import { Position } from '../components/Player';
import { map, TILE_SIZE, TileType } from './map';

const mapWidth = 496;
const mapHeight = 208;

export const checkCollision = (position: Position, direction: string): Position => {
  let newPosition = { ...position };

  switch (direction) {
    case 'up':
      newPosition.y = Math.max(0, position.y - TILE_SIZE);
      break;
    case 'down':
      newPosition.y = Math.min(mapHeight - TILE_SIZE, position.y + TILE_SIZE);
      break;
    case 'left':
      newPosition.x = Math.max(0, position.x - TILE_SIZE);
      break;
    case 'right':
      newPosition.x = Math.min(mapWidth - TILE_SIZE, position.x + TILE_SIZE);
      break;
  }

  const row = newPosition.y / TILE_SIZE;
  const col = newPosition.x / TILE_SIZE;

  if (map[row][col] !== TileType.EMPTY) {
    return position;
  }

  return newPosition;
};
