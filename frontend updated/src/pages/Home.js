import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventContext';
import './Home.css';

const Home = () => {
  const { isAuthenticated } = useAuth();
  const { events, loading } = useEvents();

  const featuredEvents = events.slice(0, 3);

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Discover Amazing Local Events
          </h1>
          <p className="hero-subtitle">
            Join, create, and share events in your community. Connect with people who share your interests.
          </p>
          <div className="hero-actions">
            {isAuthenticated ? (
              <Link to="/create-event" className="btn btn-primary btn-large">
                Create Your First Event
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-large">
                  Get Started
                </Link>
                <Link to="/login" className="btn btn-secondary btn-large">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="hero-image">
          <div className="hero-graphic">
            <div className="event-card-graphic">
              <div className="event-dot"></div>
              <div className="event-dot"></div>
              <div className="event-dot"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section — cards link to Events; tabs on Event Detail expose chat / QR / feedback */}
      <section className="features">
        <h2 className="section-title">Why Choose EventEase?</h2>
        <p className="features-hint">
          Tap a card to open Discover Events. For chat, QR share, or feedback, pick an event and use its tabs.
        </p>
        <div className="features-grid">
          <Link to="/events" className="feature-card feature-card-link">
            <div className="feature-icon">🎯</div>
            <h3>Easy Discovery</h3>
            <p>Find events that match your interests and location with our smart filtering system.</p>
            <span className="feature-cta">Browse events →</span>
          </Link>
          <Link to="/events" className="feature-card feature-card-link">
            <div className="feature-icon">💬</div>
            <h3>Real-time Chat</h3>
            <p>Connect with other attendees before and during events with our integrated chat feature.</p>
            <span className="feature-cta">Open an event → Chat tab</span>
          </Link>
          <Link to="/events" className="feature-card feature-card-link">
            <div className="feature-icon">📱</div>
            <h3>QR Code Sharing</h3>
            <p>Share events easily with friends using QR codes and social media integration.</p>
            <span className="feature-cta">Open an event → Share tab</span>
          </Link>
          <Link to="/events" className="feature-card feature-card-link">
            <div className="feature-icon">⭐</div>
            <h3>Feedback System</h3>
            <p>Rate and review events to help others discover the best local experiences.</p>
            <span className="feature-cta">Open an event → Feedback tab</span>
          </Link>
        </div>
      </section>

      {/* Featured Events Section */}
      <section className="featured-events">
        <h2 className="section-title">Featured Events</h2>
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading events...</p>
          </div>
        ) : featuredEvents.length > 0 ? (
          <div className="events-grid">
            {featuredEvents.map((event) => (
              <div key={event._id} className="event-card">
                <div className="event-image">
                  {event.banner ? (
                    <img src={event.banner} alt={event.title} />
                  ) : (
                    <div className="event-placeholder">
                      <span>📅</span>
                    </div>
                  )}
                </div>
                <div className="event-content">
                  <h3 className="event-title">{event.title}</h3>
                  <p className="event-description">{event.description}</p>
                  <div className="event-meta">
                    <span className="event-category">{event.category}</span>
                    <span className="event-location">📍 {event.location}</span>
                    <span className="event-date">
                      📅 {new Date(event.schedule).toLocaleDateString()}
                    </span>
                  </div>
                  <Link to={`/events/${event._id}`} className="btn btn-primary">
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-events">
            <p>No events available yet. Be the first to create one!</p>
            {isAuthenticated && (
              <Link to="/create-event" className="btn btn-primary">
                Create Event
              </Link>
            )}
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Start?</h2>
          <p>Join thousands of people discovering and creating amazing local events.</p>
          {isAuthenticated ? (
            <Link to="/events" className="btn btn-primary btn-large">
              Browse Events
            </Link>
          ) : (
            <Link to="/register" className="btn btn-primary btn-large">
              Join Now
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
