import { ServerGameEngine } from './ServerGameEngine';
import { GameState, RoomOptions } from '../../shared/types';
import mapConfig from '../../data/map.json';
import charactersConfig from '../../data/data.json';

interface PendingGame {
  roomId: string;
  expectedPlayers: Map<string, { name: string; characterIndex: number }>;
  connectedPlayers: Set<string>;
  roomOptions: RoomOptions;
}

const PENDING_GAME_TIMEOUT_MS = 30000;

export class GameManager {
  private activeGames: Map<string, ServerGameEngine> = new Map();
  private pendingGames: Map<string, PendingGame> = new Map();
  private pendingTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

  /**
   * Preparar uma partida - chamado quando o host inicia o jogo
   */
  prepareGame(
    roomId: string,
    players: Map<string, { name: string; characterIndex: number }>,
    roomOptions: RoomOptions = { blocks: true, items: true, monsters: false }
  ): void {
    this.pendingGames.set(roomId, {
      roomId,
      expectedPlayers: players,
      connectedPlayers: new Set(),
      roomOptions,
    });

    // Auto-cancel pending game if not all players connect in time
    const timeout = setTimeout(() => {
      if (this.pendingGames.has(roomId)) {
        console.log(`[GameManager] Timeout: cancelando jogo pendente na sala ${roomId}`);
        this.pendingGames.delete(roomId);
        this.pendingTimeouts.delete(roomId);
      }
    }, PENDING_GAME_TIMEOUT_MS);
    this.pendingTimeouts.set(roomId, timeout);
  }

  /**
   * Jogador conectou via Socket.io para jogar
   * Retorna true se o jogo pode iniciar (todos conectados)
   */
  playerConnected(roomId: string, playerId: string): boolean {
    const pending = this.pendingGames.get(roomId);
    if (!pending) return false;
    if (!pending.expectedPlayers.has(playerId)) return false;

    pending.connectedPlayers.add(playerId);

    return pending.connectedPlayers.size === pending.expectedPlayers.size;
  }

  /**
   * Iniciar o jogo quando todos os jogadores conectaram
   */
  startGame(
    roomId: string,
    onSnapshot: (state: GameState) => void,
    onGameOver: (winnerId: string | null) => void
  ): ServerGameEngine | null {
    const pending = this.pendingGames.get(roomId);
    if (!pending) return null;

    // Clear pending timeout since all players connected
    const timeout = this.pendingTimeouts.get(roomId);
    if (timeout) {
      clearTimeout(timeout);
      this.pendingTimeouts.delete(roomId);
    }

    const playerIds = Array.from(pending.expectedPlayers.keys());
    const playerNames = new Map<string, string>();
    const playerCharacters = new Map<string, number>();

    for (const [id, data] of pending.expectedPlayers) {
      playerNames.set(id, data.name);
      playerCharacters.set(id, data.characterIndex);
    }

    const engine = new ServerGameEngine(
      playerIds,
      playerNames,
      playerCharacters,
      mapConfig.layout,
      onSnapshot,
      onGameOver,
      pending.roomOptions,
      charactersConfig.length,
    );

    this.activeGames.set(roomId, engine);
    this.pendingGames.delete(roomId);

    engine.startCountdown();
    return engine;
  }

  /**
   * Obter engine de um jogo ativo
   */
  getEngine(roomId: string): ServerGameEngine | undefined {
    return this.activeGames.get(roomId);
  }

  /**
   * Verificar se uma sala tem um jogo pendente
   */
  hasPendingGame(roomId: string): boolean {
    return this.pendingGames.has(roomId);
  }

  /**
   * Remover jogador de um jogo
   */
  removePlayer(roomId: string, playerId: string): void {
    const engine = this.activeGames.get(roomId);
    if (engine) {
      engine.removePlayer(playerId);
    }

    const pending = this.pendingGames.get(roomId);
    if (pending) {
      pending.connectedPlayers.delete(playerId);
    }
  }

  /**
   * Finalizar e remover um jogo
   */
  endGame(roomId: string): void {
    const engine = this.activeGames.get(roomId);
    if (engine) {
      engine.stop();
    }
    this.activeGames.delete(roomId);
    this.pendingGames.delete(roomId);
    const timeout = this.pendingTimeouts.get(roomId);
    if (timeout) {
      clearTimeout(timeout);
      this.pendingTimeouts.delete(roomId);
    }
  }
}
