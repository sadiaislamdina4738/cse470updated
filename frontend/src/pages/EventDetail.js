import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEvents } from '../contexts/EventContext';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
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
  const navigate = useNavigate();
  const { fetchEventById, patchEventInList, rsvpToEvent, cancelRsvp, deleteEvent } = useEvents();
  const { isAuthenticated, user } = useAuth();
  const { joinEventLive, leaveEventLive, subscribeEventUpdated } = useSocket();
  const [activeTab, setActiveTab] = useState('details');
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [event, setEvent] = useState(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [feedbackRefreshKey, setFeedbackRefreshKey] = useState(0);

  const loadEvent = useCallback(async () => {
    setDetailLoading(true);
    try {
      const ev = await fetchEventById(id);
      setEvent(ev || null);
    } catch {
      setEvent(null);
    } finally {
      setDetailLoading(false);
    }
  }, [id, fetchEventById]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  useEffect(() => {
    if (!id || !isAuthenticated) return undefined;
    joinEventLive(id);
    const unsub = subscribeEventUpdated((doc) => {
      const docId = doc?._id != null ? String(doc._id) : '';
      if (docId !== String(id)) return;
      patchEventInList(doc);
      if (doc.isActive === false) {
        toast.error('This event is no longer available');
        navigate('/events');
        return;
      }
      setEvent(doc);
    });
    return () => {
      unsub();
      leaveEventLive(id);
    };
  }, [
    id,
    isAuthenticated,
    joinEventLive,
    leaveEventLive,
    subscribeEventUpdated,
    patchEventInList,
    navigate
  ]);

  const handleRSVP = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to RSVP to this event');
      return;
    }
    setRsvpLoading(true);
    try {
      const result = await rsvpToEvent(event._id);
      if (result.success && result.event) {
        setEvent(result.event);
      }
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleCancelRsvp = async () => {
    setRsvpLoading(true);
    try {
      const result = await cancelRsvp(event._id);
      if (result.success && result.event) {
        setEvent(result.event);
      }
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!window.confirm('Delete this event? It will be hidden from the public list.')) return;
    const result = await deleteEvent(event._id);
    if (result.success) {
      navigate('/events');
    }
  };

  if (detailLoading) {
    return (
      <div className="event-detail-page">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="event-detail-page">
        <div className="loading-container">
          <h2>Event not found</h2>
          <p>The event you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <Link to="/events" className="btn btn-primary">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const currentUserId = user?._id || user?.id;
  const uid = currentUserId ? String(currentUserId) : '';

  const isAttending = event.attendees?.some((attendee) => {
    const attendeeId = attendee?._id || attendee?.id || attendee;
    return String(attendeeId) === uid;
  });

  const isPending = event.pendingRequests?.some((p) => String(p?._id || p) === uid);
  const isWaitlisted = event.waitlist?.some((w) => String(w?._id || w) === uid);

  const creatorId = typeof event.creator === 'object' ? (event.creator?._id || event.creator?.id) : event.creator;
  const isCreator = creatorId && uid && String(creatorId) === uid;
  const hasPendingRequests = event.pendingRequests && event.pendingRequests.length > 0;

  const canUseChat = isAuthenticated && (isAttending || isPending || isWaitlisted || isCreator);

  return (
    <div className="event-detail-page">
      {isCreator && hasPendingRequests && (
        <div className="pending-requests-banner">
          <div className="banner-content">
            <span className="banner-icon">⚠️</span>
            <span className="banner-text">
              You have {event.pendingRequests.length} pending join request(s) that need your approval
            </span>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setActiveTab('manage')}
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
              <span>{event.attendees?.length || 0} attending</span>
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
              <strong>Attendees:</strong> {event.attendees?.length || 0} / {event.maxAttendees || '—'}
            </div>
            <div className="detail-item">
              <strong>Approval required:</strong> {event.requiresApproval ? 'Yes' : 'No'}
            </div>
          </div>

          <div className="event-actions-card">
            <h3>Actions</h3>
            {isAuthenticated ? (
              <div className="action-buttons">
                {isCreator && (
                  <>
                    <Link to={`/events/${event._id}/edit`} className="btn btn-secondary btn-large">
                      Edit Event
                    </Link>
                    <button type="button" className="btn btn-danger btn-large" onClick={handleDeleteEvent}>
                      Delete Event
                    </button>
                  </>
                )}
                {isAttending ? (
                  <>
                    <button type="button" className="btn btn-success btn-large" disabled>
                      ✓ Already Attending
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-large"
                      onClick={handleCancelRsvp}
                      disabled={rsvpLoading}
                    >
                      {rsvpLoading ? 'Updating...' : 'Cancel RSVP'}
                    </button>
                  </>
                ) : isPending || isWaitlisted ? (
                  <>
                    <button type="button" className="btn btn-warning btn-large" disabled>
                      {isPending ? 'Request Pending' : 'On Waitlist'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-large"
                      onClick={handleCancelRsvp}
                      disabled={rsvpLoading}
                    >
                      {rsvpLoading ? 'Updating...' : 'Withdraw'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-large"
                    onClick={handleRSVP}
                    disabled={rsvpLoading}
                  >
                    {rsvpLoading ? 'RSVPing...' : 'RSVP to Event'}
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('share')}>
                  Share Event
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('details')}>
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

      <div className="event-tabs-container">
        <div className="event-tabs">
          <button
            type="button"
            className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          {isCreator && (
            <button
              type="button"
              className={`tab-button ${activeTab === 'manage' ? 'active' : ''}`}
              onClick={() => setActiveTab('manage')}
            >
              Manage {hasPendingRequests && `(${event.pendingRequests.length})`}
            </button>
          )}
          <button
            type="button"
            className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            Chat
          </button>
          <button
            type="button"
            className={`tab-button ${activeTab === 'feedback' ? 'active' : ''}`}
            onClick={() => setActiveTab('feedback')}
          >
            Feedback
          </button>
          <button
            type="button"
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
                      <span className="info-value">{event.maxAttendees || '—'}</span>
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
                    setEvent(updatedEvent);
                    patchEventInList(updatedEvent);
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
              {canUseChat ? (
                <EventChat eventId={event._id} />
              ) : isAuthenticated ? (
                <div className="access-denied">
                  <p>Join this event (RSVP) to access chat.</p>
                </div>
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
              <FeedbackDisplay key={feedbackRefreshKey} eventId={event._id} />
              <FeedbackForm
                event={event}
                eventId={event._id}
                onSubmitSuccess={() => {
                  setFeedbackRefreshKey((k) => k + 1);
                  setActiveTab('feedback');
                }}
              />
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
