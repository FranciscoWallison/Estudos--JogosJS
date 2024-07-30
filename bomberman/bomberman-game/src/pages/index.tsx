import { useEffect } from 'react';
import Canvas from '@/components/Canvas';
import Player from '@/components/Player';
import Enemy from '@/components/Enemy';
import Bomb from '@/components/Bomb';
import { playerSprites, enemySprites, bombSprites, loadSprites } from '@/utils/sprites';
import { drawMap } from '@/utils/map';

export default function Home() {
  useEffect(() => {
    loadSprites();
  }, []);

  return (
    <Canvas
      draw={(context) => {
        drawMap(context);
        return (
          <>
            <Player context={context} sprites={playerSprites[0]} initialPosition={{ x: 50, y: 50 }} />
            <Enemy context={context} sprites={enemySprites[0]} initialPosition={{ x: 100, y: 50 }} />
            <Bomb context={context} sprites={bombSprites[0]} initialPosition={{ x: 75, y: 75 }} />
          </>
        );
      }}
    />
  );
}
