import { useEffect, useRef } from 'react';
import { SPRITE_SIZE } from '@/shared/constants';
import charactersConfig from '@/data/data.json';

interface CharacterSelectorProps {
  selected: number;
  onSelect: (index: number) => void;
}

const PREVIEW_SIZE = 48;

export default function CharacterSelector({ selected, onSelect }: CharacterSelectorProps) {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    charactersConfig.forEach((config, index) => {
      const canvas = canvasRefs.current[index];
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.src = config.imageSrc;
      img.onload = () => {
        ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
        ctx.imageSmoothingEnabled = false;
        // Draw first frame of "down" animation
        const sprite = config.down[0];
        ctx.drawImage(
          img,
          sprite.x, sprite.y, SPRITE_SIZE, SPRITE_SIZE,
          0, 0, PREVIEW_SIZE, PREVIEW_SIZE
        );
      };
    });
  }, []);

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
      {charactersConfig.map((_, index) => (
        <button
          key={index}
          onClick={() => onSelect(index)}
          style={{
            padding: '4px',
            border: selected === index ? '2px solid #ffd700' : '2px solid #555',
            borderRadius: '8px',
            background: selected === index ? '#333' : '#1a1a1a',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <canvas
            ref={(el) => { canvasRefs.current[index] = el; }}
            width={PREVIEW_SIZE}
            height={PREVIEW_SIZE}
            style={{ display: 'block', imageRendering: 'pixelated' }}
          />
        </button>
      ))}
    </div>
  );
}
