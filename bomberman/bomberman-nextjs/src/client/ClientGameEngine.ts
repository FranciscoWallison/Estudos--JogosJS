import { GameState, PlayerState, Direction, TileType } from '../shared/types';
import { PlayerInput } from '../shared/protocol';
import {
  SCALED_SIZE, SPRITE_SIZE, SCALE, MAP_COLS, MAP_ROWS,
  MOVEMENT_SPEED, ANIMATION_SPEED, CANVAS_WIDTH, CANVAS_HEIGHT,
  EXPLOSION_DURATION_TICKS, BOMB_TIMER_TICKS, SNAPSHOT_INTERVAL_TICKS,
} from '../shared/constants';
import { canMoveTo, pixelToGrid, gridToPixel } from '../shared/collision';
import { CharacterConfig, Sprite } from '../utils/character';

interface BombSpriteConfig {
  bomb: Sprite[];
  explosion: Sprite[];
  imageSrc: string;
}

interface MapTileConfig {
  type: number;
  imageSrc: string;
  frames?: Sprite[];
}

export class ClientGameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private myPlayerId: string;
  private state: GameState | null = null;

  // Images
  private characterImages: Map<number, HTMLImageElement> = new Map();
  private characterAnimations: Map<number, Record<string, Sprite[]>> = new Map();
  private backgroundImage: HTMLImageElement;
  private bombImage: HTMLImageElement;
  private bombSprites: Sprite[];
  private explosionSprites: Sprite[];
  private tileImages: Map<number, HTMLImageElement> = new Map();
  private tileFrames: Map<number, Sprite[] | null> = new Map();

  // Animation
  private animationFrameId: number = 0;
  private frameIndices: Map<string, number> = new Map();
  private frameTimers: Map<string, number> = new Map();

  // Client-side prediction
  private pendingInputs: PlayerInput[] = [];
  private inputSeq: number = 0;
  private localPlayerState: PlayerState | null = null;

  // Input state
  private keysDown: Set<string> = new Set();
  private sendInput: (input: PlayerInput) => void;

  // Callbacks
  private onGameOver: ((winnerId: string | null, winnerName: string | null) => void) | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    myPlayerId: string,
    charactersConfig: CharacterConfig[],
    bombConfig: BombSpriteConfig,
    backgroundImageSrc: string,
    tiles: MapTileConfig[],
    sendInput: (input: PlayerInput) => void,
  ) {
    this.canvas = canvas;
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.myPlayerId = myPlayerId;
    this.sendInput = sendInput;

    // Load character images
    charactersConfig.forEach((config, index) => {
      const img = new Image();
      img.src = config.imageSrc;
      this.characterImages.set(index, img);
      this.characterAnimations.set(index, {
        down: config.down,
        up: config.up,
        left: config.left,
        right: config.right,
        death: config.death,
      });
    });

    // Load bomb image
    this.bombImage = new Image();
    this.bombImage.src = bombConfig.imageSrc;
    this.bombSprites = bombConfig.bomb;
    this.explosionSprites = bombConfig.explosion;

    // Load background
    this.backgroundImage = new Image();
    this.backgroundImage.src = backgroundImageSrc;

    // Load tile images
    for (const tile of tiles) {
      const img = new Image();
      img.src = tile.imageSrc;
      this.tileImages.set(tile.type, img);
      this.tileFrames.set(tile.type, tile.frames || null);
    }

    // Input handlers
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  setOnGameOver(callback: (winnerId: string | null, winnerName: string | null) => void): void {
    this.onGameOver = callback;
  }

  applyServerState(serverState: GameState): void {
    this.state = serverState;

    // Server reconciliation for local player
    const serverPlayer = serverState.players[this.myPlayerId];
    if (serverPlayer) {
      // Start from server position
      this.localPlayerState = { ...serverPlayer };

      // Re-apply pending inputs
      this.pendingInputs = this.pendingInputs.filter(
        input => input.seq > serverState.tick
      );
      for (const input of this.pendingInputs) {
        this.applyInputLocally(this.localPlayerState, input);
      }
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.keysDown.has(e.key)) return;
    this.keysDown.add(e.key);

    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      const input: PlayerInput = { type: 'bomb', seq: ++this.inputSeq };
      this.sendInput(input);
      return;
    }

    const direction = this.keyToDirection(e.key);
    if (direction) {
      e.preventDefault();
      const input: PlayerInput = { type: 'move', direction, seq: ++this.inputSeq };
      this.sendInput(input);
      this.pendingInputs.push(input);
      if (this.localPlayerState && !this.localPlayerState.isDead) {
        this.localPlayerState.direction = direction;
        this.localPlayerState.isMoving = true;
      }
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keysDown.delete(e.key);

    const direction = this.keyToDirection(e.key);
    if (direction) {
      const stillMoving = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd']
        .some(k => this.keysDown.has(k));
      if (!stillMoving) {
        const input: PlayerInput = { type: 'stop', seq: ++this.inputSeq };
        this.sendInput(input);
        this.pendingInputs.push(input);
        if (this.localPlayerState) {
          this.localPlayerState.isMoving = false;
        }
      }
    }
  }

  private keyToDirection(key: string): Direction | null {
    switch (key) {
      case 'ArrowUp': case 'w': return 'up';
      case 'ArrowDown': case 's': return 'down';
      case 'ArrowLeft': case 'a': return 'left';
      case 'ArrowRight': case 'd': return 'right';
      default: return null;
    }
  }

  private applyInputLocally(player: PlayerState, input: PlayerInput): void {
    if (player.isDead) return;
    if (input.type === 'move' && input.direction) {
      player.direction = input.direction;
      player.isMoving = true;
    } else if (input.type === 'stop') {
      player.isMoving = false;
    }
    if (player.isMoving && this.state) {
      const speed = MOVEMENT_SPEED * player.speed;
      let nx = player.x, ny = player.y;
      switch (player.direction) {
        case 'up': ny -= speed; break;
        case 'down': ny += speed; break;
        case 'left': nx -= speed; break;
        case 'right': nx += speed; break;
      }
      if (canMoveTo(nx, ny, SCALED_SIZE, this.state.map)) {
        player.x = nx;
        player.y = ny;
      }
    }
  }

  start(): void {
    this.animationFrameId = requestAnimationFrame((t) => this.renderLoop(t));
  }

  stop(): void {
    cancelAnimationFrame(this.animationFrameId);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
  }

  private renderLoop(timestamp: number): void {
    this.render(timestamp);
    this.animationFrameId = requestAnimationFrame((t) => this.renderLoop(t));
  }

  private render(timestamp: number): void {
    if (!this.state) return;
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 1. Background
    if (this.backgroundImage.complete) {
      this.ctx.drawImage(this.backgroundImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // 2. All tiles from map (floor, walls, blocks)
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const tileType = this.state.map[r][c];

        const img = this.tileImages.get(tileType);
        if (!img || !img.complete) continue;

        const frames = this.tileFrames.get(tileType);
        const x = c * SCALED_SIZE;
        const y = r * SCALED_SIZE;

        if (frames && frames.length > 0) {
          const frame = frames[0];
          this.ctx.drawImage(
            img,
            frame.x, frame.y, SPRITE_SIZE, SPRITE_SIZE,
            x, y, SCALED_SIZE, SCALED_SIZE
          );
        } else {
          this.ctx.drawImage(
            img,
            0, 0, SPRITE_SIZE, SPRITE_SIZE,
            x, y, SCALED_SIZE, SCALED_SIZE
          );
        }
      }
    }

    // 3. Bombs and explosions
    for (const bomb of this.state.bombs) {
      if (!this.bombImage.complete) continue;

      const sprites = bomb.isExploding ? this.explosionSprites : this.bombSprites;
      const frameKey = `bomb_${bomb.id}`;
      let fi = this.frameIndices.get(frameKey) || 0;
      const lastTime = this.frameTimers.get(frameKey) || 0;

      if (timestamp - lastTime > ANIMATION_SPEED) {
        fi = (fi + 1) % sprites.length;
        this.frameIndices.set(frameKey, fi);
        this.frameTimers.set(frameKey, timestamp);
      }

      const sprite = sprites[fi];
      if (sprite) {
        this.ctx.drawImage(
          this.bombImage,
          sprite.x, sprite.y, SPRITE_SIZE, SPRITE_SIZE,
          bomb.x, bomb.y, SCALED_SIZE, SCALED_SIZE
        );
      }

      // Draw explosion cross
      if (bomb.isExploding && this.state.explosions.length > 0) {
        const expSprite = this.explosionSprites[fi % this.explosionSprites.length];
        if (expSprite) {
          for (const cell of this.state.explosions) {
            if (cell.col === bomb.col && cell.row === bomb.row) continue; // center already drawn
            this.ctx.drawImage(
              this.bombImage,
              expSprite.x, expSprite.y, SPRITE_SIZE, SPRITE_SIZE,
              cell.col * SCALED_SIZE, cell.row * SCALED_SIZE, SCALED_SIZE, SCALED_SIZE
            );
          }
        }
      }
    }

    // 4. Players
    const playerEntries = Object.values(this.state.players);
    for (const player of playerEntries) {
      const isLocal = player.id === this.myPlayerId;
      const renderPlayer = isLocal && this.localPlayerState
        ? this.localPlayerState
        : player;

      if (renderPlayer.deathCompleted) continue; // Don't render fully dead players

      this.drawPlayer(renderPlayer, timestamp);
    }

    // 5. Countdown overlay
    if (this.state.status === 'countdown' && this.state.countdownSeconds !== null) {
      this.drawCountdown(this.state.countdownSeconds);
    }

    // 6. Game over overlay
    if (this.state.status === 'finished') {
      this.drawGameOver();
    }
  }

  private drawPlayer(player: PlayerState, timestamp: number): void {
    const charIndex = player.characterIndex;
    const image = this.characterImages.get(charIndex);
    const anims = this.characterAnimations.get(charIndex);
    if (!image || !image.complete || !anims) return;

    const animKey = player.isDead ? 'death' : player.direction;
    const frames = anims[animKey] || anims['down'];
    if (!frames || frames.length === 0) return;

    // Update animation frame
    const frameKey = `player_${player.id}`;
    let fi = this.frameIndices.get(frameKey) || 0;
    const lastTime = this.frameTimers.get(frameKey) || 0;

    if ((player.isMoving || player.isDead) && timestamp - lastTime > ANIMATION_SPEED) {
      fi = (fi + 1) % frames.length;
      this.frameIndices.set(frameKey, fi);
      this.frameTimers.set(frameKey, timestamp);

      if (player.isDead && fi === frames.length - 1) {
        player.deathCompleted = true;
      }
    } else if (!player.isMoving && !player.isDead) {
      fi = 0;
      this.frameIndices.set(frameKey, 0);
    }

    const sprite = frames[fi];
    if (!sprite) return;

    if (player.direction === 'left' && !player.isDead) {
      this.ctx.save();
      this.ctx.scale(-1, 1);
      this.ctx.drawImage(
        image,
        sprite.x, sprite.y, SPRITE_SIZE, SPRITE_SIZE,
        -player.x - SCALED_SIZE, player.y, SCALED_SIZE, SCALED_SIZE
      );
      this.ctx.restore();
    } else {
      this.ctx.drawImage(
        image,
        sprite.x, sprite.y, SPRITE_SIZE, SPRITE_SIZE,
        player.x, player.y, SCALED_SIZE, SCALED_SIZE
      );
    }

    // Draw player name above
    this.ctx.fillStyle = player.id === this.myPlayerId ? '#ffd700' : '#ffffff';
    this.ctx.font = '10px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      player.name,
      player.x + SCALED_SIZE / 2,
      player.y - 4
    );
  }

  private drawCountdown(seconds: number): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 72px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(
      seconds > 0 ? String(seconds) : 'GO!',
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2
    );
  }

  private drawGameOver(): void {
    if (!this.state) return;
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    if (this.state.winnerId === this.myPlayerId) {
      this.ctx.fillStyle = '#ffd700';
      this.ctx.font = 'bold 48px Arial';
      this.ctx.fillText('VITORIA!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
    } else if (this.state.winnerId) {
      const winner = this.state.players[this.state.winnerId];
      this.ctx.fillStyle = '#f44336';
      this.ctx.font = 'bold 48px Arial';
      this.ctx.fillText('DERROTA', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
      this.ctx.fillStyle = '#aaa';
      this.ctx.font = '20px Arial';
      this.ctx.fillText(
        `${winner?.name || 'Desconhecido'} venceu!`,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 30
      );
    } else {
      this.ctx.fillStyle = '#ff9800';
      this.ctx.font = 'bold 48px Arial';
      this.ctx.fillText('EMPATE', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }
  }

  destroy(): void {
    this.stop();
  }
}
