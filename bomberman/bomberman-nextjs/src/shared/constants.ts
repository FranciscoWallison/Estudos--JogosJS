export const SPRITE_SIZE = 16;
export const SCALE = 2;
export const SCALED_SIZE = SPRITE_SIZE * SCALE; // 32

export const MAP_COLS = 31;
export const MAP_ROWS = 13;
export const CANVAS_WIDTH = MAP_COLS * SCALED_SIZE; // 992
export const CANVAS_HEIGHT = MAP_ROWS * SCALED_SIZE; // 416

export const MOVEMENT_SPEED = 2; // pixels per tick at speed=1
export const ANIMATION_SPEED = 100; // ms between animation frames
export const BOMB_TIMER_TICKS = 120; // 2 seconds at 60 ticks/sec
export const EXPLOSION_DURATION_TICKS = 30; // 0.5 seconds at 60 ticks/sec

export const SERVER_TICK_RATE = 60; // ticks per second
export const SERVER_TICK_MS = 1000 / SERVER_TICK_RATE; // ~16.67ms
export const SNAPSHOT_RATE = 20; // state broadcasts per second
export const SNAPSHOT_INTERVAL_TICKS = SERVER_TICK_RATE / SNAPSHOT_RATE; // every 3 ticks

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const COUNTDOWN_SECONDS = 3;

// Spawn positions (grid coordinates) for up to 4 players - classic Bomberman corners
export const SPAWN_POSITIONS: { col: number; row: number }[] = [
  { col: 1, row: 1 },    // top-left
  { col: 29, row: 1 },   // top-right
  { col: 1, row: 11 },   // bottom-left
  { col: 29, row: 11 },  // bottom-right
];

// Safe zone offsets: tiles around each spawn that must be clear of destructible blocks
export const SPAWN_SAFE_OFFSETS: { dc: number; dr: number }[] = [
  { dc: 0, dr: 0 },
  { dc: 1, dr: 0 },
  { dc: -1, dr: 0 },
  { dc: 0, dr: 1 },
  { dc: 0, dr: -1 },
];
