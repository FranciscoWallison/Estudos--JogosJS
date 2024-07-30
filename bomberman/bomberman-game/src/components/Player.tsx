import { useEffect, useState } from 'react';
import { CharacterSprites } from '../utils/sprites';
import { checkCollision } from '../utils/gameLogic';
import { TILE_SIZE, map, TileType } from '../utils/map';

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
  const [spriteIndex, setSpriteIndex] = useState<number>(0);

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

    if (newPosition.x !== position.x || newPosition.y !== position.y) {
      setSpriteIndex((prevIndex) => (prevIndex + 1) % sprites[newDirection as keyof CharacterSprites].length);
    }

    setDirection(newDirection);
    setPosition(newPosition);
  };

  useEffect(() => {
    const sprite = sprites[direction as keyof CharacterSprites][spriteIndex];
    context.clearRect(position.x, position.y, TILE_SIZE, TILE_SIZE);
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

    const row = position.y / TILE_SIZE;
    const col = position.x / TILE_SIZE;

    // Verifica se o jogador foi atingido por uma explosão
    if (map[row][col] === TileType.EXPLOSION) {
      console.log('Player hit by explosion!');
      // Lógica para o jogador ser atingido pela explosão
    }
  }, [context, position, direction, sprites, spriteIndex]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return null;
};

export default Player;
