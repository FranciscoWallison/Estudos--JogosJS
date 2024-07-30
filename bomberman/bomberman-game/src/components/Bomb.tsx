import { useEffect, useState } from 'react';
import { BombSprites } from '../utils/sprites';
import { TILE_SIZE, map, TileType } from '../utils/map';

interface Position {
  x: number;
  y: number;
}

interface BombProps {
  context: CanvasRenderingContext2D;
  sprites: BombSprites;
  initialPosition: Position;
}

const Bomb = ({ context, sprites, initialPosition }: BombProps) => {
  const [exploded, setExploded] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExploded(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (exploded) {
      // Desenhar explosão central
      context.clearRect(initialPosition.x, initialPosition.y, TILE_SIZE, TILE_SIZE);
      context.drawImage(
        sprites.image,
        sprites.explosion[0].x,
        sprites.explosion[0].y,
        TILE_SIZE,
        TILE_SIZE,
        initialPosition.x,
        initialPosition.y,
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
        setTimeout(() => {
          const newRow = (initialPosition.y + dir.y) / TILE_SIZE;
          const newCol = (initialPosition.x + dir.x) / TILE_SIZE;

          if (map[newRow] && map[newRow][newCol] !== TileType.SOLID) {
            // Destruir bloco se for destrutível
            if (map[newRow][newCol] === TileType.DESTRUCTIBLE) {
              map[newRow][newCol] = TileType.EMPTY;
            }

            context.clearRect(initialPosition.x + dir.x, initialPosition.y + dir.y, TILE_SIZE, TILE_SIZE);
            context.drawImage(
              sprites.image,
              sprites.explosion[0].x,
              sprites.explosion[0].y,
              TILE_SIZE,
              TILE_SIZE,
              initialPosition.x + dir.x,
              initialPosition.y + dir.y,
              TILE_SIZE,
              TILE_SIZE
            );
          }
        }, index * 100);
      });
    } else {
      const sprite = sprites.bomb[0];
      context.drawImage(
        sprites.image,
        sprite.x,
        sprite.y,
        TILE_SIZE,
        TILE_SIZE,
        initialPosition.x,
        initialPosition.y,
        TILE_SIZE,
        TILE_SIZE
      );
    }
  }, [context, exploded, initialPosition, sprites]);

  return null;
};

export default Bomb;
