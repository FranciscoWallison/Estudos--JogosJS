import { useEffect, useRef } from 'react';
import { drawMap } from '../utils/map';
import { backgroundImage } from '../utils/sprites';

const Canvas = ({ draw }: { draw: (ctx: CanvasRenderingContext2D) => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (canvas && context) {
      let animationFrameId: number;

      const render = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Desenhar a imagem de fundo
        if (backgroundImage) {
          if (backgroundImage.complete) {
            context.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
          } else {
            backgroundImage.onload = () => {
              context.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
            };
          }
        }

        //drawMap(context); // Desenhar o mapa
        draw(context); // Desenhar outros elementos (jogador, inimigos, bombas)
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
