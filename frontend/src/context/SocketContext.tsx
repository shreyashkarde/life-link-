import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinBookingRoom: (bookingId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const { user } = useAuth();

  useEffect(() => {
    const s = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    s.on('connect', () => {
      console.log('[Socket.io Client] Connected with ID:', s.id);
      setIsConnected(true);
    });

    s.on('disconnect', () => {
      console.log('[Socket.io Client] Disconnected');
      setIsConnected(false);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  // Handle user and driver room joining when user changes
  useEffect(() => {
    if (socket && socket.connected && (user?.id || user?._id)) {
      const uId = user.id || user._id;
      socket.emit('join_user', uId);

      if (user.role === 'DRIVER') {
        socket.emit('join_driver', uId);
      }
    }
  }, [socket, isConnected, user]);

  const joinBookingRoom = (bookingId: string) => {
    if (socket && bookingId) {
      socket.emit('join_booking', bookingId);
      console.log(`[Socket.io Client] Joined tracking room: booking_${bookingId}`);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinBookingRoom }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};
