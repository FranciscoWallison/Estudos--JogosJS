import { Character, CharacterConfig } from './character';
import { Player } from './player';
import { Enemy } from './enemy';
import { Bomb } from './bomb';
import { Block } from './block';

interface BombConfig {
  bomb: Sprite[];
  explosion: Sprite[];
  imageSrc: string;
}

interface MapConfig {
  width: number;
  height: number;
  backgroundImageSrc: string;
  tiles: { type: number, imageSrc: string, frames?: { x: number, y: number }[] }[];
  layout: number[][];
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
  blocks: Block[];
  currentCharacterIndex: number;
  player: Player;
  bombConfig: BombConfig | null = null;
  mapConfig: MapConfig;
  backgroundImage: HTMLImageElement;

  constructor(canvas: HTMLCanvasElement, charactersConfig: CharacterConfig[], bombConfig: BombConfig, mapConfig: MapConfig) {
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
    this.blocks = [];
    this.currentCharacterIndex = 0;
    this.player = new Player(
      this.canvas.width / 2 - this.SCALED_SIZE / 2,
      this.canvas.height / 2 - this.SCALED_SIZE / 2,
      this.SCALED_SIZE
    );
    this.bombConfig = bombConfig;
    this.mapConfig = mapConfig;

    this.backgroundImage = new Image();
    this.backgroundImage.src = this.mapConfig.backgroundImageSrc;

    this.spawnEnemies();
    this.loadMap();

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

  loadMap(): void {
    const { tiles, layout } = this.mapConfig;

    for (let y = 0; y < layout.length; y++) {
      for (let x = 0; x < layout[y].length; x++) {
        const tileType = layout[y][x];
        if (tileType > 0) {
          const tileConfig = tiles.find(tile => tile.type === tileType);
          if (tileConfig) {
            const block = new Block(x * this.SCALED_SIZE, y * this.SCALED_SIZE, this.SCALED_SIZE, this.SCALED_SIZE, tileConfig.imageSrc);
            if (tileConfig.frames) {
              block.frames = tileConfig.frames;
            }
            this.blocks.push(block);
          }
        }
      }
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
      this.bombConfig.imageSrc,
      this.SCALED_SIZE * 2 // Definindo um raio de explosão padrão
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

      if (bomb.isExploding) {
        // Verificar se o jogador está dentro da área de explosão
        if (bomb.isWithinExplosion(this.player.x, this.player.y)) {
          this.player.setDeathState(true);
        }

        // Verificar se os inimigos estão dentro da área de explosão
        for (const enemy of this.enemies) {
          if (bomb.isWithinExplosion(enemy.x, enemy.y)) {
            enemy.setDeathState(true);
          }
        }

        // Verificar se os blocos estão dentro da área de explosão
        this.blocks = this.blocks.filter(block => !bomb.isWithinExplosion(block.x, block.y));
      }

      if (bomb.isExplosionComplete(timestamp)) {
        this.bombs = this.bombs.filter(b => b !== bomb);
      }
    }
  }

  draw(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Desenhar o fundo
    this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);

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

    for (const block of this.blocks) {
      if (block.frames) {
        const frame = block.frames[0]; // Use a lógica necessária para alternar frames
        this.ctx.drawImage(
          block.image,
          frame.x, frame.y, this.SPRITE_SIZE, this.SPRITE_SIZE,
          block.x, block.y, block.width, block.height
        );
      } else {
        this.ctx.drawImage(
          block.image,
          0, 0, this.SPRITE_SIZE, this.SPRITE_SIZE,
          block.x, block.y, block.width, block.height
        );
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
