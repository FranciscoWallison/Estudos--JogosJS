import { GameState, PlayerState, Direction, TileType, TileShrink, ItemType } from '../shared/types';
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

export interface ItemsSpriteConfig {
  imageSrc: string;
  spriteSize: number;
  items: { type: string; sprite: Sprite }[];
}

interface MapTileConfig {
  type: number;
  imageSrc: string;
  spriteSize?: number;
  frames?: Sprite[];
  destroyFrames?: Sprite[];
  shrink?: TileShrink;
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
  private tileDestroyFrames: Map<number, Sprite[]> = new Map();
  private tileSpriteSize: Map<number, number> = new Map();
  private tileShrinks: Map<number, TileShrink> = new Map();
  private itemImage: HTMLImageElement | null = null;
  private itemSprites: Map<string, Sprite> = new Map();
  private itemSpriteSize: number = 128;

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

  // Debug
  private debugMode: boolean = false;

  constructor(
    canvas: HTMLCanvasElement,
    myPlayerId: string,
    charactersConfig: CharacterConfig[],
    bombConfig: BombSpriteConfig,
    backgroundImageSrc: string,
    tiles: MapTileConfig[],
    sendInput: (input: PlayerInput) => void,
    itemsConfig?: ItemsSpriteConfig,
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
      if (tile.spriteSize) {
        this.tileSpriteSize.set(tile.type, tile.spriteSize);
      }
      if (tile.destroyFrames && tile.destroyFrames.length > 0) {
        this.tileDestroyFrames.set(tile.type, tile.destroyFrames);
      }
      if (tile.shrink) {
        this.tileShrinks.set(tile.type, tile.shrink);
      }
    }

    // Load item sprites
    if (itemsConfig) {
      const itemImg = new Image();
      itemImg.src = itemsConfig.imageSrc;
      this.itemImage = itemImg;
      this.itemSpriteSize = itemsConfig.spriteSize;
      for (const item of itemsConfig.items) {
        this.itemSprites.set(item.type, item.sprite);
      }
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
    if (e.key === 'F3') {
      e.preventDefault();
      this.debugMode = !this.debugMode;
      return;
    }

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
      if (canMoveTo(nx, ny, SCALED_SIZE, this.state.map, this.tileShrinks, player.shrink)) {
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

    // 2. Floor and walls from map (type 0 and type 1 only)
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const tileType = this.state.map[r][c];

        // Always draw floor under everything
        const floorImg = this.tileImages.get(0);
        const floorFrames = this.tileFrames.get(0);
        if (floorImg && floorImg.complete && floorFrames && floorFrames.length > 0) {
          const ff = floorFrames[0];
          this.ctx.drawImage(
            floorImg,
            ff.x, ff.y, SPRITE_SIZE, SPRITE_SIZE,
            c * SCALED_SIZE, r * SCALED_SIZE, SCALED_SIZE, SCALED_SIZE
          );
        }

        // Draw walls on top of floor (type 1 = border walls, type 2 = center pillars)
        if (tileType === 1 || tileType === 2) {
          const tileId = tileType as number;
          const img = this.tileImages.get(tileId);
          const frames = this.tileFrames.get(tileId);
          if (img && img.complete && frames && frames.length > 0) {
            const frame = frames[0];
            this.ctx.drawImage(
              img,
              frame.x, frame.y, SPRITE_SIZE, SPRITE_SIZE,
              c * SCALED_SIZE, r * SCALED_SIZE, SCALED_SIZE, SCALED_SIZE
            );
          }
        }
      }
    }

