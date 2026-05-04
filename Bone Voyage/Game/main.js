"use strict";

const ZONE_PREFIX = "Game/zone";
const ZONE_SUFFIX = ".json";

let selectedSprite = "original sprite/Normal.png";

window.addEventListener("DOMContentLoaded", () => {

  const modeButtons = document.querySelectorAll(".mode-btn");
  const startButton = document.getElementById("start-game-btn");

  modeButtons.forEach(button => {
    button.addEventListener("click", function () {

      modeButtons.forEach(btn => btn.classList.remove("selected"));
      this.classList.add("selected");

      selectedSprite = this.dataset.sprite;
    });
  });

  startButton.onclick = function () {
    document.getElementById("start-menu").style.display = "none";

    setTimeout(() => {
      startGame();
    }, 50);
  };
});

function startGame() {

  const AssetsManager = function () {
    this.tile_set_image = undefined;
  };

  AssetsManager.prototype = {

    constructor: AssetsManager,

    requestJSON: function (url, callback) {
      let request = new XMLHttpRequest();

      request.addEventListener("load", function () {
        callback(JSON.parse(this.responseText));
      }, { once: true });

      request.open("GET", url);
      request.send();
    },

    requestImage: function (url, callback) {
      let image = new Image();

      image.addEventListener("load", function () {
        callback(image);
      }, { once: true });

      image.src = url;
    }
  };

  let assets_manager = new AssetsManager();
  let controller = new Controller();
  let display = new Display(document.querySelector("canvas"));
  let game = new Game();
  let engine = new Engine(1000 / 30, render, update);

  let p = document.createElement("p");
  p.style = `
   color: black;
   font-size: 2em;
   position: fixed;
   top: 10px;
   left: 50%;
   transform: translateX(-50%);
   margin: 0;
   z-index: 9999;
   font-family: 'Press Start 2P', monospace;
   background: white;
   padding: 10px;
   border: 2px solid black;
   z-index: 100;
  `;
  p.innerHTML = "bones: 0";
  document.body.appendChild(p);

  function keyDownUp(event) {
    controller.keyDownUp(event.type, event.keyCode);
  }

  function resize() {
    display.resize(
      document.documentElement.clientWidth,
      document.documentElement.clientHeight,
      game.world.height / game.world.width
    );
    display.render();
  }

  function render() {

    let frame;

    display.drawMap(
      assets_manager.tile_set_image,
      game.world.tile_set.columns,
      game.world.graphical_map,
      game.world.columns,
      game.world.tile_set.tile_size
    );

    for (let i = game.world.bones.length - 1; i > -1; --i) {
      let bone = game.world.bones[i];
      frame = game.world.tile_set.frames[bone.frame_value];

      display.drawObject(
        assets_manager.tile_set_image,
        frame.x,
        frame.y,
        bone.x + Math.floor(bone.width * 0.5 - frame.width * 0.5) + frame.offset_x,
        bone.y + frame.offset_y,
        frame.width,
        frame.height
      );
    }

    frame = game.world.tile_set.frames[game.world.player.frame_value];

    display.drawObject(
      assets_manager.tile_set_image,
      frame.x,
      frame.y,
      game.world.player.x + Math.floor(game.world.player.width * 0.5 - frame.width * 0.5) + frame.offset_x,
      game.world.player.y + frame.offset_y,
      frame.width,
      frame.height
    );

    for (let i = game.world.grass.length - 1; i > -1; --i) {
      let grass = game.world.grass[i];
      frame = game.world.tile_set.frames[grass.frame_value];

      display.drawObject(
        assets_manager.tile_set_image,
        frame.x,
        frame.y,
        grass.x + frame.offset_x,
        grass.y + frame.offset_y,
        frame.width,
        frame.height
      );
    }

    p.innerHTML = "bones: " + game.world.bone_count;

    display.render();
  }

  function update() {

    if (controller.left.active) game.world.player.moveLeft();
    if (controller.right.active) game.world.player.moveRight();

    if (controller.up.active) {
      game.world.player.jump();
      controller.up.active = false;
    }

    game.update();

    if (game.world.bone_count >= 7) {
      engine.stop();
      showEndScreen("You Win!", "bones collected: " + game.world.bone_count, "Play Again");
      return;
    }

    if (
      game.world.zone_id === "04" &&
      game.world.bones.length === 0 &&
      game.world.bone_count < 7
    ) {
      engine.stop();
      showEndScreen(
        "You Lose!",
        "bones missed: " + (7 - game.world.bone_count),
        "Try Again"
      );
      return;
    }

    if (game.world.door) {
      engine.stop();

      assets_manager.requestJSON(
        ZONE_PREFIX + game.world.door.destination_zone + ZONE_SUFFIX,
        zone => {
          game.world.setup(zone);
          engine.start();
        }
      );
    }
  }

  function showEndScreen(title, text, buttonText) {

    let div = document.createElement("div");

    div.style = `
      position:fixed;
      top:50%;
      left:50%;
      transform:translate(-50%,-50%);
      background:white;
      color:black;
      padding:30px;
      text-align:center;
      font-family:'Press Start 2P', monospace;
      border:3px solid black;
      z-index:1000;
    `;

    div.innerHTML = `
      ${title}<br><br>
      ${text}<br><br>
      <button onclick="location.reload()">${buttonText}</button>
    `;

    document.body.appendChild(div);
  }

  display.buffer.canvas.height = game.world.height;
  display.buffer.canvas.width = game.world.width;
  display.buffer.imageSmoothingEnabled = false;

  assets_manager.requestJSON(
    ZONE_PREFIX + game.world.zone_id + ZONE_SUFFIX,
    zone => {

      game.world.setup(zone);

      assets_manager.requestImage(selectedSprite, image => {
        assets_manager.tile_set_image = image;

        resize();
        engine.start();
      });
    }
  );

  window.addEventListener("keydown", keyDownUp);
  window.addEventListener("keyup", keyDownUp);
  window.addEventListener("resize", resize);
}