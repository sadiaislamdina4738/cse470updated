import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import './Notifications.css';

const Notifications = () => {
  const {
    notifications,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  } = useNotifications();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <h2>Notifications</h2>
        <button type="button" className="btn btn-secondary" onClick={markAllAsRead}>
          Mark all as read
        </button>
      </div>

      {loading ? (
        <div className="notifications-empty">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="notifications-empty">No notifications yet.</div>
      ) : (
        <div className="notifications-list">
          {notifications.map((item) => (
            <div
              key={item._id}
              className={`notification-item ${item.isRead ? 'read' : 'unread'}`}
            >
              <div className="notification-content">
                <div className="notification-title">{item.title}</div>
                <div className="notification-message">{item.message}</div>
                <div className="notification-meta">
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                  {item.event?._id && (
                    <Link to={`/events/${item.event._id}`}>View event</Link>
                  )}
                </div>
              </div>
              {!item.isRead && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => markAsRead(item._id)}
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
