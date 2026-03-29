import { Server, Socket } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '../../shared/protocol';
import { GameManager } from '../game/GameManager';
import { verifyToken } from '../firebaseAdmin';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// Map socket.id -> { playerId, roomId, playerName }
const socketPlayerMap = new Map<string, { playerId: string; roomId: string; playerName: string }>();

// Map roomId -> Map<playerId, { name, characterIndex }>
// Tracks players who have joined a game room via socket
const roomPlayers = new Map<string, Map<string, { name: string; characterIndex: number }>>();

// Grace period for disconnects (handles React Strict Mode double-mount and page transitions)
const DISCONNECT_GRACE_MS = 5000;
const pendingDisconnects = new Map<string, ReturnType<typeof setTimeout>>();

export function setupSocketHandlers(io: TypedServer, gameManager: GameManager): void {
  io.on('connection', (socket: TypedSocket) => {
    console.log(`Socket conectado: ${socket.id}`);

    socket.on('game:join', async (data) => {
      try {
        // Verificar token Firebase
        const decoded = await verifyToken(data.token);
        if (!decoded) {
          socket.emit('game:error', { message: 'Token invalido.' });
          return;
        }

        const playerId = decoded.uid;
        const { roomId, playerName, characterIndex, expectedPlayers, roomOptions } = data;

        // Cancelar disconnect pendente se o jogador reconectou
        const pendingKey = `${roomId}:${playerId}`;
        if (pendingDisconnects.has(pendingKey)) {
          clearTimeout(pendingDisconnects.get(pendingKey)!);
          pendingDisconnects.delete(pendingKey);
          console.log(`Jogador ${playerName} reconectou - cancelando disconnect pendente`);
        }

        // Registrar socket
        socketPlayerMap.set(socket.id, { playerId, roomId, playerName });
        socket.join(roomId);

        // Track room players
        if (!roomPlayers.has(roomId)) {
          roomPlayers.set(roomId, new Map());
        }
        roomPlayers.get(roomId)!.set(playerId, { name: playerName, characterIndex });

        // Se jogo ja esta ativo, rejeitar
        if (gameManager.getEngine(roomId)) {
          socket.emit('game:error', { message: 'Jogo ja esta em andamento.' });
          return;
        }

        // Se nao ha jogo pendente, preparar usando a lista completa de jogadores esperados
        if (!gameManager.hasPendingGame(roomId)) {
          // Usar a lista de jogadores esperados enviada pelo client (da sala do Firebase)
          const allPlayers = new Map<string, { name: string; characterIndex: number }>();
          if (expectedPlayers && expectedPlayers.length > 0) {
            for (const p of expectedPlayers) {
              allPlayers.set(p.id, { name: p.name, characterIndex: p.characterIndex });
            }
          } else {
            // Fallback: usar jogadores conectados (pode causar problemas se só 1 conectou)
            allPlayers.set(playerId, { name: playerName, characterIndex });
          }
          console.log(`Preparando jogo na sala ${roomId} com ${allPlayers.size} jogadores esperados`);
          const options = roomOptions || { blocks: true, items: true, monsters: false };
          gameManager.prepareGame(roomId, allPlayers, options);
        }

        // Registrar jogador como conectado
        const allConnected = gameManager.playerConnected(roomId, playerId);

        console.log(`Jogador ${playerName} (${playerId}) conectou na sala ${roomId}. Todos conectados: ${allConnected}`);

        if (allConnected) {
          // Todos conectaram, iniciar jogo
          console.log(`Todos os jogadores conectados na sala ${roomId}. Iniciando jogo...`);
          gameManager.startGame(
            roomId,
            (state) => {
              io.to(roomId).emit('game:state', state);
            },
            (winnerId) => {
              const winnerName = winnerId
                ? roomPlayers.get(roomId)?.get(winnerId)?.name || null
                : null;

              io.to(roomId).emit('game:over', { winnerId, winnerName });
              gameManager.endGame(roomId);
              roomPlayers.delete(roomId);
            }
          );
        }
      } catch (err) {
        console.error('Erro no game:join:', err);
        socket.emit('game:error', { message: 'Erro ao entrar no jogo.' });
      }
    });

    socket.on('game:input', (data) => {
      const mapping = socketPlayerMap.get(socket.id);
      if (!mapping) return;

      const engine = gameManager.getEngine(mapping.roomId);
      if (engine) {
        engine.pushInput(mapping.playerId, data);
      }
    });

    socket.on('game:leave', () => {
      handleDisconnect(socket, gameManager, io, false);
    });

    socket.on('disconnect', () => {
      console.log(`Socket desconectado: ${socket.id}`);
      handleDisconnect(socket, gameManager, io, true);
    });
  });
}

function handleDisconnect(
  socket: TypedSocket,
  gameManager: GameManager,
  io: TypedServer,
  useGracePeriod: boolean
): void {
  const mapping = socketPlayerMap.get(socket.id);
  if (!mapping) return;

  const { playerId, roomId, playerName } = mapping;
  socketPlayerMap.delete(socket.id);
  socket.leave(roomId);

  if (useGracePeriod) {
    // Agendar remocao com grace period (permite reconexao em caso de Strict Mode / refresh)
    const pendingKey = `${roomId}:${playerId}`;
    console.log(`Agendando disconnect de ${playerName} em ${DISCONNECT_GRACE_MS}ms...`);

    const timeout = setTimeout(() => {
      pendingDisconnects.delete(pendingKey);
      console.log(`Grace period expirou - removendo jogador ${playerName} da sala ${roomId}`);

      gameManager.removePlayer(roomId, playerId);
      io.to(roomId).emit('game:player-disconnected', {
        playerId,
        playerName,
      });
    }, DISCONNECT_GRACE_MS);

    pendingDisconnects.set(pendingKey, timeout);
  } else {
    // game:leave explicito - remover imediatamente
    gameManager.removePlayer(roomId, playerId);
    io.to(roomId).emit('game:player-disconnected', {
      playerId,
      playerName,
    });
  }
}
