import { Character, CharacterConfig } from './character';
import { Player } from './player';
import { Enemy } from './enemy';
import { Bomb } from './bomb';

interface BombConfig {
  bomb: Sprite[];
  explosion: Sprite[];
  imageSrc: string;
}

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  SPRITE_SIZE: number;
  SCALE: number;
  SCALED_SIZE: number;
  MOVEMENT_SPEED: number;
  ANIMATION_SPEED: number;
  EXPLOSION_DURATION: number;
  characters: Character[];
  enemies: Enemy[];
  bombs: Bomb[];
  currentCharacterIndex: number;
  player: Player;
  bombConfig: BombConfig | null = null;

  constructor(canvas: HTMLCanvasElement, charactersConfig: CharacterConfig[], bombConfig: BombConfig) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    this.SPRITE_SIZE = 16;
    this.SCALE = 2;
    this.SCALED_SIZE = this.SPRITE_SIZE * this.SCALE;
    this.MOVEMENT_SPEED = 2;
    this.ANIMATION_SPEED = 100;
    this.EXPLOSION_DURATION = 500; // Duração da explosão em milissegundos

    this.characters = charactersConfig.map(config => new Character(config));
    this.enemies = [];
    this.bombs = [];
    this.currentCharacterIndex = 0;
    this.player = new Player(
      this.canvas.width / 2 - this.SCALED_SIZE / 2,
      this.canvas.height / 2 - this.SCALED_SIZE / 2,
      this.SCALED_SIZE
    );
    this.bombConfig = bombConfig;

    this.spawnEnemies();

    document.addEventListener('keydown', (event) => this.handleKey(event, true));
    document.addEventListener('keyup', (event) => this.handleKey(event, false));

    this.characters[0].image.onload = () => {
      this.gameLoop();
    };
  }

  spawnEnemies(): void {
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * this.canvas.width;
      const y = Math.random() * this.canvas.height;
      const enemy = new Enemy(x, y, this.SCALED_SIZE, this.MOVEMENT_SPEED, this.ANIMATION_SPEED);
      this.enemies.push(enemy);
    }
  }

  placeBomb(): void {
    if (!this.bombConfig) return;
    const bomb = new Bomb(
      this.player.x,
      this.player.y,
      this.SCALED_SIZE,
      this.ANIMATION_SPEED,
      this.EXPLOSION_DURATION,
      this.bombConfig.bomb,
      this.bombConfig.explosion,
      this.bombConfig.imageSrc
    );
    this.bombs.push(bomb);
    setTimeout(() => bomb.startExplosion(Date.now()), 2000); // A bomba explode após 2 segundos
  }

  handleKey(event: KeyboardEvent, isKeyDown: boolean): void {
    if (event.key === ' ') {
      if (isKeyDown) {
        this.placeBomb();
      }
    } else {
      this.player.setDirection(event.key, isKeyDown);
    }
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

    for (const enemy of this.enemies) {
      enemy.updatePosition();
      const enemyAnimations = enemy.isDead
        ? this.characters[this.currentCharacterIndex].animations.death
        : this.characters[this.currentCharacterIndex].animations[enemy.direction];
      enemy.updateAnimation(enemyAnimations, timestamp);
    }

    for (const bomb of this.bombs) {
      bomb.updateAnimation(timestamp);

      if (bomb.isExplosionComplete(timestamp)) {
        this.bombs = this.bombs.filter(b => b !== bomb);
      }
    }
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
        this.ctx.scale(-1, 1);
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

    for (const enemy of this.enemies) {
      const enemyAnimations = enemy.isDead
        ? character.animations.death
        : character.animations[enemy.direction];
      const enemySprite = enemyAnimations[enemy.frameIndex];

      if (enemySprite) {
        if (enemy.direction === 'left' && !enemy.isDead) {
          this.ctx.save();
          this.ctx.scale(-1, 1);
          this.ctx.drawImage(
            character.image,
            enemySprite.x, enemySprite.y, this.SPRITE_SIZE, this.SPRITE_SIZE,
            -enemy.x - this.SCALED_SIZE, enemy.y, this.SCALED_SIZE, this.SCALED_SIZE
          );
          this.ctx.restore();
        } else {
          this.ctx.drawImage(
            character.image,
            enemySprite.x, enemySprite.y, this.SPRITE_SIZE, this.SPRITE_SIZE,
            enemy.x, enemy.y, this.SCALED_SIZE, this.SCALED_SIZE
          );
        }
      }
    }

    for (const bomb of this.bombs) {
      const bombAnimations = bomb.isExploding
        ? bomb.explosionSprites
        : bomb.bombSprites;
      const bombSprite = bombAnimations[bomb.frameIndex];

      if (bombSprite) {
        this.ctx.drawImage(
          bomb.image,
          bombSprite.x, bombSprite.y, this.SPRITE_SIZE, this.SPRITE_SIZE,
          bomb.x, bomb.y, this.SCALED_SIZE, this.SCALED_SIZE
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
