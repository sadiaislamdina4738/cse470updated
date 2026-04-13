import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Profile.css';

const Profile = () => {
  const { user, logout } = useAuth();
  const createdEvents = user?.eventsCreated || [];
  const joinedEvents = user?.eventsJoined || [];

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>Profile</h1>
        <p>Manage your account and preferences</p>
      </div>

      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              <span>{user?.username?.charAt(0).toUpperCase() || 'U'}</span>
            </div>
            <div className="profile-info">
              <h2>{user?.username || 'User'}</h2>
              <p>{user?.email || 'No email available'}</p>
            </div>
          </div>

          <div className="profile-stats">
            <div className="stat-item">
              <span className="stat-number">{createdEvents.length}</span>
              <span className="stat-label">Events Created</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{joinedEvents.length}</span>
              <span className="stat-label">Events Joined</span>
            </div>
          </div>

          <div className="event-history">
            <div className="event-history-section">
              <h3>Created Events</h3>
              {createdEvents.length === 0 ? (
                <p className="empty-history">No created events yet.</p>
              ) : (
                <ul className="event-list">
                  {createdEvents.map((event) => (
                    <li key={event._id} className="event-list-item">
                      <strong>{event.title}</strong>
                      <span>{event.category} | {event.location}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="event-history-section">
              <h3>Joined Events</h3>
              {joinedEvents.length === 0 ? (
                <p className="empty-history">No joined events yet.</p>
              ) : (
                <ul className="event-list">
                  {joinedEvents.map((event) => (
                    <li key={event._id} className="event-list-item">
                      <strong>{event.title}</strong>
                      <span>{event.category} | {event.location}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="profile-actions">
            <button onClick={logout} className="btn btn-danger">
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
