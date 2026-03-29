import { useCallback, useRef } from 'react';
import { Direction } from '@/shared/types';

interface TouchGamepadProps {
  onMove: (direction: Direction) => void;
  onStop: () => void;
  onBomb: () => void;
}

const BTN_SIZE = 56;
const BOMB_SIZE = 64;
const GAP = 4;

const btnBase: React.CSSProperties = {
  width: BTN_SIZE,
  height: BTN_SIZE,
  borderRadius: 10,
  border: '2px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.12)',
  color: 'rgba(255,255,255,0.7)',
  fontSize: 22,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  touchAction: 'none',
  pointerEvents: 'auto',
  cursor: 'pointer',
};

export default function TouchGamepad({ onMove, onStop, onBomb }: TouchGamepadProps) {
  const activeRef = useRef<string | null>(null);

  const handleStart = useCallback((dir: Direction) => (e: React.TouchEvent) => {
    e.preventDefault();
    activeRef.current = dir;
    onMove(dir);
  }, [onMove]);

  const handleEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    activeRef.current = null;
    onStop();
  }, [onStop]);

  const handleBomb = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    onBomb();
  }, [onBomb]);

  return (
    <div style={{
      position: 'fixed',
      bottom: 12,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      padding: '0 20px',
      pointerEvents: 'none',
      zIndex: 1000,
      touchAction: 'none',
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }}>
      {/* D-Pad */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: GAP,
        pointerEvents: 'none',
      }}>
        {/* Up */}
        <div
          onTouchStart={handleStart('up')}
          onTouchEnd={handleEnd}
          onTouchCancel={handleEnd}
          style={btnBase}
        >
          &#9650;
        </div>
        {/* Left + Center + Right */}
        <div style={{ display: 'flex', gap: GAP, pointerEvents: 'none' }}>
          <div
            onTouchStart={handleStart('left')}
            onTouchEnd={handleEnd}
            onTouchCancel={handleEnd}
            style={btnBase}
          >
            &#9664;
          </div>
          <div style={{ width: BTN_SIZE, height: BTN_SIZE }} />
          <div
            onTouchStart={handleStart('right')}
            onTouchEnd={handleEnd}
            onTouchCancel={handleEnd}
            style={btnBase}
          >
            &#9654;
          </div>
        </div>
        {/* Down */}
        <div
          onTouchStart={handleStart('down')}
          onTouchEnd={handleEnd}
          onTouchCancel={handleEnd}
          style={btnBase}
        >
          &#9660;
        </div>
      </div>

      {/* Bomb Button */}
      <div
        onTouchStart={handleBomb}
        style={{
          width: BOMB_SIZE,
          height: BOMB_SIZE,
          borderRadius: '50%',
          border: '2px solid rgba(255,80,80,0.4)',
          background: 'rgba(255,60,60,0.3)',
          color: 'rgba(255,255,255,0.8)',
          fontSize: 24,
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'none',
          pointerEvents: 'auto',
          cursor: 'pointer',
          marginBottom: BTN_SIZE + GAP,
        }}
      >
        B
      </div>
    </div>
  );
}
