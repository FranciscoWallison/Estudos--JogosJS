class Game {
  constructor(canvasId, spriteSheetSrc) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.spriteSheet = new Image();
    this.spriteSheet.src = spriteSheetSrc;

    this.SPRITE_SIZE = 16;
    this.SCALE = 2;
    this.SCALED_SIZE = this.SPRITE_SIZE * this.SCALE;
    this.MOVEMENT_SPEED = 2; // Velocidade de movimento em pixels por frame
    this.ANIMATION_SPEED = 100; // Tempo em milissegundos por frame de animação

    this.characters = this.initCharacters();
    this.currentCharacterIndex = 0;
    this.player = new Player(
      this.canvas.width / 2 - this.SCALED_SIZE / 2,
      this.canvas.height / 2 - this.SCALED_SIZE / 2,
      this.SCALED_SIZE
    );

    this.spriteSheet.onload = () => {
      this.gameLoop();
    };

    document.addEventListener('keydown', (event) => this.handleKey(event, true));
    document.addEventListener('keyup', (event) => this.handleKey(event, false));
    document.getElementById('characterSelect').addEventListener('change', (event) => this.selectCharacter(event));
  }

  initCharacters() {
    return [
      {
        down: [{ x: 4, y: 11 }, { x: 21, y: 11 }, { x: 38, y: 11 }],
        right: [{ x: 54, y: 11 }, { x: 70, y: 11 }, { x: 85, y: 11 }],
        up: [{ x: 100, y: 11 }, { x: 117, y: 11 }, { x: 133, y: 11 }],
        left: [{ x: 54, y: 11 }, { x: 70, y: 11 }, { x: 85, y: 11 }]
      },
      {
        down: [{ x: 4, y: 62 }, { x: 21, y: 62 }, { x: 38, y: 62 }],
        right: [{ x: 54, y: 62 }, { x: 70, y: 62 }, { x: 85, y: 62 }],
        up: [{ x: 100, y: 62 }, { x: 117, y: 62 }, { x: 133, y: 62 }],
        left: [{ x: 54, y: 62 }, { x: 70, y: 62 }, { x: 85, y: 62 }]
      },
      {
        down: [{ x: 4, y: 184 }, { x: 21, y: 184 }, { x: 38, y: 184 }],
        right: [{ x: 54, y: 184 }, { x: 70, y: 184 }, { x: 85, y: 184 }],
        up: [{ x: 100, y: 184 }, { x: 117, y: 184 }, { x: 133, y: 184 }],
        left: [{ x: 54, y: 184 }, { x: 70, y: 184 }, { x: 85, y: 184 }]
      },
      {
        down: [{ x: 4, y: 238 }, { x: 21, y: 238 }, { x: 38, y: 238 }],
        right: [{ x: 54, y: 238 }, { x: 70, y: 238 }, { x: 85, y: 238 }],
        up: [{ x: 100, y: 238 }, { x: 117, y: 238 }, { x: 133, y: 238 }],
        left: [{ x: 54, y: 238 }, { x: 70, y: 238 }, { x: 85, y: 238 }]
      },
      {
        down: [{ x: 4, y: 292 }, { x: 21, y: 292 }, { x: 38, y: 292 }],
        right: [{ x: 54, y: 292 }, { x: 70, y: 292 }, { x: 85, y: 292 }],
        up: [{ x: 100, y: 292 }, { x: 117, y: 292 }, { x: 133, y: 292 }],
        left: [{ x: 54, y: 292 }, { x: 70, y: 292 }, { x: 85, y: 292 }]
      },
      {
        down: [{ x: 4, y: 345 }, { x: 21, y: 345 }, { x: 38, y: 345 }],
        right: [{ x: 54, y: 345 }, { x: 70, y: 345 }, { x: 85, y: 345 }],
        up: [{ x: 100, y: 345 }, { x: 117, y: 345 }, { x: 133, y: 345 }],
        left: [{ x: 54, y: 345 }, { x: 70, y: 345 }, { x: 85, y: 345 }]
      },
      {
        down: [{ x: 4, y: 399 }, { x: 21, y: 399 }, { x: 38, y: 399 }],
        right: [{ x: 54, y: 399 }, { x: 70, y: 399 }, { x: 85, y: 399 }],
        up: [{ x: 100, y: 399 }, { x: 117, y: 399 }, { x: 133, y: 399 }],
        left: [{ x: 54, y: 399 }, { x: 70, y: 399 }, { x: 85, y: 399 }]
      }
    ];
  }

  selectCharacter(event) {
    this.currentCharacterIndex = parseInt(event.target.value);
  }

  handleKey(event, isKeyDown) {
    this.player.setDirection(event.key, isKeyDown);
  }

  update(timestamp) {
    this.player.updatePosition(this.MOVEMENT_SPEED);
    this.player.updateAnimation(this.characters[this.currentCharacterIndex], this.ANIMATION_SPEED, timestamp);
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const sprite = this.characters[this.currentCharacterIndex][this.player.direction][this.player.frameIndex];
    
    if (this.player.direction === 'left') {
      this.ctx.save();
      this.ctx.scale(-1, 1); // Inverte a imagem horizontalmente
      this.ctx.drawImage(
        this.spriteSheet,
        sprite.x, sprite.y, this.SPRITE_SIZE, this.SPRITE_SIZE,
        -this.player.x - this.SCALED_SIZE, this.player.y, this.SCALED_SIZE, this.SCALED_SIZE
      );
      this.ctx.restore();
    } else {
      this.ctx.drawImage(
        this.spriteSheet,
        sprite.x, sprite.y, this.SPRITE_SIZE, this.SPRITE_SIZE,
        this.player.x, this.player.y, this.SCALED_SIZE, this.SCALED_SIZE
      );
    }
  }

  gameLoop(timestamp = 0) {
    this.update(timestamp);
    this.draw();
    requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
  }
}

class Player {
  constructor(x, y, scaledSize) {
    this.x = x;
    this.y = y;
    this.direction = 'down';
    this.frameIndex = 0;
    this.isMoving = false;
    this.lastFrameTime = 0; // Armazena o tempo do último frame de animação
    this.scaledSize = scaledSize;
  }

  setDirection(key, isKeyDown) {
    switch (key) {
      case 'ArrowDown':
      case 's':
        this.direction = 'down';
        this.isMoving = isKeyDown;
        break;
      case 'ArrowRight':
      case 'd':
        this.direction = 'right';
        this.isMoving = isKeyDown;
        break;
      case 'ArrowUp':
      case 'w':
        this.direction = 'up';
        this.isMoving = isKeyDown;
        break;
      case 'ArrowLeft':
      case 'a':
        this.direction = 'left';
        this.isMoving = isKeyDown;
        break;
    }
  }

  updatePosition(movementSpeed) {
    if (this.isMoving) {
      switch (this.direction) {
        case 'down':
          this.y += movementSpeed;
          break;
        case 'right':
          this.x += movementSpeed;
          break;
        case 'up':
          this.y -= movementSpeed;
          break;
        case 'left':
          this.x -= movementSpeed;
          break;
      }
    }
  }

  updateAnimation(directions, animationSpeed, timestamp) {
    if (this.isMoving) {
      if (timestamp - this.lastFrameTime > animationSpeed) {
        this.frameIndex = (this.frameIndex + 1) % directions[this.direction].length;
        this.lastFrameTime = timestamp;
      }
    } else {
      this.frameIndex = 0;
    }
  }
}

// Inicializar o jogo
new Game('gameCanvas', 'assets/bomberman.png');
