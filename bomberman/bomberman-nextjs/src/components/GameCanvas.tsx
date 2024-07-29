import { useEffect, useRef } from 'react';
import { Game } from '../utils/game';

const charactersConfig = [
  {
    imageSrc: '/assets/bomberman.png',
    down: [{ x: 4, y: 11 }, { x: 21, y: 11 }, { x: 38, y: 11 }],
    right: [{ x: 54, y: 11 }, { x: 70, y: 11 }, { x: 85, y: 11 }],
    up: [{ x: 100, y: 11 }, { x: 117, y: 11 }, { x: 133, y: 11 }],
    left: [{ x: 54, y: 11 }, { x: 70, y: 11 }, { x: 85, y: 11 }],
    death: [{ x: 150, y: 11 }, { x: 167, y: 11 }, { x: 184, y: 11 }]
  },
  {
    imageSrc: '/assets/character2.png',
    down: [{ x: 4, y: 62 }, { x: 21, y: 62 }, { x: 38, y: 62 }],
    right: [{ x: 54, y: 62 }, { x: 70, y: 62 }, { x: 85, y: 62 }],
    up: [{ x: 100, y: 62 }, { x: 117, y: 62 }, { x: 133, y: 62 }],
    left: [{ x: 54, y: 62 }, { x: 70, y: 62 }, { x: 85, y: 62 }],
    death: [{ x: 150, y: 62 }, { x: 167, y: 62 }, { x: 184, y: 62 }]
  },
  // Adicione mais personagens aqui
];

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      gameRef.current = new Game(canvasRef.current, charactersConfig);
    }
  }, []);

  return (
    <>
      <div id="ui">
        <label htmlFor="characterSelect">Select Character:</label>
        <select id="characterSelect" onChange={(e) => gameRef.current?.selectCharacter(parseInt(e.target.value))}>
          <option value="0">Character 1</option>
          <option value="1">Character 2</option>
          <option value="2">Character 3</option>
          <option value="3">Character 4</option>
          <option value="4">Character 5</option>
          <option value="5">Character 6</option>
          <option value="6">Character 7</option>
        </select>
        <button id="deathTest" onClick={() => gameRef.current?.testDeath()}>Test Death</button>
      </div>
      <canvas id="gameCanvas" ref={canvasRef} width="800" height="600"></canvas>
    </>
  );
}
