const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let W;
let H;
let DPR;

function resize() {
  DPR = window.devicePixelRatio || 1;

  W = window.innerWidth;
  H = window.innerHeight;

  canvas.width = W * DPR;
  canvas.height = H * DPR;

  canvas.style.width = W + "px";
  canvas.style.height = H + "px";

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

window.addEventListener("resize", resize);
resize();


// ========================================
// INPUT
// ========================================

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


// ========================================
// WORLD
// ========================================

const world = {
  width: 3000,
  height: 2200
};

const camera = {
  x: 0,
  y: 0
};


// ========================================
// GAME VARIABLES
// ========================================

let player;
let bots = [];
let bullets = [];
let loot = [];

let zone;

let running = false;
let gameTime = 0;

let lastTime = 0;

let shootTimer = 0;


// ========================================
// MOBILE CONTROLS
// ========================================

let touchMove = {
  x: 0,
  y: 0
};


// ========================================
// UTILITY FUNCTIONS
// ========================================

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


// ========================================
// START / RESET GAME
// ========================================

function resetGame() {

  player = {
    x: world.width / 2,
    y: world.height / 2,

    radius: 18,

    hp: 100,
    maxHp: 100,

    ammo: 12,
    reserveAmmo: 60,

    speed: 240,

    angle: 0,

    kills: 0,

    dead: false
  };


  bots = [];
  bullets = [];
  loot = [];


  gameTime = 0;
  shootTimer = 0;


  // ----------------------------------------
  // Create enemy bots
  // ----------------------------------------

  for (let i = 0; i < 15; i++) {

    const angle = random(
      0,
      Math.PI * 2
    );

    const radius = random(
      500,
      1050
    );

    bots.push({

      x:
        world.width / 2 +
        Math.cos(angle) * radius,

      y:
        world.height / 2 +
        Math.sin(angle) * radius,

      radius: 17,

      hp: 60,
      maxHp: 60,

      speed: random(85, 125),

      cooldown: random(0.2, 1.2),

      angle: 0,

      dead: false
    });
  }


  // ----------------------------------------
  // Safe zone
  // ----------------------------------------

  zone = {

    x: world.width / 2,
    y: world.height / 2,

    startRadius: 1050,

    targetRadius: 210,

    radius: 1050,

    phase: 0
  };


  // ----------------------------------------
  // Spawn loot
  // ----------------------------------------

  for (let i = 0; i < 22; i++) {

    loot.push({

      x: random(
        120,
        world.width - 120
      ),

      y: random(
        120,
        world.height - 120
      ),

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
}


// ========================================
// RELOAD
// ========================================

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


  const needed =
    12 - player.ammo;

  const amount =
    Math.min(
      needed,
      player.reserveAmmo
    );


  player.ammo += amount;

  player.reserveAmmo -= amount;
}


// ========================================
// SHOOT BULLET
// ========================================

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
      Math.cos(angle) * speed,

    vy:
      Math.sin(angle) * speed,

    life: 1.2,

    owner: owner,

    damage: damage,

    radius: 4
  });
}


// ========================================
// PLAYER SHOOTING
// ========================================

function playerShoot() {

  if (player.ammo <= 0) {

    reload();

    return;
  }


  player.ammo--;


  shoot(
    "player",

    player.x +
      Math.cos(player.angle) * 22,

    player.y +
      Math.sin(player.angle) * 22,

    player.angle,

    28,

    950
  );


  shootTimer = 0.16;
}


// ========================================
// UPDATE GAME
// ========================================

