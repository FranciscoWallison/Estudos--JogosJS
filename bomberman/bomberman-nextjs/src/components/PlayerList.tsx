import { useEffect, useRef } from 'react';
import { SPRITE_SIZE } from '@/shared/constants';
import charactersConfig from '@/data/data.json';

interface PlayerInfo {
  id: string;
  name: string;
  characterIndex: number;
  isReady: boolean;
  isHost: boolean;
}

interface PlayerListProps {
  players: PlayerInfo[];
  currentUserId: string;
}

const AVATAR_SIZE = 32;

function PlayerAvatar({ characterIndex }: { characterIndex: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const config = charactersConfig[characterIndex];
    if (!config) return;

    const img = new Image();
    img.src = config.imageSrc;
    img.onload = () => {
      ctx.clearRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
      ctx.imageSmoothingEnabled = false;
      const sprite = config.down[0];
      ctx.drawImage(
        img,
        sprite.x, sprite.y, SPRITE_SIZE, SPRITE_SIZE,
        0, 0, AVATAR_SIZE, AVATAR_SIZE
      );
    };
  }, [characterIndex]);

  return (
    <canvas
      ref={canvasRef}
      width={AVATAR_SIZE}
      height={AVATAR_SIZE}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

export default function PlayerList({ players, currentUserId }: PlayerListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '400px' }}>
      {players.map((player) => (
        <div
          key={player.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 12px',
            background: player.id === currentUserId ? '#2a2a3a' : '#1a1a2a',
            borderRadius: '8px',
            border: `1px solid ${player.isReady ? '#4caf50' : '#555'}`,
          }}
        >
          <PlayerAvatar characterIndex={player.characterIndex} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
              {player.name}
              {player.isHost && (
                <span style={{ marginLeft: '8px', color: '#ffd700', fontSize: '12px' }}>
                  HOST
                </span>
              )}
              {player.id === currentUserId && (
                <span style={{ marginLeft: '8px', color: '#64b5f6', fontSize: '12px' }}>
                  (Voce)
                </span>
              )}
            </div>
          </div>
          <div style={{
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            background: player.isReady ? '#4caf50' : '#666',
            color: 'white',
          }}>
            {player.isReady ? 'PRONTO' : 'ESPERANDO'}
          </div>
        </div>
      ))}
    </div>
  );
}
