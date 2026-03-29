import {
  ref,
  push,
  set,
  get,
  remove,
  update,
  onValue,
  onDisconnect,
  query,
  orderByChild,
  equalTo,
  off,
  DataSnapshot,
} from 'firebase/database';
import { database } from './firebase';
import { MAX_PLAYERS, MIN_PLAYERS } from '@/shared/constants';
import { RoomOptions } from '@/shared/types';

const DB_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(
          `Timeout ao ${operation}. O Realtime Database pode estar desativado. ` +
          'Ative em Firebase Console > Realtime Database > Criar banco de dados.'
        )),
        DB_TIMEOUT_MS
      )
    ),
  ]);
}

function handleDatabaseError(err: unknown, operation: string): never {
  const error = err as { code?: string; message?: string };
  const msg = error.message || '';
  const code = error.code || '';

  if (msg.includes('deactivated') || msg.includes('FIREBASE WARNING')) {
    throw new Error('Realtime Database nao esta ativado. Ative em Firebase Console > Realtime Database > Criar banco de dados.');
  }
  if (code === 'PERMISSION_DENIED' || msg.includes('PERMISSION_DENIED')) {
    throw new Error('Permissao negada no banco de dados. Configure as regras de seguranca no Firebase Console > Realtime Database > Regras.');
  }
  if (msg.includes('Failed to fetch') || msg.includes('network')) {
    throw new Error('Erro de rede ao acessar o banco de dados. Verifique sua conexao.');
  }

  throw new Error(`Erro ao ${operation}: ${msg || code || 'erro desconhecido'}`);
}

export interface RoomData {
  id: string;
  info: {
    name: string;
    hostId: string;
    maxPlayers: number;
    status: 'waiting' | 'playing' | 'finished';
    createdAt: number;
    options: RoomOptions;
  };
  players: Record<string, {
    name: string;
    characterIndex: number;
    isReady: boolean;
    joinedAt: number;
  }>;
}

/**
 * Criar uma nova sala
 */
export async function createRoom(
  userId: string,
  playerName: string,
  roomName: string,
  maxPlayers: number,
  characterIndex: number
): Promise<string> {
  try {
    const roomsRef = ref(database, 'rooms');
    const newRoomRef = push(roomsRef);
    const roomId = newRoomRef.key!;

    await withTimeout(set(newRoomRef, {
      info: {
        name: roomName,
        hostId: userId,
        maxPlayers: Math.min(Math.max(maxPlayers, MIN_PLAYERS), MAX_PLAYERS),
        status: 'waiting',
        createdAt: Date.now(),
        options: {
          blocks: true,
          items: true,
          monsters: false,
        },
      },
      players: {
        [userId]: {
          name: playerName,
          characterIndex,
          isReady: false,
          joinedAt: Date.now(),
        },
      },
    }), 'criar sala');

    // Remover jogador ao desconectar
    const playerRef = ref(database, `rooms/${roomId}/players/${userId}`);
    onDisconnect(playerRef).remove();

    return roomId;
  } catch (err) {
    handleDatabaseError(err, 'criar sala');
  }
}

/**
 * Entrar em uma sala existente
 */
export async function joinRoom(
  userId: string,
  playerName: string,
  roomId: string,
  characterIndex: number
): Promise<boolean> {
  try {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await withTimeout(get(roomRef), 'ler sala');

    if (!snapshot.exists()) return false;

    const roomData = snapshot.val();
    if (roomData.info.status !== 'waiting') return false;

    const playerCount = roomData.players ? Object.keys(roomData.players).length : 0;
    if (playerCount >= roomData.info.maxPlayers) return false;

    const playerRef = ref(database, `rooms/${roomId}/players/${userId}`);
    await withTimeout(set(playerRef, {
      name: playerName,
      characterIndex,
      isReady: false,
      joinedAt: Date.now(),
    }), 'entrar na sala');

    // Remover jogador ao desconectar
    onDisconnect(playerRef).remove();

    return true;
  } catch (err) {
    handleDatabaseError(err, 'entrar na sala');
  }
}

/**
 * Quick match: encontrar sala disponivel ou criar nova
 */
export async function quickMatch(
  userId: string,
  playerName: string,
  characterIndex: number
): Promise<string> {
  try {
    const roomsRef = ref(database, 'rooms');
    const snapshot = await withTimeout(get(roomsRef), 'buscar salas');

    if (snapshot.exists()) {
      const rooms = snapshot.val();
      for (const [roomId, roomData] of Object.entries(rooms) as [string, any][]) {
        if (roomData.info.status === 'waiting') {
          const playerCount = roomData.players ? Object.keys(roomData.players).length : 0;
          if (playerCount < roomData.info.maxPlayers) {
            const joined = await joinRoom(userId, playerName, roomId, characterIndex);
            if (joined) return roomId;
          }
        }
      }
    }

    // Nenhuma sala disponivel, criar uma nova
    return createRoom(userId, playerName, `Sala de ${playerName}`, MAX_PLAYERS, characterIndex);
  } catch (err) {
    handleDatabaseError(err, 'buscar partida');
  }
}

