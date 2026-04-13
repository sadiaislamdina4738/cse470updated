import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useEvents } from '../contexts/EventContext';
import { useAuth } from '../contexts/AuthContext';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from 'date-fns';
import EventMap from '../components/EventMap';
import CalendarIntegration from '../components/CalendarIntegration';
import './EventList.css';

const EventList = () => {
  const { events, loading, filters, updateFilters } = useEvents();
  const { isAuthenticated, user } = useAuth();
  const [localFilters, setLocalFilters] = useState(filters);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'map', 'calendar'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const applyFilters = () => {
    updateFilters(localFilters);
  };

  const resetFilters = () => {
    const resetFilters = { category: '', location: '', limit: 20 };
    setLocalFilters(resetFilters);
    updateFilters(resetFilters);
  };

  const categories = [
    'Technology', 'Business', 'Education', 'Entertainment', 'Sports', 'Health', 'Other'
  ];

  // Calendar helper functions
  const getCalendarDays = (month) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const startDate = new Date(start);
    startDate.setDate(startDate.getDate() - start.getDay()); // Start from Sunday

    const endDate = new Date(end);
    endDate.setDate(endDate.getDate() + (6 - end.getDay())); // End on Saturday

    return eachDayOfInterval({ start: startDate, end: endDate });
  };

  const getEventsForDate = (date) => {
    return events.filter(event => isSameDay(new Date(event.schedule), date));
  };

  return (
    <div className="event-list-page">
      <div className="page-header">
        <h1>Discover Events</h1>
        <p>Find amazing events happening in your area</p>

        {/* View Mode Toggle */}
        <div className="view-mode-toggle">
          <button
            className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('list')}
          >
            📋 List
          </button>
          <button
            className={`btn ${viewMode === 'map' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('map')}
          >
            🗺️ Map
          </button>
          <button
            className={`btn ${viewMode === 'calendar' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('calendar')}
          >
            📅 Calendar
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label htmlFor="category" className="filter-label">Category</label>
            <select
              id="category"
              className="form-select"
              value={localFilters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="location" className="filter-label">Location</label>
            <input
              type="text"
              id="location"
              className="form-input"
              placeholder="Enter location"
              value={localFilters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="limit" className="filter-label">Results</label>
            <select
              id="limit"
              className="form-select"
              value={localFilters.limit}
              onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
            >
              <option value={10}>10 events</option>
              <option value={20}>20 events</option>
              <option value={50}>50 events</option>
              <option value={100}>100 events</option>
            </select>
          </div>

          <div className="filter-actions">
            <button onClick={applyFilters} className="btn btn-primary">
              Apply Filters
            </button>
            <button onClick={resetFilters} className="btn btn-secondary">
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Events Content */}
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading events...</p>
        </div>
      ) : events.length > 0 ? (
        <>
          {/* Map View */}
          {viewMode === 'map' && (
            <div className="map-view-container">
              <EventMap
                events={events}
                onEventClick={(event) => setSelectedEvent(event)}
                selectedEvent={selectedEvent}
              />
              {selectedEvent && (
                <div className="selected-event-info">
                  <h4>{selectedEvent.title}</h4>
                  <p>{selectedEvent.description}</p>
                  <Link to={`/events/${selectedEvent._id}`} className="btn btn-primary">
                    View Details
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Calendar View */}
          {viewMode === 'calendar' && (
            <div className="calendar-view-container">
              <h3>Events Calendar</h3>
              <div className="calendar-header">
                <button
                  className="calendar-nav-btn"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
                >
                  ←
                </button>
                <h4>{format(currentMonth, 'MMMM yyyy')}</h4>
                <button
                  className="calendar-nav-btn"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  →
                </button>
              </div>

              <div className="calendar-grid">
                <div className="calendar-weekdays">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="weekday-header">{day}</div>
                  ))}
                </div>

                <div className="calendar-days">
                  {getCalendarDays(currentMonth).map((day, index) => {
                    const dayEvents = getEventsForDate(day);
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = isSameMonth(day, currentMonth);

                    return (
                      <div
                        key={index}
                        className={`calendar-day ${isToday ? 'today' : ''} ${!isCurrentMonth ? 'other-month' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
                      >
                        <span className="day-number">{format(day, 'd')}</span>
                        {dayEvents.length > 0 && (
                          <div className="day-events">
                            {dayEvents.slice(0, 2).map(event => (
                              <div key={event._id} className="day-event-dot" title={event.title}></div>
                            ))}
                            {dayEvents.length > 2 && (
                              <div className="day-event-more">+{dayEvents.length - 2}</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="calendar-legend">
                <div className="legend-item">
                  <div className="legend-dot today"></div>
                  <span>Today</span>
                </div>
                <div className="legend-item">
                  <div className="legend-dot has-events"></div>
                  <span>Has Events</span>
                </div>
              </div>
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="events-container">
              <div className="events-grid">
                {events.map((event) => (
                  <div key={event._id} className="event-card">
                    <div className="event-image">
                      {event.banner ? (
                        <img src={event.banner} alt={event.title} />
                      ) : (
                        <div className="event-placeholder">
                          <span>📅</span>
                        </div>
                      )}
                      <div className="event-category-badge">
                        {event.category}
                      </div>
                    </div>

                    <div className="event-content">
                      <h3 className="event-title">{event.title}</h3>

                      {event.description && (
                        <p className="event-description">
                          {event.description.length > 100
                            ? `${event.description.substring(0, 100)}...`
                            : event.description
                          }
                        </p>
                      )}

                      <div className="event-meta">
                        <div className="event-info">
                          <span className="event-location">
                            📍 {event.location}
                          </span>
                          <span className="event-date">
                            📅 {format(new Date(event.schedule), 'MMM dd, yyyy')}
                          </span>
                          <span className="event-time">
                            🕐 {format(new Date(event.schedule), 'h:mm a')}
                          </span>
                        </div>

                        <div className="event-stats">
                          <span className="attendees-count">
                            👥 {event.attendees.length} attending
                          </span>
                          {event.maxAttendees && (
                            <span className="max-attendees">
                              Max: {event.maxAttendees}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="event-actions">
                        <Link to={`/events/${event._id}`} className="btn btn-primary">
                          View Details
                        </Link>
                        {isAuthenticated && (
                          <button
                            className={`btn ${event.attendees.some(a => {
                              const attendeeId = a._id || a;
                              const userId = user?.id;
                              return attendeeId === userId;
                            })
                              ? 'btn-success'
                              : event.pendingRequests?.some(a => {
                                const requestId = a._id || a;
                                return requestId === user?.id;
                              })
                                ? 'btn-warning'
                                : event.waitlist?.some(a => {
                                  const waitlistId = a._id || a;
                                  return waitlistId === user?.id;
                                })
                                  ? 'btn-info'
                                  : 'btn-secondary'}`}
                            disabled={event.attendees.some(a => {
                              const attendeeId = a._id || a;
                              return attendeeId === user?.id;
                            }) || event.pendingRequests?.some(a => {
                              const requestId = a._id || a;
                              return requestId === user?.id;
                            }) || event.waitlist?.some(a => {
                              const waitlistId = a._id || a;
                              return waitlistId === user?.id;
                            })}
                          >
                            {event.attendees.some(a => {
                              const attendeeId = a._id || a;
                              return attendeeId === user?.id;
                            })
                              ? 'Already RSVPed'
                              : event.pendingRequests?.some(a => {
                                const requestId = a._id || a;
                                return requestId === user?.id;
                              })
                                ? 'Request Pending'
                                : event.waitlist?.some(a => {
                                  const waitlistId = a._id || a;
                                  return waitlistId === user?.id;
                                })
                                  ? 'On Waitlist'
                                  : 'RSVP'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="no-events">
          <div className="no-events-content">
            <h3>No events found</h3>
            <p>Try adjusting your filters or check back later for new events.</p>
            {isAuthenticated && (
              <Link to="/create-event" className="btn btn-primary">
                Create Your First Event
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventList;
