import { RoomData } from '@/lib/lobbyService';

interface RoomCardProps {
  room: RoomData;
  onJoin: (roomId: string) => void;
}

export default function RoomCard({ room, onJoin }: RoomCardProps) {
  const playerCount = room.players ? Object.keys(room.players).length : 0;
  const isFull = playerCount >= room.info.maxPlayers;

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
        </div>
      </div>
      <button
        onClick={() => onJoin(room.id)}
        disabled={isFull}
        style={{
          padding: '8px 20px',
          background: isFull ? '#444' : '#4caf50',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: isFull ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          fontSize: '14px',
        }}
      >
        {isFull ? 'Lotada' : 'Entrar'}
      </button>
    </div>
  );
}
