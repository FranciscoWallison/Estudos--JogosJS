import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import CharacterSelector from '@/components/CharacterSelector';
import { LocalGameController } from '@/client/LocalGameController';
import TouchGamepad from '@/components/TouchGamepad';
import charactersConfig from '@/data/data.json';
import bombConfig from '@/data/bombs.json';

type GamePhase = 'setup' | 'playing' | 'finished';

export default function OfflinePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [playerName, setPlayerName] = useState('Jogador');
  const [characterIndex, setCharacterIndex] = useState(0);
  const [result, setResult] = useState<{ winnerId: string | null; winnerName: string | null } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<LocalGameController | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window);
  }, []);

  const handleStart = useCallback(() => {
    if (!canvasRef.current) return;

    const controller = new LocalGameController({
      canvas: canvasRef.current,
      playerName: playerName.trim() || 'Jogador',
      playerCharacterIndex: characterIndex,
      charactersConfig,
      bombConfig,
      onGameOver: (winnerId, winnerName) => {
        setResult({ winnerId, winnerName });
        setPhase('finished');
      },
    });

    controllerRef.current = controller;
    setPhase('playing');
    controller.start();
  }, [playerName, characterIndex]);

  const handleRestart = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.destroy();
      controllerRef.current = null;
    }
    setResult(null);
    setPhase('setup');
  }, []);

  const handleBackToMenu = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.destroy();
      controllerRef.current = null;
    }
    router.push('/');
  }, [router]);

  const isLocalPlayerWinner = result?.winnerId === 'local-player';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      padding: '24px 16px',
      minHeight: '100vh',
      width: '100%',
      boxSizing: 'border-box',
    }}>
      <h1 style={{
        fontSize: '36px',
        fontWeight: 'bold',
        color: '#ffd700',
        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
        margin: 0,
      }}>
        BOMBERMAN OFFLINE
      </h1>

      {phase === 'setup' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          background: '#111',
          padding: '32px',
          borderRadius: '12px',
          border: '1px solid #333',
          width: '100%',
          maxWidth: '500px',
        }}>
          {/* Player name */}
          <div style={{ width: '100%' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '14px' }}>
              Seu nome:
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Digite seu nome..."
              maxLength={20}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#222',
                border: '1px solid #444',
                borderRadius: '6px',
                color: 'white',
                fontSize: '16px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Character selector */}
          <div style={{ width: '100%' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '14px' }}>
              Escolha seu personagem:
            </label>
            <CharacterSelector selected={characterIndex} onSelect={setCharacterIndex} />
          </div>

          {/* Start button */}
          <button
            onClick={handleStart}
            style={{
              width: '100%',
              padding: '14px',
              background: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '18px',
              marginTop: '8px',
            }}
          >
            Iniciar Jogo
          </button>

          {/* Back to menu */}
          <button
            onClick={handleBackToMenu}
            style={{
              width: '100%',
              padding: '10px',
              background: 'transparent',
              color: '#aaa',
              border: '1px solid #444',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Voltar ao Menu
          </button>
        </div>
      )}

      <div style={{
        display: phase === 'setup' ? 'none' : 'block',
        width: '100%',
        maxWidth: '992px',
        aspectRatio: '992 / 416',
        padding: '0 8px',
        boxSizing: 'border-box',
      }}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            border: '2px solid #333',
            borderRadius: '4px',
            imageRendering: 'pixelated',
          }}
        />
      </div>

      {isTouchDevice && phase === 'playing' && controllerRef.current && (
        <TouchGamepad
          onMove={(dir) => controllerRef.current?.startMove(dir)}
          onStop={() => controllerRef.current?.stopMove()}
          onBomb={() => controllerRef.current?.triggerBomb()}
        />
      )}

      {phase === 'finished' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          marginTop: '8px',
        }}>
          <p style={{
            color: isLocalPlayerWinner ? '#ffd700' : (result?.winnerId ? '#f44336' : '#ff9800'),
            fontSize: '20px',
            fontWeight: 'bold',
            margin: 0,
          }}>
            {isLocalPlayerWinner
              ? 'Voce venceu!'
              : result?.winnerId
                ? `${result.winnerName || 'Bot'} venceu!`
                : 'Empate!'}
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleRestart}
              style={{
                padding: '12px 28px',
                background: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              Jogar Novamente
            </button>
            <button
              onClick={handleBackToMenu}
              style={{
                padding: '12px 28px',
                background: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              Voltar ao Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
