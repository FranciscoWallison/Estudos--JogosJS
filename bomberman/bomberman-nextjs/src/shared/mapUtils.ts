import { GridPosition, TileType } from './types';
import { MAP_COLS, MAP_ROWS, SPAWN_POSITIONS, SPAWN_SAFE_OFFSETS } from './constants';

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getRandomMonsterSpawns(map: TileType[][], count: number): GridPosition[] {
  const validCells: GridPosition[] = [];
  const playerSafeZones = new Set<string>();

  for (const spawn of SPAWN_POSITIONS) {
    for (const offset of SPAWN_SAFE_OFFSETS) {
      playerSafeZones.add(`${spawn.col + offset.dc},${spawn.row + offset.dr}`);
    }
  }

  for (let r = 1; r < MAP_ROWS - 1; r++) {
    for (let c = 1; c < MAP_COLS - 1; c++) {
      if (map[r][c] === 0 && !playerSafeZones.has(`${c},${r}`)) {
        validCells.push({ col: c, row: r });
      }
    }
  }

  shuffle(validCells);
  return validCells.slice(0, count);
}
