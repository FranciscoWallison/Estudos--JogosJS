import { ServerGameEngine } from './ServerGameEngine';
import { GameState } from '../../shared/types';
import mapConfig from '../../data/map.json';

interface PendingGame {
  roomId: string;
  expectedPlayers: Map<string, { name: string; characterIndex: number }>;
  connectedPlayers: Set<string>;
}

export class GameManager {
  private activeGames: Map<string, ServerGameEngine> = new Map();
  private pendingGames: Map<string, PendingGame> = new Map();

  /**
   * Preparar uma partida - chamado quando o host inicia o jogo
   */
  prepareGame(
    roomId: string,
    players: Map<string, { name: string; characterIndex: number }>
  ): void {
    this.pendingGames.set(roomId, {
      roomId,
      expectedPlayers: players,
      connectedPlayers: new Set(),
    });
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
      onGameOver
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
  }
}
