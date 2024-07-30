import { useEffect, useState } from 'react';
import { CharacterSprites } from '../utils/sprites';
import { checkCollision } from '../utils/gameLogic';
import { TILE_SIZE, map, TileType } from '../utils/map';

interface Position {
  x: number;
  y: number;
}

interface PlayerProps {
  position: Position;
  setPosition: (position: Position) => void;
}

const Player = ({ position, setPosition }: PlayerProps) => {
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
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return null;
};

export const drawPlayer = (
  context: CanvasRenderingContext2D,
  position: Position,
  direction: string,
  sprites: CharacterSprites,
  frameCount: number
) => {
  if (!sprites.image) return;

  const spriteIndex = Math.floor(frameCount / 10) % sprites[direction as keyof CharacterSprites].length;
  const sprite = sprites[direction as keyof CharacterSprites][spriteIndex];
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
};

export default Player;
