// ============================================================
// LAST ZONE - BATTLE ROYALE
// Complete mobile + desktop game.js
// ============================================================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let W = window.innerWidth;
let H = window.innerHeight;
let DPR = window.devicePixelRatio || 1;

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  DPR = window.devicePixelRatio || 1;

  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);

  canvas.style.width = W + "px";
  canvas.style.height = H + "px";

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

window.addEventListener("resize", resize);
resize();


// ============================================================
// INPUT
// ============================================================

const keys = {};

const mouse = {
  x: W / 2,
  y: H / 2,
  down: false
};

window.addEventListener("keydown", function (e) {
  const key = e.key.toLowerCase();

  keys[key] = true;

  if (key === "r") {
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


// ============================================================
// WORLD
// ============================================================

const world = {
  width: 3000,
  height: 2200
};

const camera = {
  x: 0,
  y: 0
};


// ============================================================
// GAME VARIABLES
// ============================================================

let player = null;
let bots = [];
let bullets = [];
let loot = [];
let buildings = [];
let trees = [];

let zone = null;

let running = false;
let gameTime = 0;
let lastTime = 0;

let shootTimer = 0;


// ============================================================
// MOBILE CONTROLS
// ============================================================

const touchMove = {
  x: 0,
  y: 0
};

const touchAim = {
  x: 0,
  y: 0,
  active: false
};

let joystickPointerId = null;
let aimPointerId = null;


// ============================================================
// UTILITY
// ============================================================

function random(min, max) {
  return min + Math.random() * (max - min);
}

function distance(a, b) {
  return Math.hypot(
    a.x - b.x,
    a.y - b.y
  );
}

function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

function aliveBots() {
  return bots.filter(bot => !bot.dead);
}


// ============================================================
// CREATE MAP
// ============================================================

function createMap() {
  buildings = [];
  trees = [];

  // Buildings
  const buildingData = [
    [350, 350, 280, 180],
    [850, 300, 300, 220],
    [1450, 280, 280, 180],
    [2100, 400, 320, 220],

    [400, 900, 320, 230],
    [1050, 850, 300, 200],
    [1700, 800, 360, 230],
    [2300, 900, 300, 220],

    [300, 1500, 300, 210],
    [900, 1450, 350, 230],
    [1550, 1450, 300, 220],
    [2150, 1500, 360, 220],

    [1200, 1850, 300, 180]
  ];

  for (const data of buildingData) {
    buildings.push({
      x: data[0],
      y: data[1],
      width: data[2],
      height: data[3]
    });
  }

  // Trees
  for (let i = 0; i < 120; i++) {
    trees.push({
      x: random(80, world.width - 80),
      y: random(80, world.height - 80),
      size: random(18, 32)
    });
  }
}


// ============================================================
// START GAME
// ============================================================

function resetGame() {
  player = {
    x: world.width / 2,
    y: world.height / 2,

    radius: 22,

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

  touchAim.x = 0;
  touchAim.y = 0;
  touchAim.active = false;

  createMap();

  // ----------------------------------------------------------
  // CREATE ENEMIES
  // ----------------------------------------------------------

  for (let i = 0; i < 15; i++) {
    let x;
    let y;

    // Spawn enemies around the player
    // but not too close.
    const angle = random(0, Math.PI * 2);
    const radius = random(450, 950);

    x =
      player.x +
      Math.cos(angle) * radius;

    y =
      player.y +
      Math.sin(angle) * radius;

    x = clamp(x, 80, world.width - 80);
    y = clamp(y, 80, world.height - 80);

    bots.push({
      x: x,
      y: y,

      radius: 21,

      hp: 60,
      maxHp: 60,

      speed: random(75, 115),

      cooldown: random(0.5, 1.5),

      angle: 0,

      dead: false,

      wanderAngle: random(0, Math.PI * 2)
    });
  }

  // ----------------------------------------------------------
  // SAFE ZONE
  // ----------------------------------------------------------

  zone = {
    x: world.width / 2,
    y: world.height / 2,

    startRadius: 1050,
    targetRadius: 180,

    radius: 1050,

    phase: 0
  };

  // ----------------------------------------------------------
  // LOOT
  // ----------------------------------------------------------

  for (let i = 0; i < 35; i++) {
    loot.push({
      x: random(100, world.width - 100),
      y: random(100, world.height - 100),

      type:
        Math.random() < 0.65
          ? "ammo"
          : "med"
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

  // Center camera immediately.
  updateCamera();

  updateHUD();
}


// ============================================================
// CAMERA
// ============================================================

function updateCamera() {
  if (!player) {
    return;
  }

  camera.x = clamp(
    player.x - W / 2,
    0,
    Math.max(0, world.width - W)
  );

  camera.y = clamp(
    player.y - H / 2,
    0,
    Math.max(0, world.height - H)
  );
}


// ============================================================
// RELOAD
// ============================================================

function reload() {
  if (!running || !player) {
    return;
  }

  if (player.ammo >= 12) {
    return;
  }

  if (player.reserveAmmo <= 0) {
    return;
  }

  const needed = 12 - player.ammo;

  const amount = Math.min(
    needed,
    player.reserveAmmo
  );

  player.ammo += amount;
  player.reserveAmmo -= amount;
}


// ============================================================
// SHOOT
// ============================================================

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

    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,

    life: 1.4,

    owner: owner,

    damage: damage,

    radius: 5
  });
}


// ============================================================
// PLAYER SHOOT
// ============================================================

function playerShoot() {
  if (!player || !running) {
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
      Math.cos(player.angle) * 30,

    player.y +
      Math.sin(player.angle) * 30,

    player.angle,

    30,

    1000
  );

  shootTimer = 0.18;
}


// ============================================================
// PLAYER MOVEMENT
// ============================================================

function updatePlayer(dt) {
  let moveX = 0;
  let moveY = 0;

  // Keyboard
  if (
    keys["w"] ||
    keys["arrowup"]
  ) {
    moveY -= 1;
  }

  if (
    keys["s"] ||
    keys["arrowdown"]
  ) {
    moveY += 1;
  }

  if (
    keys["a"] ||
    keys["arrowleft"]
  ) {
    moveX -= 1;
  }

  if (
    keys["d"] ||
    keys["arrowright"]
  ) {
    moveX += 1;
  }

  // Mobile joystick
  moveX += touchMove.x;
  moveY += touchMove.y;

  const length = Math.hypot(
    moveX,
    moveY
  );

  if (length > 0) {
    moveX /= length;
    moveY /= length;
  }

  player.x +=
    moveX *
    player.speed *
    dt;

  player.y +=
    moveY *
    player.speed *
    dt;

  player.x = clamp(
    player.x,
    35,
    world.width - 35
  );

  player.y = clamp(
    player.y,
    35,
    world.height - 35
  );
}


// ============================================================
// PLAYER AIM
// ============================================================

function updatePlayerAim() {
  if (!player) {
    return;
  }

  if (touchAim.active) {
    player.angle = Math.atan2(
      touchAim.y +
        camera.y -
        player.y,

      touchAim.x +
        camera.x -
        player.x
    );
  }
  else {
    player.angle = Math.atan2(
      mouse.y +
        camera.y -
        player.y,

      mouse.x +
        camera.x -
        player.x
    );
  }
}


// ============================================================
// ENEMY AI
// ============================================================

function updateBots(dt) {
  for (const bot of bots) {
    if (bot.dead) {
      continue;
    }

    bot.cooldown -= dt;

    const d = distance(
      bot,
      player
    );

    const angle = Math.atan2(
      player.y - bot.y,
      player.x - bot.x
    );

    bot.angle = angle;

    // Chase player
    if (d > 360) {
      bot.x +=
        Math.cos(angle) *
        bot.speed *
        dt;

      bot.y +=
        Math.sin(angle) *
        bot.speed *
        dt;
    }
    else if (d < 190) {
      // Move away if too close
      bot.x -=
        Math.cos(angle) *
        bot.speed *
        0.7 *
        dt;

      bot.y -=
        Math.sin(angle) *
        bot.speed *
        0.7 *
        dt;
    }

    // Keep inside world
    bot.x = clamp(
      bot.x,
      30,
      world.width - 30
    );

    bot.y = clamp(
      bot.y,
      30,
      world.height - 30
    );

    // Shoot player
    if (
      d < 700 &&
      bot.cooldown <= 0
    ) {
      shoot(
        "bot",

        bot.x +
          Math.cos(angle) * 25,

        bot.y +
          Math.sin(angle) * 25,

        angle,

        10,

        600
      );

      bot.cooldown =
        random(0.8, 1.6);
    }

    // Zone damage
    if (
      distance(bot, zone) >
      zone.radius
    ) {
      bot.hp -= 8 * dt;
    }

    if (bot.hp <= 0) {
      bot.dead = true;
    }
  }
}


// ============================================================
// UPDATE BULLETS
// ============================================================

function updateBullets(dt) {
  for (const bullet of bullets) {
    bullet.x +=
      bullet.vx * dt;

    bullet.y +=
      bullet.vy * dt;

    bullet.life -= dt;

    // Outside world
    if (
      bullet.x < 0 ||
      bullet.y < 0 ||
      bullet.x > world.width ||
      bullet.y > world.height
    ) {
      bullet.life = 0;
    }

    // Player bullet
    if (
      bullet.owner === "player"
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
          bot.radius +
          bullet.radius
        ) {
          bot.hp -=
            bullet.damage;

          bullet.life = 0;

          createHitEffect(
            bot.x,
            bot.y
          );

          if (bot.hp <= 0) {
            bot.dead = true;

            player.kills++;

            // Drop loot
            if (
              Math.random() < 0.75
            ) {
              loot.push({
                x: bot.x,
                y: bot.y,

                type:
                  Math.random() < 0.65
                    ? "ammo"
                    : "med"
              });
            }
          }

          break;
        }
      }
    }

    // Enemy bullet
    else {
      if (
        distance(
          bullet,
          player
        ) <
        player.radius +
        bullet.radius
      ) {
        player.hp -=
          bullet.damage;

        bullet.life = 0;

        createHitEffect(
          player.x,
          player.y
        );
      }
    }
  }

  bullets = bullets.filter(
    bullet =>
      bullet.life > 0
  );
}


// ============================================================
// HIT EFFECTS
// ============================================================

const effects = [];

function createHitEffect(x, y) {
  effects.push({
    x: x,
    y: y,
    life: 0.25,
    maxLife: 0.25
  });
}

function updateEffects(dt) {
  for (const effect of effects) {
    effect.life -= dt;
  }

  while (
    effects.length &&
    effects[0].life <= 0
  ) {
    effects.shift();
  }
}


// ============================================================
// PICKUPS
// ============================================================

function updateLoot() {
  for (const item of loot) {
    if (
      distance(
        item,
        player
      ) < 42
    ) {
      if (
        item.type === "ammo"
      ) {
        player.reserveAmmo =
          Math.min(
            120,
            player.reserveAmmo + 30
          );
      }
      else {
        player.hp =
          Math.min(
            100,
            player.hp + 30
          );
      }

      item.collected = true;
    }
  }

  loot = loot.filter(
    item =>
      !item.collected
  );
}


// ============================================================
// UPDATE SAFE ZONE
// ============================================================

function updateZone(dt) {
  zone.phase = clamp(
    gameTime / 120,
    0,
    1
  );

  zone.radius =
    zone.startRadius -
    (
      zone.startRadius -
      zone.targetRadius
    ) *
    zone.phase;

  if (
    distance(
      player,
      zone
    ) > zone.radius
  ) {
    player.hp -=
      11 * dt;
  }
}


// ============================================================
// UPDATE HUD
// ============================================================

function updateHUD() {
  if (!player) {
    return;
  }

  const alive =
    aliveBots().length + 1;

  const hpElement =
    document.getElementById("hp");

  const ammoElement =
    document.getElementById("ammo");

  const aliveElement =
    document.getElementById("alive");

  const zoneElement =
    document.getElementById("zone");

  if (hpElement) {
    hpElement.textContent =
      Math.max(
        0,
        Math.ceil(player.hp)
      );
  }

  if (ammoElement) {
    ammoElement.textContent =
      player.ammo +
      "/" +
      player.reserveAmmo;
  }

  if (aliveElement) {
    aliveElement.textContent =
      alive;
  }

  if (zoneElement) {
    zoneElement.textContent =
      Math.ceil(
        (
          zone.radius /
          zone.startRadius
        ) * 100
      );
  }

  const message =
    document.getElementById(
      "message"
    );

  if (message) {
    if (
      distance(
        player,
        zone
      ) > zone.radius
    ) {
      message.textContent =
        "⚠ OUTSIDE SAFE ZONE!";
    }
    else {
      message.textContent = "";
    }
  }
}


// ============================================================
// MAIN UPDATE
// ============================================================

function update(dt) {
  if (!player) {
    return;
  }

  gameTime += dt;

  shootTimer -= dt;

  updatePlayer(dt);

  updateCamera();

  updatePlayerAim();

  // Desktop shooting
  if (
    mouse.down &&
    shootTimer <= 0
  ) {
    playerShoot();
  }

  // Mobile shooting
  if (
    touchAim.active &&
    shootTimer <= 0
  ) {
    playerShoot();
  }

  updateBots(dt);

  updateBullets(dt);

  updateLoot();

  updateZone(dt);

  updateEffects(dt);

  updateHUD();

  // Death
  if (player.hp <= 0) {
    player.hp = 0;

    finishGame(false);

    return;
  }

  // Victory
  if (
    aliveBots().length === 0
  ) {
    finishGame(true);

    return;
  }
}


// ============================================================
// DRAW GROUND
// ============================================================

function drawGround() {
  ctx.fillStyle = "#294b32";

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
    x <= world.width;
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
    y <= world.height;
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


// ============================================================
// DRAW TREES
// ============================================================

function drawTrees() {
  for (const tree of trees) {
    // Shadow
    ctx.fillStyle =
      "rgba(0,0,0,0.18)";

    ctx.beginPath();

    ctx.ellipse(
      tree.x,
      tree.y + tree.size * 0.55,
      tree.size * 0.9,
      tree.size * 0.35,
      0,
      0,
      Math.PI * 2
    );

    ctx.fill();

    // Trunk
    ctx.fillStyle = "#63462e";

    ctx.fillRect(
      tree.x - 5,
      tree.y,
      10,
      tree.size
    );

    // Leaves
    ctx.fillStyle = "#163d24";

    ctx.beginPath();

    ctx.arc(
      tree.x,
      tree.y - 5,
      tree.size,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle = "#245a31";

    ctx.beginPath();

    ctx.arc(
      tree.x - 6,
      tree.y - 10,
      tree.size * 0.65,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }
}


// ============================================================
// DRAW BUILDINGS
// ============================================================

function drawBuildings() {
  for (const building of buildings) {
    // Shadow
    ctx.fillStyle =
      "rgba(0,0,0,0.25)";

    ctx.fillRect(
      building.x + 10,
      building.y + 12,
      building.width,
      building.height
    );

    // Building
    ctx.fillStyle = "#707982";

    ctx.fillRect(
      building.x,
      building.y,
      building.width,
      building.height
    );

    // Roof
    ctx.fillStyle = "#4c565e";

    ctx.fillRect(
      building.x,
      building.y,
      building.width,
      18
    );

    // Windows
    ctx.fillStyle = "#a9d9df";

    const cols = Math.max(
      2,
      Math.floor(building.width / 75)
    );

    const rows = Math.max(
      1,
      Math.floor(building.height / 75)
    );

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx =
          building.x +
          25 +
          c *
            (
              (building.width - 50) /
              Math.max(1, cols - 1)
            );

        const wy =
          building.y +
          45 +
          r * 65;

        ctx.fillRect(
          wx - 10,
          wy - 8,
          20,
          16
        );
      }
    }

    // Door
    ctx.fillStyle = "#30363b";

    ctx.fillRect(
      building.x +
        building.width / 2 -
        14,

      building.y +
        building.height -
        45,

      28,
      45
    );
  }
}


// ============================================================
// DRAW SAFE ZONE
// ============================================================

function drawZone() {
  // Dark area outside zone
  ctx.save();

  ctx.fillStyle =
    "rgba(10,18,35,0.62)";

  ctx.fillRect(
    0,
    0,
    world.width,
    world.height
  );

  // Remove darkness inside circle
  ctx.globalCompositeOperation =
    "destination-out";

  ctx.beginPath();

  ctx.arc(
    zone.x,
    zone.y,
    zone.radius,
    0,
    Math.PI * 2
  );

 
