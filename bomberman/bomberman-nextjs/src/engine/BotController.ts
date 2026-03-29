import { GameState, Direction, GridPosition, TileType, TileShrink } from '../shared/types';
import { PlayerInput } from '../shared/protocol';
import { SCALED_SIZE, MAP_COLS, MAP_ROWS, BOMB_TIMER_TICKS } from '../shared/constants';
import { canMoveTo, calculateExplosionCells, pixelToGrid, gridToPixel } from '../shared/collision';

const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];
const DIR_OFFSETS: Record<Direction, { dc: number; dr: number }> = {
  up:    { dc: 0, dr: -1 },
  down:  { dc: 0, dr: 1 },
  left:  { dc: -1, dr: 0 },
  right: { dc: 1, dr: 0 },
};

export class BotController {
  private botId: string;
  private pushInput: (playerId: string, input: PlayerInput) => void;
  private seq: number = 0;
  private tickCounter: number = 0;
  private lastBombTick: number = 0;

  private thinkInterval: number;
  private bombCooldown: number;
  private randomChance: number;
  private canPlaceBombs: boolean;
  private tileShrinks?: Map<number, TileShrink>;

  constructor(
    botId: string,
    pushInput: (playerId: string, input: PlayerInput) => void,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
    canPlaceBombs: boolean = true,
    tileShrinks?: Map<number, TileShrink>,
  ) {
    this.botId = botId;
    this.pushInput = pushInput;
    this.canPlaceBombs = canPlaceBombs;
    this.tileShrinks = tileShrinks;

    switch (difficulty) {
      case 'easy':
        this.thinkInterval = 30;
        this.bombCooldown = 240;
        this.randomChance = 0.3;
        break;
      case 'medium':
        this.thinkInterval = 15;
        this.bombCooldown = 150;
        this.randomChance = 0.15;
        break;
      case 'hard':
        this.thinkInterval = 8;
        this.bombCooldown = 90;
        this.randomChance = 0.05;
        break;
    }
  }

  update(state: GameState): void {
    this.tickCounter++;
    const bot = state.players[this.botId];
    if (!bot || bot.isDead) return;
    if (this.tickCounter % this.thinkInterval !== 0) return;

    const grid = pixelToGrid(
      bot.x + SCALED_SIZE / 2,
      bot.y + SCALED_SIZE / 2,
    );

    const dangerCells = this.computeDangerZone(state);
    const inDanger = dangerCells.some(c => c.col === grid.col && c.row === grid.row);

    const botShrink = bot.shrink;

    // Priority 1: Flee from danger
    if (inDanger) {
      const safeDir = this.findSafeDirection(grid, state.map, dangerCells, botShrink);
      if (safeDir) {
        this.emitMove(safeDir);
        return;
      }
      // No safe direction - try any walkable direction
      const anyDir = this.findAnyWalkableDirection(grid, state.map, botShrink);
      if (anyDir) {
        this.emitMove(anyDir);
      }
      return;
    }

    // Priority 2: Place bomb near destructible block (only if allowed)
    if (this.canPlaceBombs && this.tickCounter - this.lastBombTick >= this.bombCooldown) {
      if (this.isNearDestructible(grid, state.map)) {
        const escapeDir = this.findEscapeAfterBomb(grid, bot.bombRange, state.map, dangerCells, botShrink);
        if (escapeDir) {
          this.emitBomb();
          this.lastBombTick = this.tickCounter;
          this.emitMove(escapeDir);
          return;
        }
      }
    }

    // Random action chance (makes bots less predictable)
    if (Math.random() < this.randomChance) {
      const randomDir = this.findAnyWalkableDirection(grid, state.map, botShrink);
      if (randomDir) {
        this.emitMove(randomDir);
        return;
      }
    }

    // Priority 3: Move toward nearest destructible block
    const targetDir = this.findDirectionTowardBlock(grid, state.map);
    if (targetDir) {
      this.emitMove(targetDir);
      return;
    }

    // Priority 4: Wander randomly
    const wanderDir = this.findAnyWalkableDirection(grid, state.map, botShrink);
    if (wanderDir) {
      this.emitMove(wanderDir);
    } else {
      this.emitStop();
    }
  }

  private computeDangerZone(state: GameState): GridPosition[] {
    const cells: GridPosition[] = [...state.explosions];

    for (const bomb of state.bombs) {
      if (bomb.isExploding) continue;
      const ticksRemaining = BOMB_TIMER_TICKS - (state.tick - bomb.placedAt);
      // Consider bombs that will explode within ~0.75 seconds
      if (ticksRemaining < 45) {
        const { cells: predicted } = calculateExplosionCells(
          bomb.col, bomb.row, bomb.range, state.map,
        );
        cells.push(...predicted);
      }
    }

    // Also mark all ticking bomb positions as danger
    for (const bomb of state.bombs) {
      if (!bomb.isExploding) {
        const { cells: bombCells } = calculateExplosionCells(
          bomb.col, bomb.row, bomb.range, state.map,
        );
        for (const c of bombCells) {
          if (!cells.some(d => d.col === c.col && d.row === c.row)) {
            cells.push(c);
          }
        }
      }
    }

    return cells;
  }

