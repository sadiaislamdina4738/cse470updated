import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useEvents } from '../contexts/EventContext';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import EventChat from '../components/EventChat';
import FeedbackForm from '../components/FeedbackForm';
import FeedbackDisplay from '../components/FeedbackDisplay';
import EventQRCode from '../components/EventQRCode';
import CalendarIntegration from '../components/CalendarIntegration';
import EventManagement from '../components/EventManagement';
import toast from 'react-hot-toast';
import './EventDetail.css';

const EventDetail = () => {
  const { id } = useParams();
  const { getEventById, rsvpToEvent } = useEvents();
  const { isAuthenticated, user } = useAuth();
  const [activeTab, setActiveTab] = useState('details');
  const [rsvpLoading, setRsvpLoading] = useState(false);

  const event = getEventById(id);

  if (!event) {
    return (
      <div className="event-detail-page">
        <div className="loading-container">
          <h2>Event not found</h2>
          <p>The event you're looking for doesn't exist or has been removed.</p>
          <Link to="/events" className="btn btn-primary">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const handleRSVP = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to RSVP to this event');
      return;
    }

    setRsvpLoading(true);
    try {
      const result = await rsvpToEvent(event._id);
      if (result.success) {
        toast.success('Successfully RSVP\'d to event!');
        // Refresh the page to update the event data
        window.location.reload();
      }
    } catch (error) {
      toast.error('Failed to RSVP to event');
    } finally {
      setRsvpLoading(false);
    }
  };

  const currentUserId = user?._id || user?.id;
  const isAttending = event.attendees?.some((attendee) => {
    const attendeeId = attendee?._id || attendee?.id || attendee;
    return String(attendeeId) === String(currentUserId);
  });

  // Check if current user is the event creator (supports both populated object and raw ID)
  const creatorId = typeof event.creator === 'object' ? (event.creator?._id || event.creator?.id) : event.creator;
  const isCreator = creatorId && currentUserId && String(creatorId) === String(currentUserId);
  const hasPendingRequests = event.pendingRequests && event.pendingRequests.length > 0;

  return (
    <div className="event-detail-page">
      {/* Notification banner for pending requests */}
      {isCreator && hasPendingRequests && (
        <div className="pending-requests-banner">
          <div className="banner-content">
            <span className="banner-icon">⚠️</span>
            <span className="banner-text">
              You have {event.pendingRequests.length} pending join request(s) that need your approval
            </span>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setActiveTab('details')}
            >
              Review Requests
            </button>
          </div>
        </div>
      )}
      <div className="event-hero">
        <div className="event-image-large">
          {event.banner ? (
            <img src={event.banner} alt={event.title} />
          ) : (
            <div className="event-placeholder-large">
              <span>📅</span>
            </div>
          )}
        </div>

        <div className="event-hero-content">
          <div className="event-category-badge-large">
            {event.category}
          </div>
          <h1 className="event-title-large">{event.title}</h1>
          <p className="event-description-large">{event.description}</p>

          <div className="event-meta-large">
            <div className="meta-item">
              <span className="meta-icon">📍</span>
              <span>{event.location}</span>
            </div>
            <div className="meta-item">
              <span className="meta-icon">📅</span>
              <span>{format(new Date(event.schedule), 'EEEE, MMMM dd, yyyy')}</span>
            </div>
            <div className="meta-item">
              <span className="meta-icon">🕐</span>
              <span>{format(new Date(event.schedule), 'h:mm a')}</span>
            </div>
            <div className="meta-item">
              <span className="meta-icon">👥</span>
              <span>{event.attendees.length} attending</span>
            </div>
          </div>
        </div>
      </div>

      <div className="event-details-container">
        <div className="event-details-grid">
          <div className="event-info-card">
            <h3>Event Details</h3>
            <div className="detail-item">
              <strong>Organizer:</strong> {event.creator?.username || 'Event Organizer'}
            </div>
            <div className="detail-item">
              <strong>Category:</strong> {event.category}
            </div>
            <div className="detail-item">
              <strong>Location:</strong> {event.location}
            </div>
            <div className="detail-item">
              <strong>Date & Time:</strong> {format(new Date(event.schedule), 'EEEE, MMMM dd, yyyy at h:mm a')}
            </div>
            <div className="detail-item">
              <strong>Attendees:</strong> {event.attendees.length} / {event.maxAttendees || 'Unlimited'}
            </div>
          </div>

          <div className="event-actions-card">
            <h3>Actions</h3>
            {isAuthenticated ? (
              <div className="action-buttons">
                {isAttending ? (
                  <button className="btn btn-success btn-large" disabled>
                    ✓ Already Attending
                  </button>
                ) : (
                  <button
                    className="btn btn-primary btn-large"
                    onClick={handleRSVP}
                    disabled={rsvpLoading}
                  >
                    {rsvpLoading ? 'RSVPing...' : 'RSVP to Event'}
                  </button>
                )}
                <button className="btn btn-secondary">
                  Share Event
                </button>
                <button className="btn btn-secondary">
                  Add to Calendar
                </button>
              </div>
            ) : (
              <div className="login-prompt">
                <p>Please log in to RSVP to this event</p>
                <Link to="/login" className="btn btn-primary">
                  Login
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="event-description-full">
          <h3>About This Event</h3>
          <p>{event.description || 'No description provided for this event.'}</p>
        </div>
      </div>

      {/* Event Tabs */}
      <div className="event-tabs-container">
        <div className="event-tabs">
          <button
            className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          {isCreator && (
            <button
              className={`tab-button ${activeTab === 'manage' ? 'active' : ''}`}
              onClick={() => setActiveTab('manage')}
            >
              Manage {hasPendingRequests && `(${event.pendingRequests.length})`}
            </button>
          )}
          <button
            className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            Chat
          </button>
          <button
            className={`tab-button ${activeTab === 'feedback' ? 'active' : ''}`}
            onClick={() => setActiveTab('feedback')}
          >
            Feedback
          </button>
          <button
            className={`tab-button ${activeTab === 'share' ? 'active' : ''}`}
            onClick={() => setActiveTab('share')}
          >
            Share
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'details' && (
            <div className="tab-panel">
              <h3>Event Information</h3>
              <div className="event-details-content">
                <div className="event-info-section">
                  <h4>Event Details</h4>
                  <div className="event-info-grid">
                    <div className="info-item">
                      <span className="info-label">Date & Time:</span>
                      <span className="info-value">{format(new Date(event.schedule), 'PPP p')}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Location:</span>
                      <span className="info-value">{event.location}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Category:</span>
                      <span className="info-value">{event.category}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Max Attendees:</span>
                      <span className="info-value">{event.maxAttendees || 'Unlimited'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Current Attendees:</span>
                      <span className="info-value">{event.attendees?.length || 0}</span>
                    </div>
                  </div>
                </div>

                <CalendarIntegration
                  event={event}
                  isAttending={isAttending}
                />
              </div>
            </div>
          )}

          {activeTab === 'manage' && (
            <div className="tab-panel">
              {isCreator ? (
                <EventManagement
                  event={event}
                  onEventUpdate={(updatedEvent) => {
                    // Refresh the page to update event data
                    window.location.reload();
                  }}
                />
              ) : (
                <div className="access-denied">
                  <p>Only event creators can access this section.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="tab-panel">
              {isAuthenticated ? (
                <EventChat eventId={event._id} />
              ) : (
                <div className="login-prompt">
                  <p>Please log in to join the event chat</p>
                  <Link to="/login" className="btn btn-primary">
                    Login
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="tab-panel">
              <FeedbackDisplay eventId={event._id} />
              {isAuthenticated && (
                <FeedbackForm
                  eventId={event._id}
                  onSubmitSuccess={() => {
                    // Refresh feedback display
                    setActiveTab('feedback');
                  }}
                />
              )}
            </div>
          )}

          {activeTab === 'share' && (
            <div className="tab-panel">
              <EventQRCode event={event} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
