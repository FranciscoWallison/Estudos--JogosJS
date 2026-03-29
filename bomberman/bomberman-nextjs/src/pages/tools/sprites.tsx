import { useState, useRef, useEffect, useCallback } from 'react';
import charactersConfig from '../../data/data.json';
import bombsConfig from '../../data/bombs.json';
import monstersConfig from '../../data/monsters.json';

const FALLBACK_IMAGES = ['/assets/bomberman.png'];

const SPRITE_SIZE = 16;

interface SelectedSprite {
  x: number;
  y: number;
  w: number;
  h: number;
  processedCanvas?: HTMLCanvasElement;
}

type TabId = 'explorer' | 'builder' | 'viewer';
type BgMode = 'dark' | 'light' | 'checker';

// --- Utility functions ---
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

function drawSpriteToCtx(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  sprite: SelectedSprite,
  dx: number, dy: number, dw: number, dh: number,
) {
  if (sprite.processedCanvas) {
    ctx.drawImage(sprite.processedCanvas, 0, 0, sprite.w, sprite.h, dx, dy, dw, dh);
  } else {
    ctx.drawImage(img, sprite.x, sprite.y, sprite.w, sprite.h, dx, dy, dw, dh);
  }
}

function mirrorSprite(img: HTMLImageElement, sprite: SelectedSprite): SelectedSprite {
  const canvas = document.createElement('canvas');
  canvas.width = sprite.w;
  canvas.height = sprite.h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.scale(-1, 1);
  if (sprite.processedCanvas) {
    ctx.drawImage(sprite.processedCanvas, 0, 0, sprite.w, sprite.h, -sprite.w, 0, sprite.w, sprite.h);
  } else {
    ctx.drawImage(img, sprite.x, sprite.y, sprite.w, sprite.h, -sprite.w, 0, sprite.w, sprite.h);
  }
  ctx.restore();
  return { ...sprite, processedCanvas: canvas };
}