  private findSafeDirection(
    grid: GridPosition,
    map: TileType[][],
    dangerCells: GridPosition[],
    playerShrink?: TileShrink,
  ): Direction | null {
    const shuffled = this.shuffleArray([...DIRECTIONS]);
    for (const dir of shuffled) {
      const offset = DIR_OFFSETS[dir];
      const targetCol = grid.col + offset.dc;
      const targetRow = grid.row + offset.dr;
      const targetPixel = gridToPixel(targetCol, targetRow);

      if (canMoveTo(targetPixel.x, targetPixel.y, SCALED_SIZE, map, this.tileShrinks, playerShrink)) {
        const isSafe = !dangerCells.some(
          c => c.col === targetCol && c.row === targetRow,
        );
        if (isSafe) return dir;
      }
    }
    return null;
  }

  private findAnyWalkableDirection(grid: GridPosition, map: TileType[][], playerShrink?: TileShrink): Direction | null {
    const shuffled = this.shuffleArray([...DIRECTIONS]);
    for (const dir of shuffled) {
      const offset = DIR_OFFSETS[dir];
      const targetPixel = gridToPixel(grid.col + offset.dc, grid.row + offset.dr);
      if (canMoveTo(targetPixel.x, targetPixel.y, SCALED_SIZE, map, this.tileShrinks, playerShrink)) {
        return dir;
      }
    }
    return null;
  }

  private isNearDestructible(grid: GridPosition, map: TileType[][]): boolean {
    for (const dir of DIRECTIONS) {
      const offset = DIR_OFFSETS[dir];
      const nc = grid.col + offset.dc;
      const nr = grid.row + offset.dr;
      if (nc >= 0 && nc < MAP_COLS && nr >= 0 && nr < MAP_ROWS) {
        if (map[nr][nc] === 3) return true;
      }
    }
    return false;
  }

  private findEscapeAfterBomb(
    grid: GridPosition,
    bombRange: number,
    map: TileType[][],
    currentDanger: GridPosition[],
    playerShrink?: TileShrink,
  ): Direction | null {
    // Simulate explosion if bomb placed at grid position
    const { cells: futureDanger } = calculateExplosionCells(
      grid.col, grid.row, bombRange, map,
    );
    const allDanger = [...currentDanger, ...futureDanger];

    // Find a direction that leads to safety
    const shuffled = this.shuffleArray([...DIRECTIONS]);
    for (const dir of shuffled) {
      const offset = DIR_OFFSETS[dir];
      const targetCol = grid.col + offset.dc;
      const targetRow = grid.row + offset.dr;
      const targetPixel = gridToPixel(targetCol, targetRow);

      if (!canMoveTo(targetPixel.x, targetPixel.y, SCALED_SIZE, map, this.tileShrinks, playerShrink)) continue;

      const targetInDanger = allDanger.some(
        c => c.col === targetCol && c.row === targetRow,
      );

      if (!targetInDanger) return dir;

      // Check one step further
      const furtherCol = targetCol + offset.dc;
      const furtherRow = targetRow + offset.dr;
      const furtherPixel = gridToPixel(furtherCol, furtherRow);
      if (canMoveTo(furtherPixel.x, furtherPixel.y, SCALED_SIZE, map, this.tileShrinks, playerShrink)) {
        const furtherSafe = !allDanger.some(
          c => c.col === furtherCol && c.row === furtherRow,
        );
        if (furtherSafe) return dir;
      }
    }
    return null;
  }

  private findDirectionTowardBlock(grid: GridPosition, map: TileType[][]): Direction | null {
    // Simple BFS to find nearest destructible block
    const visited = new Set<string>();
    const queue: { col: number; row: number; firstDir: Direction }[] = [];

    visited.add(`${grid.col},${grid.row}`);

    for (const dir of DIRECTIONS) {
      const offset = DIR_OFFSETS[dir];
      const nc = grid.col + offset.dc;
      const nr = grid.row + offset.dr;
      const key = `${nc},${nr}`;
      if (visited.has(key)) continue;
      if (nc < 0 || nc >= MAP_COLS || nr < 0 || nr >= MAP_ROWS) continue;

      if (map[nr][nc] === 3) return dir; // Adjacent destructible block
      if (map[nr][nc] === 0) {
        visited.add(key);
        queue.push({ col: nc, row: nr, firstDir: dir });
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;

      for (const dir of DIRECTIONS) {
        const offset = DIR_OFFSETS[dir];
        const nc = current.col + offset.dc;
        const nr = current.row + offset.dr;
        const key = `${nc},${nr}`;
        if (visited.has(key)) continue;
        if (nc < 0 || nc >= MAP_COLS || nr < 0 || nr >= MAP_ROWS) continue;

        visited.add(key);

        if (map[nr][nc] === 3) return current.firstDir; // Found destructible block
        if (map[nr][nc] === 0) {
          queue.push({ col: nc, row: nr, firstDir: current.firstDir });
        }
      }
    }

    return null;
  }

  private emitMove(direction: Direction): void {
    this.pushInput(this.botId, {
      type: 'move',
      direction,
      seq: ++this.seq,
    });
  }

  private emitBomb(): void {
    this.pushInput(this.botId, {
      type: 'bomb',
      seq: ++this.seq,
    });
  }

  private emitStop(): void {
    this.pushInput(this.botId, {
      type: 'stop',
      seq: ++this.seq,
    });
  }

  private shuffleArray<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
