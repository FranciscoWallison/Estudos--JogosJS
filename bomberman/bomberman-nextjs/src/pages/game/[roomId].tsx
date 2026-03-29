import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { ClientGameEngine, ItemsSpriteConfig } from '@/client/ClientGameEngine';
import { GameState, RoomOptions } from '@/shared/types';
import { CharacterConfig } from '@/utils/character';
import { PlayerInput } from '@/shared/protocol';
import TouchGamepad from '@/components/TouchGamepad';
import charactersConfig from '@/data/data.json';
import monstersConfig from '@/data/monsters.json';
import bombConfig from '@/data/bombs.json';
import itemsConfig from '@/data/items.json';
import mapConfig from '@/data/map.json';

export default function GamePage() {
  const { user, getToken, loading } = useAuth();
  const router = useRouter();
  const { roomId } = router.query;
  const { socket, isConnected, connect, disconnect } = useSocket();
  const hasJoinedRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ClientGameEngine | null>(null);
  const [gameStatus, setGameStatus] = useState<string>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window);
  }, []);

  const playerName = typeof window !== 'undefined' ? sessionStorage.getItem('playerName') || 'Jogador' : 'Jogador';
  const characterIndex = typeof window !== 'undefined' ? parseInt(sessionStorage.getItem('characterIndex') || '0') : 0;

  // Conectar socket quando pagina carrega
  useEffect(() => {
    if (!loading && user && roomId) {
      connect();
    }
  }, [loading, user, roomId, connect]);

  // Join game quando socket conectar
  useEffect(() => {
    if (!isConnected || !socket || !user || !roomId || typeof roomId !== 'string') return;

    // Evitar join duplo em Strict Mode
    if (hasJoinedRef.current) return;

    const joinGame = async () => {
      const token = await getToken();
      if (!token) {
        setError('Erro de autenticacao.');
        return;
      }

      // Ler lista de jogadores esperados (salva pelo room/[id].tsx)
      let expectedPlayers: { id: string; name: string; characterIndex: number }[] = [];
      try {
        const stored = sessionStorage.getItem('expectedPlayers');
        if (stored) expectedPlayers = JSON.parse(stored);
      } catch {}

      // Ler opcoes da sala
      let roomOptions: RoomOptions = { blocks: true, items: true, monsters: false };
      try {
        const stored = sessionStorage.getItem('roomOptions');
        if (stored) roomOptions = JSON.parse(stored);
      } catch {}

      socket.emit('game:join', {
        roomId,
        token,
        playerName,
        characterIndex,
        expectedPlayers,
        roomOptions,
      });
      hasJoinedRef.current = true;
    };

    joinGame();

    // Listen for game events
    socket.on('game:state', (state: GameState) => {
      setGameStatus(state.status);

      if (!engineRef.current && canvasRef.current && user) {
        // Criar engine na primeira vez que receber estado
        // Combine player + monster character configs for rendering
        const allCharConfigs = [...charactersConfig, ...monstersConfig as CharacterConfig[]];
        const engine = new ClientGameEngine(
          canvasRef.current,
          user.uid,
          allCharConfigs,
          bombConfig,
          mapConfig.backgroundImageSrc,
          mapConfig.tiles,
          (input: PlayerInput) => {
            socket.emit('game:input', input);
          },
          itemsConfig as ItemsSpriteConfig,
        );
        engineRef.current = engine;
        engine.start();
      }

      if (engineRef.current) {
        engineRef.current.applyServerState(state);
      }
    });

    socket.on('game:error', (data) => {
      setError(data.message);
    });

    socket.on('game:over', (data) => {
      setGameStatus('finished');
    });

    socket.on('game:player-disconnected', (data) => {
      console.log(`Jogador desconectou: ${data.playerName}`);
    });

    return () => {
      socket.off('game:state');
      socket.off('game:error');
      socket.off('game:over');
      socket.off('game:player-disconnected');
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [isConnected, socket, user, roomId, getToken, playerName, characterIndex]);

  const handleBackToLobby = () => {
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }
    disconnect();
    router.push('/lobby');
  };

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '16px',
      }}>
        <h2 style={{ color: '#f44336' }}>Erro</h2>
        <p style={{ color: '#aaa' }}>{error}</p>
        <button
          onClick={handleBackToLobby}
          style={{
            padding: '12px 24px',
            background: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Voltar ao Lobby
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: '12px',
    }}>
      {gameStatus === 'connecting' && (
        <div style={{ color: '#ffd700', fontSize: '18px', marginBottom: '12px' }}>
          Conectando ao servidor...
        </div>
      )}

      {gameStatus === 'waiting' && (
        <div style={{ color: '#ffd700', fontSize: '18px', marginBottom: '12px' }}>
          Aguardando jogadores...
        </div>
      )}

      <div style={{
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

      {isTouchDevice && engineRef.current && (
        <TouchGamepad
          onMove={(dir) => engineRef.current?.startMove(dir)}
          onStop={() => engineRef.current?.stopMove()}
          onBomb={() => engineRef.current?.triggerBomb()}
        />
      )}

      {gameStatus === 'finished' && (
        <button
          onClick={handleBackToLobby}
          style={{
            padding: '12px 28px',
            background: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '16px',
            marginTop: '12px',
          }}
        >
          Voltar ao Lobby
        </button>
      )}
    </div>
  );
}
