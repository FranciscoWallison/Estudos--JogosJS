import { useState, useRef, useEffect, useCallback } from 'react';
import charactersConfig from '../../data/data.json';
import bombsConfig from '../../data/bombs.json';
import monstersConfig from '../../data/monsters.json';

const AVAILABLE_IMAGES = [
  '/assets/bomberman.png',
  '/assets/bomberman2.png',
  '/assets/bomberman copy.png',
  '/assets/bomberman2 - Copia.png',
  '/assets/bbsprits.png',
  '/assets/Arcade - Bomberman World - Bomberman.png',
  '/assets/Game Boy Advance - Bomberman Jetters_ Densetsu no Bomberman (JPN) - Enemies & Bosses - Enemies.png',
  '/assets/52695.png',
  '/assets/52695 (1).png',
  '/assets/60462.png',
  '/assets/60462 (1).png',
  '/assets/59913.png',
  '/assets/59913 (1).png',
  '/assets/41421.png',
  '/assets/7944.png',
  '/assets/map.png',
  '/assets/44163.jpg',
  '/assets/44163 (1).jpg',
];

const SPRITE_SIZE = 16;

interface SelectedSprite {
  x: number;
  y: number;
  w: number;
  h: number;
}

type TabId = 'explorer' | 'builder' | 'viewer';
type BgMode = 'dark' | 'light' | 'checker';

// --- Utility: draw checker background ---
function drawCheckerBg(ctx: CanvasRenderingContext2D, w: number, h: number, cellSize = 8) {
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#3a3a3a';
  for (let y = 0; y < h; y += cellSize) {
    for (let x = 0; x < w; x += cellSize) {
      if ((Math.floor(x / cellSize) + Math.floor(y / cellSize)) % 2 === 0) {
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }
  }
}

function drawBg(ctx: CanvasRenderingContext2D, w: number, h: number, mode: BgMode) {
  if (mode === 'dark') {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, w, h);
  } else if (mode === 'light') {
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(0, 0, w, h);
  } else {
    drawCheckerBg(ctx, w, h);
  }
}

