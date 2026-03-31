import { GameState, PlayerState, BombState, TileType, GridPosition, TileShrink, ItemType, RoomOptions } from '../../shared/types';
import { PlayerInput } from '../../shared/protocol';
import {
  SCALED_SIZE, MAP_COLS, MAP_ROWS, MOVEMENT_SPEED,
  BOMB_TIMER_TICKS, EXPLOSION_DURATION_TICKS, SERVER_TICK_RATE,
  SERVER_TICK_MS, SNAPSHOT_INTERVAL_TICKS, SPAWN_POSITIONS,
  SPAWN_SAFE_OFFSETS, COUNTDOWN_SECONDS,
  ITEM_DROP_CHANCE, SPEED_UP_INCREMENT, MAX_BOMB_RANGE, MAX_BOMBS, MAX_SPEED,
} from '../../shared/constants';
import { canMoveTo, calculateExplosionCells, pixelToGrid, gridToPixel } from '../../shared/collision';
import { getRandomMonsterSpawns } from '../../shared/mapUtils';
import { BotController } from '../../engine/BotController';
import { v4 as uuid } from 'uuid';
import monstersConfig from '../../data/monsters.json';
import mapConfig from '../../data/map.json';

const BLOCK_DESTROY_TICKS = 30;
const BLOCK_FILL_RATIO = 0.7;
const MONSTER_COUNT = 4;

const DEFAULT_ROOM_OPTIONS: RoomOptions = { blocks: true, items: true, monsters: false };

export class ServerGameEngine {
  private state: GameState;
  private inputQueues: Map<string, PlayerInput[]>;
  private loopInterval: ReturnType<typeof setInterval> | null = null;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private onSnapshot: (state: GameState) => void;
  private onGameOver: (winnerId: string | null) => void;
  /** Bomb ID that each player is allowed to walk through (the one they placed while standing on it) */
  private bombPassthrough: Map<string, string> = new Map();
  /** Items waiting to spawn after block destruction animation finishes */
  private pendingItems: Map<string, ItemType> = new Map();
  private roomOptions: RoomOptions;
  private monsterIds: Set<string> = new Set();
  private botControllers: BotController[] = [];
  private botUpdateInterval: ReturnType<typeof setInterval> | null = null;
  private tileShrinks?: Map<number, TileShrink>;

