import { useEffect } from 'react';
import { CharacterSprites } from '../utils/sprites';
import { TILE_SIZE } from '../utils/map';

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
      TILE_SIZE,
      TILE_SIZE,
      initialPosition.x,
      initialPosition.y,
      TILE_SIZE,
      TILE_SIZE
    );
  }, [context, initialPosition, sprites]);

  return null;
};

export default Enemy;