// --- Thumbnail component ---
function SpriteThumbnail({ img, sprite, size = 32 }: { img: HTMLImageElement | null; sprite: SelectedSprite; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !img) return;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    drawCheckerBg(ctx, size, size, 4);
    ctx.drawImage(img, sprite.x, sprite.y, sprite.w, sprite.h, 0, 0, size, size);
  }, [img, sprite, size]);
  return <canvas ref={ref} style={{ imageRendering: 'pixelated', borderRadius: '2px' }} />;
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function SpriteTool() {
  // --- Shared state ---
  const [activeTab, setActiveTab] = useState<TabId>('explorer');
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageSrc, setImageSrc] = useState(AVAILABLE_IMAGES[0]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ w: 0, h: 0 });
  const [selectedList, setSelectedList] = useState<SelectedSprite[]>([]);

  // --- Explorer state ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [gridSize, setGridSize] = useState(16);
  const [zoom, setZoom] = useState(3);
  const [showGrid, setShowGrid] = useState(true);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ col: number; row: number } | null>(null);
  const [selected, setSelected] = useState<SelectedSprite | null>(null);
  const [customSize, setCustomSize] = useState({ w: 0, h: 0 });
  const [useCustomSize, setUseCustomSize] = useState(false);
  const [explorerBg, setExplorerBg] = useState<BgMode>('dark');

  // --- Builder state ---
  const animCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animFrameIndex, setAnimFrameIndex] = useState(0);
  const [animSpeed, setAnimSpeed] = useState(100);
  const [animScale, setAnimScale] = useState(6);
  const [flipH, setFlipH] = useState(false);
  const [onionSkin, setOnionSkin] = useState(false);
  const [builderBg, setBuilderBg] = useState<BgMode>('checker');

  // --- Viewer state ---
  const [viewerEntity, setViewerEntity] = useState('char_0');
  const [viewerPlaying, setViewerPlaying] = useState(true);
  const [viewerSpeed, setViewerSpeed] = useState(100);
  const [viewerFrameIndex, setViewerFrameIndex] = useState(0);
  const viewerCanvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const viewerImageRef = useRef<HTMLImageElement | null>(null);
  const [viewerImageLoaded, setViewerImageLoaded] = useState(false);

  // --- Load sprite sheet image ---
  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      imageRef.current = img;
      setImageSize({ w: img.naturalWidth, h: img.naturalHeight });
      setImageLoaded(true);
      setSelected(null);
      setCustomSize({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => setImageLoaded(false);
  }, [imageSrc]);

  // ============================================================
  // EXPLORER: Draw main canvas
  // ============================================================
  useEffect(() => {
    if (activeTab !== 'explorer') return;
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const w = img.naturalWidth * zoom;
    const h = img.naturalHeight * zoom;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    if (showGrid && gridSize > 0) {
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= img.naturalWidth; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x * zoom, 0);
        ctx.lineTo(x * zoom, h);
        ctx.stroke();
      }
      for (let y = 0; y <= img.naturalHeight; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y * zoom);
        ctx.lineTo(w, y * zoom);
        ctx.stroke();
      }
    }

    if (hoveredCell && gridSize > 0) {
      ctx.fillStyle = 'rgba(0, 150, 255, 0.3)';
      ctx.fillRect(
        hoveredCell.col * gridSize * zoom,
        hoveredCell.row * gridSize * zoom,
        gridSize * zoom,
        gridSize * zoom,
      );
    }

    if (selected) {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.strokeRect(selected.x * zoom, selected.y * zoom, selected.w * zoom, selected.h * zoom);
    }

    for (const s of selectedList) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x * zoom, s.y * zoom, s.w * zoom, s.h * zoom);
    }
  }, [activeTab, imageLoaded, zoom, showGrid, gridSize, hoveredCell, selected, selectedList]);

  // EXPLORER: Draw preview
  useEffect(() => {
    if (activeTab !== 'explorer') return;
    const preview = previewCanvasRef.current;
    const img = imageRef.current;
    if (!preview || !img || !selected) return;

    const previewScale = 4;
    preview.width = selected.w * previewScale;
    preview.height = selected.h * previewScale;

    const ctx = preview.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    drawBg(ctx, preview.width, preview.height, explorerBg);
    ctx.drawImage(img, selected.x, selected.y, selected.w, selected.h, 0, 0, preview.width, preview.height);
  }, [activeTab, selected, explorerBg]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = Math.floor((e.clientX - rect.left) * scaleX / zoom);
    const py = Math.floor((e.clientY - rect.top) * scaleY / zoom);
    setMousePos({ x: px, y: py });
    if (gridSize > 0) {
      setHoveredCell({ col: Math.floor(px / gridSize), row: Math.floor(py / gridSize) });
    }
  }, [zoom, gridSize]);

  const handleCanvasClick = useCallback(() => {
    if (!hoveredCell || gridSize <= 0) return;
    const spriteW = useCustomSize ? customSize.w : gridSize;
    const spriteH = useCustomSize ? customSize.h : gridSize;
    setSelected({ x: hoveredCell.col * gridSize, y: hoveredCell.row * gridSize, w: spriteW, h: spriteH });
  }, [hoveredCell, gridSize, useCustomSize, customSize]);

  const handlePixelClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gridSize > 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = Math.floor((e.clientX - rect.left) * scaleX / zoom);
    const py = Math.floor((e.clientY - rect.top) * scaleY / zoom);
    const w = useCustomSize ? customSize.w : 16;
    const h = useCustomSize ? customSize.h : 16;
    setSelected({ x: px, y: py, w, h });
  }, [zoom, useCustomSize, customSize, gridSize]);

  // --- Frame list management ---
  const addToList = () => {
    if (selected) setSelectedList(prev => [...prev, selected]);
  };

  const moveFrame = (index: number, dir: -1 | 1) => {
    setSelectedList(prev => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeFrame = (index: number) => {
    setSelectedList(prev => prev.filter((_, i) => i !== index));
  };

  const clearList = () => setSelectedList([]);

  const copyJSON = () => {
    const items = selectedList.length > 0 ? selectedList : (selected ? [selected] : []);
    if (items.length === 0) return;
    const json = JSON.stringify(items.map(s => ({ x: s.x, y: s.y })), null, 2);
    navigator.clipboard.writeText(json).catch(() => {});
  };

  // ============================================================
  // BUILDER: Animation playback engine
  // ============================================================
  useEffect(() => {
    if (activeTab !== 'builder' || !isPlaying || selectedList.length === 0) return;
    const interval = setInterval(() => {
      setAnimFrameIndex(prev => (prev + 1) % selectedList.length);
    }, animSpeed);
    return () => clearInterval(interval);
  }, [activeTab, isPlaying, animSpeed, selectedList.length]);

  // BUILDER: Draw animation canvas
  useEffect(() => {
    if (activeTab !== 'builder') return;
    const canvas = animCanvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded || selectedList.length === 0) return;

    const sprite = selectedList[animFrameIndex % selectedList.length];
    if (!sprite) return;

    const cw = sprite.w * animScale;
    const ch = sprite.h * animScale;
    canvas.width = cw;
    canvas.height = ch;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    drawBg(ctx, cw, ch, builderBg);

    // Onion skin: previous frame at 30% opacity
    if (onionSkin && selectedList.length > 1) {
      const prevIdx = (animFrameIndex - 1 + selectedList.length) % selectedList.length;
      const prevSprite = selectedList[prevIdx];
      ctx.globalAlpha = 0.3;
      if (flipH) {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(img, prevSprite.x, prevSprite.y, prevSprite.w, prevSprite.h, -cw, 0, cw, ch);
        ctx.restore();
      } else {
        ctx.drawImage(img, prevSprite.x, prevSprite.y, prevSprite.w, prevSprite.h, 0, 0, cw, ch);
      }
      ctx.globalAlpha = 1.0;
    }

    // Current frame
    if (flipH) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(img, sprite.x, sprite.y, sprite.w, sprite.h, -cw, 0, cw, ch);
      ctx.restore();
    } else {
      ctx.drawImage(img, sprite.x, sprite.y, sprite.w, sprite.h, 0, 0, cw, ch);
    }
  }, [activeTab, animFrameIndex, selectedList, imageLoaded, animScale, flipH, onionSkin, builderBg]);

  const stepFrame = (dir: 1 | -1) => {
    if (selectedList.length === 0) return;
    setIsPlaying(false);
    setAnimFrameIndex(prev => (prev + dir + selectedList.length) % selectedList.length);
  };

  // ============================================================
  // VIEWER: Build entity list
  // ============================================================
  const viewerEntities = useCallback(() => {
    const list: { id: string; label: string; imageSrc: string; animations: Record<string, { x: number; y: number }[]> }[] = [];

    (charactersConfig as any[]).forEach((c, i) => {
      list.push({
        id: `char_${i}`,
        label: `Personagem ${i}`,
        imageSrc: c.imageSrc,
        animations: { down: c.down, right: c.right, up: c.up, left: c.left, death: c.death },
      });
    });

    (monstersConfig as any[]).forEach(m => {
      list.push({
        id: `monster_${m.name}`,
        label: m.name,
        imageSrc: m.imageSrc,
        animations: { down: m.down, right: m.right, up: m.up, left: m.left, death: m.death },
      });
    });

    list.push({
      id: 'bomb',
      label: 'Bomba',
      imageSrc: (bombsConfig as any).imageSrc,
      animations: { bomb: (bombsConfig as any).bomb },
    });

    list.push({
      id: 'explosion',
      label: 'Explosao',
      imageSrc: (bombsConfig as any).imageSrc,
      animations: { explosion: (bombsConfig as any).explosion },
    });

    return list;
  }, []);

  const currentViewerEntity = viewerEntities().find(e => e.id === viewerEntity) || viewerEntities()[0];

  // VIEWER: Load entity image
  useEffect(() => {
    if (activeTab !== 'viewer') return;
    const img = new Image();
    img.src = currentViewerEntity.imageSrc;
    img.onload = () => {
      viewerImageRef.current = img;
      setViewerImageLoaded(true);
      setViewerFrameIndex(0);
    };
    img.onerror = () => setViewerImageLoaded(false);
  }, [activeTab, currentViewerEntity.imageSrc]);

  // VIEWER: Animation timer
  useEffect(() => {
    if (activeTab !== 'viewer' || !viewerPlaying) return;
    const interval = setInterval(() => {
      setViewerFrameIndex(prev => prev + 1);
    }, viewerSpeed);
    return () => clearInterval(interval);
  }, [activeTab, viewerPlaying, viewerSpeed]);

  // VIEWER: Draw all animation canvases
  useEffect(() => {
    if (activeTab !== 'viewer') return;
    const img = viewerImageRef.current;
    if (!img || !viewerImageLoaded) return;

    const scale = 4;
    const anims = currentViewerEntity.animations;

    for (const [key, frames] of Object.entries(anims)) {
      const canvas = viewerCanvasRefs.current[key];
      if (!canvas || !frames || frames.length === 0) continue;

      const fi = viewerFrameIndex % frames.length;
      const sprite = frames[fi];

      const cw = SPRITE_SIZE * scale;
      const ch = SPRITE_SIZE * scale;
      canvas.width = cw;
      canvas.height = ch;

      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      drawCheckerBg(ctx, cw, ch);

      const isLeft = key === 'left';
      if (isLeft) {
        // Use right animation frames with horizontal flip
        const rightFrames = anims['right'] || frames;
        const rfi = viewerFrameIndex % rightFrames.length;
        const rSprite = rightFrames[rfi];
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(img, rSprite.x, rSprite.y, SPRITE_SIZE, SPRITE_SIZE, -cw, 0, cw, ch);
        ctx.restore();
      } else {
        ctx.drawImage(img, sprite.x, sprite.y, SPRITE_SIZE, SPRITE_SIZE, 0, 0, cw, ch);
      }
    }
  }, [activeTab, viewerFrameIndex, viewerImageLoaded, currentViewerEntity]);

  // ============================================================
  // STYLES
  // ============================================================
  const labelStyle: React.CSSProperties = { color: '#aaa', fontSize: '12px', marginBottom: '4px', display: 'block' };
  const inputStyle: React.CSSProperties = { width: '60px', padding: '4px 6px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: 'white', fontSize: '13px' };
  const btnStyle: React.CSSProperties = { padding: '6px 12px', background: '#333', color: 'white', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' };
  const btnActiveStyle: React.CSSProperties = { ...btnStyle, background: '#2196f3', border: '1px solid #64b5f6' };
  const btnAccent: React.CSSProperties = { ...btnStyle, background: '#ff9800', border: '1px solid #ffb74d' };

  const tabBtn = (id: TabId, label: string) => (
    <button
      key={id}
      onClick={() => setActiveTab(id)}
      style={{
        padding: '10px 20px',
        background: activeTab === id ? '#2196f3' : '#222',
        color: activeTab === id ? 'white' : '#aaa',
        border: activeTab === id ? '1px solid #64b5f6' : '1px solid #444',
        borderBottom: activeTab === id ? '2px solid #2196f3' : '2px solid transparent',
        borderRadius: '6px 6px 0 0',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: activeTab === id ? 'bold' : 'normal',
      }}
    >
      {label}
    </button>
  );

  const bgToggle = (current: BgMode, setter: (v: BgMode) => void) => (
    <div style={{ display: 'flex', gap: '4px' }}>
      {(['dark', 'light', 'checker'] as BgMode[]).map(m => (
        <button key={m} onClick={() => setter(m)} style={current === m ? btnActiveStyle : btnStyle}>
          {m === 'dark' ? 'Escuro' : m === 'light' ? 'Claro' : 'Xadrez'}
        </button>
      ))}
    </div>
  );

  const dirLabel: Record<string, string> = { down: '\u2193 Down', right: '\u2192 Right', up: '\u2191 Up', left: '\u2190 Left', death: '\u2620 Death', bomb: 'Bomba', explosion: 'Explosao' };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div style={{ padding: '16px', minHeight: '100vh', color: 'white', background: '#0d0d0d' }}>
      <h1 style={{ fontSize: '24px', color: '#ffd700', margin: '0 0 12px 0' }}>
        Sprite Sheet Explorer & Animation Tool
      </h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '0' }}>
        {tabBtn('explorer', 'Explorer')}
        {tabBtn('builder', 'Animation Builder')}
        {tabBtn('viewer', 'Animation Viewer')}
      </div>
      <div style={{ borderTop: '1px solid #444', marginBottom: '16px' }} />

      {/* ========== TAB: EXPLORER ========== */}
      {activeTab === 'explorer' && (
        <>
          {/* Controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end', marginBottom: '16px', background: '#111', padding: '12px', borderRadius: '8px', border: '1px solid #333' }}>
            <div>
              <label style={labelStyle}>Imagem:</label>
              <select value={imageSrc} onChange={(e) => setImageSrc(e.target.value)} style={{ ...inputStyle, width: '200px' }}>
                {AVAILABLE_IMAGES.map(src => <option key={src} value={src}>{src.split('/').pop()}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Grid (px):</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[0, 8, 12, 16, 24, 32].map(size => (
                  <button key={size} onClick={() => setGridSize(size)} style={gridSize === size ? btnActiveStyle : btnStyle}>
                    {size === 0 ? 'Off' : size}
                  </button>
                ))}
                <input type="number" value={gridSize} onChange={(e) => setGridSize(Math.max(0, parseInt(e.target.value) || 0))} style={inputStyle} min={0} max={128} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Zoom:</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[1, 2, 3, 4, 6].map(z => (
                  <button key={z} onClick={() => setZoom(z)} style={zoom === z ? btnActiveStyle : btnStyle}>{z}x</button>
                ))}
              </div>
            </div>

            <div>
              <button onClick={() => setShowGrid(!showGrid)} style={showGrid ? btnActiveStyle : btnStyle}>
                Grid {showGrid ? 'ON' : 'OFF'}
              </button>
            </div>

            <div>
              <label style={labelStyle}>Tamanho sprite (WxH):</label>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button onClick={() => setUseCustomSize(!useCustomSize)} style={useCustomSize ? btnActiveStyle : btnStyle}>Custom</button>
                {useCustomSize && (
                  <>
                    <input type="number" value={customSize.w} onChange={(e) => setCustomSize(prev => ({ ...prev, w: parseInt(e.target.value) || 0 }))} style={{ ...inputStyle, width: '45px' }} min={1} />
                    <span style={{ color: '#666' }}>x</span>
                    <input type="number" value={customSize.h} onChange={(e) => setCustomSize(prev => ({ ...prev, h: parseInt(e.target.value) || 0 }))} style={{ ...inputStyle, width: '45px' }} min={1} />
                  </>
                )}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Fundo preview:</label>
              {bgToggle(explorerBg, setExplorerBg)}
            </div>
          </div>

          {/* Info bar */}
          <div style={{ display: 'flex', gap: '24px', marginBottom: '12px', padding: '8px 12px', background: '#1a1a1a', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace' }}>
            <span style={{ color: '#888' }}>Imagem: {imageSize.w}x{imageSize.h}px</span>
            {mousePos && <span style={{ color: '#4fc3f7' }}>Pixel: ({mousePos.x}, {mousePos.y})</span>}
            {hoveredCell && gridSize > 0 && <span style={{ color: '#81c784' }}>Cell: col={hoveredCell.col}, row={hoveredCell.row} | Pos: ({hoveredCell.col * gridSize}, {hoveredCell.row * gridSize})</span>}
            {selected && <span style={{ color: '#ff8a65' }}>Selecionado: x={selected.x}, y={selected.y}, {selected.w}x{selected.h}</span>}
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            {/* Main canvas */}
            <div style={{ overflow: 'auto', maxWidth: 'calc(100vw - 320px)', maxHeight: 'calc(100vh - 300px)', border: '1px solid #333', borderRadius: '4px', background: '#0a0a0a' }}>
              <canvas
                ref={canvasRef}
                onMouseMove={handleCanvasMouseMove}
                onMouseLeave={() => { setMousePos(null); setHoveredCell(null); }}
                onClick={gridSize > 0 ? handleCanvasClick : handlePixelClick}
                style={{ cursor: 'crosshair', imageRendering: 'pixelated', display: imageLoaded ? 'block' : 'none' }}
              />
              {!imageLoaded && <div style={{ padding: '40px', color: '#888', textAlign: 'center' }}>Carregando imagem...</div>}
            </div>

            {/* Side panel */}
            <div style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Preview */}
              {selected && (
                <div style={{ background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '12px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#ffd700' }}>Preview</h3>
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '8px', background: '#1a1a1a', borderRadius: '4px', marginBottom: '8px' }}>
                    <canvas ref={previewCanvasRef} style={{ imageRendering: 'pixelated' }} />
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#aaa' }}>
                    <div>x: {selected.x}, y: {selected.y}</div>
                    <div>size: {selected.w}x{selected.h}</div>
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
                    <button onClick={addToList} style={{ ...btnAccent, flex: 1 }}>+ Adicionar</button>
                    <button onClick={copyJSON} style={{ ...btnStyle, flex: 1 }}>Copiar JSON</button>
                  </div>
                </div>
              )}

              {/* Frame list with thumbnails */}
              {selectedList.length > 0 && (
                <div style={{ background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', color: '#ffd700' }}>Frames ({selectedList.length})</h3>
                    <button onClick={clearList} style={{ ...btnStyle, fontSize: '11px', padding: '2px 8px' }}>Limpar</button>
                  </div>
                  <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                    {selectedList.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px', background: i % 2 === 0 ? '#1a1a1a' : 'transparent', borderRadius: '3px' }}>
                        <SpriteThumbnail img={imageRef.current} sprite={s} size={28} />
                        <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#aaa', flex: 1 }}>
                          {i}: ({s.x},{s.y})
                        </span>
                        <button onClick={() => moveFrame(i, -1)} style={{ ...btnStyle, padding: '1px 5px', fontSize: '10px' }} title="Mover cima">{'\u25B2'}</button>
                        <button onClick={() => moveFrame(i, 1)} style={{ ...btnStyle, padding: '1px 5px', fontSize: '10px' }} title="Mover baixo">{'\u25BC'}</button>
                        <button onClick={() => removeFrame(i)} style={{ background: 'none', border: 'none', color: '#f44336', cursor: 'pointer', fontSize: '13px', padding: '0 2px' }}>x</button>
                      </div>
                    ))}
                  </div>
                  <button onClick={copyJSON} style={{ ...btnActiveStyle, width: '100%', marginTop: '8px' }}>
                    Copiar JSON dos Frames
                  </button>
                  <pre style={{ marginTop: '8px', padding: '8px', background: '#1a1a1a', borderRadius: '4px', fontSize: '10px', color: '#81c784', overflow: 'auto', maxHeight: '120px' }}>
                    {JSON.stringify(selectedList.map(s => ({ x: s.x, y: s.y })), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ========== TAB: ANIMATION BUILDER ========== */}
      {activeTab === 'builder' && (
        <>
          {selectedList.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#666' }}>
              <p style={{ fontSize: '18px', marginBottom: '8px' }}>Nenhum frame selecionado</p>
              <p style={{ fontSize: '14px' }}>Va para a tab <strong>Explorer</strong>, selecione sprites e adicione-os a lista de frames.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '20px' }}>
              {/* Left: Animation preview */}
              <div style={{ flex: 1 }}>
                {/* Controls */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end', marginBottom: '16px', background: '#111', padding: '12px', borderRadius: '8px', border: '1px solid #333' }}>
                  <div>
                    <label style={labelStyle}>Playback:</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => setIsPlaying(!isPlaying)} style={isPlaying ? btnActiveStyle : btnAccent}>
                        {isPlaying ? 'Pause' : 'Play'}
                      </button>
                      <button onClick={() => { setIsPlaying(false); setAnimFrameIndex(0); }} style={btnStyle}>Stop</button>
                      <button onClick={() => stepFrame(-1)} style={btnStyle}>{'\u25C0'} Prev</button>
                      <button onClick={() => stepFrame(1)} style={btnStyle}>Next {'\u25B6'}</button>
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Velocidade: {animSpeed}ms ({Math.round(1000 / animSpeed)} fps)</label>
                    <input
                      type="range"
                      min={30}
                      max={500}
                      value={animSpeed}
                      onChange={(e) => setAnimSpeed(parseInt(e.target.value))}
                      style={{ width: '160px', accentColor: '#2196f3' }}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Escala:</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[4, 6, 8, 10].map(s => (
                        <button key={s} onClick={() => setAnimScale(s)} style={animScale === s ? btnActiveStyle : btnStyle}>{s}x</button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Opcoes:</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => setFlipH(!flipH)} style={flipH ? btnActiveStyle : btnStyle}>Flip H</button>
                      <button onClick={() => setOnionSkin(!onionSkin)} style={onionSkin ? btnActiveStyle : btnStyle}>Onion Skin</button>
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Fundo:</label>
                    {bgToggle(builderBg, setBuilderBg)}
                  </div>
                </div>

                {/* Animation canvas */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '24px', background: '#111', borderRadius: '8px', border: '1px solid #333', marginBottom: '16px' }}>
                  <canvas ref={animCanvasRef} style={{ imageRendering: 'pixelated' }} />
                </div>

                {/* Frame indicator */}
                <div style={{ background: '#111', borderRadius: '8px', border: '1px solid #333', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#aaa' }}>
                      Frame: {animFrameIndex + 1} / {selectedList.length}
                    </span>
                    <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#4fc3f7' }}>
                      {selectedList[animFrameIndex % selectedList.length] && `(${selectedList[animFrameIndex % selectedList.length].x}, ${selectedList[animFrameIndex % selectedList.length].y})`}
                    </span>
                  </div>
                  {/* Frame strip with thumbnails */}
                  <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', padding: '4px 0' }}>
                    {selectedList.map((s, i) => (
                      <div
                        key={i}
                        onClick={() => { setIsPlaying(false); setAnimFrameIndex(i); }}
                        style={{
                          cursor: 'pointer',
                          border: i === animFrameIndex % selectedList.length ? '2px solid #ffd700' : '2px solid #333',
                          borderRadius: '4px',
                          padding: '2px',
                          background: i === animFrameIndex % selectedList.length ? '#332800' : 'transparent',
                          flexShrink: 0,
                        }}
                      >
                        <SpriteThumbnail img={imageRef.current} sprite={s} size={36} />
                        <div style={{ textAlign: 'center', fontSize: '9px', color: '#888', marginTop: '2px' }}>{i}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Frame list */}
              <div style={{ width: '260px', flexShrink: 0 }}>
                <div style={{ background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', color: '#ffd700' }}>Frames ({selectedList.length})</h3>
                    <button onClick={clearList} style={{ ...btnStyle, fontSize: '11px', padding: '2px 8px' }}>Limpar</button>
                  </div>
                  <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                    {selectedList.map((s, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '4px',
                        background: i === animFrameIndex % selectedList.length ? '#1a2a1a' : (i % 2 === 0 ? '#1a1a1a' : 'transparent'),
                        borderRadius: '3px',
                        border: i === animFrameIndex % selectedList.length ? '1px solid #4caf50' : '1px solid transparent',
                      }}>
                        <SpriteThumbnail img={imageRef.current} sprite={s} size={28} />
                        <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#aaa', flex: 1 }}>
                          {i}: ({s.x},{s.y})
                        </span>
                        <button onClick={() => moveFrame(i, -1)} style={{ ...btnStyle, padding: '1px 5px', fontSize: '10px' }}>{'\u25B2'}</button>
                        <button onClick={() => moveFrame(i, 1)} style={{ ...btnStyle, padding: '1px 5px', fontSize: '10px' }}>{'\u25BC'}</button>
                        <button onClick={() => removeFrame(i)} style={{ background: 'none', border: 'none', color: '#f44336', cursor: 'pointer', fontSize: '13px', padding: '0 2px' }}>x</button>
                      </div>
                    ))}
                  </div>
                  <button onClick={copyJSON} style={{ ...btnActiveStyle, width: '100%', marginTop: '12px' }}>
                    Copiar JSON
                  </button>
                  <pre style={{ marginTop: '8px', padding: '8px', background: '#1a1a1a', borderRadius: '4px', fontSize: '10px', color: '#81c784', overflow: 'auto', maxHeight: '150px' }}>
                    {JSON.stringify(selectedList.map(s => ({ x: s.x, y: s.y })), null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========== TAB: ANIMATION VIEWER ========== */}
      {activeTab === 'viewer' && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end', marginBottom: '20px', background: '#111', padding: '12px', borderRadius: '8px', border: '1px solid #333' }}>
            <div>
              <label style={labelStyle}>Entidade:</label>
              <select
                value={viewerEntity}
                onChange={(e) => { setViewerEntity(e.target.value); setViewerFrameIndex(0); setViewerImageLoaded(false); }}
                style={{ ...inputStyle, width: '200px' }}
              >
                <optgroup label="Personagens">
                  {viewerEntities().filter(e => e.id.startsWith('char_')).map(e => (
                    <option key={e.id} value={e.id}>{e.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Monstros">
                  {viewerEntities().filter(e => e.id.startsWith('monster_')).map(e => (
                    <option key={e.id} value={e.id}>{e.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Efeitos">
                  {viewerEntities().filter(e => !e.id.startsWith('char_') && !e.id.startsWith('monster_')).map(e => (
                    <option key={e.id} value={e.id}>{e.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Playback:</label>
              <button onClick={() => setViewerPlaying(!viewerPlaying)} style={viewerPlaying ? btnActiveStyle : btnAccent}>
                {viewerPlaying ? 'Pause' : 'Play'}
              </button>
            </div>

            <div>
              <label style={labelStyle}>Velocidade: {viewerSpeed}ms ({Math.round(1000 / viewerSpeed)} fps)</label>
              <input
                type="range"
                min={30}
                max={500}
                value={viewerSpeed}
                onChange={(e) => setViewerSpeed(parseInt(e.target.value))}
                style={{ width: '160px', accentColor: '#2196f3' }}
              />
            </div>
          </div>

          {/* Entity info */}
          <div style={{ marginBottom: '16px', padding: '8px 12px', background: '#1a1a1a', borderRadius: '6px', fontFamily: 'monospace', fontSize: '13px' }}>
            <span style={{ color: '#888' }}>Sprite sheet: </span>
            <span style={{ color: '#4fc3f7' }}>{currentViewerEntity.imageSrc}</span>
            <span style={{ color: '#888', marginLeft: '16px' }}>Animacoes: </span>
            <span style={{ color: '#81c784' }}>{Object.keys(currentViewerEntity.animations).join(', ')}</span>
          </div>

          {/* Animation previews grid */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            {Object.entries(currentViewerEntity.animations).map(([key, frames]) => (
              <div key={key} style={{ background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '12px', textAlign: 'center', minWidth: '100px' }}>
                <div style={{ fontSize: '13px', color: '#ffd700', marginBottom: '8px', fontWeight: 'bold' }}>
                  {dirLabel[key] || key}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '8px', background: '#0a0a0a', borderRadius: '4px', marginBottom: '8px' }}>
                  <canvas
                    ref={(el) => { viewerCanvasRefs.current[key] = el; }}
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#888' }}>
                  {(frames as any[]).length} frames
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#555', marginTop: '4px' }}>
                  {(frames as any[]).map((f: any, i: number) => (
                    <div key={i}>({f.x}, {f.y})</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
