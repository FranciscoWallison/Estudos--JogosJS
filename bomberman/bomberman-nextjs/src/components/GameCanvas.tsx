import { useEffect, useRef } from 'react';
import { Game } from '../utils/game';
import charactersConfig from '../data/data.json';

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
        <select
          id="characterSelect"
          onChange={(e) =>
            gameRef.current?.selectCharacter(parseInt(e.target.value))
          }
        >
          <option value="0">Character 1</option>
          <option value="1">Character 2</option>
          <option value="2">Character 3</option>
          <option value="3">Character 4</option>
          <option value="4">Character 5</option>
          <option value="5">Character 6</option>
          <option value="6">Character 7</option>
        </select>
        <button id="deathTest" onClick={() => gameRef.current?.testDeath()}>
          Test Death
        </button>
      </div>
      <canvas id="gameCanvas" ref={canvasRef} width="800" height="600"></canvas>
    </>
  );
}
