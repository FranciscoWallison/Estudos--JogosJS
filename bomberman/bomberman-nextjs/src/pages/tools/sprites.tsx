import { useState, useRef, useEffect, useCallback } from 'react';

const AVAILABLE_IMAGES = [
  '/assets/bbsprits.png',
  '/assets/bomberman2.png',
  '/assets/bomberman.png',
  '/assets/bomberman copy.png',
  '/assets/Arcade - Bomberman World - Bomberman.png',
  '/assets/map.png',
];

interface SelectedSprite {
  x: number;
  y: number;
  w: number;
  h: number;
}

export default function SpriteTool() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [imageSrc, setImageSrc] = useState(AVAILABLE_IMAGES[0]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ w: 0, h: 0 });
  const [gridSize, setGridSize] = useState(16);
  const [zoom, setZoom] = useState(3);
  const [showGrid, setShowGrid] = useState(true);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ col: number; row: number } | null>(null);
  const [selected, setSelected] = useState<SelectedSprite | null>(null);
  const [selectedList, setSelectedList] = useState<SelectedSprite[]>([]);
  const [customSize, setCustomSize] = useState({ w: 0, h: 0 });
  const [useCustomSize, setUseCustomSize] = useState(false);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      imageRef.current = img;
      setImageSize({ w: img.naturalWidth, h: img.naturalHeight });
      setImageLoaded(true);
      setSelected(null);
      setSelectedList([]);
      setCustomSize({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => {
      setImageLoaded(false);
    };
  }, [imageSrc]);

  // Draw canvas
  useEffect(() => {
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

    // Draw grid
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

    // Highlight hovered cell
    if (hoveredCell && gridSize > 0) {
      ctx.fillStyle = 'rgba(0, 150, 255, 0.3)';
      ctx.fillRect(
        hoveredCell.col * gridSize * zoom,
        hoveredCell.row * gridSize * zoom,
        gridSize * zoom,
        gridSize * zoom,
      );
    }

    // Highlight selected sprite
    if (selected) {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        selected.x * zoom,
        selected.y * zoom,
        selected.w * zoom,
        selected.h * zoom,
      );
    }

    // Highlight all saved selections
    for (const s of selectedList) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        s.x * zoom,
        s.y * zoom,
        s.w * zoom,
        s.h * zoom,
      );
    }
  }, [imageLoaded, zoom, showGrid, gridSize, hoveredCell, selected, selectedList]);

  // Draw preview
  useEffect(() => {
    const preview = previewCanvasRef.current;
    const img = imageRef.current;
    if (!preview || !img || !selected) return;

    const previewScale = 4;
    preview.width = selected.w * previewScale;
    preview.height = selected.h * previewScale;

    const ctx = preview.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, preview.width, preview.height);
    ctx.drawImage(
      img,
      selected.x, selected.y, selected.w, selected.h,
      0, 0, preview.width, preview.height,
    );
  }, [selected]);

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
      setHoveredCell({
        col: Math.floor(px / gridSize),
        row: Math.floor(py / gridSize),
      });
    }
  }, [zoom, gridSize]);

  const handleCanvasClick = useCallback(() => {
    if (!hoveredCell || gridSize <= 0) return;
    const spriteW = useCustomSize ? customSize.w : gridSize;
    const spriteH = useCustomSize ? customSize.h : gridSize;
    setSelected({
      x: hoveredCell.col * gridSize,
      y: hoveredCell.row * gridSize,
      w: spriteW,
      h: spriteH,
    });
  }, [hoveredCell, gridSize, useCustomSize, customSize]);

  const handlePixelClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gridSize > 0) return; // grid mode uses cell click
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

  const addToList = () => {
    if (selected) {
      setSelectedList(prev => [...prev, selected]);
    }
  };

  const clearList = () => {
    setSelectedList([]);
  };

  const copyJSON = () => {
    const items = selectedList.length > 0 ? selectedList : (selected ? [selected] : []);
    if (items.length === 0) return;

    const json = JSON.stringify(
      items.map(s => ({ x: s.x, y: s.y })),
      null,
      2,
    );
    navigator.clipboard.writeText(json).catch(() => {});
  };

  const labelStyle: React.CSSProperties = {
    color: '#aaa',
    fontSize: '12px',
    marginBottom: '4px',
    display: 'block',
  };

  const inputStyle: React.CSSProperties = {
    width: '60px',
    padding: '4px 6px',
    background: '#222',
    border: '1px solid #444',
    borderRadius: '4px',
    color: 'white',
    fontSize: '13px',
  };

  const btnStyle: React.CSSProperties = {
    padding: '6px 12px',
    background: '#333',
    color: 'white',
    border: '1px solid #555',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  };

  const btnActiveStyle: React.CSSProperties = {
    ...btnStyle,
    background: '#2196f3',
    border: '1px solid #64b5f6',
  };

  return (
    <div style={{ padding: '16px', minHeight: '100vh', color: 'white' }}>
      <h1 style={{ fontSize: '24px', color: '#ffd700', margin: '0 0 16px 0' }}>
        Sprite Sheet Explorer
      </h1>

      {/* Controls */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'flex-end',
        marginBottom: '16px',
        background: '#111',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid #333',
      }}>
        {/* Image selector */}
        <div>
          <label style={labelStyle}>Imagem:</label>
          <select
            value={imageSrc}
            onChange={(e) => setImageSrc(e.target.value)}
            style={{
              ...inputStyle,
              width: '200px',
            }}
          >
            {AVAILABLE_IMAGES.map(src => (
              <option key={src} value={src}>{src.split('/').pop()}</option>
            ))}
          </select>
        </div>

        {/* Grid size */}
        <div>
          <label style={labelStyle}>Grid (px):</label>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[0, 8, 12, 16, 24, 32].map(size => (
              <button
                key={size}
                onClick={() => setGridSize(size)}
                style={gridSize === size ? btnActiveStyle : btnStyle}
              >
                {size === 0 ? 'Off' : size}
              </button>
            ))}
            <input
              type="number"
              value={gridSize}
              onChange={(e) => setGridSize(Math.max(0, parseInt(e.target.value) || 0))}
              style={inputStyle}
              min={0}
              max={128}
            />
          </div>
        </div>

        {/* Zoom */}
        <div>
          <label style={labelStyle}>Zoom:</label>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[1, 2, 3, 4, 6].map(z => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                style={zoom === z ? btnActiveStyle : btnStyle}
              >
                {z}x
              </button>
            ))}
          </div>
        </div>

        {/* Show grid toggle */}
        <div>
          <button
            onClick={() => setShowGrid(!showGrid)}
            style={showGrid ? btnActiveStyle : btnStyle}
          >
            Grid {showGrid ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Custom sprite size */}
        <div>
          <label style={labelStyle}>Tamanho sprite (WxH):</label>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button
              onClick={() => setUseCustomSize(!useCustomSize)}
              style={useCustomSize ? btnActiveStyle : btnStyle}
            >
              Custom
            </button>
            {useCustomSize && (
              <>
                <input
                  type="number"
                  value={customSize.w}
                  onChange={(e) => setCustomSize(prev => ({ ...prev, w: parseInt(e.target.value) || 0 }))}
                  style={{ ...inputStyle, width: '45px' }}
                  min={1}
                />
                <span style={{ color: '#666' }}>x</span>
                <input
                  type="number"
                  value={customSize.h}
                  onChange={(e) => setCustomSize(prev => ({ ...prev, h: parseInt(e.target.value) || 0 }))}
                  style={{ ...inputStyle, width: '45px' }}
                  min={1}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Info bar */}
      <div style={{
        display: 'flex',
        gap: '24px',
        marginBottom: '12px',
        padding: '8px 12px',
        background: '#1a1a1a',
        borderRadius: '6px',
        fontSize: '13px',
        fontFamily: 'monospace',
      }}>
        <span style={{ color: '#888' }}>
          Imagem: {imageSize.w}x{imageSize.h}px
        </span>
        {mousePos && (
          <span style={{ color: '#4fc3f7' }}>
            Pixel: ({mousePos.x}, {mousePos.y})
          </span>
        )}
        {hoveredCell && gridSize > 0 && (
          <span style={{ color: '#81c784' }}>
            Cell: col={hoveredCell.col}, row={hoveredCell.row} | Pos: ({hoveredCell.col * gridSize}, {hoveredCell.row * gridSize})
          </span>
        )}
        {selected && (
          <span style={{ color: '#ff8a65' }}>
            Selecionado: x={selected.x}, y={selected.y}, {selected.w}x{selected.h}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        {/* Main canvas */}
        <div style={{
          overflow: 'auto',
          maxWidth: 'calc(100vw - 280px)',
          maxHeight: 'calc(100vh - 260px)',
          border: '1px solid #333',
          borderRadius: '4px',
          background: '#0a0a0a',
        }}>
          <canvas
            ref={canvasRef}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={() => { setMousePos(null); setHoveredCell(null); }}
            onClick={gridSize > 0 ? handleCanvasClick : handlePixelClick}
            style={{
              cursor: 'crosshair',
              imageRendering: 'pixelated',
              display: imageLoaded ? 'block' : 'none',
            }}
          />
          {!imageLoaded && (
            <div style={{ padding: '40px', color: '#888', textAlign: 'center' }}>
              Carregando imagem...
            </div>
          )}
        </div>

        {/* Side panel */}
        <div style={{
          width: '240px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {/* Preview */}
          {selected && (
            <div style={{
              background: '#111',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '12px',
            }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#ffd700' }}>
                Preview
              </h3>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '8px',
                background: '#1a1a1a',
                borderRadius: '4px',
                marginBottom: '8px',
              }}>
                <canvas
                  ref={previewCanvasRef}
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#aaa' }}>
                <div>x: {selected.x}, y: {selected.y}</div>
                <div>size: {selected.w}x{selected.h}</div>
              </div>
              <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
                <button onClick={addToList} style={{ ...btnStyle, flex: 1 }}>
                  + Adicionar
                </button>
                <button onClick={copyJSON} style={{ ...btnStyle, flex: 1 }}>
                  Copiar JSON
                </button>
              </div>
            </div>
          )}

          {/* Selected list */}
          {selectedList.length > 0 && (
            <div style={{
              background: '#111',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '12px',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}>
                <h3 style={{ margin: 0, fontSize: '14px', color: '#ffd700' }}>
                  Frames ({selectedList.length})
                </h3>
                <button onClick={clearList} style={{ ...btnStyle, fontSize: '11px', padding: '2px 8px' }}>
                  Limpar
                </button>
              </div>
              <div style={{
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#aaa',
                maxHeight: '200px',
                overflow: 'auto',
              }}>
                {selectedList.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '2px 4px',
                      background: i % 2 === 0 ? '#1a1a1a' : 'transparent',
                      borderRadius: '2px',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{i}: ({s.x}, {s.y})</span>
                    <button
                      onClick={() => setSelectedList(prev => prev.filter((_, idx) => idx !== i))}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#f44336',
                        cursor: 'pointer',
                        fontSize: '11px',
                        padding: 0,
                      }}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={copyJSON}
                style={{ ...btnStyle, width: '100%', marginTop: '8px', background: '#2196f3' }}
              >
                Copiar JSON dos Frames
              </button>
              <pre style={{
                marginTop: '8px',
                padding: '8px',
                background: '#1a1a1a',
                borderRadius: '4px',
                fontSize: '10px',
                color: '#81c784',
                overflow: 'auto',
                maxHeight: '120px',
              }}>
                {JSON.stringify(selectedList.map(s => ({ x: s.x, y: s.y })), null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
