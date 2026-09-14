  const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let W = 0;
let H = 0;
let DPR = 1;

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  DPR = window.devicePixelRatio || 1;

  canvas.width = W * DPR;
  canvas.height = H * DPR;

  canvas.style.width = W + "px";
  canvas.style.height = H + "px";

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

window.addEventListener("resize", resize);
resize();


// =====================================================
// INPUT
// =====================================================

const keys = {};

const mouse = {
  x: W / 2,
  y: H / 2,
  down: false
};

window.addEventListener("keydown", function (e) {
  keys[e.key.toLowerCase()] = true;

  if (e.key.toLowerCase() === "r") {
    reload();
  }
});

window.addEventListener("keyup", function (e) {
  keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener("mousemove", function (e) {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

canvas.addEventListener("mousedown", function () {
  mouse.down = true;
});

window.addEventListener("mouseup", function () {
  mouse.down = false;
});


// =====================================================
// WORLD
// =====================================================

const world = {
  width: 3000,
  height: 2200
};

const camera = {
  x: 0,
  y: 0
};


// =====================================================
// GAME
// =====================================================

let player = null;
let bots = [];
let bullets = [];
let loot = [];

let running = false;

let gameTime = 0;
let lastTime = 0;
let shootTimer = 0;


// =====================================================
// MOBILE
// =====================================================

const touchMove = {
  x: 0,
  y: 0
};

const touchAim = {
  x: 0,
  y: 0,
  active: false
};

let joystickPointer = null;
let aimPointer = null;


// =====================================================
// SAFE ZONE
// =====================================================

const zone = {
  x: 1500,
  y: 1100,
  radius: 1050,
  startRadius: 1050,
  endRadius: 180
};


// =====================================================
// HELPERS
// =====================================================

function random(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(
    a.x - b.x,
    a.y - b.y
  );
}


// =====================================================
// START GAME
// =====================================================

function resetGame() {

  player = {
    x: 1500,
    y: 1100,

    radius: 25,

    hp: 100,
    maxHp: 100,

    ammo: 12,
    reserveAmmo: 60,

    speed: 260,

    angle: 0,

    kills: 0,

    dead: false
  };

  bots = [];
  bullets = [];
  loot = [];

  gameTime = 0;
  shootTimer = 0;

  touchMove.x = 0;
  touchMove.y = 0;

  touchAim.active = false;

  zone.radius = zone.startRadius;


  // ===================================================
  // ENEMIES
  // ===================================================

  for (let i = 0; i < 15; i++) {

    const a =
      Math.random() *
      Math.PI *
      2;

    const r =
      random(500, 900);

    bots.push({

      x:
        player.x +
        Math.cos(a) * r,

      y:
        player.y +
        Math.sin(a) * r,

      radius: 24,

      hp: 60,
      maxHp: 60,

      speed: random(70, 110),

      angle: 0,

      cooldown:
        random(0.5, 1.5),

      dead: false
    });
  }


  // ===================================================
  // LOOT
  // ===================================================

  for (let i = 0; i < 30; i++) {

    loot.push({

      x: random(
        100,
        world.width - 100
      ),

      y: random(
        100,
        world.height - 100
      ),

      type:
        Math.random() < 0.65
          ? "ammo"
          : "med",

      collected: false
    });
  }


  running = true;


  document
    .getElementById("menu")
    .classList.add("hidden");

  document
    .getElementById("end")
    .classList.add("hidden");

  document
    .getElementById("hud")
    .classList.remove("hidden");


  updateCamera();
  updateHUD();
}


// =====================================================
// CAMERA
// =====================================================

function updateCamera() {

  if (!player) {
    return;
  }

  camera.x =
    player.x -
    W / 2;

  camera.y =
    player.y -
    H / 2;

  camera.x =
    clamp(
      camera.x,
      0,
      Math.max(
        0,
        world.width - W
      )
    );

  camera.y =
    clamp(
      camera.y,
      0,
      Math.max(
        0,
        world.height - H
      )
    );
}


// =====================================================
// RELOAD
// =====================================================

function reload() {

  if (!running) {
    return;
  }

  if (player.ammo >= 12) {
    return;
  }

  if (player.reserveAmmo <= 0) {
    return;
  }

  const need =
    12 - player.ammo;

  const amount =
    Math.min(
      need,
      player.reserveAmmo
    );

  player.ammo += amount;
  player.reserveAmmo -= amount;
}


// =====================================================
// SHOOT
// =====================================================

function shoot(
  owner,
  x,
  y,
  angle,
  damage,
  speed
) {

  bullets.push({

    x: x,
    y: y,

    vx:
      Math.cos(angle) *
      speed,

    vy:
      Math.sin(angle) *
      speed,

    owner: owner,

    damage: damage,

    life: 1.5,

    radius: 5
  });
}


// =====================================================
// PLAYER SHOOT
// =====================================================

function playerShoot() {

  if (!player) {
    return;
  }

  if (player.ammo <= 0) {
    reload();
    return;
  }

  player.ammo--;

  shoot(

    "player",

    player.x +
      Math.cos(player.angle) *
      35,

    player.y +
      Math.sin(player.angle) *
      35,

    player.angle,

    30,

    1000
  );

  shootTimer = 0.18;
}


// =====================================================
// PLAYER
// =====================================================

function updatePlayer(dt) {

  let mx = 0;
  let my = 0;


  // Keyboard
  if (
    keys["w"] ||
    keys["arrowup"]
  ) {
    my -= 1;
  }

  if (
    keys["s"] ||
    keys["arrowdown"]
  ) {
    my += 1;
  }

  if (
    keys["a"] ||
    keys["arrowleft"]
  ) {
    mx -= 1;
  }

  if (
    keys["d"] ||
    keys["arrowright"]
  ) {
    mx += 1;
  }


  // Mobile joystick
  mx += touchMove.x;
  my += touchMove.y;


  const len =
    Math.hypot(mx, my);


  if (len > 0) {
    mx /= len;
    my /= len;
  }


  player.x +=
    mx *
    player.speed *
    dt;

  player.y +=
    my *
    player.speed *
    dt;


  player.x =
    clamp(
      player.x,
      30,
      world.width - 30
    );

  player.y =
    clamp(
      player.y,
      30,
      world.height - 30
    );
}


// =====================================================
// AIM
// =====================================================

function updateAim() {

  if (!player) {
    return;
  }


  let targetX;
  let targetY;


  if (touchAim.active) {

    targetX =
      touchAim.x +
      camera.x;

    targetY =
      touchAim.y +
      camera.y;

  }
  else {

    targetX =
      mouse.x +
      camera.x;

    targetY =
      mouse.y +
      camera.y;

  }


  player.angle =
    Math.atan2(
      targetY - player.y,
      targetX - player.x
    );
}


// =====================================================
// ENEMIES
// =====================================================

function updateBots(dt) {

  for (const bot of bots) {

    if (bot.dead) {
      continue;
    }


    const d =
      distance(
        bot,
        player
      );


    const angle =
      Math.atan2(
        player.y - bot.y,
        player.x - bot.x
      );


    bot.angle = angle;


    bot.cooldown -= dt;


    // Chase player
    if (d > 300) {

      bot.x +=
        Math.cos(angle) *
        bot.speed *
        dt;

      bot.y +=
        Math.sin(angle) *
        bot.speed *
        dt;
    }


    // Shoot
    if (
      d < 700 &&
      bot.cooldown <= 0
    ) {

      shoot(

        "bot",

        bot.x +
          Math.cos(angle) *
          30,

        bot.y +
          Math.sin(angle) *
          30,

        angle,

        10,

        550
      );

      bot.cooldown =
        random(
          0.8,
          1.6
        );
    }


    // Zone damage
    if (
      distance(
        bot,
        zone
      ) >
      zone.radius
    ) {

      bot.hp -=
        8 * dt;
    }


    if (bot.hp <= 0) {
      bot.dead = true;
    }
  }
}


// =====================================================
// BULLETS
// =====================================================

function updateBullets(dt) {

  for (const bullet of bullets) {

    bullet.x +=
      bullet.vx * dt;

    bullet.y +=
      bullet.vy * dt;

    bullet.life -= dt;


    if (
      bullet.x < 0 ||
      bullet.y < 0 ||
      bullet.x >
        world.width ||
      bullet.y >
        world.height
    ) {

      bullet.life = 0;
    }


    // Player bullet
    if (
      bullet.owner ===
      "player"
    ) {

      for (const bot of bots) {

        if (bot.dead) {
          continue;
        }


        if (
          distance(
            bullet,
            bot
          ) <
          bullet.radius +
          bot.radius
        ) {

          bot.hp -=
            bullet.damage;

          bullet.life = 0;


          if (bot.hp <= 0) {

            bot.dead = true;

            player.kills++;


            if (
              Math.random() <
              0.7
            ) {

              loot.push({

                x: bot.x,
                y: bot.y,

                type:
                  Math.random() <
                  0.65
                    ? "ammo"
                    : "med",

                collected:
                  false
              });
            }
          }

          break;
        }
      }
    }


    // Enemy bullet
    if (
      bullet.owner ===
      "bot"
    ) {

      if (
        distance(
          bullet,
          player
        ) <
        bullet.radius +
        player.radius
      ) {

        player.hp -=
          bullet.damage;

        bullet.life = 0;
      }
    }
  }


  bullets =
    bullets.filter(
      b =>
        b.life > 0
    );
}


// =====================================================
// LOOT
// =====================================================

function updateLoot() {

  for (const item of loot) {

    if (item.collected) {
      continue;
    }


    if (
      distance(
        item,
        player
      ) < 45
    ) {

      if (
        item.type ===
        "ammo"
      ) {

        player.reserveAmmo =
          Math.min(
            120,
            player.reserveAmmo +
              30
          );

      }
      else {

        player.hp =
          Math.min(
            100,
            player.hp + 25
          );
      }


      item.collected = true;
    }
  }


  loot =
    loot.filter(
      item =>
        !item.collected
    );
}


// =====================================================
// ZONE
// =====================================================

function updateZone(dt) {

  const progress =
    clamp(
      gameTime / 120,
      0,
      1
    );


  zone.radius =
    zone.startRadius -
    (
      zone.startRadius -
      zone.endRadius
    ) *
    progress;


  if (
    distance(
      player,
      zone
    ) >
    zone.radius
  ) {

    player.hp -=
      10 * dt;
  }
}


// =====================================================
// HUD
// =====================================================

function updateHUD() {

  if (!player) {
    return;
  }


  const alive =
    bots.filter(
      bot =>
        !bot.dead
    ).length + 1;


  document.getElementById(
    "hp"
  ).textContent =
    Math.max(
      0,
      Math.ceil(
        player.hp
      )
    );


  document.getElementById(
    "ammo"
  ).textContent =
    player.ammo +
    "/" +
    player.reserveAmmo;


  document.getElementById(
    "alive"
  ).textContent =
    alive;


  document.getElementById(
    "zone"
  ).textContent =
    Math.ceil(
      zone.radius /
      zone.startRadius *
      100
    );


  const message =
    document.getElementById(
      "message"
    );


  if (
    distance(
      player,
      zone
    ) >
    zone.radius
  ) {

    message.textContent =
      "⚠ OUTSIDE SAFE ZONE!";

  }
  else {

    message.textContent =
      "";
  }
}


// =====================================================
// DRAW GROUND
// =====================================================

function drawGround() {

  ctx.fillStyle =
    "#263b40";

  ctx.fillRect(
    0,
    0,
    world.width,
    world.height
  );


  // Grid
  ctx.strokeStyle =
    "rgba(255,255,255,0.055)";

  ctx.lineWidth = 1;


  for (
    let x = 0;
    x < world.width;
    x += 100
  ) {

    ctx.beginPath();

    ctx.moveTo(
      x,
      0
    );

    ctx.lineTo(
      x,
      world.height
    );

    ctx.stroke();
  }


  for (
    let y = 0;
    y < world.height;
    y += 100
  ) {

    ctx.beginPath();

    ctx.moveTo(
      0,
      y
    );

    ctx.lineTo(
      world.width,
      y
    );

    ctx.stroke();
  }
}


// =====================================================
// DRAW WORLD DECORATIONS
// =====================================================

function drawDecorations() {

  // Trees / rocks
  const objects = [
    [300, 300],
    [700, 500],
    [1200, 300],
    [1900, 400],
    [2500, 550],

    [350, 950],
    [900, 800],
    [1800, 850],
    [2500, 900],

    [400, 1600],
    [1100, 1500],
    [1700, 1550],
    [2400, 1600],

    [800, 1900],
    [2000, 1900]
  ];


  for (const obj of objects) {

    const x = obj[0];
    const y = obj[1];


    ctx.fillStyle =
      "#102c20";

    ctx.beginPath();

    ctx.arc(
      x,
      y,
      45,
      0,
      Math.PI * 2
    );

    ctx.fill();


    ctx.fillStyle =
      "#1d5230";

    ctx.beginPath();

    ctx.arc(
      x - 8,
      y - 10,
      30,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }


  // Buildings
  const buildings = [
    [500, 400, 260, 170],
    [1150, 500, 280, 190],
    [2050, 400, 300, 200],

    [400, 1050, 300, 200],
    [1300, 900, 300, 190],
    [2150, 1050, 280, 200],

    [650, 1550, 300, 190],
    [1550, 1500, 300, 200],
    [2200, 1650, 300, 190]
  ];


  for (const b of buildings) {

    const x = b[0];
    const y = b[1];
    const w = b[2];
    const h = b[3];


    ctx.fillStyle =
      "rgba(0,0,0,0.3)";

    ctx.fillRect(
      x + 10,
      y + 12,
      w,
      h
    );


    ctx.fillStyle =
      "#59646b";

    ctx.fillRect(
      x,
      y,
      w,
      h
    );


    ctx.fillStyle =
      "#3d474e";

    ctx.fillRect(
      x,
      y,
      w,
      20
    );


    // Windows
    ctx.fillStyle =
      "#9ddbe4";


    for (
      let wx = x + 30;
      wx < x + w - 20;
      wx += 65
    ) {

      for (
        let wy = y + 45;
        wy < y + h - 25;
        wy += 65
      ) {

        ctx.fillRect(
          wx,
          wy,
          22,
          16
        );
      }
    }
  }
}


// =====================================================
// DRAW LOOT
// =====================================================

function drawLoot() {

  for (const item of loot) {

    ctx.save();

    ctx.shadowBlur = 15;

    ctx.shadowColor =
      item.type === "ammo"
        ? "#ffd43b"
        : "#43f07b";


    ctx.fillStyle =
      item.type === "ammo"
        ? "#ffd43b"
        : "#43f07b";


    ctx.fillRect(
      item.x - 10,
      item.y - 10,
      20,
      20
    );


    ctx.shadowBlur = 0;

    ctx.fillStyle =
      "#172018";

    ctx.font =
      "bold 14px Arial";

    ctx.textAlign =
      "center";

    ctx.textBaseline =
      "middle";


    ctx.fillText(
      item.type === "ammo"
        ? "A"
        : "+",

      item.x,
      item.y
    );


    ctx.restore();
  }
}


// =====================================================
// DRAW BULLETS
// =====================================================

function drawBullets() {

  for (const bullet of bullets) {

    ctx.fillStyle =
      bullet.owner ===
      "player"
        ? "#fff06a"
        : "#ff5555";


    ctx.beginPath();

    ctx.arc(
      bullet.x,
      bullet.y,
      bullet.radius,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }
}


// =====================================================
// DRAW HEALTH BAR
// =====================================================

function drawHealthBar(
  character
) {

  const width = 60;
  const height = 7;


  const x =
    character.x -
    width / 2;


  const y =
    character.y -
    character.radius -
    18;


  ctx.fillStyle =
    "#000";

  ctx.fillRect(
    x,
    y,
    width,
    height
  );


  ctx.fillStyle =
    character ===
    player
      ? "#39ed76"
      : "#ff4f4f";


  ctx.fillRect(
    x,
    y,
    width *
      Math.max(
        0,
        character.hp /
        character.maxHp
      ),
    height
  );
}


// =====================================================
// DRAW CHARACTER
// =====================================================

function drawCharacter(
  character,
  isPlayer
) {

  ctx.save();


  ctx.translate(
    character.x,
    character.y
  );


  ctx.rotate(
    character.angle
  );


  // Shadow
  ctx.fillStyle =
    "rgba(0,0,0,0.45)";

  ctx.beginPath();

  ctx.ellipse(
    0,
    25,
    28,
    11,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();


  // Weapon
  ctx.fillStyle =
    "#111";

  ctx.fillRect(
    8,
    -7,
    42,
    14
  );


  ctx.fillStyle =
    "#39434b";

  ctx.fillRect(
    42,
    -4,
    16,
    8
  );


  // Body
  ctx.fillStyle =
    isPlayer
      ? "#168cff"
      : "#ff414f";


  ctx.strokeStyle =
    "#ffffff";

  ctx.lineWidth = 4;


  ctx.beginPath();

  ctx.arc(
    0,
    0,
    character.radius,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.stroke();


  // Head
  ctx.fillStyle =
    isPlayer
      ? "#8bd0ff"
      : "#ff9999";


  ctx.beginPath();

  ctx.arc(
    7,
    -4,
    10,
    0,
    Math.PI * 2
  );

  ctx.fill();


  // Direction marker
  ctx.fillStyle =
    "#fff";

  ctx.beginPath();

  ctx.arc(
    13,
    -4,
    3,
    0,
    Math.PI * 2
  );

  ctx.fill();


  ctx.restore();


  drawHealthBar(
    character
  );
}


// =====================================================
// DRAW ZONE
// =====================================================

function drawZone() {

  // IMPORTANT:
  // No destination-out here.
  // This prevents the zone from hiding
  // characters on mobile.

  ctx.fillStyle =
    "rgba(20,30,70,0.30)";

  ctx.fillRect(
    0,
    0,
    world.width,
    world.height
  );


  // Safe zone border
  ctx.strokeStyle =
    "#58e7ff";

  ctx.lineWidth = 8;


  ctx.beginPath();

  ctx.arc(
    zone.x,
    zone.y,
    zone.radius,
    0,
    Math.PI * 2
  );

  ctx.stroke();
}


// =====================================================
// DRAW
// =====================================================

function draw() {

  ctx.clearRect(
    0,
    0,
    W,
    H
  );


  // Background
  ctx.fillStyle =
    "#17252a";

  ctx.fillRect(
    0,
    0,
    W,
    H
  );


  if (!player) {
    return;
  }


  ctx.save();


  ctx.translate(
    -camera.x,
    -camera.y
  );


  // Ground
  drawGround();


  // Buildings / trees
  drawDecorations();


  // Zone background
  drawZone();


  // Loot
  drawLoot();


  // Bullets
  drawBullets();


  // =================================================
  // ENEMIES
  // =================================================

  for (const bot of bots) {

    if (!bot.dead) {

      drawCharacter(
        bot,
        false
      );
    }
  }


  // ======================

 