/**
 * Sair de uma sala
 */
export async function leaveRoom(userId: string, roomId: string): Promise<void> {
  const roomRef = ref(database, `rooms/${roomId}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) return;

  const roomData = snapshot.val();
  const playerRef = ref(database, `rooms/${roomId}/players/${userId}`);
  await remove(playerRef);

  // Verificar se a sala ficou vazia
  const playersSnapshot = await get(ref(database, `rooms/${roomId}/players`));
  if (!playersSnapshot.exists() || Object.keys(playersSnapshot.val()).length === 0) {
    await remove(roomRef);
    return;
  }

  // Transferir host se necessario
  if (roomData.info.hostId === userId) {
    const remainingPlayers = Object.keys(playersSnapshot.val());
    await update(ref(database, `rooms/${roomId}/info`), {
      hostId: remainingPlayers[0],
    });
  }
}

/**
 * Alternar estado pronto
 */
export async function toggleReady(userId: string, roomId: string): Promise<void> {
  const playerRef = ref(database, `rooms/${roomId}/players/${userId}`);
  const snapshot = await get(playerRef);

  if (!snapshot.exists()) return;

  const currentReady = snapshot.val().isReady;
  await update(playerRef, { isReady: !currentReady });
}

/**
 * Alterar personagem
 */
export async function changeCharacter(
  userId: string,
  roomId: string,
  characterIndex: number
): Promise<void> {
  const playerRef = ref(database, `rooms/${roomId}/players/${userId}`);
  await update(playerRef, { characterIndex });
}

/**
 * Atualizar opcoes da sala (host only)
 */
export async function updateRoomOptions(
  roomId: string,
  options: Partial<RoomOptions>
): Promise<void> {
  try {
    const optionsRef = ref(database, `rooms/${roomId}/info/options`);
    await withTimeout(update(optionsRef, options), 'atualizar opcoes');
  } catch (err) {
    handleDatabaseError(err, 'atualizar opcoes');
  }
}

/**
 * Iniciar jogo (host only)
 */
export async function startGame(roomId: string): Promise<void> {
  await update(ref(database, `rooms/${roomId}/info`), {
    status: 'playing',
  });
}

/**
 * Marcar jogo como finalizado
 */
export async function finishGame(roomId: string): Promise<void> {
  await update(ref(database, `rooms/${roomId}/info`), {
    status: 'finished',
  });
}

/**
 * Subscribir a mudancas em uma sala (tempo real)
 */
export function subscribeToRoom(
  roomId: string,
  callback: (data: RoomData | null) => void,
  onError?: (error: string) => void
): () => void {
  const roomRef = ref(database, `rooms/${roomId}`);

  const handler = (snapshot: DataSnapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback({ id: roomId, ...snapshot.val() } as RoomData);
  };

  const errorHandler = (err: Error) => {
    console.error('Erro ao observar sala:', err);
    if (onError) {
      const msg = err.message || '';
      if (msg.includes('deactivated')) {
        onError('Realtime Database nao esta ativado. Ative em Firebase Console > Realtime Database.');
      } else if (msg.includes('PERMISSION_DENIED')) {
        onError('Permissao negada. Configure as regras no Firebase Console > Realtime Database > Regras.');
      } else {
        onError(`Erro ao carregar sala: ${msg}`);
      }
    }
  };

  onValue(roomRef, handler, errorHandler);

  return () => off(roomRef, 'value', handler);
}

/**
 * Subscribir a lista de salas disponiveis (tempo real)
 */
export function subscribeToRoomList(
  callback: (rooms: RoomData[]) => void,
  onError?: (error: string) => void
): () => void {
  const roomsRef = ref(database, 'rooms');

  const handler = (snapshot: DataSnapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const rooms: RoomData[] = [];
    const data = snapshot.val();

    for (const [roomId, roomData] of Object.entries(data) as [string, any][]) {
      if (roomData.info?.status === 'waiting') {
        rooms.push({ id: roomId, ...roomData } as RoomData);
      }
    }

    callback(rooms);
  };

  const errorHandler = (err: Error) => {
    console.error('Erro ao listar salas:', err);
    if (onError) {
      const msg = err.message || '';
      if (msg.includes('deactivated')) {
        onError('Realtime Database nao esta ativado. Ative em Firebase Console > Realtime Database.');
      } else if (msg.includes('PERMISSION_DENIED')) {
        onError('Permissao negada. Configure as regras no Firebase Console > Realtime Database > Regras.');
      } else {
        onError(`Erro ao listar salas: ${msg}`);
      }
    }
  };

  onValue(roomsRef, handler, errorHandler);

  return () => off(roomsRef, 'value', handler);
}
