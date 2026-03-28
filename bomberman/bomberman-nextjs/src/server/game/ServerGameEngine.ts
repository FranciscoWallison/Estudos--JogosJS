import { GameState, PlayerState, BombState, TileType, GridPosition } from '../../shared/types';
import { PlayerInput } from '../../shared/protocol';
import {
  SCALED_SIZE, MAP_COLS, MAP_ROWS, MOVEMENT_SPEED,
  BOMB_TIMER_TICKS, EXPLOSION_DURATION_TICKS, SERVER_TICK_RATE,
  SERVER_TICK_MS, SNAPSHOT_INTERVAL_TICKS, SPAWN_POSITIONS,
  SPAWN_SAFE_OFFSETS, COUNTDOWN_SECONDS,
} from '../../shared/constants';
import { canMoveTo, calculateExplosionCells, pixelToGrid, gridToPixel } from '../../shared/collision';
import { v4 as uuid } from 'uuid';

export class ServerGameEngine {
  private state: GameState;
  private inputQueues: Map<string, PlayerInput[]>;
  private loopInterval: ReturnType<typeof setInterval> | null = null;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private onSnapshot: (state: GameState) => void;
  private onGameOver: (winnerId: string | null) => void;

  constructor(
    playerIds: string[],
    playerNames: Map<string, string>,
    playerCharacters: Map<string, number>,
    mapLayout: number[][],
    onSnapshot: (state: GameState) => void,
    onGameOver: (winnerId: string | null) => void,
  ) {
    this.onSnapshot = onSnapshot;
    this.onGameOver = onGameOver;
    this.inputQueues = new Map();

    // Build map copy
    const map = mapLayout.map(row => row.map(t => t as TileType));

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
      };
      this.inputQueues.set(id, []);
    });

    // Clear safe zones around spawn points
    playerIds.forEach((_, index) => {
      const spawn = SPAWN_POSITIONS[index % SPAWN_POSITIONS.length];
      for (const offset of SPAWN_SAFE_OFFSETS) {
        const c = spawn.col + offset.dc;
        const r = spawn.row + offset.dr;
        if (c >= 0 && c < MAP_COLS && r >= 0 && r < MAP_ROWS) {
          if (map[r][c] === 2) map[r][c] = 0;
        }
      }
    });

    // Build blocks list from map
    const blocks = [];
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        if (map[r][c] === 2) {
          blocks.push({ col: c, row: r, tileType: 2, destroyedAt: null });
        }
      }
    }

    this.state = {
      tick: 0,
      players,
      bombs: [],
      explosions: [],
      blocks,
      map,
      status: 'waiting',
      winnerId: null,
      countdownSeconds: null,
    };

    console.log(`[GameEngine] Criado com ${playerIds.length} jogadores:`, playerIds.map(id => `${playerNames.get(id)} (${id})`));
  }

  pushInput(playerId: string, input: PlayerInput): void {
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
  }

  private tick(): void {
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

    // 4. Check explosion kills
    this.checkExplosionKills();

    // 5. Check win condition
    this.checkWinCondition();

    // 6. Send snapshot at reduced rate
    if (this.state.tick % SNAPSHOT_INTERVAL_TICKS === 0) {
      this.onSnapshot(this.getStateCopy());
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

    if (canMoveTo(newX, newY, SCALED_SIZE, this.state.map)) {
      player.x = newX;
      player.y = newY;
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
    this.state.bombs.push({
      id: uuid(),
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

    // Rebuild explosion cells
    this.state.explosions = [];
    for (const bomb of this.state.bombs) {
      if (bomb.isExploding) {
        const { cells } = calculateExplosionCells(
          bomb.col, bomb.row, bomb.range, this.state.map
        );
        this.state.explosions.push(...cells);
      }
    }
  }

  private explodeBomb(bomb: BombState): void {
    bomb.isExploding = true;
    bomb.explodedAt = this.state.tick;

    const { destroyedBlocks } = calculateExplosionCells(
      bomb.col, bomb.row, bomb.range, this.state.map
    );

    // Destroy blocks
    for (const block of destroyedBlocks) {
      this.state.map[block.row][block.col] = 0;
      this.state.blocks = this.state.blocks.filter(
        b => !(b.col === block.col && b.row === block.row)
      );
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

  private checkWinCondition(): void {
    if (this.state.status !== 'playing') return;

    const allPlayers = Object.values(this.state.players);
    const alivePlayers = allPlayers.filter(p => !p.isDead);

    if (alivePlayers.length <= 1) {
      console.log(`[GameEngine] Fim de jogo! Total: ${allPlayers.length}, Vivos: ${alivePlayers.length}`);
      for (const p of allPlayers) {
        console.log(`  - ${p.name} (${p.id}): isDead=${p.isDead}, pos=(${p.x},${p.y})`);
      }
      this.state.status = 'finished';
      this.state.winnerId = alivePlayers.length === 1 ? alivePlayers[0].id : null;
      this.onSnapshot(this.getStateCopy());
      this.onGameOver(this.state.winnerId);
      this.stop();
    }
  }

  removePlayer(playerId: string): void {
    const player = this.state.players[playerId];
    if (player) {
      console.log(`[GameEngine] Removendo jogador ${player.name} (${playerId}) - marcando como morto`);
      player.isDead = true;
      player.isMoving = false;
    }
    this.inputQueues.delete(playerId);
  }

  private getStateCopy(): GameState {
    return JSON.parse(JSON.stringify(this.state));
  }
}