    // 2b. Destructible blocks from state.blocks (type 3, with destruction animation)
    const blockImg = this.tileImages.get(3);
    const blockFrames = this.tileFrames.get(3);
    const destroyFrames = this.tileDestroyFrames.get(3);
    const blockSpriteSize = this.tileSpriteSize.get(3) || SPRITE_SIZE;
    if (blockImg && blockImg.complete) {
      for (const block of this.state.blocks) {
        const x = block.col * SCALED_SIZE;
        const y = block.row * SCALED_SIZE;

        if (block.destroyedAt !== null && block.destroyedAt !== undefined && destroyFrames && destroyFrames.length > 0) {
          // Destruction animation
          const elapsed = this.state.tick - block.destroyedAt;
          const ticksPerFrame = 6;
          const fi = Math.min(Math.floor(elapsed / ticksPerFrame), destroyFrames.length - 1);
          const frame = destroyFrames[fi];
          this.ctx.drawImage(
            blockImg,
            frame.x, frame.y, blockSpriteSize, blockSpriteSize,
            x, y, SCALED_SIZE, SCALED_SIZE
          );
        } else if (blockFrames && blockFrames.length > 0) {
          // Normal block
          const frame = blockFrames[0];
          this.ctx.drawImage(
            blockImg,
            frame.x, frame.y, blockSpriteSize, blockSpriteSize,
            x, y, SCALED_SIZE, SCALED_SIZE
          );
        }
      }
    }

    // 2c. Items on the ground
    if (this.itemImage && this.itemImage.complete && this.state.items.length > 0) {
      for (const item of this.state.items) {
        const sprite = this.itemSprites.get(item.type);
        if (!sprite) continue;
        this.ctx.drawImage(
          this.itemImage,
          sprite.x, sprite.y, this.itemSpriteSize, this.itemSpriteSize,
          item.col * SCALED_SIZE, item.row * SCALED_SIZE, SCALED_SIZE, SCALED_SIZE,
        );
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

    // 7. Debug collision overlay
    if (this.debugMode) {
      this.drawDebugCollisions();
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

  private drawDebugCollisions(): void {
    if (!this.state) return;
    const ctx = this.ctx;
    ctx.lineWidth = 1;

    // Draw tile collision boxes
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const tile = this.state.map[r][c];
        if (tile === 0) continue;

        const shrink = this.tileShrinks.get(tile);
        if (shrink) {
          // Tile with custom shrink - yellow outline
          const tLeft = c * SCALED_SIZE + shrink.left;
          const tTop = r * SCALED_SIZE + shrink.top;
          const tWidth = SCALED_SIZE - shrink.left - shrink.right;
          const tHeight = SCALED_SIZE - shrink.top - shrink.bottom;
          ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
          ctx.strokeRect(tLeft, tTop, tWidth, tHeight);
        } else {
          // Full tile collision - red outline
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
          ctx.strokeRect(c * SCALED_SIZE, r * SCALED_SIZE, SCALED_SIZE, SCALED_SIZE);
        }
      }
    }

    // Draw player/monster hitboxes (per-entity shrink)
    for (const player of Object.values(this.state.players)) {
      if (player.isDead || player.deathCompleted) continue;

      const isLocal = player.id === this.myPlayerId;
      const rp = isLocal && this.localPlayerState ? this.localPlayerState : player;
      const s = rp.shrink;

      const pLeft = rp.x + s.left;
      const pTop = rp.y + s.top;
      const pWidth = SCALED_SIZE - s.left - s.right;
      const pHeight = SCALED_SIZE - s.top - s.bottom;

      ctx.strokeStyle = isLocal ? 'rgba(0, 255, 0, 0.9)' : 'rgba(0, 200, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(pLeft, pTop, pWidth, pHeight);
    }

    // Draw grid overlay (subtle)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= MAP_ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * SCALED_SIZE);
      ctx.lineTo(CANVAS_WIDTH, r * SCALED_SIZE);
      ctx.stroke();
    }
    for (let c = 0; c <= MAP_COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * SCALED_SIZE, 0);
      ctx.lineTo(c * SCALED_SIZE, CANVAS_HEIGHT);
      ctx.stroke();
    }

    // Debug label
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(4, 4, 120, 20);
    ctx.fillStyle = '#0f0';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('DEBUG (F3)', 8, 7);
  }

  destroy(): void {
    this.stop();
  }
}
