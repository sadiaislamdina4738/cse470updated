import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
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
  const eventLiveRef = useRef(new Map());
  const eventUpdatedHandlersRef = useRef(new Set());

  useEffect(() => {
    if (isAuthenticated && user) {
      const token = localStorage.getItem('token');

      if (!token) {
        console.error('No token found for socket connection');
        return undefined;
      }

      const apiBase =
        process.env.REACT_APP_API_URL ||
        (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');
      const socketURL = apiBase.replace(/\/?api\/?$/i, '') || 'http://localhost:5000';

      const socket = io(socketURL, {
        transports: ['websocket'],
        auth: {
          token
        }
      });
      socketRef.current = socket;

      const fanOutEventUpdated = (doc) => {
        eventUpdatedHandlersRef.current.forEach((fn) => {
          try {
            fn(doc);
          } catch (e) {
            console.error('event-updated handler error:', e);
          }
        });
      };
      socket.on('event-updated', fanOutEventUpdated);

      socket.on('connect', () => {
        console.log('Connected to socket server');
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from socket server');
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      return () => {
        socket.off('event-updated', fanOutEventUpdated);
        socket.disconnect();
        socketRef.current = undefined;
        eventChatsRef.current.clear();
        eventLiveRef.current.clear();
      };
    }
    return undefined;
  }, [isAuthenticated, user]);

  const joinEventChat = useCallback((eventId) => {
    if (socketRef.current && isAuthenticated) {
      socketRef.current.emit('join-event-chat', eventId, (ack) => {
        if (ack && ack.success === false) {
          console.warn('join-event-chat denied:', ack.message);
        }
      });
      eventChatsRef.current.set(eventId, true);
    }
  }, [isAuthenticated]);

  const leaveEventChat = useCallback((eventId) => {
    if (socketRef.current && eventChatsRef.current.has(eventId)) {
      socketRef.current.emit('leave-event-chat', eventId);
      eventChatsRef.current.delete(eventId);
    }
  }, []);

  const joinEventLive = useCallback((eventId) => {
    if (socketRef.current && isAuthenticated) {
      socketRef.current.emit('join-event-live', eventId, (ack) => {
        if (ack && ack.success === false) {
          console.warn('join-event-live denied:', ack.message);
        }
      });
      eventLiveRef.current.set(eventId, true);
    }
  }, [isAuthenticated]);

  const leaveEventLive = useCallback((eventId) => {
    if (socketRef.current && eventLiveRef.current.has(eventId)) {
      socketRef.current.emit('leave-event-live', eventId);
      eventLiveRef.current.delete(eventId);
    }
  }, []);

  const sendMessage = useCallback((eventId, message) => {
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
  }, [isAuthenticated]);

  const onNewMessage = useCallback((eventId, callback) => {
    if (socketRef.current) {
      socketRef.current.on('new-message', (msg) => {
        if (msg.eventId === eventId) {
          callback(msg);
        }
      });
    }
  }, []);

  const offNewMessage = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.off('new-message');
    }
  }, []);

  const subscribeEventUpdated = useCallback((handler) => {
    eventUpdatedHandlersRef.current.add(handler);
    return () => {
      eventUpdatedHandlersRef.current.delete(handler);
    };
  }, []);

  const value = {
    socket: socketRef.current,
    joinEventChat,
    leaveEventChat,
    joinEventLive,
    leaveEventLive,
    sendMessage,
    onNewMessage,
    offNewMessage,
    subscribeEventUpdated,
    isConnected: !!socketRef.current?.connected
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