  constructor(
    playerIds: string[],
    playerNames: Map<string, string>,
    playerCharacters: Map<string, number>,
    mapLayout: number[][],
    onSnapshot: (state: GameState) => void,
    onGameOver: (winnerId: string | null) => void,
    roomOptions: RoomOptions = DEFAULT_ROOM_OPTIONS,
    playerCharacterCount: number = 0,
  ) {
    this.onSnapshot = onSnapshot;
    this.onGameOver = onGameOver;
    this.inputQueues = new Map();
    this.roomOptions = roomOptions;

    // Build map copy
    const map = mapLayout.map(row => row.map(t => t as TileType));

    // Build per-tile shrink configs from map data (parity with LocalGameEngine)
    const tileShrinks = new Map<number, TileShrink>();
    for (const tile of (mapConfig.tiles as { type: number; shrink?: TileShrink }[])) {
      if (tile.shrink) {
        tileShrinks.set(tile.type, tile.shrink);
      }
    }
    this.tileShrinks = tileShrinks.size > 0 ? tileShrinks : undefined;

    // Default player shrink
    const defaultShrink: TileShrink = { top: 6, bottom: 6, left: 6, right: 6 };

    // Build safe zones around player spawns
    const safeZones = new Set<string>();
    playerIds.forEach((_, index) => {
      const spawn = SPAWN_POSITIONS[index % SPAWN_POSITIONS.length];
      for (const offset of SPAWN_SAFE_OFFSETS) {
        safeZones.add(`${spawn.col + offset.dc},${spawn.row + offset.dr}`);
      }
    });

    // Setup monsters if enabled (before block fill so monster spawns are safe)
    let monsterSpawns: GridPosition[] = [];
    if (roomOptions.monsters) {
      // Get random spawn positions on the clean map (before block fill)
      monsterSpawns = getRandomMonsterSpawns(map, MONSTER_COUNT);
      // Add monster spawn safe zones
      for (const spawn of monsterSpawns) {
        for (const offset of SPAWN_SAFE_OFFSETS) {
          safeZones.add(`${spawn.col + offset.dc},${spawn.row + offset.dr}`);
        }
      }
    }

    // Handle blocks option
    if (roomOptions.blocks) {
      // Fill empty tiles with destructible blocks (same as LocalGameEngine)
      for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
          if (map[r][c] !== 0) continue;
          if (safeZones.has(`${c},${r}`)) continue;
          if (Math.random() < BLOCK_FILL_RATIO) {
            map[r][c] = 3 as TileType;
          }
        }
      }
    } else {
      // Blocks OFF: strip ALL type 3 tiles from the base layout
      for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
          if (map[r][c] === 3) map[r][c] = 0;
        }
      }
    }

    // Clear safe zones (in case base layout had blocks in spawn areas)
    for (const key of safeZones) {
      const [cs, rs] = key.split(',');
      const c = parseInt(cs);
      const r = parseInt(rs);
      if (c >= 0 && c < MAP_COLS && r >= 0 && r < MAP_ROWS) {
        if (map[r][c] === 3) map[r][c] = 0;
      }
    }

    // Build players
    const players: Record<string, PlayerState> = {};
    playerIds.forEach((id, index) => {
      const spawn = SPAWN_POSITIONS[index % SPAWN_POSITIONS.length];
      const pos = gridToPixel(spawn.col, spawn.row);
      players[id] = {
        id,
        name: playerNames.get(id) || `Jogador ${index + 1}`,
        characterIndex: playerCharacters.get(id) || 0,
        x: pos.x,
        y: pos.y,
        direction: 'down',
        isMoving: false,
        isDead: false,
        deathCompleted: false,
        frameIndex: 0,
        bombsAvailable: 1,
        bombRange: 2,
        speed: 1,
        shrink: defaultShrink,
        isMonster: false,
      };
      this.inputQueues.set(id, []);
    });

    // Create monster players if enabled
    if (roomOptions.monsters) {
      const monsterIds: string[] = [];
      for (let i = 0; i < MONSTER_COUNT; i++) {
        const monsterId = `monster-${i}`;
        monsterIds.push(monsterId);
        this.monsterIds.add(monsterId);

        const monsterData = (monstersConfig as { name?: string; speed?: number; shrink?: TileShrink }[])[i % monstersConfig.length];
        const spawn = monsterSpawns[i];
        if (!spawn) continue;

        const pos = gridToPixel(spawn.col, spawn.row);
        const charIndex = playerCharacterCount + (i % monstersConfig.length);

        players[monsterId] = {
          id: monsterId,
          name: monsterData?.name || `Monster ${i + 1}`,
          characterIndex: charIndex,
          x: pos.x,
          y: pos.y,
          direction: 'down',
          isMoving: false,
          isDead: false,
          deathCompleted: false,
          frameIndex: 0,
          bombsAvailable: 0,
          bombRange: 1,
          speed: monsterData?.speed ?? 0.8,
          shrink: (monsterData?.shrink as TileShrink) ?? defaultShrink,
          isMonster: true,
        };
        this.inputQueues.set(monsterId, []);
      }

      // Create BotControllers for monsters (no bombs, medium difficulty)
      this.botControllers = monsterIds.map(mId =>
        new BotController(mId, (id, input) => this.pushInput(id, input), 'medium', false, this.tileShrinks),
      );
    }

    // Build blocks list from map
    const blocks = [];
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        if (map[r][c] === 3) {
          blocks.push({ col: c, row: r, tileType: 3, destroyedAt: null });
        }
      }
    }

    this.state = {
      tick: 0,
      players,
      bombs: [],
      explosions: [],
      blocks,
      items: [],
      map,
      status: 'waiting',
      winnerId: null,
      countdownSeconds: null,
    };

    const allPlayerNames = Object.values(players).map(p => `${p.name} (${p.id})`);
    console.log(`[GameEngine] Criado com ${allPlayerNames.length} entidades:`, allPlayerNames);
    console.log(`[GameEngine] Opcoes: blocks=${roomOptions.blocks}, items=${roomOptions.items}, monsters=${roomOptions.monsters}`);
  }

  pushInput(playerId: string, input: PlayerInput): void {
    if (this.state.status !== 'playing') return;
    const queue = this.inputQueues.get(playerId);
    if (queue) queue.push(input);
  }

  startCountdown(): void {
    this.state.status = 'countdown';
    let remaining = COUNTDOWN_SECONDS;
    this.state.countdownSeconds = remaining;
    this.onSnapshot(this.getStateCopy());

    this.countdownInterval = setInterval(() => {
      remaining--;
      this.state.countdownSeconds = remaining;
      this.onSnapshot(this.getStateCopy());
      if (remaining <= 0) {
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        this.countdownInterval = null;
        this.state.status = 'playing';
        this.state.countdownSeconds = null;
        this.startGameLoop();
      }
    }, 1000);
  }

  private startGameLoop(): void {
    this.loopInterval = setInterval(() => this.tick(), SERVER_TICK_MS);

    // Start bot update loop if monsters are enabled
    if (this.botControllers.length > 0) {
      this.botUpdateInterval = setInterval(() => {
        if (this.state.status === 'playing') {
          const stateCopy = this.getStateCopy();
          for (const bot of this.botControllers) {
            bot.update(stateCopy);
          }
        }
      }, SERVER_TICK_MS);
    }
  }

  stop(): void {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    if (this.botUpdateInterval) {
      clearInterval(this.botUpdateInterval);
      this.botUpdateInterval = null;
    }
  }

  private tick(): void {
    try {
    this.state.tick++;

    // 1. Process inputs
    for (const [playerId, queue] of this.inputQueues) {
      const player = this.state.players[playerId];
      if (!player || player.isDead) continue;

      while (queue.length > 0) {
        const input = queue.shift()!;
        this.processInput(player, input);
      }
    }

    // 2. Move players
    for (const player of Object.values(this.state.players)) {
      if (player.isDead || !player.isMoving) continue;
      this.movePlayer(player);
    }

    // 3. Update bombs
    this.updateBombs();

    // 4. Clean up finished block destruction animations + spawn pending items
    this.state.blocks = this.state.blocks.filter(b => {
      if (b.destroyedAt !== null) {
        if ((this.state.tick - b.destroyedAt) >= BLOCK_DESTROY_TICKS) {
          // Animation finished: clear the tile so it becomes walkable
          this.state.map[b.row][b.col] = 0;
          // Spawn pending item at this position (only if items enabled)
          if (this.roomOptions.items) {
            const key = `${b.col},${b.row}`;
            const itemType = this.pendingItems.get(key);
            if (itemType) {
              this.pendingItems.delete(key);
              this.state.items.push({
                id: uuid(),
                type: itemType,
                col: b.col,
                row: b.row,
              });
            }
          }
          return false;
        }
      }
      return true;
    });

    // 5. Check item pickups
    this.checkItemPickups();

    // 6. Destroy items caught in explosions
    this.destroyItemsInExplosions();

    // 7. Check explosion kills
    this.checkExplosionKills();

    // 8. Check monster touch kills
    if (this.monsterIds.size > 0) {
      this.checkMonsterTouchKills();
    }

    // 9. Check win condition
    this.checkWinCondition();

    // 10. Send snapshot at reduced rate
    if (this.state.tick % SNAPSHOT_INTERVAL_TICKS === 0) {
      this.onSnapshot(this.getStateCopy());
    }
    } catch (err) {
      console.error('[GameEngine] Erro no tick:', err);
    }
  }

  private processInput(player: PlayerState, input: PlayerInput): void {
    switch (input.type) {
      case 'move':
        if (input.direction) {
          player.direction = input.direction;
          player.isMoving = true;
        }
        break;
      case 'stop':
        player.isMoving = false;
        break;
      case 'bomb':
        this.placeBomb(player);
        break;
    }
  }

  private movePlayer(player: PlayerState): void {
    const speed = MOVEMENT_SPEED * player.speed;
    let newX = player.x;
    let newY = player.y;

    switch (player.direction) {
      case 'up':    newY -= speed; break;
      case 'down':  newY += speed; break;
      case 'left':  newX -= speed; break;
      case 'right': newX += speed; break;
    }

    if (!canMoveTo(newX, newY, SCALED_SIZE, this.state.map, this.tileShrinks, player.shrink)) return;

    // Check bomb collision
    if (this.isBlockedByBomb(player, newX, newY)) return;

    player.x = newX;
    player.y = newY;

    // Clear passthrough if player left the bomb tile
    this.updateBombPassthrough(player);
  }

  private isBlockedByBomb(player: PlayerState, newX: number, newY: number): boolean {
    const s = player.shrink;
    const left = newX + s.left;
    const right = newX + SCALED_SIZE - s.right;
    const top = newY + s.top;
    const bottom = newY + SCALED_SIZE - s.bottom;

    const colStart = Math.floor(left / SCALED_SIZE);
    const colEnd = Math.floor((right - 1) / SCALED_SIZE);
    const rowStart = Math.floor(top / SCALED_SIZE);
    const rowEnd = Math.floor((bottom - 1) / SCALED_SIZE);

    const passthroughBombId = this.bombPassthrough.get(player.id);

    for (const bomb of this.state.bombs) {
      if (bomb.isExploding) continue;
      if (bomb.id === passthroughBombId) continue;
      if (bomb.col >= colStart && bomb.col <= colEnd &&
          bomb.row >= rowStart && bomb.row <= rowEnd) {
        return true;
      }
    }
    return false;
  }

  private updateBombPassthrough(player: PlayerState): void {
    const passthroughBombId = this.bombPassthrough.get(player.id);
    if (!passthroughBombId) return;

    const bomb = this.state.bombs.find(b => b.id === passthroughBombId);
    if (!bomb) {
      this.bombPassthrough.delete(player.id);
      return;
    }

    // Only remove passthrough when the entire hitbox no longer overlaps the bomb tile
    const s = player.shrink;
    const left = player.x + s.left;
    const right = player.x + SCALED_SIZE - s.right;
    const top = player.y + s.top;
    const bottom = player.y + SCALED_SIZE - s.bottom;

    const bombLeft = bomb.col * SCALED_SIZE;
    const bombRight = bombLeft + SCALED_SIZE;
    const bombTop = bomb.row * SCALED_SIZE;
    const bombBottom = bombTop + SCALED_SIZE;

    const overlaps = left < bombRight && right > bombLeft &&
                     top < bombBottom && bottom > bombTop;

    if (!overlaps) {
      this.bombPassthrough.delete(player.id);
    }
  }

  private placeBomb(player: PlayerState): void {
    const activeBombs = this.state.bombs.filter(
      b => b.ownerId === player.id && !b.isExploding
    ).length;
    if (activeBombs >= player.bombsAvailable) return;

    // Snap to grid using player center
    const grid = pixelToGrid(
      player.x + SCALED_SIZE / 2,
      player.y + SCALED_SIZE / 2
    );

    // Don't place if bomb already exists on this tile
    const existing = this.state.bombs.find(
      b => b.col === grid.col && b.row === grid.row && !b.isExploding
    );
    if (existing) return;

    const pos = gridToPixel(grid.col, grid.row);
    const bombId = uuid();
    this.state.bombs.push({
      id: bombId,
      ownerId: player.id,
      col: grid.col,
      row: grid.row,
      x: pos.x,
      y: pos.y,
      placedAt: this.state.tick,
      explodedAt: null,
      range: player.bombRange,
      isExploding: false,
    });

    // Player can walk through their own bomb until they leave the tile
    this.bombPassthrough.set(player.id, bombId);
  }

  private updateBombs(): void {
    const bombsToExplode: BombState[] = [];

    for (const bomb of this.state.bombs) {
      if (!bomb.isExploding) {
        if (this.state.tick - bomb.placedAt >= BOMB_TIMER_TICKS) {
          bombsToExplode.push(bomb);
        }
      }
    }

    for (const bomb of bombsToExplode) {
      this.explodeBomb(bomb);
    }

    // Remove finished explosions
    this.state.bombs = this.state.bombs.filter(bomb => {
      if (bomb.isExploding && bomb.explodedAt !== null) {
        return (this.state.tick - bomb.explodedAt) < EXPLOSION_DURATION_TICKS;
      }
      return true;
    });

    // Rebuild explosion cells (exclude cells where blocks are being destroyed)
    const destroyingSet = new Set(
      this.state.blocks
        .filter(b => b.destroyedAt !== null)
        .map(b => `${b.col},${b.row}`)
    );
    this.state.explosions = [];
    for (const bomb of this.state.bombs) {
      if (bomb.isExploding) {
        const { cells } = calculateExplosionCells(
          bomb.col, bomb.row, bomb.range, this.state.map
        );
        for (const cell of cells) {
          if (!destroyingSet.has(`${cell.col},${cell.row}`)) {
            this.state.explosions.push(cell);
          }
        }
      }
    }
  }

  private explodeBomb(bomb: BombState): void {
    bomb.isExploding = true;
    bomb.explodedAt = this.state.tick;

    const { destroyedBlocks } = calculateExplosionCells(
      bomb.col, bomb.row, bomb.range, this.state.map
    );

    // Mark blocks as destroying (keep map[r][c]=3 so explosions stop at them)
    const itemTypes: ItemType[] = ['fire_up', 'bomb_up', 'speed_up'];
    for (const block of destroyedBlocks) {
      const blockState = this.state.blocks.find(
        b => b.col === block.col && b.row === block.row && b.destroyedAt === null
      );
      if (blockState) {
        blockState.destroyedAt = this.state.tick;
        // Random chance to spawn an item after block destruction animation (only if items enabled)
        if (this.roomOptions.items) {
          const key = `${block.col},${block.row}`;
          if (!this.pendingItems.has(key) && Math.random() < ITEM_DROP_CHANCE) {
            const randomType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
            this.pendingItems.set(key, randomType);
          }
        }
      }
    }

    // Chain reaction
    const { cells } = calculateExplosionCells(
      bomb.col, bomb.row, bomb.range, this.state.map
    );
    for (const cell of cells) {
      const chainBomb = this.state.bombs.find(
        b => b.col === cell.col && b.row === cell.row && !b.isExploding
      );
      if (chainBomb) {
        this.explodeBomb(chainBomb);
      }
    }
  }

  private checkItemPickups(): void {
    if (this.state.items.length === 0) return;

    for (const player of Object.values(this.state.players)) {
      if (player.isDead) continue;
      if (this.monsterIds.has(player.id)) continue; // monsters don't collect items

      const grid = pixelToGrid(
        player.x + SCALED_SIZE / 2,
        player.y + SCALED_SIZE / 2,
      );

      const itemIndex = this.state.items.findIndex(
        item => item.col === grid.col && item.row === grid.row,
      );
      if (itemIndex === -1) continue;

      const item = this.state.items[itemIndex];
      switch (item.type) {
        case 'fire_up':
          player.bombRange = Math.min(player.bombRange + 1, MAX_BOMB_RANGE);
          break;
        case 'bomb_up':
          player.bombsAvailable = Math.min(player.bombsAvailable + 1, MAX_BOMBS);
          break;
        case 'speed_up':
          player.speed = Math.min(player.speed + SPEED_UP_INCREMENT, MAX_SPEED);
          break;
      }
      this.state.items.splice(itemIndex, 1);
    }
  }

  private destroyItemsInExplosions(): void {
    if (this.state.items.length === 0 || this.state.explosions.length === 0) return;

    this.state.items = this.state.items.filter(item =>
      !this.state.explosions.some(e => e.col === item.col && e.row === item.row),
    );
  }

  private checkExplosionKills(): void {
    if (this.state.explosions.length === 0) return;

    for (const player of Object.values(this.state.players)) {
      if (player.isDead) continue;
      const grid = pixelToGrid(
        player.x + SCALED_SIZE / 2,
        player.y + SCALED_SIZE / 2
      );
      const isInExplosion = this.state.explosions.some(
        e => e.col === grid.col && e.row === grid.row
      );
      if (isInExplosion) {
        player.isDead = true;
        player.isMoving = false;
      }
    }
  }

  private checkMonsterTouchKills(): void {
    const humans = Object.values(this.state.players)
      .filter(p => !this.monsterIds.has(p.id) && !p.isDead);
    const monsters = Object.values(this.state.players)
      .filter(p => this.monsterIds.has(p.id) && !p.isDead);

    for (const human of humans) {
      const hGrid = pixelToGrid(
        human.x + SCALED_SIZE / 2,
        human.y + SCALED_SIZE / 2,
      );
      for (const monster of monsters) {
        const mGrid = pixelToGrid(
          monster.x + SCALED_SIZE / 2,
          monster.y + SCALED_SIZE / 2,
        );
        if (hGrid.col === mGrid.col && hGrid.row === mGrid.row) {
          human.isDead = true;
          human.isMoving = false;
          break;
        }
      }
    }
  }

  private checkWinCondition(): void {
    if (this.state.status !== 'playing') return;

    // Only count human players for win condition (monsters are environmental hazards)
    const aliveHumans = Object.values(this.state.players)
      .filter(p => !this.monsterIds.has(p.id) && !p.isDead);

    if (aliveHumans.length <= 1) {
      this.finishGame(aliveHumans.length === 1 ? aliveHumans[0].id : null);
    }
  }

  private finishGame(winnerId: string | null): void {
    const allPlayers = Object.values(this.state.players);
    console.log(`[GameEngine] Fim de jogo! Humanos vivos: ${allPlayers.filter(p => !p.isDead && !this.monsterIds.has(p.id)).length}`);
    for (const p of allPlayers) {
      console.log(`  - ${p.name} (${p.id}): isDead=${p.isDead}`);
    }
    this.state.status = 'finished';
    this.state.winnerId = winnerId;
    this.onSnapshot(this.getStateCopy());
    this.onGameOver(winnerId);
    this.stop();
  }

  removePlayer(playerId: string): void {
    const player = this.state.players[playerId];
    if (player) {
      console.log(`[GameEngine] Removendo jogador ${player.name} (${playerId}) - marcando como morto`);
      player.isDead = true;
      player.isMoving = false;
    }
    this.inputQueues.delete(playerId);

    // Verificar condicao de vitoria apos remocao
    if (this.state.status === 'playing') {
      this.checkWinCondition();
    }
  }

  private getStateCopy(): GameState {
    return JSON.parse(JSON.stringify(this.state));
  }
}
