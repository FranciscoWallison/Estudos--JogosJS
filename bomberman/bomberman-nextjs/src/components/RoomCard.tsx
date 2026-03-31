import { RoomData } from '@/lib/lobbyService';

interface RoomCardProps {
  room: RoomData;
  onJoin: (roomId: string) => void;
  joining?: boolean;
}

export default function RoomCard({ room, onJoin, joining = false }: RoomCardProps) {
  const playerCount = room.players ? Object.keys(room.players).length : 0;
  const isFull = playerCount >= room.info.maxPlayers;
  const disabled = isFull || joining;

  const optionTags = [];
  if (room.info.options?.blocks) optionTags.push('Blocos');
  if (room.info.options?.items) optionTags.push('Itens');
  if (room.info.options?.monsters) optionTags.push('Monstros');

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: '#1a1a2a',
      borderRadius: '8px',
      border: '1px solid #333',
    }}>
      <div>
        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{room.info.name}</div>
        <div style={{ color: '#aaa', fontSize: '13px', marginTop: '4px' }}>
          {playerCount}/{room.info.maxPlayers} jogadores
          {optionTags.length > 0 && (
            <span style={{ marginLeft: '8px', color: '#666' }}>· {optionTags.join(', ')}</span>
          )}
        </div>
      </div>
      <button
        onClick={() => !disabled && onJoin(room.id)}
        disabled={disabled}
        style={{
          padding: '8px 20px',
          background: disabled ? '#444' : '#4caf50',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          fontSize: '14px',
          minWidth: '80px',
        }}
      >
        {joining ? '...' : isFull ? 'Lotada' : 'Entrar'}
      </button>
    </div>
  );
}