function removeColorFromSprite(
  img: HTMLImageElement,
  sprite: SelectedSprite,
  color: { r: number; g: number; b: number },
  tolerance: number,
): SelectedSprite {
  const canvas = document.createElement('canvas');
  canvas.width = sprite.w;
  canvas.height = sprite.h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  if (sprite.processedCanvas) {
    ctx.drawImage(sprite.processedCanvas, 0, 0);
  } else {
    ctx.drawImage(img, sprite.x, sprite.y, sprite.w, sprite.h, 0, 0, sprite.w, sprite.h);
  }
  const imageData = ctx.getImageData(0, 0, sprite.w, sprite.h);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    if (
      Math.abs(d[i] - color.r) <= tolerance &&
      Math.abs(d[i + 1] - color.g) <= tolerance &&
      Math.abs(d[i + 2] - color.b) <= tolerance
    ) {
      d[i + 3] = 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return { ...sprite, processedCanvas: canvas };
}

function buildSpriteSheet(img: HTMLImageElement, frames: SelectedSprite[], cols: number): HTMLCanvasElement {
  const rows = Math.ceil(frames.length / cols);
  const fw = frames[0]?.w || 16;
  const fh = frames[0]?.h || 16;
  const canvas = document.createElement('canvas');
  canvas.width = cols * fw;
  canvas.height = rows * fh;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  frames.forEach((sprite, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    drawSpriteToCtx(ctx, img, sprite, col * fw, row * fh, fw, fh);
  });
  return canvas;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
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
    drawSpriteToCtx(ctx, img, sprite, 0, 0, size, size);
  }, [img, sprite, size]);
  return <canvas ref={ref} style={{ imageRendering: 'pixelated', borderRadius: '2px' }} />;
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function SpriteTool() {
  // --- Shared state ---
  const [activeTab, setActiveTab] = useState<TabId>('explorer');
  const [availableImages, setAvailableImages] = useState<string[]>(FALLBACK_IMAGES);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageSrc, setImageSrc] = useState(FALLBACK_IMAGES[0]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ w: 0, h: 0 });
  const [selectedList, setSelectedList] = useState<SelectedSprite[]>([]);

  // --- Fetch available images from API ---
  useEffect(() => {
    fetch('/api/assets')
      .then(res => res.json())
      .then((images: string[]) => {
        if (images.length > 0) {
          setAvailableImages(images);
          setImageSrc(images[0]);
        }
      })
      .catch(() => {});
  }, []);

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
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragPanStartRef = useRef({ x: 0, y: 0 });
  const dragDistRef = useRef(0);

  // --- Builder state ---
  const animCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animFrameIndex, setAnimFrameIndex] = useState(0);
  const [animSpeed, setAnimSpeed] = useState(100);
  const [animScale, setAnimScale] = useState(6);
  const [flipH, setFlipH] = useState(false);
  const [onionSkin, setOnionSkin] = useState(false);
  const [builderBg, setBuilderBg] = useState<BgMode>('checker');

  // --- Eyedropper / color removal state ---
  const [eyedropperActive, setEyedropperActive] = useState(false);
  const [pickedColor, setPickedColor] = useState<{ r: number; g: number; b: number } | null>(null);
  const [colorTolerance, setColorTolerance] = useState(10);

  // --- Export state ---
  const [exportCols, setExportCols] = useState(0); // 0 = horizontal (all in one row)
  const exportCanvasRef = useRef<HTMLCanvasElement>(null);

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
      setPan({ x: 0, y: 0 });
      setCustomSize({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => setImageLoaded(false);
  }, [imageSrc]);

  // ============================================================
  // EXPLORER: Draw main canvas with internal zoom via ctx.scale.
  // Canvas size = container size (fixed). No CSS scaling.
  // ============================================================
  useEffect(() => {
    if (activeTab !== 'explorer') return;
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const cw = Math.floor(rect.width);
    const ch = Math.floor(rect.height);
    if (canvas.width !== cw) canvas.width = cw;
    if (canvas.height !== ch) canvas.height = ch;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-pan.x, -pan.y);

    // Draw image
    ctx.drawImage(img, 0, 0);

    // Grid (lineWidth compensated by zoom to stay 1 screen pixel)
    if (showGrid && gridSize > 0) {
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
      ctx.lineWidth = 1 / zoom;
      for (let x = 0; x <= img.naturalWidth; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, img.naturalHeight); ctx.stroke();
      }
      for (let y = 0; y <= img.naturalHeight; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(img.naturalWidth, y); ctx.stroke();
      }
    }

    // Hovered cell
    if (hoveredCell && gridSize > 0) {
      ctx.fillStyle = 'rgba(0, 150, 255, 0.3)';
      ctx.fillRect(hoveredCell.col * gridSize, hoveredCell.row * gridSize, gridSize, gridSize);
    }

    // Selected sprite
    if (selected) {
      ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 2 / zoom;
      ctx.strokeRect(selected.x, selected.y, selected.w, selected.h);
    }

    // Frame list
    for (const s of selectedList) {
      ctx.strokeStyle = '#00ff00'; ctx.lineWidth = 2 / zoom;
      ctx.strokeRect(s.x, s.y, s.w, s.h);
    }

    ctx.restore();
  }, [activeTab, imageLoaded, zoom, pan, showGrid, gridSize, hoveredCell, selected, selectedList]);

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
    drawSpriteToCtx(ctx, img, selected, 0, 0, preview.width, preview.height);
  }, [activeTab, selected, explorerBg]);

  // Screen coords → image coords using zoom + pan
  const screenToImage = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: pan.x + (clientX - rect.left) / zoom,
      y: pan.y + (clientY - rect.top) / zoom,
    };
  }, [zoom, pan]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    dragPanStartRef.current = { ...pan };
    dragDistRef.current = 0;
  }, [pan]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Pan while dragging
    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      dragDistRef.current = Math.max(dragDistRef.current, Math.abs(dx) + Math.abs(dy));
      setPan({
        x: Math.max(0, dragPanStartRef.current.x - dx / zoom),
        y: Math.max(0, dragPanStartRef.current.y - dy / zoom),
      });
    }
    // Update hover
    const { x: imgX, y: imgY } = screenToImage(e.clientX, e.clientY);
    const px = Math.floor(imgX);
    const py = Math.floor(imgY);
    setMousePos({ x: px, y: py });
    if (gridSize > 0) {
      setHoveredCell({ col: Math.floor(px / gridSize), row: Math.floor(py / gridSize) });
    }
  }, [zoom, gridSize, screenToImage]);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const wasDrag = dragDistRef.current > 3;
    isDraggingRef.current = false;
    if (wasDrag) return; // was a pan drag, not a click

    // Handle as click (select sprite)
    const { x: imgX, y: imgY } = screenToImage(e.clientX, e.clientY);
    const px = Math.floor(imgX);
    const py = Math.floor(imgY);
    if (gridSize > 0) {
      const col = Math.floor(px / gridSize);
      const row = Math.floor(py / gridSize);
      const spriteW = useCustomSize ? customSize.w : gridSize;
      const spriteH = useCustomSize ? customSize.h : gridSize;
      setSelected({ x: col * gridSize, y: row * gridSize, w: spriteW, h: spriteH });
    } else {
      const w = useCustomSize ? customSize.w : 16;
      const h = useCustomSize ? customSize.h : 16;
      setSelected({ x: px, y: py, w, h });
    }
  }, [gridSize, useCustomSize, customSize, screenToImage]);

  // Wheel zoom on canvas (with preventDefault to block page zoom)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || activeTab !== 'explorer') return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;
      const imgX = pan.x + cursorX / zoom;
      const imgY = pan.y + cursorY / zoom;
      const newZoom = e.deltaY > 0
        ? Math.max(1, zoom - 1)
        : Math.min(32, zoom + 1);
      if (newZoom !== zoom) {
        setPan({
          x: Math.max(0, imgX - cursorX / newZoom),
          y: Math.max(0, imgY - cursorY / newZoom),
        });
        setZoom(newZoom);
      }
    };
    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, [activeTab, zoom, pan]);

  // Zoom via +/- buttons (zoom toward center of viewport)
  const zoomToCenter = useCallback((delta: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.width;
    const ch = canvas.height;
    const newZoom = Math.max(1, Math.min(32, zoom + delta));
    if (newZoom === zoom) return;
    const centerImgX = pan.x + (cw / 2) / zoom;
    const centerImgY = pan.y + (ch / 2) / zoom;
    setPan({
      x: Math.max(0, centerImgX - (cw / 2) / newZoom),
      y: Math.max(0, centerImgY - (ch / 2) / newZoom),
    });
    setZoom(newZoom);
  }, [zoom, pan]);

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

  // --- Mirror ---
  const mirrorFrame = (index: number) => {
    const img = imageRef.current;
    if (!img) return;
    const mirrored = mirrorSprite(img, selectedList[index]);
    setSelectedList(prev => {
      const next = [...prev];
      next.splice(index + 1, 0, mirrored);
      return next;
    });
  };

  const mirrorAllFrames = () => {
    const img = imageRef.current;
    if (!img || selectedList.length === 0) return;
    const mirrored = selectedList.map(s => mirrorSprite(img, s));
    setSelectedList(prev => [...prev, ...mirrored]);
  };

  // --- Eyedropper ---
  const handleAnimCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!eyedropperActive) return;
    const img = imageRef.current;
    if (!img || selectedList.length === 0) return;

    const sprite = selectedList[animFrameIndex % selectedList.length];
    if (!sprite) return;

    // Get click position relative to sprite
    const canvas = animCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
    const clickY = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));

    // Convert to sprite-local pixel
    const px = Math.floor(clickX / animScale);
    const py = Math.floor(clickY / animScale);
    if (px < 0 || px >= sprite.w || py < 0 || py >= sprite.h) return;

    // Read pixel from the sprite
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = sprite.w;
    tempCanvas.height = sprite.h;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.imageSmoothingEnabled = false;
    if (sprite.processedCanvas) {
      tempCtx.drawImage(sprite.processedCanvas, 0, 0);
    } else {
      tempCtx.drawImage(img, sprite.x, sprite.y, sprite.w, sprite.h, 0, 0, sprite.w, sprite.h);
    }

    const pixel = tempCtx.getImageData(px, py, 1, 1).data;
    setPickedColor({ r: pixel[0], g: pixel[1], b: pixel[2] });
  }, [eyedropperActive, selectedList, animFrameIndex, animScale]);

  // --- Remove color ---
  const removeColorCurrent = () => {
    const img = imageRef.current;
    if (!img || !pickedColor || selectedList.length === 0) return;
    const idx = animFrameIndex % selectedList.length;
    const updated = removeColorFromSprite(img, selectedList[idx], pickedColor, colorTolerance);
    setSelectedList(prev => {
      const next = [...prev];
      next[idx] = updated;
      return next;
    });
  };

  const removeColorAll = () => {
    const img = imageRef.current;
    if (!img || !pickedColor || selectedList.length === 0) return;
    setSelectedList(prev => prev.map(s => removeColorFromSprite(img, s, pickedColor, colorTolerance)));
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

    // Onion skin
    if (onionSkin && selectedList.length > 1) {
      const prevIdx = (animFrameIndex - 1 + selectedList.length) % selectedList.length;
      const prevSprite = selectedList[prevIdx];
      ctx.globalAlpha = 0.3;
      if (flipH) {
        ctx.save(); ctx.scale(-1, 1);
        drawSpriteToCtx(ctx, img, prevSprite, -cw, 0, cw, ch);
        ctx.restore();
      } else {
        drawSpriteToCtx(ctx, img, prevSprite, 0, 0, cw, ch);
      }
      ctx.globalAlpha = 1.0;
    }

    // Current frame
    if (flipH) {
      ctx.save(); ctx.scale(-1, 1);
      drawSpriteToCtx(ctx, img, sprite, -cw, 0, cw, ch);
      ctx.restore();
    } else {
      drawSpriteToCtx(ctx, img, sprite, 0, 0, cw, ch);
    }
  }, [activeTab, animFrameIndex, selectedList, imageLoaded, animScale, flipH, onionSkin, builderBg]);

  // BUILDER: Draw export preview
  useEffect(() => {
    if (activeTab !== 'builder') return;
    const canvas = exportCanvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded || selectedList.length === 0) return;

    const cols = exportCols > 0 ? exportCols : selectedList.length;
    const sheet = buildSpriteSheet(img, selectedList, cols);

    const previewScale = 3;
    canvas.width = sheet.width * previewScale;
    canvas.height = sheet.height * previewScale;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    drawCheckerBg(ctx, canvas.width, canvas.height, 6);
    ctx.drawImage(sheet, 0, 0, canvas.width, canvas.height);
  }, [activeTab, selectedList, exportCols, imageLoaded]);

  const downloadExport = () => {
    const img = imageRef.current;
    if (!img || selectedList.length === 0) return;
    const cols = exportCols > 0 ? exportCols : selectedList.length;
    const sheet = buildSpriteSheet(img, selectedList, cols);
    const link = document.createElement('a');
    link.download = 'spritesheet.png';
    link.href = sheet.toDataURL('image/png');
    link.click();
  };

  const stepFrame = (dir: 1 | -1) => {
    if (selectedList.length === 0) return;
    setIsPlaying(false);
    setAnimFrameIndex(prev => (prev + dir + selectedList.length) % selectedList.length);
  };

  // ============================================================
  // VIEWER
  // ============================================================
  const viewerEntities = useCallback(() => {
    const list: { id: string; label: string; imageSrc: string; animations: Record<string, { x: number; y: number }[]> }[] = [];
    (charactersConfig as any[]).forEach((c, i) => {
      list.push({ id: `char_${i}`, label: `Personagem ${i}`, imageSrc: c.imageSrc, animations: { down: c.down, right: c.right, up: c.up, left: c.left, death: c.death } });
    });
    (monstersConfig as any[]).forEach(m => {
      list.push({ id: `monster_${m.name}`, label: m.name, imageSrc: m.imageSrc, animations: { down: m.down, right: m.right, up: m.up, left: m.left, death: m.death } });
    });
    list.push({ id: 'bomb', label: 'Bomba', imageSrc: (bombsConfig as any).imageSrc, animations: { bomb: (bombsConfig as any).bomb } });
    list.push({ id: 'explosion', label: 'Explosao', imageSrc: (bombsConfig as any).imageSrc, animations: { explosion: (bombsConfig as any).explosion } });
    return list;
  }, []);

  const currentViewerEntity = viewerEntities().find(e => e.id === viewerEntity) || viewerEntities()[0];

  useEffect(() => {
    if (activeTab !== 'viewer') return;
    const img = new Image();
    img.src = currentViewerEntity.imageSrc;
    img.onload = () => { viewerImageRef.current = img; setViewerImageLoaded(true); setViewerFrameIndex(0); };
    img.onerror = () => setViewerImageLoaded(false);
  }, [activeTab, currentViewerEntity.imageSrc]);

  useEffect(() => {
    if (activeTab !== 'viewer' || !viewerPlaying) return;
    const interval = setInterval(() => { setViewerFrameIndex(prev => prev + 1); }, viewerSpeed);
    return () => clearInterval(interval);
  }, [activeTab, viewerPlaying, viewerSpeed]);

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
      canvas.width = cw; canvas.height = ch;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      drawCheckerBg(ctx, cw, ch);
      if (key === 'left') {
        const rightFrames = anims['right'] || frames;
        const rSprite = rightFrames[viewerFrameIndex % rightFrames.length];
        ctx.save(); ctx.scale(-1, 1);
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
  const btnDanger: React.CSSProperties = { ...btnStyle, background: '#c62828', border: '1px solid #e53935' };

  const tabBtn = (id: TabId, label: string) => (
    <button key={id} onClick={() => setActiveTab(id)} style={{
      padding: '10px 20px',
      background: activeTab === id ? '#2196f3' : '#222',
      color: activeTab === id ? 'white' : '#aaa',
      border: activeTab === id ? '1px solid #64b5f6' : '1px solid #444',
      borderBottom: activeTab === id ? '2px solid #2196f3' : '2px solid transparent',
      borderRadius: '6px 6px 0 0', cursor: 'pointer', fontSize: '14px',
      fontWeight: activeTab === id ? 'bold' : 'normal',
    }}>{label}</button>
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

      <div style={{ display: 'flex', gap: '4px', marginBottom: '0' }}>
        {tabBtn('explorer', 'Explorer')}
        {tabBtn('builder', 'Animation Builder')}
        {tabBtn('viewer', 'Animation Viewer')}
      </div>
      <div style={{ borderTop: '1px solid #444', marginBottom: '16px' }} />

      {/* ========== TAB: EXPLORER ========== */}
      {activeTab === 'explorer' && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end', marginBottom: '16px', background: '#111', padding: '12px', borderRadius: '8px', border: '1px solid #333' }}>
            <div>
              <label style={labelStyle}>Imagem:</label>
              <select value={imageSrc} onChange={(e) => setImageSrc(e.target.value)} style={{ ...inputStyle, width: '200px' }}>
                {availableImages.map(src => <option key={src} value={src}>{src.split('/').pop()}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Grid (px):</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[0, 8, 12, 16, 24, 32].map(size => (
                  <button key={size} onClick={() => setGridSize(size)} style={gridSize === size ? btnActiveStyle : btnStyle}>{size === 0 ? 'Off' : size}</button>
                ))}
                <input type="number" value={gridSize} onChange={(e) => setGridSize(Math.max(0, parseInt(e.target.value) || 0))} style={inputStyle} min={0} max={128} />
              </div>
            </div>
            <div>
              <button onClick={() => setShowGrid(!showGrid)} style={showGrid ? btnActiveStyle : btnStyle}>Grid {showGrid ? 'ON' : 'OFF'}</button>
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

          <div style={{ display: 'flex', gap: '24px', marginBottom: '12px', padding: '8px 12px', background: '#1a1a1a', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace' }}>
            <span style={{ color: '#888' }}>Imagem: {imageSize.w}x{imageSize.h}px</span>
            <span style={{ color: '#aaa' }}>Zoom: {zoom}x</span>
            {mousePos && <span style={{ color: '#4fc3f7' }}>Pixel: ({mousePos.x}, {mousePos.y})</span>}
            {hoveredCell && gridSize > 0 && <span style={{ color: '#81c784' }}>Cell: col={hoveredCell.col}, row={hoveredCell.row} | Pos: ({hoveredCell.col * gridSize}, {hoveredCell.row * gridSize})</span>}
            {selected && <span style={{ color: '#ff8a65' }}>Selecionado: x={selected.x}, y={selected.y}, {selected.w}x{selected.h}</span>}
          </div>

          <div style={{ display: 'flex', gap: '16px', height: 'calc(100vh - 300px)' }}>
            <div style={{ flex: 1, minWidth: 0, position: 'relative', border: '1px solid #333', borderRadius: '4px', overflow: 'hidden' }}>
              {/* Floating zoom controls */}
              <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.75)', borderRadius: '6px', padding: '4px 8px' }}>
                <button onClick={() => zoomToCenter(-1)} style={{ ...btnStyle, padding: '2px 10px', fontSize: '16px', lineHeight: '1' }}>-</button>
                <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: '13px', minWidth: '36px', textAlign: 'center' }}>{zoom}x</span>
                <button onClick={() => zoomToCenter(1)} style={{ ...btnStyle, padding: '2px 10px', fontSize: '16px', lineHeight: '1' }}>+</button>
              </div>
              {/* Canvas — fixed size, zoom is internal via ctx.scale */}
              <canvas
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={() => { isDraggingRef.current = false; setMousePos(null); setHoveredCell(null); }}
                style={{
                  cursor: isDraggingRef.current ? 'grabbing' : 'crosshair',
                  display: imageLoaded ? 'block' : 'none',
                  width: '100%',
                  height: '100%',
                }}
              />
              {!imageLoaded && <div style={{ padding: '40px', color: '#888', textAlign: 'center' }}>Carregando imagem...</div>}
            </div>
            <div style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                        <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#aaa', flex: 1 }}>{i}: ({s.x},{s.y}){s.processedCanvas ? ' *' : ''}</span>
                        <button onClick={() => moveFrame(i, -1)} style={{ ...btnStyle, padding: '1px 5px', fontSize: '10px' }}>{'\u25B2'}</button>
                        <button onClick={() => moveFrame(i, 1)} style={{ ...btnStyle, padding: '1px 5px', fontSize: '10px' }}>{'\u25BC'}</button>
                        <button onClick={() => removeFrame(i)} style={{ background: 'none', border: 'none', color: '#f44336', cursor: 'pointer', fontSize: '13px', padding: '0 2px' }}>x</button>
                      </div>
                    ))}
                  </div>
                  <button onClick={copyJSON} style={{ ...btnActiveStyle, width: '100%', marginTop: '8px' }}>Copiar JSON dos Frames</button>
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
                {/* Controls row 1: Playback */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end', marginBottom: '12px', background: '#111', padding: '12px', borderRadius: '8px', border: '1px solid #333' }}>
                  <div>
                    <label style={labelStyle}>Playback:</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => setIsPlaying(!isPlaying)} style={isPlaying ? btnActiveStyle : btnAccent}>{isPlaying ? 'Pause' : 'Play'}</button>
                      <button onClick={() => { setIsPlaying(false); setAnimFrameIndex(0); }} style={btnStyle}>Stop</button>
                      <button onClick={() => stepFrame(-1)} style={btnStyle}>{'\u25C0'}</button>
                      <button onClick={() => stepFrame(1)} style={btnStyle}>{'\u25B6'}</button>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Velocidade: {animSpeed}ms ({Math.round(1000 / animSpeed)} fps)</label>
                    <input type="range" min={30} max={500} value={animSpeed} onChange={(e) => setAnimSpeed(parseInt(e.target.value))} style={{ width: '150px', accentColor: '#2196f3' }} />
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

                {/* Controls row 2: Eyedropper + Remove color */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end', marginBottom: '16px', background: '#111', padding: '12px', borderRadius: '8px', border: '1px solid #333' }}>
                  <div>
                    <label style={labelStyle}>Conta-gotas:</label>
                    <button onClick={() => setEyedropperActive(!eyedropperActive)} style={eyedropperActive ? { ...btnActiveStyle, background: '#e91e63', border: '1px solid #f48fb1' } : btnStyle}>
                      {eyedropperActive ? 'Conta-gotas ON' : 'Conta-gotas'}
                    </button>
                  </div>
                  {pickedColor && (
                    <>
                      <div>
                        <label style={labelStyle}>Cor selecionada:</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '28px', height: '28px', background: rgbToHex(pickedColor.r, pickedColor.g, pickedColor.b), border: '2px solid #fff', borderRadius: '4px' }} />
                          <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#aaa' }}>
                            {rgbToHex(pickedColor.r, pickedColor.g, pickedColor.b)} ({pickedColor.r},{pickedColor.g},{pickedColor.b})
                          </span>
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Tolerancia: {colorTolerance}</label>
                        <input type="range" min={0} max={80} value={colorTolerance} onChange={(e) => setColorTolerance(parseInt(e.target.value))} style={{ width: '120px', accentColor: '#e91e63' }} />
                      </div>
                      <div>
                        <label style={labelStyle}>Remover cor:</label>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={removeColorCurrent} style={btnDanger}>Frame Atual</button>
                          <button onClick={removeColorAll} style={btnDanger}>Todos</button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Animation canvas */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '24px', background: '#111', borderRadius: '8px', border: '1px solid #333', marginBottom: '16px' }}>
                  <canvas
                    ref={animCanvasRef}
                    onClick={handleAnimCanvasClick}
                    style={{ imageRendering: 'pixelated', cursor: eyedropperActive ? 'crosshair' : 'default' }}
                  />
                </div>

                {/* Frame strip */}
                <div style={{ background: '#111', borderRadius: '8px', border: '1px solid #333', padding: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#aaa' }}>
                      Frame: {(animFrameIndex % selectedList.length) + 1} / {selectedList.length}
                    </span>
                    <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#4fc3f7' }}>
                      {selectedList[animFrameIndex % selectedList.length] && `(${selectedList[animFrameIndex % selectedList.length].x}, ${selectedList[animFrameIndex % selectedList.length].y})`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', padding: '4px 0' }}>
                    {selectedList.map((s, i) => (
                      <div key={i} onClick={() => { setIsPlaying(false); setAnimFrameIndex(i); }} style={{
                        cursor: 'pointer',
                        border: i === animFrameIndex % selectedList.length ? '2px solid #ffd700' : '2px solid #333',
                        borderRadius: '4px', padding: '2px',
                        background: i === animFrameIndex % selectedList.length ? '#332800' : 'transparent',
                        flexShrink: 0,
                      }}>
                        <SpriteThumbnail img={imageRef.current} sprite={s} size={36} />
                        <div style={{ textAlign: 'center', fontSize: '9px', color: '#888', marginTop: '2px' }}>{i}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Export section */}
                <div style={{ background: '#111', borderRadius: '8px', border: '1px solid #333', padding: '12px' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#ffd700' }}>Exportar Sprite Sheet</h3>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Layout:</label>
                    <button onClick={() => setExportCols(0)} style={exportCols === 0 ? btnActiveStyle : btnStyle}>Horizontal</button>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Grid cols:</label>
                    <input type="number" value={exportCols} onChange={(e) => setExportCols(Math.max(0, parseInt(e.target.value) || 0))} style={{ ...inputStyle, width: '50px' }} min={0} />
                    <button onClick={downloadExport} style={{ ...btnAccent, fontWeight: 'bold' }}>Download PNG</button>
                  </div>
                  <div style={{ padding: '8px', background: '#0a0a0a', borderRadius: '4px', display: 'flex', justifyContent: 'center' }}>
                    <canvas ref={exportCanvasRef} style={{ imageRendering: 'pixelated', maxWidth: '100%' }} />
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
                  <div style={{ maxHeight: '350px', overflow: 'auto' }}>
                    {selectedList.map((s, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '4px', padding: '3px',
                        background: i === animFrameIndex % selectedList.length ? '#1a2a1a' : (i % 2 === 0 ? '#1a1a1a' : 'transparent'),
                        borderRadius: '3px',
                        border: i === animFrameIndex % selectedList.length ? '1px solid #4caf50' : '1px solid transparent',
                      }}>
                        <SpriteThumbnail img={imageRef.current} sprite={s} size={24} />
                        <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#aaa', flex: 1 }}>
                          {i}:{s.processedCanvas ? '*' : ''} ({s.x},{s.y})
                        </span>
                        <button onClick={() => mirrorFrame(i)} style={{ ...btnStyle, padding: '1px 4px', fontSize: '9px' }} title="Espelhar">Esp</button>
                        <button onClick={() => moveFrame(i, -1)} style={{ ...btnStyle, padding: '1px 4px', fontSize: '9px' }}>{'\u25B2'}</button>
                        <button onClick={() => moveFrame(i, 1)} style={{ ...btnStyle, padding: '1px 4px', fontSize: '9px' }}>{'\u25BC'}</button>
                        <button onClick={() => removeFrame(i)} style={{ background: 'none', border: 'none', color: '#f44336', cursor: 'pointer', fontSize: '12px', padding: '0 2px' }}>x</button>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '10px' }}>
                    <button onClick={mirrorAllFrames} style={{ ...btnAccent, flex: 1, fontSize: '11px' }}>Espelhar Todos</button>
                    <button onClick={copyJSON} style={{ ...btnActiveStyle, flex: 1, fontSize: '11px' }}>Copiar JSON</button>
                  </div>
                  <pre style={{ marginTop: '8px', padding: '8px', background: '#1a1a1a', borderRadius: '4px', fontSize: '10px', color: '#81c784', overflow: 'auto', maxHeight: '120px' }}>
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
              <select value={viewerEntity} onChange={(e) => { setViewerEntity(e.target.value); setViewerFrameIndex(0); setViewerImageLoaded(false); }} style={{ ...inputStyle, width: '200px' }}>
                <optgroup label="Personagens">
                  {viewerEntities().filter(e => e.id.startsWith('char_')).map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                </optgroup>
                <optgroup label="Monstros">
                  {viewerEntities().filter(e => e.id.startsWith('monster_')).map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                </optgroup>
                <optgroup label="Efeitos">
                  {viewerEntities().filter(e => !e.id.startsWith('char_') && !e.id.startsWith('monster_')).map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                </optgroup>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Playback:</label>
              <button onClick={() => setViewerPlaying(!viewerPlaying)} style={viewerPlaying ? btnActiveStyle : btnAccent}>{viewerPlaying ? 'Pause' : 'Play'}</button>
            </div>
            <div>
              <label style={labelStyle}>Velocidade: {viewerSpeed}ms ({Math.round(1000 / viewerSpeed)} fps)</label>
              <input type="range" min={30} max={500} value={viewerSpeed} onChange={(e) => setViewerSpeed(parseInt(e.target.value))} style={{ width: '160px', accentColor: '#2196f3' }} />
            </div>
          </div>
          <div style={{ marginBottom: '16px', padding: '8px 12px', background: '#1a1a1a', borderRadius: '6px', fontFamily: 'monospace', fontSize: '13px' }}>
            <span style={{ color: '#888' }}>Sprite sheet: </span>
            <span style={{ color: '#4fc3f7' }}>{currentViewerEntity.imageSrc}</span>
            <span style={{ color: '#888', marginLeft: '16px' }}>Animacoes: </span>
            <span style={{ color: '#81c784' }}>{Object.keys(currentViewerEntity.animations).join(', ')}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            {Object.entries(currentViewerEntity.animations).map(([key, frames]) => (
              <div key={key} style={{ background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '12px', textAlign: 'center', minWidth: '100px' }}>
                <div style={{ fontSize: '13px', color: '#ffd700', marginBottom: '8px', fontWeight: 'bold' }}>{dirLabel[key] || key}</div>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '8px', background: '#0a0a0a', borderRadius: '4px', marginBottom: '8px' }}>
                  <canvas ref={(el) => { viewerCanvasRefs.current[key] = el; }} style={{ imageRendering: 'pixelated' }} />
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#888' }}>{(frames as any[]).length} frames</div>
                <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#555', marginTop: '4px' }}>
                  {(frames as any[]).map((f: any, i: number) => <div key={i}>({f.x}, {f.y})</div>)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
