import { TileType, GridPosition, TileShrink } from './types';
import { SCALED_SIZE, MAP_COLS, MAP_ROWS } from './constants';

/**
 * Convert pixel position to grid position.
 */
export function pixelToGrid(x: number, y: number): GridPosition {
  return {
    col: Math.floor(x / SCALED_SIZE),
    row: Math.floor(y / SCALED_SIZE),
  };
}

/**
 * Convert grid position to pixel position (top-left corner of tile).
 */
export function gridToPixel(col: number, row: number): { x: number; y: number } {
  return {
    x: col * SCALED_SIZE,
    y: row * SCALED_SIZE,
  };
}

const DEFAULT_PLAYER_SHRINK: TileShrink = { top: 6, bottom: 6, left: 6, right: 6 };

/**
 * Check if a rectangle at (newX, newY) with given size can move to that position.
 * Uses AABB vs tile-grid collision with a shrunken player hitbox.
 * Tiles with a shrink config have a reduced collision box; others use the full tile.
 */
export function canMoveTo(
  newX: number,
  newY: number,
  size: number,
  map: TileType[][],
  tileShrinks?: Map<number, TileShrink>,
  playerShrink: TileShrink = DEFAULT_PLAYER_SHRINK,
): boolean {
  const pLeft = newX + playerShrink.left;
  const pRight = newX + size - playerShrink.right;
  const pTop = newY + playerShrink.top;
  const pBottom = newY + size - playerShrink.bottom;

  // Boundary check
  if (pLeft < 0 || pTop < 0 || pRight > MAP_COLS * SCALED_SIZE || pBottom > MAP_ROWS * SCALED_SIZE) {
    return false;
  }

  // Check all tiles the player hitbox could overlap
  const colStart = Math.floor(pLeft / SCALED_SIZE);
  const colEnd = Math.floor((pRight - 1) / SCALED_SIZE);
  const rowStart = Math.floor(pTop / SCALED_SIZE);
  const rowEnd = Math.floor((pBottom - 1) / SCALED_SIZE);

  for (let r = rowStart; r <= rowEnd; r++) {
    for (let c = colStart; c <= colEnd; c++) {
      if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) return false;
      const tile = map[r][c];
      if (tile === 0) continue;

      const shrink = tileShrinks?.get(tile);
      if (!shrink) return false; // no shrink config = full tile collision

      // Tile collision box with per-side shrink
      const tLeft = c * SCALED_SIZE + shrink.left;
      const tRight = (c + 1) * SCALED_SIZE - shrink.right;
      const tTop = r * SCALED_SIZE + shrink.top;
      const tBottom = (r + 1) * SCALED_SIZE - shrink.bottom;

      // AABB overlap test
      if (pLeft < tRight && pRight > tLeft && pTop < tBottom && pBottom > tTop) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Calculate cross-shaped explosion cells from a bomb position.
 * Extends in 4 cardinal directions up to `range` tiles.
 * Stops at walls (type 1, 2) and includes-but-stops-at destructible blocks (type 3).
 */
export function calculateExplosionCells(
  col: number,
  row: number,
  range: number,
  map: TileType[][]
): { cells: GridPosition[]; destroyedBlocks: GridPosition[] } {
  const cells: GridPosition[] = [{ col, row }]; // center always included
  const destroyedBlocks: GridPosition[] = [];

  const directions = [
    { dc: 0, dr: -1 }, // up
    { dc: 0, dr: 1 },  // down
    { dc: -1, dr: 0 }, // left
    { dc: 1, dr: 0 },  // right
  ];

  for (const { dc, dr } of directions) {
    for (let i = 1; i <= range; i++) {
      const nc = col + dc * i;
      const nr = row + dr * i;

      if (nc < 0 || nc >= MAP_COLS || nr < 0 || nr >= MAP_ROWS) break;

      const tile = map[nr][nc];
      if (tile === 1 || tile === 2) break; // indestructible walls stop explosion

      cells.push({ col: nc, row: nr });

      if (tile === 3) {
        destroyedBlocks.push({ col: nc, row: nr });
        break; // destructible block stops explosion after being hit
      }
    }
  }

  return { cells, destroyedBlocks };
}
