import { useEffect, useState } from 'react';
import { BombSprites } from '../utils/sprites';

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
      sprites.explosion.forEach((sprite, index) => {
        setTimeout(() => {
          context.drawImage(
            sprites.image,
            sprite.x,
            sprite.y,
            16,
            16,
            initialPosition.x,
            initialPosition.y,
            16,
            16
          );
        }, index * 100);
      });
    } else {
      const sprite = sprites.bomb[0];
      context.drawImage(
        sprites.image,
        sprite.x,
        sprite.y,
        16,
        16,
        initialPosition.x,
        initialPosition.y,
        16,
        16
      );
    }
  }, [context, exploded, initialPosition, sprites]);

  return null;
};

export default Bomb;
