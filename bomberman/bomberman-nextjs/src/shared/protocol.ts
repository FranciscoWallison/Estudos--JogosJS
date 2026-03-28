import { Direction, GameState, RoomInfo } from './types';

// --- Player input (client -> server) ---
export interface PlayerInput {
  type: 'move' | 'stop' | 'bomb';
  direction?: Direction;
  seq: number;
}

// --- Client -> Server events ---
export interface ClientToServerEvents {
  'game:join': (data: {
    roomId: string;
    token: string;
    playerName: string;
    characterIndex: number;
    expectedPlayers: { id: string; name: string; characterIndex: number }[];
  }) => void;
  'game:input': (data: PlayerInput) => void;
  'game:leave': () => void;
}

// --- Server -> Client events ---
export interface ServerToClientEvents {
  'game:countdown': (data: { seconds: number }) => void;
  'game:start': (data: { initialState: GameState; playerId: string }) => void;
  'game:state': (state: GameState) => void;
  'game:over': (data: { winnerId: string | null; winnerName: string | null }) => void;
  'game:player-disconnected': (data: { playerId: string; playerName: string }) => void;
  'game:error': (data: { message: string }) => void;
}