function update(dt) {

  gameTime += dt;

  shootTimer -= dt;


  // ======================================
  // PLAYER MOVEMENT
  // ======================================

  let moveX = 0;
  let moveY = 0;


  if (
    keys["d"] ||
    keys["arrowright"]
  ) {
    moveX += 1;
  }


  if (
    keys["a"] ||
    keys["arrowleft"]
  ) {
    moveX -= 1;
  }


  if (
    keys["s"] ||
    keys["arrowdown"]
  ) {
    moveY += 1;
  }


  if (
    keys["w"] ||
    keys["arrowup"]
  ) {
    moveY -= 1;
  }


  moveX += touchMove.x;
  moveY += touchMove.y;


  const movementLength =
    Math.hypot(
      moveX,
      moveY
    );


  if (movementLength > 0) {

    moveX /= movementLength;
    moveY /= movementLength;

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
    25,
    world.width - 25
  );


  player.y = clamp(
    player.y,
    25,
    world.height - 25
  );


  // ======================================
  // AIM
  // ======================================

  player.angle = Math.atan2(

    mouse.y +
      camera.y -
      player.y,

    mouse.x +
      camera.x -
      player.x

  );


  // ======================================
  // SHOOT
  // ======================================

  if (
    mouse.down &&
    shootTimer <= 0
  ) {

    playerShoot();

  }


  // ======================================
  // CAMERA
  // ======================================

  camera.x = clamp(

    player.x - W / 2,

    0,

    world.width - W

  );


  camera.y = clamp(

    player.y - H / 2,

    0,

    world.height - H

  );


  // ======================================
  // SAFE ZONE
  // ======================================

  zone.phase = clamp(
    gameTime / 110,
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


  // Damage player outside zone

  const playerOutside =
    distance(player, zone) -
    zone.radius;


  if (playerOutside > 0) {

    player.hp -=
      10 * dt;

  }


  // ======================================
  // ENEMY AI
  // ======================================

  for (const bot of bots) {

    if (bot.dead) {
      continue;
    }


    bot.cooldown -= dt;


    const d =
      distance(bot, player);


    const angle =
      Math.atan2(
        player.y - bot.y,
        player.x - bot.x
      );


    bot.angle = angle;


    // Move toward player

    if (d > 330) {

      bot.x +=
        Math.cos(angle) *
        bot.speed *
        dt;

      bot.y +=
        Math.sin(angle) *
        bot.speed *
        dt;

    }


    // Shoot player

    if (
      d < 650 &&
      bot.cooldown <= 0
    ) {

      shoot(

        "bot",

        bot.x +
          Math.cos(angle) * 18,

        bot.y +
          Math.sin(angle) * 18,

        angle,

        12,

        520

      );


      bot.cooldown =
        random(0.7, 1.5);

    }


    // Bots also take zone damage

    if (
      distance(bot, zone) >
      zone.radius
    ) {

      bot.hp -=
        7 * dt;

    }


    if (bot.hp <= 0) {

      bot.dead = true;

    }

  }


  // ======================================
  // BULLETS
  // ======================================

  for (const bullet of bullets) {

    bullet.x +=
      bullet.vx * dt;

    bullet.y +=
      bullet.vy * dt;

    bullet.life -= dt;


    // Outside map

    if (
      bullet.x < 0 ||
      bullet.y < 0 ||
      bullet.x > world.width ||
      bullet.y > world.height
    ) {

      bullet.life = 0;

    }


    // ------------------------------------
    // Player bullets hit bots
    // ------------------------------------

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


          if (bot.hp <= 0) {

            bot.dead = true;

            player.kills++;


            // Drop loot

            if (
              Math.random() < 0.7
            ) {

              loot.push({

                x: bot.x,
                y: bot.y,

                type:
                  Math.random() < 0.7
                    ? "ammo"
                    : "med"

              });

            }

          }

          break;

        }

      }

    }


    // ------------------------------------
    // Enemy bullets hit player
    // ------------------------------------

    else if (
      bullet.owner === "bot"
    ) {

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

      }

    }

  }


  bullets =
    bullets.filter(
      bullet =>
        bullet.life > 0
    );


  // ======================================
  // PICKUPS
  // ======================================

  for (const item of loot) {

    if (
      distance(
        item,
        player
      ) < 30
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


  // ======================================
  // HUD
  // ======================================

  const alive =
    bots.filter(
      bot =>
        !bot.dead
    ).length +
    (
      player.dead
        ? 0
        : 1
    );


  document.getElementById(
    "hp"
  ).textContent =
    Math.max(
      0,
      Math.ceil(player.hp)
    );


  document.getElementById(
    "ammo"
  ).textContent =
    player.ammo;


  document.getElementById(
    "alive"
  ).textContent =
    alive;


  document.getElementById(
    "zone"
  ).textContent =
    Math.ceil(
      (
        zone.radius /
        zone.startRadius
      ) * 100
    );


  const message =
    document.getElementById(
      "message"
    );


  if (playerOutside > 0) {

    message.textContent =
      "⚠ OUTSIDE SAFE ZONE!";

  }

  else {

    message.textContent = "";

  }


  // ======================================
  // DEATH
  // ======================================

  if (player.hp <= 0) {

    finishGame(false);

    return;

  }


  // ======================================
  // VICTORY
  // ======================================

  if (alive === 1) {

    finishGame(true);

  }

}


// ========================================
// DRAW GAME
// ========================================

function draw() {

  ctx.clearRect(
    0,
    0,
    W,
    H
  );


  ctx.save();


  ctx.translate(
    -camera.x,
    -camera.y
  );


  // ======================================
  // GROUND
  // ======================================

  ctx.fillStyle = "#304c35";

  ctx.fillRect(
    0,
    0,
    world.width,
    world.height
  );


  // ======================================
  // MAP GRID
  // ======================================

  ctx.strokeStyle =
    "#ffffff0b";

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


  // ======================================
  // TREES / ROCKS
  // ======================================

  for (
    let i = 0;
    i < 75;
    i++
  ) {

    const x =
      (i * 397) %
      world.width;

    const y =
      (i * 673) %
      world.height;


    ctx.fillStyle =
      "#1c3522";


    ctx.beginPath();

    ctx.arc(
      x,
      y,
      18 + (i % 12),
      0,
      Math.PI * 2
    );

    ctx.fill();

  }


  // ======================================
  // OUTSIDE SAFE ZONE
  // ======================================

  ctx.save();


  ctx.fillStyle =
    "#182032aa";


  ctx.fillRect(
    0,
    0,
    world.width,
    world.height
  );


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

  ctx.fill();


  ctx.restore();


  // ======================================
  // SAFE ZONE BORDER
  // ======================================

  ctx.strokeStyle =
    "#7fe7ff";

  ctx.lineWidth = 5;


  ctx.beginPath();

  ctx.arc(
    zone.x,
    zone.y,
    zone.radius,
    0,
    Math.PI * 2
  );

  ctx.stroke();


  // ======================================
  // LOOT
  // ======================================

  for (const item of loot) {

    ctx.fillStyle =
      item.type === "ammo"
        ? "#f4c542"
        : "#66e08a";


    ctx.fillRect(
      item.x - 8,
      item.y - 8,
      16,
      16
    );


    ctx.fillStyle =
      "#111";


    ctx.font =
      "12px sans-serif";


    ctx.fillText(

      item.type === "ammo"
        ? "A"
        : "+",

      item.x - 4,
      item.y + 4

    );

  }


  // ======================================
  // BULLETS
  // ======================================

  for (const bullet of bullets) {

    ctx.fillStyle =
      bullet.owner === "player"
        ? "#ffe58a"
        : "#ff7878";


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


  // ======================================
  // ENEMIES
  // ======================================

  for (const bot of bots) {

    if (!bot.dead) {

      drawCharacter(
        bot,
        false
      );

    }

  }


  // ======================================
  // PLAYER
  // ======================================

  if (!player.dead) {

    drawCharacter(
      player,
      true
    );

  }


  ctx.restore();

}


// ========================================
// DRAW CHARACTER
// ========================================

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


  // Body

  ctx.fillStyle =
    isPlayer
      ? "#42a5f5"
      : "#e05a5a";


  ctx.beginPath();

  ctx.arc(
    0,
    0,
    character.radius,
    0,
    Math.PI * 2
  );

  ctx.fill();


  // Weapon

  ctx.fillStyle =
    "#20262b";


  ctx.fillRect(
    4,
    -5,
    25,
    10
  );


  ctx.restore();


  // ======================================
  // HEALTH BAR
  // ======================================

  ctx.fillStyle =
    "#0008";


  ctx.fillRect(
    character.x - 22,
    character.y -
      character.radius -
      12,
    44,
    5
  );


  ctx.fillStyle =
    isPlayer
      ? "#55e58b"
      : "#ef6464";


  ctx.fillRect(

    character.x - 22,

    character.y -
      character.radius -
      12,

    44 *
      Math.max(
        0,
        character.hp /
          character.maxHp
      ),

    5

  );

}


// ========================================
// GAME END
// ========================================

function finishGame(
  victory
) {

  running = false;


  document
    .getElementById("hud")
    .classList.add("hidden");


  document
    .getElementById("end")
    .classList.remove("hidden");


  const title =
    document.getElementById(
      "endTitle"
    );


  const text =
    document.getElementById(
      "endText"
    );


  if (victory) {

    title.textContent =
      "🏆 VICTORY!";


    text.textContent =
      "You survived the zone with " +
      player.kills +
      " eliminations.";

  }

  else {

    title.textContent =
      "💀 ELIMINATED";


    text.textContent =
      "You scored " +
      player.kills +
      " eliminations. Try again!";

  }

}


// ========================================
// BUTTONS
// ========================================

document
  .getElementById("startBtn")
  .addEventListener(
    "click",
    resetGame
  );


document
  .getElementById("againBtn")
  .addEventListener(
    "click",
    resetGame
  );


// ========================================
// MOBILE JOYSTICK
// ========================================

const stick =
  document.getElementById(
    "stick"
  );


const knob =
  document.getElementById(
    "knob"
  );


let stickPointerId = null;


function moveJoystick(e) {

  const rect =
    stick.getBoundingClientRect();


  let x =
    e.clientX -
    (
      rect.left +
      rect.width / 2
    );


  let y =
    e.clientY -
    (
      rect.top +
      rect.height / 2
    );


  const maxDistance = 48;


  const currentDistance =
    Math.hypot(
      x,
      y
    );


  if (
    currentDistance >
    maxDistance
  ) {

    const angle =
      Math.atan2(y, x);


    x =
      Math.cos(angle) *
      maxDistance;


    y =
      Math.sin(angle) *
      maxDistance;

  }


  touchMove.x =
    x / maxDistance;


  touchMove.y =
    y / maxDistance;


  knob.style.transform =
    `translate(${x}px, ${y}px)`;
}


// Start joystick

stick.addEventListener(
  "pointerdown",
  function (e) {

    stickPointerId =
      e.pointerId;

    stick.setPointerCapture(
      stickPointerId
    );

    moveJoystick(e);

  }
);


// Move joystick

stick.addEventListener(
  "pointermove",
  function (e) {

    if (
      e.pointerId ===
      stickPointerId
    ) {

      moveJoystick(e);

    }

  }
);


// Release joystick

stick.addEventListener(
  "pointerup",
  function () {

    stickPointerId =
      null;

    touchMove.x = 0;
    touchMove.y = 0;

    knob.style.transform =
      "translate(0, 0)";

  }
);


stick.addEventListener(
  "pointercancel",
  function () {

    stickPointerId =
      null;

    touchMove.x = 0;
    touchMove.y = 0;

    knob.style.transform =
      "translate(0, 0)";

  }
);


// ========================================
// MOBILE RELOAD
// ========================================

document
  .getElementById("reload")
  .addEventListener(
    "click",
    reload
  );


// ========================================
// MOBILE SHOOTING
// ========================================

canvas.addEventListener(
  "touchstart",
  function (e) {
    if (e.touches.length > 0) {
      const touch = e.touches[0];

      mouse.x = touch.clientX;
      mouse.y = touch.clientY;
      mouse.down = true;
    }
  },
  {
    passive: true
  }
);


canvas.addEventListener(
  "touchmove",
  function (e) {
    if (e.touches.length > 0) {
      const touch = e.touches[0];

      mouse.x = touch.clientX;
      mouse.y = touch.clientY;
    }
  },
  {
    passive: true
  }
);


canvas.addEventListener(
  "touchend",
  function () {
    mouse.down = false;
  }
);


canvas.addEventListener(
  "touchcancel",
  function () {
    mouse.down = false;
  }
);


// ========================================
// GAME LOOP
// ========================================

function gameLoop(timestamp) {
  const deltaTime =
    Math.min(
      0.033,
      (timestamp - lastTime) / 1000 || 0
    );

  lastTime = timestamp;

  if (running) {
    update(deltaTime);
  }

  draw();

  requestAnimationFrame(gameLoop);
}


requestAnimationFrame(gameLoop);
