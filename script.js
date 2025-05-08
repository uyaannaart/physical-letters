const { Engine, Render, Runner, Bodies, World, Body, Events } = Matter;

const canvas   = document.getElementById("canvas");
const clearBtn = document.getElementById("clearBtn");

const engine = Engine.create();
const render = Render.create({
  canvas,
  engine,
  options: { background: "transparent", wireframes: false }
});

let viewportW = window.innerWidth;
let viewportH = window.innerHeight;

function resizeCanvas () {
  const dpr = window.devicePixelRatio || 1;
  viewportW = window.innerWidth;
  viewportH = window.innerHeight;

  canvas.width  = viewportW * dpr;
  canvas.height = viewportH * dpr;
  canvas.style.width  = viewportW + "px";
  canvas.style.height = viewportH + "px";

  render.options.pixelRatio = dpr;
  render.context.imageSmoothingEnabled = false;
}
resizeCanvas();
window.addEventListener("resize", () => {
  resizeCanvas();
  rebuildBoundaries();
});
Render.run(render);
Runner.run(Runner.create(), engine);

Events.on(engine, "beforeUpdate", () => {
  const g = engine.world.gravity;
  if (!g.scale) return;
  const gx = g.x * g.scale, gy = g.y * g.scale;

  engine.world.bodies.forEach(b => {
    if (b.plugin?.noGravity) {
      Body.applyForce(b, b.position, { x: -b.mass * gx, y: -b.mass * gy });

      const speed2 = b.velocity.x ** 2 + b.velocity.y ** 2;
      if (speed2 < 0.0004) {
        Body.setVelocity(b, {
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2
        });
      }
    }
  });
});

let ground, leftWall, rightWall, topWall;
const WALL = 120, GROUND_H = 80, CEIL_H = 80;

function rebuildBoundaries () {
  if (ground) World.remove(engine.world, [ground, leftWall, rightWall, topWall]);

  ground = Bodies.rectangle(viewportW/2, viewportH+GROUND_H/2,
                            viewportW, GROUND_H,
                            { isStatic:true, render:{ fillStyle:"#9359B6" }});
  leftWall  = Bodies.rectangle(-WALL/2,          viewportH/2, WALL, viewportH*2,
                               { isStatic:true, render:{visible:false}});
  rightWall = Bodies.rectangle(viewportW+WALL/2, viewportH/2, WALL, viewportH*2,
                               { isStatic:true, render:{visible:false}});
  topWall   = Bodies.rectangle(viewportW/2, -CEIL_H/2,
                               viewportW, CEIL_H,
                               { isStatic:true, isSensor:true, render:{visible:false}});

  World.add(engine.world,[ground,leftWall,rightWall,topWall]);
}
rebuildBoundaries();

const RADIUS = 36, OVERLAP = 2, cache = {};

function scaleFor (img){
  const dpr = window.devicePixelRatio || 1;
  return (2 * RADIUS * OVERLAP) / (Math.max(img.width,img.height) * dpr);
}

function makeLetterBody (ch) {
  const imgPath = `images/${ch}.png`;
  if (!cache[ch]) { cache[ch] = new Image(); cache[ch].src = imgPath; }

  const img   = cache[ch];
  const scale = img.complete ? scaleFor(img) : 0.05;

  const x = Math.random() * (viewportW - 2*RADIUS) + RADIUS;
  const body = Bodies.circle(x, -120, RADIUS, {
    restitution: 0.6,
    frictionAir: 0.02,
    render: { sprite:{ texture:imgPath, xScale:scale, yScale:scale },
              fillStyle:"rgba(0,0,0,0.12)" }
  });
  Body.setAngularVelocity(body, (Math.random()-0.5)*0.6);
  World.add(engine.world, body);
  return body;
}

let buffer = "";
let wordLetters = [];
const MAX_WORD = 12;

function alignWordAndHold () {
  if (!wordLetters.length) return;

  const totalW = wordLetters.length * (2*RADIUS);
  const startX = viewportW/2 - totalW/2 + RADIUS;

  wordLetters.forEach((b, i) => {
    Body.setVelocity(b,{x:0,y:0});
    Body.setAngularVelocity(b,0);
    Body.setPosition(b,{x:startX+i*2*RADIUS,y:viewportH/2});
    Body.setAngle(b,0);
    b.isStatic = true;
  });

  setTimeout(() => {
    topWall.isSensor = false;   
    wordLetters.forEach(b => {
      b.isStatic = false;
      b.frictionAir = 0;
      b.plugin = { noGravity: true };
      const force = 0.03;
      Body.applyForce(b,b.position,{
        x:(Math.random()-0.5)*force,
        y:(Math.random()-0.8)*force
      });
    });
    buffer = "";
    wordLetters = [];
  }, 2000);
}


document.addEventListener("keydown", e => {
  const k = e.key.toLowerCase();

  if (/^[a-z]$/.test(k)) {
    if (buffer.length === 0) topWall.isSensor = true; 
    if (buffer.length >= MAX_WORD) return;
    buffer += k;
    wordLetters.push(makeLetterBody(k));
  } else if (e.key === "Enter" && buffer) {
    alignWordAndHold();
  }
});

Events.on(engine,"afterUpdate",()=>{
  engine.world.bodies.forEach(b=>{
    const tex=b.render.sprite.texture;
    if(!tex) return;
    const ch=tex.slice(-5,-4);
    const img=cache[ch];
    if(img && img.complete){
      const s=scaleFor(img);
      b.render.sprite.xScale=b.render.sprite.yScale=s;
    }
  });
});

clearBtn.addEventListener("click", () => {
  window.location.reload();
});