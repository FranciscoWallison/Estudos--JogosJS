import { useEffect, useState } from 'react';
import Canvas from '../components/Canvas';
import Player, { drawPlayer } from '../components/Player';
import Bomb, { drawBomb } from '../components/Bomb';
import { loadSprites, playerSprites, bombSprites } from '../utils/sprites';

export default function Home() {
  const [playerPosition, setPlayerPosition] = useState<Position>({ x: 50, y: 50 });
  const [bombs, setBombs] = useState<{ position: Position; exploded: boolean }[]>([]);
  const [spritesLoaded, setSpritesLoaded] = useState<boolean>(false);

  useEffect(() => {
    loadSprites().then(() => {
      setSpritesLoaded(true);
    });
  }, []);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === ' ') {
      setBombs([...bombs, { position: { ...playerPosition }, exploded: false }]);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [bombs, playerPosition]);

  const draw = (context: CanvasRenderingContext2D, frameCount: number) => {
    if (spritesLoaded) {
      drawPlayer(context, playerPosition, 'down', playerSprites[0], frameCount);
      bombs.forEach((bomb, index) => {
        drawBomb(context, bomb.position, bombSprites[0], bomb.exploded, frameCount);
        if (frameCount % 200 === 0) {
          bombs[index].exploded = true;
        }
      });
    }
  };

  return (
    <div>
      <Canvas draw={draw} />
      <Player position={playerPosition} setPosition={setPlayerPosition} />
    </div>
  );
}
