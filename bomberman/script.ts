interface Sprite {
  x: number;
  y: number;
}

interface CharacterConfig {
  imageSrc: string;
  down: Sprite[];
  right: Sprite[];
  up: Sprite[];
  left: Sprite[];
  death: Sprite[];
}

class Character {
  image: HTMLImageElement;
  animations: {
    down: Sprite[];
    right: Sprite[];
    up: Sprite[];
    left: Sprite[];
    death: Sprite[];
  };

  constructor(config: CharacterConfig) {
    this.image = new Image();
    this.image.src = config.imageSrc;
    this.animations = {
      down: config.down,
      right: config.right,
      up: config.up,
      left: config.left,
      death: config.death
    };
  }
}

class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  SPRITE_SIZE: number;
  SCALE: number;
  SCALED_SIZE: number;
  MOVEMENT_SPEED: number;
  ANIMATION_SPEED: number;
  characters: Character[];
  currentCharacterIndex: number;
  player: Player;

  constructor(canvasId: string, charactersConfig: CharacterConfig[]) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    this.SPRITE_SIZE = 16;
    this.SCALE = 2;
    this.SCALED_SIZE = this.SPRITE_SIZE * this.SCALE;
    this.MOVEMENT_SPEED = 2; // Velocidade de movimento em pixels por frame
    this.ANIMATION_SPEED = 100; // Tempo em milissegundos por frame de animação

    this.characters = charactersConfig.map(config => new Character(config));
    this.currentCharacterIndex = 0;
    this.player = new Player(
      this.canvas.width / 2 - this.SCALED_SIZE / 2,
      this.canvas.height / 2 - this.SCALED_SIZE / 2,
      this.SCALED_SIZE
    );

    document.addEventListener('keydown', (event) => this.handleKey(event, true));
    document.addEventListener('keyup', (event) => this.handleKey(event, false));
    document.getElementById('characterSelect')?.addEventListener('change', (event) => this.selectCharacter(event));
    document.getElementById('deathTest')?.addEventListener('click', () => this.testDeath());

    this.characters[0].image.onload = () => {
      this.gameLoop();
    };
  }

  selectCharacter(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.currentCharacterIndex = parseInt(target.value);
  }

  handleKey(event: KeyboardEvent, isKeyDown: boolean): void {
    this.player.setDirection(event.key, isKeyDown);
  }

  testDeath(): void {
    this.player.setDeathState(true);
  }

  update(timestamp: number): void {
    this.player.updatePosition(this.MOVEMENT_SPEED);
    const currentAnimations = this.player.isDead
      ? this.characters[this.currentCharacterIndex].animations.death
      : this.characters[this.currentCharacterIndex].animations[this.player.direction];
    this.player.updateAnimation(currentAnimations, this.ANIMATION_SPEED, timestamp);
  }

  draw(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const character = this.characters[this.currentCharacterIndex];
    const currentAnimations = this.player.isDead
      ? character.animations.death
      : character.animations[this.player.direction];
    const sprite = currentAnimations[this.player.frameIndex];

    if (sprite) {
      if (this.player.direction === 'left' && !this.player.isDead) {
        this.ctx.save();
        this.ctx.scale(-1, 1); // Inverte a imagem horizontalmente
        this.ctx.drawImage(
          character.image,
          sprite.x, sprite.y, this.SPRITE_SIZE, this.SPRITE_SIZE,
          -this.player.x - this.SCALED_SIZE, this.player.y, this.SCALED_SIZE, this.SCALED_SIZE
        );
        this.ctx.restore();
      } else {
        this.ctx.drawImage(
          character.image,
          sprite.x, sprite.y, this.SPRITE_SIZE, this.SPRITE_SIZE,
          this.player.x, this.player.y, this.SCALED_SIZE, this.SCALED_SIZE
        );
      }
    }
  }

  gameLoop(timestamp: number = 0): void {
    this.update(timestamp);
    this.draw();
    requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
  }
}

class Player {
  x: number;
  y: number;
  direction: 'down' | 'right' | 'up' | 'left';
  frameIndex: number;
  isMoving: boolean;
  lastFrameTime: number;
  scaledSize: number;
  isDead: boolean;

  constructor(x: number, y: number, scaledSize: number) {
    this.x = x;
    this.y = y;
    this.direction = 'down';
    this.frameIndex = 0;
    this.isMoving = false;
    this.lastFrameTime = 0; // Armazena o tempo do último frame de animação
    this.scaledSize = scaledSize;
    this.isDead = false;
  }

  setDirection(key: string, isKeyDown: boolean): void {
    if (this.isDead) return;

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

  setDeathState(isDead: boolean): void {
    this.isDead = isDead;
    this.frameIndex = 0;
  }

  updatePosition(movementSpeed: number): void {
    if (this.isMoving && !this.isDead) {
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

  updateAnimation(animations: Sprite[], animationSpeed: number, timestamp: number): void {
    if (this.isMoving || this.isDead) {
      if (timestamp - this.lastFrameTime > animationSpeed) {
        this.frameIndex = (this.frameIndex + 1) % animations.length;
        this.lastFrameTime = timestamp;

        if (this.isDead && this.frameIndex === animations.length - 1) {
          this.isDead = false;
          this.frameIndex = 0;
        }
      }
    } else {
      this.frameIndex = 0;
    }
  }
}

const charactersConfig: CharacterConfig[] = [
  {
    imageSrc: 'assets/bomberman.png',
    down: [{ x: 4, y: 11 }, { x: 21, y: 11 }, { x: 38, y: 11 }],
    right: [{ x: 54, y: 11 }, { x: 70, y: 11 }, { x: 85, y: 11 }],
    up: [{ x: 100, y: 11 }, { x: 117, y: 11 }, { x: 133, y: 11 }],
    left: [{ x: 54, y: 11 }, { x: 70, y: 11 }, { x: 85, y: 11 }],
    death: [
      { x: 4, y: 28 },
      { x: 21, y: 28 },
      { x: 38, y: 28 },
      { x: 55, y: 28 },
      { x: 72, y: 28 },
      { x: 89, y: 28 },
      { x: 106, y: 28 },
      { x: 123, y: 28 },
    ]
  },
  {
    imageSrc: 'assets/character2.png',
    down: [{ x: 4, y: 62 }, { x: 21, y: 62 }, { x: 38, y: 62 }],
    right: [{ x: 54, y: 62 }, { x: 70, y: 62 }, { x: 85, y: 62 }],
    up: [{ x: 100, y: 62 }, { x: 117, y: 62 }, { x: 133, y: 62 }],
    left: [{ x: 54, y: 62 }, { x: 70, y: 62 }, { x: 85, y: 62 }],
    death: [{ x: 150, y: 62 }, { x: 167, y: 62 }, { x: 184, y: 62 }]
  },
  // Adicione mais personagens aqui
];

// Inicializar o jogo
new Game('gameCanvas', charactersConfig);
