import { useEffect, useRef } from 'react';
import { playerSprites, enemySprites, bombSprites } from '../utils/sprites';

const GameCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (canvas && context) {
      // Carregar as imagens dos sprites
      const playerImage = new Image();
      playerImage.src = playerSprites[0].imageSrc;

      const enemyImage = new Image();
      enemyImage.src = enemySprites[0].imageSrc;

      const bombImage = new Image();
      bombImage.src = bombSprites[0].imageSrc;

      // Renderização inicial
      playerImage.onload = () => {
        context.drawImage(
          playerImage,
          playerSprites[0].down[0].x,
          playerSprites[0].down[0].y,
          16,
          16,
          50,
          50,
          16,
          16
        );
      };

      enemyImage.onload = () => {
        context.drawImage(
          enemyImage,
          enemySprites[0].down[0].x,
          enemySprites[0].down[0].y,
          16,
          16,
          100,
          50,
          16,
          16
        );
      };

      bombImage.onload = () => {
        context.drawImage(
          bombImage,
          bombSprites[0].bomb[0].x,
          bombSprites[0].bomb[0].y,
          16,
          16,
          75,
          75,
          16,
          16
        );
      };
    }
  }, []);

  return <canvas ref={canvasRef} width={496} height={208} />;
};

export default GameCanvas;
