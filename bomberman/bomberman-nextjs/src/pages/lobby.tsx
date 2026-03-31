import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import RoomCard from '@/components/RoomCard';
import { RoomData, subscribeToRoomList, createRoom, joinRoom, quickMatch } from '@/lib/lobbyService';
import { MAX_PLAYERS } from '@/shared/constants';

export default function Lobby() {
  const { user, loading, authError } = useAuth();
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [quickMatching, setQuickMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playerName = typeof window !== 'undefined' ? localStorage.getItem('playerName') || 'Jogador' : 'Jogador';
  const characterIndex = typeof window !== 'undefined' ? parseInt(localStorage.getItem('characterIndex') || '0') : 0;

  useEffect(() => {
    const unsubscribe = subscribeToRoomList(setRooms, (err) => setError(err));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [loading, user, router]);

  const handleCreateRoom = async () => {
    if (!user || !roomName.trim()) return;
    setCreating(true);
    try {
      const roomId = await createRoom(user.uid, playerName, roomName.trim(), maxPlayers, characterIndex);
      router.push(`/room/${roomId}`);
    } catch (err: any) {
      console.error('Erro ao criar sala:', err);
      setError(err.message || 'Erro ao criar sala.');
      setCreating(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    if (!user || joiningId) return;
    setJoiningId(roomId);
    try {
      const success = await joinRoom(user.uid, playerName, roomId, characterIndex);
      if (success) {
        router.push(`/room/${roomId}`);
      } else {
        setError('Sala cheia ou nao disponivel. Tente outra sala.');
      }
    } catch (err: any) {
      console.error('Erro ao entrar na sala:', err);
      setError(err.message || 'Erro ao entrar na sala.');
    } finally {
      setJoiningId(null);
    }
  };

  const handleQuickMatch = async () => {
    if (!user || quickMatching) return;
    setQuickMatching(true);
    try {
      const roomId = await quickMatch(user.uid, playerName, characterIndex);
      router.push(`/room/${roomId}`);
    } catch (err: any) {
      console.error('Erro no quick match:', err);
      setError(err.message || 'Erro ao buscar partida.');
      setQuickMatching(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', paddingTop: '100px' }}><h2>Carregando...</h2></div>;
  }

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
      <h1 style={{ fontSize: '32px', color: '#ffd700', margin: 0 }}>Salas Disponiveis</h1>

      {(error || authError) && (
        <div style={{
          background: '#1a1a2e',
          border: '1px solid #f44336',
          borderRadius: '8px',
          padding: '16px',
          maxWidth: '500px',
          width: '100%',
        }}>
          <p style={{ color: '#ffcdd2', margin: 0, lineHeight: '1.5' }}>{error || authError}</p>
          {error && (
            <button
              onClick={() => setError(null)}
              style={{
                marginTop: '8px',
                padding: '6px 14px',
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
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '10px 24px',
            background: '#555',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Voltar
        </button>
        <button
          onClick={handleQuickMatch}
          disabled={quickMatching}
          style={{
            padding: '10px 24px',
            background: quickMatching ? '#444' : '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: quickMatching ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
          }}
        >
          {quickMatching ? 'Buscando...' : 'Quick Match'}
        </button>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            padding: '10px 24px',
            background: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
          }}
        >
          Criar Sala
        </button>
      </div>

      {showCreateForm && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          background: '#111',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #333',
          width: '100%',
          maxWidth: '400px',
        }}>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Nome da sala..."
            maxLength={30}
            style={{
              padding: '10px',
              background: '#222',
              border: '1px solid #444',
              borderRadius: '6px',
              color: 'white',
              fontSize: '14px',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ color: '#aaa', fontSize: '14px' }}>Max jogadores:</label>
            <select
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
              style={{
                padding: '8px',
                background: '#222',
                border: '1px solid #444',
                borderRadius: '6px',
                color: 'white',
              }}
            >
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </div>
          <button
            onClick={handleCreateRoom}
            disabled={!roomName.trim() || creating}
            style={{
              padding: '10px',
              background: !roomName.trim() || creating ? '#444' : '#ff6b00',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: !roomName.trim() || creating ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {creating ? 'Criando...' : 'Criar'}
          </button>
        </div>
      )}

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '100%',
        maxWidth: '500px',
      }}>
        {rooms.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
            Nenhuma sala disponivel. Crie uma!
          </div>
        ) : (
          rooms.map((room) => (
            <RoomCard key={room.id} room={room} onJoin={handleJoinRoom} joining={joiningId === room.id} />
          ))
        )}
      </div>
    </div>
  );
}
