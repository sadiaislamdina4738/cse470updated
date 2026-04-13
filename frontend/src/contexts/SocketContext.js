import React, { createContext, useContext, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const socketRef = useRef();
  const eventChatsRef = useRef(new Map());

  useEffect(() => {
    if (isAuthenticated && user) {
      // Get token from localStorage
      const token = localStorage.getItem('token');

      if (!token) {
        console.error('No token found for socket connection');
        return;
      }

      // Connect to socket server with authentication
      socketRef.current = io('http://localhost:5000', {
        transports: ['websocket'],
        auth: {
          token: token
        }
      });

      socketRef.current.on('connect', () => {
        console.log('Connected to socket server');
      });

      socketRef.current.on('disconnect', () => {
        console.log('Disconnected from socket server');
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [isAuthenticated, user]);

  const joinEventChat = (eventId) => {
    if (socketRef.current && isAuthenticated) {
      socketRef.current.emit('join-event-chat', eventId);
      eventChatsRef.current.set(eventId, true);
    }
  };

  const leaveEventChat = (eventId) => {
    if (socketRef.current && eventChatsRef.current.has(eventId)) {
      socketRef.current.emit('leave-event-chat', eventId);
      eventChatsRef.current.delete(eventId);
    }
  };

  const sendMessage = (eventId, message) => {
    if (socketRef.current && isAuthenticated) {
      return new Promise((resolve, reject) => {
        socketRef.current.emit('send-message', { eventId, message }, (response) => {
          if (response && response.success) {
            resolve(response);
          } else {
            reject(new Error(response?.message || 'Failed to send message'));
          }
        });
      });
    }
    return Promise.reject(new Error('Socket not connected'));
  };

  const onNewMessage = (eventId, callback) => {
    if (socketRef.current) {
      socketRef.current.on('new-message', (message) => {
        if (message.eventId === eventId) {
          callback(message);
        }
      });
    }
  };

  const offNewMessage = () => {
    if (socketRef.current) {
      socketRef.current.off('new-message');
    }
  };

  const value = {
    socket: socketRef.current,
    joinEventChat,
    leaveEventChat,
    sendMessage,
    onNewMessage,
    offNewMessage,
    isConnected: !!socketRef.current?.connected
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
