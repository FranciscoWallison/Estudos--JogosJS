import { useEffect, useRef, useState } from 'react';
import { drawMap } from '../utils/map';
import { backgroundImage, bombSprites, playerSprites } from '../utils/sprites';
import Player from './Player';
import Bomb from './Bomb';

interface Position {
  x: number;
  y: number;
}

const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [bombs, setBombs] = useState<Position[]>([]);
  const [playerPosition, setPlayerPosition] = useState<Position>({ x: 50, y: 50 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        setContext(ctx);
      }
    }
  }, []);

  useEffect(() => {
    if (context) {
      const render = () => {
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);

        if (backgroundImage && backgroundImage.complete) {
          context.drawImage(backgroundImage, 0, 0, context.canvas.width, context.canvas.height);
        }

        // drawMap(context);
        bombs.forEach((bombPosition) => {
          // Renderizar bombas
          Bomb({ context, sprites: bombSprites[0], initialPosition: bombPosition });
        });
        // Renderizar jogador
        Player({ context, sprites: playerSprites[0], initialPosition: playerPosition });

        requestAnimationFrame(render);
      };
      render();
    }
  }, [context, bombs, playerPosition]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === ' ') {
      setBombs([...bombs, playerPosition]);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [bombs, playerPosition]);

  return <canvas ref={canvasRef} width={496} height={208} />;
};

export default Canvas;
