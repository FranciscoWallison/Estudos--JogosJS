export type Direction = 'up' | 'down' | 'left' | 'right';
export type TileType = 0 | 1 | 2 | 3; // 0=empty, 1=wall(border), 2=wall(pillar), 3=destructible

export interface TileShrink {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface GridPosition {
  col: number;
  row: number;
}

export interface PlayerState {
  id: string;
  name: string;
  characterIndex: number;
  x: number;
  y: number;
  direction: Direction;
  isMoving: boolean;
  isDead: boolean;
  deathCompleted: boolean;
  frameIndex: number;
  bombsAvailable: number;
  bombRange: number;
  speed: number;
  shrink: TileShrink;
}

export interface BombState {
  id: string;
  ownerId: string;
  col: number;
  row: number;
  x: number;
  y: number;
  placedAt: number;
  explodedAt: number | null;
  range: number;
  isExploding: boolean;
}

export interface BlockState {
  col: number;
  row: number;
  tileType: number;
  destroyedAt: number | null;
}

export interface GameState {
  tick: number;
  players: Record<string, PlayerState>;
  bombs: BombState[];
  explosions: GridPosition[];
  blocks: BlockState[];
  map: TileType[][];
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  winnerId: string | null;
  countdownSeconds: number | null;
}

export interface RoomInfo {
  id: string;
  name: string;
  hostId: string;
  players: RoomPlayerInfo[];
  maxPlayers: number;
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
}

export interface RoomPlayerInfo {
  id: string;
  name: string;
  characterIndex: number;
  isReady: boolean;
  isHost: boolean;
}
