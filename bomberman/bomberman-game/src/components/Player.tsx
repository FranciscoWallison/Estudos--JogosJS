import { useEffect, useState } from 'react';
import { CharacterSprites } from '../utils/sprites';
import { checkCollision } from '../utils/gameLogic';

interface Position {
  x: number;
  y: number;
}

interface PlayerProps {
  context: CanvasRenderingContext2D;
  sprites: CharacterSprites;
  initialPosition: Position;
}

const Player = ({ context, sprites, initialPosition }: PlayerProps) => {
  const [position, setPosition] = useState<Position>(initialPosition);
  const [direction, setDirection] = useState<string>('down');

  const handleKeyDown = (e: KeyboardEvent) => {
    let newDirection = direction;
    let newPosition = { ...position };

    switch (e.key) {
      case 'ArrowUp':
        newDirection = 'up';
        newPosition = checkCollision(newPosition, newDirection);
        break;
      case 'ArrowDown':
        newDirection = 'down';
        newPosition = checkCollision(newPosition, newDirection);
        break;
      case 'ArrowLeft':
        newDirection = 'left';
        newPosition = checkCollision(newPosition, newDirection);
        break;
      case 'ArrowRight':
        newDirection = 'right';
        newPosition = checkCollision(newPosition, newDirection);
        break;
    }

    setDirection(newDirection);
    setPosition(newPosition);
  };

  useEffect(() => {
    const sprite = sprites[direction as keyof CharacterSprites][0];
    context.drawImage(
      sprites.image,
      sprite.x,
      sprite.y,
      16,
      16,
      position.x,
      position.y,
      16,
      16
    );
  }, [context, position, direction, sprites]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return null;
};

export default Player;
