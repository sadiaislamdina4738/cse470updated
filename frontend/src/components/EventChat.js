import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import './EventChat.css';

const EventChat = ({ eventId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { joinEventChat, leaveEventChat, onNewMessage, offNewMessage, sendMessage: socketSendMessage } = useSocket();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch existing messages
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/events/chat?eventId=${eventId}`);
      setMessages(response.data.messages);
    } catch (error) {
      setError('Failed to load chat messages');
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // Send new message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      // Try Socket.io first, fallback to HTTP API
      if (socketSendMessage) {
        try {
          const result = await socketSendMessage(eventId, newMessage.trim());
          if (result.success) {
            // Add message to local state immediately for optimistic UI
            const tempMessage = {
              _id: Date.now().toString(),
              eventId,
              message: newMessage.trim(),
              userId: { _id: user?.id, username: user?.username || 'You' },
              createdAt: new Date()
            };
            setMessages(prev => [...prev, tempMessage]);
            setNewMessage('');
            scrollToBottom();
            return;
          }
        } catch (socketError) {
          console.log('Socket.io failed, falling back to HTTP API');
        }
      }

      // Fallback to HTTP API
      const response = await api.post('/events/chat', {
        eventId,
        message: newMessage.trim()
      });

      // Add message to local state
      setMessages(prev => [...prev, response.data.data || response.data.chatMessage]);
      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      setError('Failed to send message');
      console.error('Error sending message:', error);
    }
  };

  // Handle incoming real-time messages
  useEffect(() => {
    const handleNewMessage = (message) => {
      // Only add message if it's for this event and not already in the list
      if (message.eventId === eventId) {
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          const exists = prev.some(m => m._id === message._id);
          if (!exists) {
            return [...prev, message];
          }
          return prev;
        });
        scrollToBottom();
      }
    };

    onNewMessage(eventId, handleNewMessage);
    return () => offNewMessage();
  }, [eventId, onNewMessage, offNewMessage]);

  // Join/leave chat room
  useEffect(() => {
    joinEventChat(eventId);
    fetchMessages();

    return () => {
      leaveEventChat(eventId);
    };
  }, [eventId, joinEventChat, leaveEventChat, fetchMessages]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (loading && messages.length === 0) {
    return (
      <div className="chat-loading">
        <div className="loading-spinner"></div>
        <p>Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="event-chat" ref={chatContainerRef}>
      <div className="chat-header">
        <h3>Event Chat</h3>
        <span className="chat-subtitle">Connect with other attendees</span>
      </div>

      {error && (
        <div className="chat-error">
          <span>{error}</span>
          <button onClick={() => setError('')} className="error-close">×</button>
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Be the first to say hello! 👋</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message._id}
              className={`message ${message.userId._id === user?.id ? 'own-message' : ''}`}
            >
              <div className="message-header">
                <span className="message-author">{message.userId.username}</span>
                <span className="message-time">
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="message-content">{message.message}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="chat-input-form">
        <div className="chat-input-container">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="chat-input"
            maxLength={500}
          />
          <button
            type="submit"
            className="chat-send-btn"
            disabled={!newMessage.trim()}
          >
            Send
          </button>
        </div>
        <div className="chat-input-info">
          <span className="char-count">{newMessage.length}/500</span>
        </div>
      </form>
    </div>
  );
};

export default EventChat;
