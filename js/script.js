"use strict";

window.addEventListener("load", function () {
  /** @type {HTMLCanvasElement} */
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  const windowInnerWidth = window.innerWidth;
  const windowInnerHeight = window.innerHeight;

  const CANVAS_HIGHT = (canvas.height =
    windowInnerHeight >= 1000 ? 1000 : windowInnerHeight);
  const CANVAS_WIDTH = (canvas.width = Math.min(
    CANVAS_HIGHT / 2,
    windowInnerWidth
  ));

  const DEFAULT_SPEED = 5;

  const images = {
    players: {
      player1: this.document.getElementById("player1"),
      player2: this.document.getElementById("player2"),
      player3: this.document.getElementById("player3"),
      player4: this.document.getElementById("player4"),
      player5: this.document.getElementById("player5"),
      player6: this.document.getElementById("player6"),
      player7: this.document.getElementById("player7"),
      player8: this.document.getElementById("player8"),
      player9: this.document.getElementById("player9"),
    },
    enemies: {
      enemy1: this.document.getElementById("enemy1"),
    },
    targets: {
      target1: this.document.getElementById("target1"),
    },
  };

  const setDimensions = (id) => {
    const el = document.querySelector(id);
    el.style.width = `${CANVAS_WIDTH}px`;
    el.style.height = `${CANVAS_HIGHT}px`;
  };

  setDimensions("#preview");
  setDimensions("#game-over");

  const calcFps = (t1, t2) => {
    const dt = t2 - t1;
    return Math.floor(1000 / dt);
  };

  const getCurrentSpeed = (fps) => {
    return DEFAULT_SPEED * (60 / fps);
  };

  function toggleScreen(id, toggle) {
    let element = document.getElementById(id);
    let display = toggle ? "block" : "none";
    element.style.display = display;
  }

  for (let el in images.players) {
    images.players[el].addEventListener("click", function (evt) {
      const iconPlayer = images.players[evt.target.id];
      toggleScreen("preview", false);
      toggleScreen("canvas", true);
      game.start(iconPlayer);
    });
  }

  const buttonShare = document.querySelector("#btn-share");
  buttonShare.addEventListener("click", (evt) => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => console.log("copied"))
      .catch(() => console.log("Error while copy"));
  });

  const buttonRestart = document.querySelector("#btn-restart");
  buttonRestart.addEventListener("click", (evt) => {
    toggleScreen("game-over", false);
    toggleScreen("canvas", true);
    game.restart();
  });

  const buttonPreview = document.querySelector("#btn-preview");
  buttonPreview.addEventListener("click", (evt) => {
    game.input = null;
    game.controlField = null;
    game.player = null;
    game.dropState();
    toggleScreen("game-over", false);
    toggleScreen("preview", true);
  });

  function getTanDeg(deg) {
    var rad = (deg * Math.PI) / 180;
    return Math.tan(rad);
  }

  function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //Максимум и минимум включаются
  }

  function drawText(data, context) {
    const obj = data;

    context.font = obj.fontSize + "px " + obj.fontFamily;
    context.textAlign = "center";
    context.fillStyle = obj.colorShadow;
    context.fillText(obj.text, obj.x + obj.dx, obj.y + obj.dy);
    context.fillStyle = obj.colorFill;
    context.fillText(obj.text, obj.x, obj.y);
  }

  class InputHandler {
    constructor() {
      this.keys = [];
      this.dx = 0;
      this.touchX = [];
      window.addEventListener("keydown", (e) => {
        if (
          (e.key === "ArrowLeft" || e.key === "ArrowRight") &&
          this.keys.indexOf(e.key) === -1
        ) {
          this.keys.push(e.key);
        } else if (e.key === "Enter" && !game.isAction) {
          toggleScreen("game-over", false);
          toggleScreen("canvas", true);
          game.restart();
        }
      });
      window.addEventListener("keyup", (e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          this.keys.splice(this.keys.indexOf(e.key), 1);
        }
      });
      window.addEventListener("touchstart", (e) => {
        this.touchX = e.changedTouches[0].pageX;
      });
      window.addEventListener("touchmove", (e) => {
        const swipeX = e.changedTouches[0].pageX;
        const dx = this.touchX - swipeX;
        this.dx = dx;
        this.touchX = swipeX;
      });
      window.addEventListener("touchend", (e) => {
        this.dx = 0;
      });
    }
  }

  class ControlField {
    constructor(gameWidth, gameHight) {
      this.gameWidth = gameWidth;
      this.gameHight = gameHight;
      this.padding = this.gameWidth / 10;
      this.width = this.gameWidth - 2 * this.padding;
      this.height = this.gameWidth / 10;
      this.x1 = this.padding;
      this.y1 = this.gameHight / 2;
      this.x2 = this.gameWidth - this.padding;
      this.y2 = this.gameHight / 2;
      this.color = "#679585";
    }
    draw(ctx) {
      ctx.lineWidth = this.height;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(this.x1, this.y1);
      ctx.lineTo(this.x2, this.y2);
      ctx.stroke();
      ctx.strokeStyle = this.color;
    }
  }

  class Score {
    constructor(gameWidth, gameHight, result) {
      this.gameWidth = gameWidth;
      this.gameHight = gameHight;
      this.score = result;
      this.fontFamily = "PokemonMonk";
      this.colorFill = "#FFCB05";
      this.colorBorder = "#3D7DCA";
      this.colorShadow = "#003A70";
      this.dx = -3;
      this.dy = 3;
    }
    draw(context, fontSize) {
      const data = {
        text: this.score,
        x: this.gameWidth / 2,
        y: this.gameHight - fontSize * 0.7,
        dx: this.dx,
        dy: this.dy,
        fontFamily: this.fontFamily,
        fontSize: fontSize,
        colorFill: this.colorFill,
        colorShadow: this.colorShadow,
      };
      drawText(data, context);
    }
    update() {
      this.score += 1;
    }
  }

  class Player {
    constructor(fieldWidth, fieldHight, fieldX, fieldY, image) {
      this.fieldWidth = fieldWidth;
      this.fieldHight = fieldHight;
      this.fieldX = fieldX;
      this.fieldY = fieldY;
      this.height = this.fieldHight;
      this.width = this.height;
      this.x = this.fieldX + this.fieldWidth / 2 - this.width / 2;
      this.y = this.fieldY - this.height / 2;
      this.image = image;
      this.speed = 0;
    }
    draw(context) {
      context.drawImage(this.image, this.x, this.y, this.width, this.height);
    }
    update(input, targets, enemies, score) {
      // controls
      this.x += this.speed;
      if (input.keys.indexOf("ArrowRight") > -1) {
        this.speed = 12;
      } else if (input.keys.indexOf("ArrowLeft") > -1) {
        this.speed = -12;
      } else if (input.dx !== 0) {
        this.speed = -input.dx * 2;
        input.dx = 0;
      } else {
        this.speed = 0;
      }
      if (this.x < this.fieldX - this.width / 2) {
        this.x = this.fieldX - this.width / 2;
      }
      if (this.x > this.fieldX + this.fieldWidth - this.width / 2) {
        this.x = this.fieldX + this.fieldWidth - this.width / 2;
      }
      // collision detection with targets
      targets.forEach((target) => {
        const dx = target.x + target.width / 2 - (this.x + this.width / 2);
        const dy = target.y + target.height / 2 - (this.y + this.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (!target.isFree && distance < target.width / 2 + this.width / 2) {
          target.reset();
          score.update();
        }
      });
      // collision detection with enemies
      enemies.forEach((enemy) => {
        const dx = enemy.x + enemy.width / 2 - (this.x + this.width / 2);
        const dy = enemy.y + enemy.height / 2 - (this.y + this.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (!enemy.isFree && distance < enemy.width / 2 + this.width / 2 - 10) {
          game.stopGame();
        }
      });
    }
    restart() {
      this.x = this.fieldX + this.fieldWidth / 2 - this.width / 2;
      this.y = this.fieldY - this.height / 2;
    }
  }

  class Target {
    constructor(gameWidth, gameHight, image) {
      this.gameWidth = gameWidth;
      this.gameHight = gameHight;
      this.width = this.gameWidth / 10;
      this.height = this.width;
      this.image = image;
      this.x = getRandomIntInclusive(0, this.gameWidth - this.width);
      this.y = -this.height;
      this.speed = DEFAULT_SPEED;
      this.route = this.x > this.gameWidth / 2 ? 1 : -1;
      this.deg =
        this.route < 0
          ? getRandomIntInclusive(100, 135)
          : getRandomIntInclusive(55, 80);
      this.dy = this.speed;
      this.dx = (this.route * this.dy) / getTanDeg(this.deg);

      this.isFree = true;
    }
    draw(context) {
      if (!this.isFree) {
        context.drawImage(this.image, this.x, this.y, this.width, this.height);
      }
    }
    update(fps) {
      if (!this.isFree) {
        this.x += this.route > 0 ? -this.dx : this.dx;
        this.y += getCurrentSpeed(fps);
        if (this.x > this.gameWidth - this.width || this.x < 0) {
          this.dx = -this.dx;
        }
        if (this.y > (this.gameHight * 2) / 3) {
          this.reset();
        }
      }
    }
    reset() {
      this.isFree = true;
    }
    start() {
      this.isFree = false;
      this.x = getRandomIntInclusive(0, this.gameWidth - this.width);
      this.y = -this.height;
    }
  }

  class Enemy {
    constructor(gameWidth, gameHight, image) {
      this.gameWidth = gameWidth;
      this.gameHight = gameHight;
      this.width = this.gameWidth / 10;
      this.height = this.width;
      this.image = image;
      this.x = getRandomIntInclusive(0, this.gameWidth - this.width);
      this.y = -this.height;
      this.speed = Math.random() * 2 + DEFAULT_SPEED;
      this.route = this.x > this.gameWidth / 2 ? 1 : -1;
      this.deg =
        this.route < 0
          ? getRandomIntInclusive(100, 135)
          : getRandomIntInclusive(55, 80);
      this.dy = this.speed;
      this.dx = (this.route * this.dy) / getTanDeg(this.deg);

      this.isFree = true;
    }
    draw(context) {
      if (!this.isFree) {
        context.drawImage(this.image, this.x, this.y, this.width, this.height);
      }
    }
    update(fps) {
      if (!this.free) {
        this.x += this.route > 0 ? -this.dx : this.dx;
        this.y += getCurrentSpeed(fps);
        if (this.x > this.gameWidth - this.width || this.x < 0) {
          this.dx = -this.dx;
        }
        if (this.y > (this.gameHight * 2) / 3) {
          this.reset();
        }
      }
    }
    reset() {
      this.isFree = true;
    }
    start() {
      this.isFree = false;
      this.x = getRandomIntInclusive(0, this.gameWidth - this.width);
      this.y = -this.height;
    }
  }

  class Game {
    constructor(gameWidth, gameHight, context) {
      this.gameWidth = gameWidth;
      this.gameHight = gameHight;
      this.context = context;

      this.enemiesPool = [];
      this.maxEnemies = 4;
      this.enemiesTimer = 0;
      this.enemiesInterval = 100;
      this.randomEnemyInterval = Math.random() * 100 + 300;
      this.createEnemiesPool();

      this.targetsPool = [];
      this.maxTargets = 4;
      this.targetsTimer = 0;
      this.targetsInterval = 800;
      this.randomTargetInterval = Math.random() * 300 + 500;
      this.createTargetsPool();

      this.score = new Score(this.gameWidth, this.gameHight, 0);
      this.lastTime = 0;

      this.controlField = null;
      this.player = null;
      this.input = null;

      this.isAction = false;
    }
    draw(context) {
      context.clearRect(0, 0, this.gameWidth, this.gameHight);

      this.controlField.draw(context);
      this.score.draw(context, this.gameWidth * 0.4);
      this.player.draw(context);
      this.targetsPool.forEach((target) => {
        target.draw(context);
      });
      this.enemiesPool.forEach((enemy) => {
        enemy.draw(context);
      });
    }
    update(input, fps) {
      this.targetsPool.forEach((target) => {
        target.update(fps);
      });
      this.enemiesPool.forEach((enemy) => {
        enemy.update(fps);
      });
      this.player.update(input, this.targetsPool, this.enemiesPool, this.score);
    }
    createEnemiesPool() {
      for (let i = 0; i < this.maxEnemies; i++) {
        const enemy = new Enemy(
          this.gameWidth,
          this.gameHight,
          images.enemies.enemy1
        );
        this.enemiesPool.push(enemy);
      }
    }
    createTargetsPool() {
      for (let i = 0; i < this.maxTargets; i++) {
        const target = new Target(
          this.gameWidth,
          this.gameHight,
          images.targets.target1
        );
        this.targetsPool.push(target);
      }
    }
    getEnemy() {
      for (let i = 0; i < this.enemiesPool.length; i++) {
        if (this.enemiesPool[i].isFree) {
          return this.enemiesPool[i];
        }
      }
    }
    getTarget() {
      for (let i = 0; i < this.targetsPool.length; i++) {
        if (this.targetsPool[i].isFree) {
          return this.targetsPool[i];
        }
      }
    }
    renderTarget(deltaTime) {
      // create targets periodically
      if (
        this.targetsTimer >
        this.targetsInterval + this.randomTargetInterval
      ) {
        const target = this.getTarget();
        if (target) target.start();
        this.targetsTimer = 0;
      } else {
        this.targetsTimer += deltaTime;
      }
    }
    renderEnemy(deltaTime) {
      // create enemies periodically
      if (this.enemiesTimer > this.enemiesInterval + this.randomEnemyInterval) {
        const enemy = this.getEnemy();
        if (enemy) enemy.start();
        this.enemiesTimer = 0;
      } else {
        this.enemiesTimer += deltaTime;
      }
    }
    start(iconPlayer) {
      this.activateAction();
      this.input = new InputHandler();
      this.controlField = new ControlField(this.gameWidth, this.gameHight);
      this.player = new Player(
        this.controlField.width,
        this.controlField.height,
        this.controlField.x1,
        this.controlField.y1,
        iconPlayer
      );

      this.loop(0);
    }
    loop(timeStamp) {
      const fps = calcFps(this.lastTime, timeStamp);
      const deltaTime = timeStamp - this.lastTime;
      this.lastTime = timeStamp;

      this.renderEnemy(deltaTime);
      this.renderTarget(deltaTime);

      this.update(this.input, fps);
      this.draw(this.context);

      if (this.isAction) {
        requestAnimationFrame(this.loop.bind(this));
      }
    }
    dropState() {
      this.activateAction();
      this.lastTime = 0;
      this.enemiesTimer = 0;
      this.targetsTimer = 0;
      this.enemiesPool.forEach((enemy) => {
        enemy.start();
        enemy.reset();
      });
      this.targetsPool.forEach((target) => {
        target.start();
        target.reset();
      });
      this.score.score = 0;
    }
    restart() {
      this.dropState();

      this.loop(0);
    }
    activateAction() {
      this.isAction = true;
    }
    deactivateAction() {
      this.isAction = false;
    }
    stopGame() {
      this.deactivateAction();
      this.player.restart();
      const scoreEl = document.querySelector("#score");
      scoreEl.innerText = this.score.score;

      toggleScreen("canvas", false);
      toggleScreen("game-over", true);
    }
  }

  const game = new Game(CANVAS_WIDTH, CANVAS_HIGHT, ctx);
});
