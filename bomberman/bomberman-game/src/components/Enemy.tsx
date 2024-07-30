import { useEffect } from 'react';
import { CharacterSprites } from '../utils/sprites';

interface Position {
  x: number;
  y: number;
}

interface EnemyProps {
  context: CanvasRenderingContext2D;
  sprites: CharacterSprites;
  initialPosition: Position;
}

const Enemy = ({ context, sprites, initialPosition }: EnemyProps) => {
  useEffect(() => {
    const sprite = sprites.down[0]; // Aqui você pode adicionar lógica para movimentos dos inimigos
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
  }, [context, initialPosition, sprites]);

  return null;
};

export default Enemy;
