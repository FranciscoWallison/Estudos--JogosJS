import { createServer } from 'http';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { GameManager } from './src/server/game/GameManager';
import { setupSocketHandlers } from './src/server/socket/handlers';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*' },
    pingInterval: 2000,
    pingTimeout: 5000,
  });

  const gameManager = new GameManager();
  setupSocketHandlers(io, gameManager);

  httpServer.listen(port, () => {
    console.log(`> Servidor pronto em http://${hostname}:${port}`);
  });
});
