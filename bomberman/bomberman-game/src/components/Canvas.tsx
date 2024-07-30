import { useEffect, useRef, useState } from 'react';
import { drawMap } from '../utils/map';
import { backgroundImage } from '../utils/sprites';

interface Position {
  x: number;
  y: number;
}

interface CanvasProps {
  draw: (context: CanvasRenderingContext2D, frameCount: number) => void;
}

const Canvas = ({ draw }: CanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const context = canvas.getContext('2d');
      let frameCount = 0;
      let animationFrameId: number;

      const render = () => {
        frameCount++;
        if (context) {
          context.clearRect(0, 0, canvas.width, canvas.height);
          if (backgroundImage && backgroundImage.complete) {
            context.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
          }
          drawMap(context);
          draw(context, frameCount);
        }
        animationFrameId = window.requestAnimationFrame(render);
      };

      render();

      return () => {
        window.cancelAnimationFrame(animationFrameId);
      };
    }
  }, [draw]);

  return <canvas ref={canvasRef} width={496} height={208} />;
};

export default Canvas;
