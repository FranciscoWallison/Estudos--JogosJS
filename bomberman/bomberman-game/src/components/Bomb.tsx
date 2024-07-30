import { useEffect, useState } from 'react';
import { BombSprites } from '../utils/sprites';
import { TILE_SIZE, map, TileType } from '../utils/map';

interface Position {
  x: number;
  y: number;
}

interface BombProps {
  position: Position;
}

const Bomb = ({ position }: BombProps) => {
  const [exploded, setExploded] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExploded(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return null;
};

export const drawBomb = (
  context: CanvasRenderingContext2D,
  position: Position,
  sprites: BombSprites,
  exploded: boolean,
  frameCount: number
) => {
  if (!sprites.image) return;

  if (exploded) {
    context.clearRect(position.x, position.y, TILE_SIZE, TILE_SIZE);
    context.drawImage(
      sprites.image,
      sprites.explosion[0].x,
      sprites.explosion[0].y,
      TILE_SIZE,
      TILE_SIZE,
      position.x,
      position.y,
      TILE_SIZE,
      TILE_SIZE
    );

    const directions = [
      { x: 0, y: -TILE_SIZE }, // up
      { x: 0, y: TILE_SIZE },  // down
      { x: -TILE_SIZE, y: 0 }, // left
      { x: TILE_SIZE, y: 0 }   // right
    ];

    directions.forEach((dir, index) => {
      const newRow = (position.y + dir.y) / TILE_SIZE;
      const newCol = (position.x + dir.x) / TILE_SIZE;

      if (map[newRow] && map[newRow][newCol] !== TileType.SOLID) {
        if (map[newRow][newCol] === TileType.DESTRUCTIBLE) {
          map[newRow][newCol] = TileType.EMPTY;
        }

        context.clearRect(position.x + dir.x, position.y + dir.y, TILE_SIZE, TILE_SIZE);
        context.drawImage(
          sprites.image,
          sprites.explosion[0].x,
          sprites.explosion[0].y,
          TILE_SIZE,
          TILE_SIZE,
          position.x + dir.x,
          position.y + dir.y,
          TILE_SIZE,
          TILE_SIZE
        );
      }
    });
  } else {
    const sprite = sprites.bomb[0];
    context.drawImage(
      sprites.image,
      sprite.x,
      sprite.y,
      TILE_SIZE,
      TILE_SIZE,
      position.x,
      position.y,
      TILE_SIZE,
      TILE_SIZE
    );
  }
};

export default Bomb;
