import { LocalGameEngine, EngineOptions } from '../engine/LocalGameEngine';
import { ClientGameEngine, ItemsSpriteConfig } from './ClientGameEngine';
import { BotController } from './BotController';
import { GameState, GridPosition, TileType, TileShrink } from '../shared/types';
import { PlayerInput } from '../shared/protocol';
import { CharacterConfig } from '../utils/character';
import {
  SERVER_TICK_MS, MAP_COLS, MAP_ROWS,
  SPAWN_POSITIONS, SPAWN_SAFE_OFFSETS,
} from '../shared/constants';
import mapConfig from '../data/map.json';
import monstersConfig from '../data/monsters.json';
import itemsConfig from '../data/items.json';

interface BombSpriteConfig {
  bomb: { x: number; y: number }[];
  explosion: { x: number; y: number }[];
  imageSrc: string;
}

export interface LocalGameConfig {
  canvas: HTMLCanvasElement;
  playerName: string;
  playerCharacterIndex: number;
  charactersConfig: CharacterConfig[];
  bombConfig: BombSpriteConfig;
  onGameOver: (winnerId: string | null, winnerName: string | null) => void;
}

const MONSTER_COUNT = 4;

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getRandomMonsterSpawns(map: TileType[][], count: number): GridPosition[] {
  const validCells: GridPosition[] = [];
  const playerSafeZones = new Set<string>();

  for (const spawn of SPAWN_POSITIONS) {
    for (const offset of SPAWN_SAFE_OFFSETS) {
      playerSafeZones.add(`${spawn.col + offset.dc},${spawn.row + offset.dr}`);
    }
  }

  for (let r = 1; r < MAP_ROWS - 1; r++) {
    for (let c = 1; c < MAP_COLS - 1; c++) {
      if (map[r][c] === 0 && !playerSafeZones.has(`${c},${r}`)) {
        validCells.push({ col: c, row: r });
      }
    }
  }

  shuffle(validCells);
  return validCells.slice(0, count);
}

export class LocalGameController {
  private serverEngine: LocalGameEngine;
  private clientEngine: ClientGameEngine;
  private bots: BotController[] = [];
  private playerId: string;
  private playerNames: Map<string, string>;
  private botUpdateInterval: ReturnType<typeof setInterval> | null = null;
  private latestState: GameState | null = null;

  constructor(config: LocalGameConfig) {
    this.playerId = 'local-player';
    const monsterIds = Array.from({ length: MONSTER_COUNT }, (_, i) => `monster-${i}`);
    const allIds = [this.playerId, ...monsterIds];

    // Build name and character maps
    this.playerNames = new Map<string, string>();
    const characters = new Map<string, number>();

    this.playerNames.set(this.playerId, config.playerName);
    characters.set(this.playerId, config.playerCharacterIndex);

    // Combine player characters + monsters into one array
    const playerCharCount = config.charactersConfig.length;
    const allCharConfigs = [...config.charactersConfig, ...monstersConfig as CharacterConfig[]];

    // Build per-player shrink configs
    const customShrinks = new Map<string, TileShrink>();
    const playerCharConfig = config.charactersConfig[config.playerCharacterIndex];
    if (playerCharConfig?.shrink) {
      customShrinks.set(this.playerId, playerCharConfig.shrink);
    }

    // Assign monster names and character indices
    const monsterIdSet = new Set<string>();
    const customSpeeds = new Map<string, number>();
    monsterIds.forEach((id, i) => {
      const monsterData = (monstersConfig as { name?: string; speed?: number; shrink?: TileShrink }[])[i % monstersConfig.length];
      this.playerNames.set(id, monsterData?.name || `Monster ${i + 1}`);
      characters.set(id, playerCharCount + (i % monstersConfig.length));
      monsterIdSet.add(id);
      customSpeeds.set(id, monsterData?.speed ?? 0.8);
      if (monsterData?.shrink) {
        customShrinks.set(id, monsterData.shrink);
      }
    });

    // Generate random spawn positions for monsters
    const mapLayout = mapConfig.layout as TileType[][];
    const spawns = getRandomMonsterSpawns(mapLayout, MONSTER_COUNT);
    const customSpawns = new Map<string, GridPosition>();
    monsterIds.forEach((id, i) => {
      if (spawns[i]) customSpawns.set(id, spawns[i]);
    });

    // Build per-tile shrink configs from map data
    const tileShrinks = new Map<number, TileShrink>();
    for (const tile of (mapConfig.tiles as { type: number; shrink?: TileShrink }[])) {
      if (tile.shrink) {
        tileShrinks.set(tile.type, tile.shrink);
      }
    }

    const engineOptions: EngineOptions = {
      customSpawns,
      customSpeeds,
      customShrinks: customShrinks.size > 0 ? customShrinks : undefined,
      monsterIds: monsterIdSet,
      tileShrinks: tileShrinks.size > 0 ? tileShrinks : undefined,
    };

    // Create server engine (runs in-browser)
    this.serverEngine = new LocalGameEngine(
      allIds,
      this.playerNames,
      characters,
      mapLayout,
      (state: GameState) => {
        this.latestState = state;
        this.clientEngine.applyServerState(state);
      },
      (winnerId: string | null) => {
        this.stopBots();
        const winnerName = winnerId ? (this.playerNames.get(winnerId) || null) : null;
        config.onGameOver(winnerId, winnerName);
      },
      engineOptions,
    );

    // Create client engine with combined character configs (players + monsters)
    this.clientEngine = new ClientGameEngine(
      config.canvas,
      this.playerId,
      allCharConfigs,
      config.bombConfig,
      mapConfig.backgroundImageSrc,
      mapConfig.tiles,
      (input: PlayerInput) => {
        this.serverEngine.pushInput(this.playerId, input);
      },
      itemsConfig as ItemsSpriteConfig,
    );

    // Create bot controllers for monsters (no bombs, medium difficulty)
    this.bots = monsterIds.map(mId =>
      new BotController(
        mId,
        (id, input) => this.serverEngine.pushInput(id, input),
        'medium',
        false, // canPlaceBombs = false
        tileShrinks.size > 0 ? tileShrinks : undefined,
      ),
    );
  }

  start(): void {
    this.clientEngine.start();
    this.serverEngine.startCountdown();

    // Bot update loop - matches server tick rate
    this.botUpdateInterval = setInterval(() => {
      if (this.latestState && this.latestState.status === 'playing') {
        for (const bot of this.bots) {
          bot.update(this.latestState);
        }
      }
    }, SERVER_TICK_MS);
  }

  destroy(): void {
    this.serverEngine.stop();
    this.clientEngine.destroy();
    this.stopBots();
  }

  private stopBots(): void {
    if (this.botUpdateInterval) {
      clearInterval(this.botUpdateInterval);
      this.botUpdateInterval = null;
    }
  }
}
