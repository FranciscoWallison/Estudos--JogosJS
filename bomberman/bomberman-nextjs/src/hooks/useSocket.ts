import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '@/shared/protocol';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useSocket() {
  const socketRef = useRef<TypedSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Se ja existe um socket (re-mount do Strict Mode), reutilizar
    if (socketRef.current) {
      const socket = socketRef.current;
      const onConnect = () => setIsConnected(true);
      const onDisconnect = () => setIsConnected(false);
      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      if (socket.connected) setIsConnected(true);
      return () => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
      };
    }

    const socket: TypedSocket = io({
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    socketRef.current = socket;

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      // NAO desconectar aqui - React Strict Mode causa cleanup/remount em dev
      // A desconexao deve ser feita explicitamente via disconnect()
    };
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    connect,
    disconnect,
  };
}
