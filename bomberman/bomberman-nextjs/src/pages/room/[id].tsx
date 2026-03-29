import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import PlayerList from '@/components/PlayerList';
import CharacterSelector from '@/components/CharacterSelector';
import {
  RoomData,
  subscribeToRoom,
  leaveRoom,
  toggleReady,
  changeCharacter,
  startGame,
  updateRoomOptions,
} from '@/lib/lobbyService';
import { RoomOptions } from '@/shared/types';
import { MIN_PLAYERS } from '@/shared/constants';

export default function Room() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { id: roomId } = router.query;
  const [room, setRoom] = useState<RoomData | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playerName = typeof window !== 'undefined' ? sessionStorage.getItem('playerName') || 'Jogador' : 'Jogador';

  useEffect(() => {
    if (!roomId || typeof roomId !== 'string') return;

    const unsubscribe = subscribeToRoom(
      roomId,
      (data) => {
        if (!data) {
          // Sala foi deletada
          router.push('/lobby');
          return;
        }
        setRoom(data);

        // Se o jogo iniciou, salvar lista de jogadores e opcoes, navegar para a tela do jogo
        if (data.info.status === 'playing') {
          if (data.players) {
            const expectedPlayers = Object.entries(data.players).map(([id, p]) => ({
              id,
              name: p.name,
              characterIndex: p.characterIndex,
            }));
            sessionStorage.setItem('expectedPlayers', JSON.stringify(expectedPlayers));
          }
          if (data.info.options) {
            sessionStorage.setItem('roomOptions', JSON.stringify(data.info.options));
          }
          router.push(`/game/${roomId}`);
        }
      },
      (err) => setError(err)
    );

    return () => unsubscribe();
  }, [roomId, router]);

  const handleLeave = async () => {
    if (!user || !roomId || typeof roomId !== 'string') return;
    try {
      await leaveRoom(user.uid, roomId);
      router.push('/lobby');
    } catch (err: any) {
      console.error('Erro ao sair da sala:', err);
      setError(err.message || 'Erro ao sair da sala.');
    }
  };

  const handleToggleReady = async () => {
    if (!user || !roomId || typeof roomId !== 'string') return;
    try {
      await toggleReady(user.uid, roomId);
    } catch (err: any) {
      console.error('Erro ao alterar status:', err);
      setError(err.message || 'Erro ao alterar status.');
    }
  };

  const handleChangeCharacter = async (index: number) => {
    if (!user || !roomId || typeof roomId !== 'string') return;
    try {
      await changeCharacter(user.uid, roomId, index);
      sessionStorage.setItem('characterIndex', String(index));
    } catch (err: any) {
      console.error('Erro ao trocar personagem:', err);
      setError(err.message || 'Erro ao trocar personagem.');
    }
  };

  const handleToggleOption = async (key: keyof RoomOptions) => {
    if (!isHost || !roomId || typeof roomId !== 'string' || !room) return;
    const defaults: RoomOptions = { blocks: true, items: true, monsters: false };
    const currentVal = room.info.options?.[key] ?? defaults[key];
    const updates: Partial<RoomOptions> = { [key]: !currentVal };
    // If turning blocks OFF, also turn items OFF (items depend on blocks)
    if (key === 'blocks' && currentVal) {
      updates.items = false;
    }
    try {
      await updateRoomOptions(roomId, updates);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar opcoes.');
    }
  };

  const handleStartGame = async () => {
    if (!roomId || typeof roomId !== 'string') return;
    setStarting(true);
    try {
      await startGame(roomId);
    } catch (err: any) {
      console.error('Erro ao iniciar jogo:', err);
      setError(err.message || 'Erro ao iniciar jogo.');
      setStarting(false);
    }
  };

  if (loading || (!room && !error)) {
    return <div style={{ textAlign: 'center', paddingTop: '100px' }}><h2>Carregando sala...</h2></div>;
  }

  if (error && !room) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '16px',
        padding: '20px',
      }}>
        <div style={{
          background: '#1a1a2e',
          border: '1px solid #f44336',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '500px',
          width: '100%',
        }}>
          <h3 style={{ color: '#f44336', margin: '0 0 12px 0' }}>Erro</h3>
          <p style={{ color: '#ffcdd2', margin: 0, lineHeight: '1.5' }}>{error}</p>
        </div>
        <button
          onClick={() => router.push('/lobby')}
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

  if (!room) {
    return <div style={{ textAlign: 'center', paddingTop: '100px' }}><h2>Sala nao encontrada.</h2></div>;
  }

  const players = room.players
    ? Object.entries(room.players).map(([id, data]) => ({
        id,
        name: data.name,
        characterIndex: data.characterIndex,
        isReady: data.isReady,
        isHost: id === room.info.hostId,
      }))
    : [];

  const isHost = user?.uid === room.info.hostId;
  const playerCount = players.length;
  const allReady = players.every(p => p.isReady || p.id === room.info.hostId);
  const canStart = isHost && allReady && playerCount >= MIN_PLAYERS;

  const currentPlayer = user ? room.players?.[user.uid] : null;
  const currentCharIndex = currentPlayer?.characterIndex || 0;
  const options: RoomOptions = room.info.options || { blocks: true, items: true, monsters: false };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '20px',
      padding: '40px 16px 24px',
      minHeight: '100vh',
      width: '100%',
      boxSizing: 'border-box',
    }}>
      <h1 style={{ fontSize: '28px', color: '#ffd700', margin: 0 }}>{room.info.name}</h1>

      {error && (
        <div style={{
          background: '#1a1a2e',
          border: '1px solid #f44336',
          borderRadius: '8px',
          padding: '12px 16px',
          maxWidth: '400px',
          width: '100%',
        }}>
          <p style={{ color: '#ffcdd2', margin: 0, fontSize: '14px' }}>{error}</p>
          <button
            onClick={() => setError(null)}
            style={{
              marginTop: '6px',
              padding: '4px 12px',
              background: '#333',
              color: '#aaa',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Fechar
          </button>
        </div>
      )}
      <div style={{ color: '#aaa', fontSize: '14px' }}>
        {playerCount}/{room.info.maxPlayers} jogadores
      </div>

      <PlayerList players={players} currentUserId={user?.uid || ''} />

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        background: '#111',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #333',
        width: '100%',
        maxWidth: '400px',
      }}>
        <label style={{ color: '#aaa', fontSize: '14px' }}>Trocar personagem:</label>
        <CharacterSelector selected={currentCharIndex} onSelect={handleChangeCharacter} />
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        background: '#111',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #333',
        width: '100%',
        maxWidth: '400px',
      }}>
        <label style={{ color: '#aaa', fontSize: '14px', marginBottom: '4px' }}>
          Opcoes da partida{!isHost ? ' (definidas pelo host)' : ''}:
        </label>
        {([
          { key: 'blocks' as const, label: 'Blocos', desc: 'Blocos destrutiveis no mapa' },
          { key: 'items' as const, label: 'Itens', desc: 'Power-ups ao destruir blocos' },
          { key: 'monsters' as const, label: 'Monstros', desc: 'Inimigos controlados por IA' },
        ]).map(opt => {
          const isOn = options[opt.key];
          const disabled = !isHost || (opt.key === 'items' && !options.blocks);
          return (
            <div
              key={opt.key}
              onClick={() => !disabled && handleToggleOption(opt.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: disabled ? '#0a0a0a' : '#1a1a1a',
                borderRadius: '6px',
                cursor: disabled ? 'default' : 'pointer',
                opacity: disabled && !isHost ? 0.7 : 1,
                border: `1px solid ${isOn ? '#4caf50' : '#333'}`,
              }}
            >
              <div>
                <div style={{ color: disabled && opt.key === 'items' ? '#555' : '#ddd', fontSize: '14px', fontWeight: 'bold' }}>
                  {opt.label}
                </div>
                <div style={{ color: '#777', fontSize: '12px' }}>{opt.desc}</div>
              </div>
              <div style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                background: isOn ? '#4caf50' : '#333',
                position: 'relative',
                transition: 'background 0.2s',
                opacity: disabled && opt.key === 'items' && !options.blocks ? 0.4 : 1,
              }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'white',
                  position: 'absolute',
                  top: '2px',
                  left: isOn ? '22px' : '2px',
                  transition: 'left 0.2s',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={handleLeave}
          style={{
            padding: '12px 28px',
            background: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
          }}
        >
          Sair
        </button>

        {!isHost && (
          <button
            onClick={handleToggleReady}
            style={{
              padding: '12px 28px',
              background: currentPlayer?.isReady ? '#ff9800' : '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            {currentPlayer?.isReady ? 'Cancelar' : 'Pronto'}
          </button>
        )}

        {isHost && (
          <button
            onClick={handleStartGame}
            disabled={!canStart || starting}
            style={{
              padding: '12px 28px',
              background: !canStart || starting ? '#444' : '#ff6b00',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: !canStart || starting ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            {starting ? 'Iniciando...' : 'Iniciar Jogo'}
          </button>
        )}
      </div>

      {isHost && !canStart && playerCount >= MIN_PLAYERS && (
        <div style={{ color: '#ff9800', fontSize: '13px' }}>
          Aguardando todos os jogadores ficarem prontos...
        </div>
      )}

      {playerCount < MIN_PLAYERS && (
        <div style={{ color: '#ff9800', fontSize: '13px' }}>
          Minimo de {MIN_PLAYERS} jogadores para iniciar.
        </div>
      )}
    </div>
  );
}
