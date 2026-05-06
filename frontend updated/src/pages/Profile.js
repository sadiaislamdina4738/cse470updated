import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  format,
  addMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth
} from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import './Profile.css';

const getCalendarDays = (month) => {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const startDate = new Date(start);
  startDate.setDate(startDate.getDate() - start.getDay());
  const endDate = new Date(end);
  endDate.setDate(endDate.getDate() + (6 - end.getDay()));
  return eachDayOfInterval({ start: startDate, end: endDate });
};

const Profile = () => {
  const { user, logout, refreshUser, deleteAccount } = useAuth();
  const [section, setSection] = useState('account');

  useEffect(() => {
    if (section === 'calendar' && refreshUser) refreshUser();
  }, [section, refreshUser]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const createdEvents = user?.eventsCreated || [];
  const joinedEvents = user?.eventsJoined || [];

  const calendarEvents = useMemo(() => {
    const map = new Map();
    const add = (ev, role) => {
      if (!ev?._id || !ev.schedule) return;
      if (ev.isActive === false) return;
      const id = String(ev._id);
      const existing = map.get(id);
      if (existing) {
        if (!existing.roles.includes(role)) existing.roles.push(role);
        return;
      }
      map.set(id, { ...ev, roles: [role] });
    };
    joinedEvents.forEach((e) => add(e, 'attending'));
    createdEvents.forEach((e) => add(e, 'hosting'));
    return [...map.values()].sort(
      (a, b) => new Date(a.schedule) - new Date(b.schedule)
    );
  }, [createdEvents, joinedEvents]);

  const getEventsForDate = useCallback(
    (day) =>
      calendarEvents.filter((ev) => isSameDay(new Date(ev.schedule), day)),
    [calendarEvents]
  );

  const selectedDayEvents = selectedDay
    ? getEventsForDate(selectedDay)
    : [];

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>Profile</h1>
        <p>Manage your account, see events you host or attend, and open your calendar.</p>
      </div>

      <div className="profile-tabs">
        <button
          type="button"
          className={`profile-tab ${section === 'account' ? 'active' : ''}`}
          onClick={() => setSection('account')}
        >
          Account
        </button>
        <button
          type="button"
          className={`profile-tab ${section === 'calendar' ? 'active' : ''}`}
          onClick={() => setSection('calendar')}
        >
          My calendar
        </button>
      </div>

      {section === 'account' && (
        <div className="profile-container">
          <div className="profile-card profile-card-wide">
            <div className="profile-header">
              <div className="profile-avatar">
                <span>{user?.username?.charAt(0).toUpperCase() || 'U'}</span>
              </div>
              <div className="profile-info">
                <h2>{user?.username || 'User'}</h2>
                <p>{user?.email || 'No email available'}</p>
                <p className="profile-role-line">
                  Role: <strong>{user?.role === 'admin' ? 'Admin' : 'User'}</strong>
                  {user?.role === 'admin' && (
                    <>
                      {' '}
                      — <Link to="/admin">Open admin dashboard</Link>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="profile-stats">
              <div className="stat-item">
                <span className="stat-number">{createdEvents.length}</span>
                <span className="stat-label">Events created</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{joinedEvents.length}</span>
                <span className="stat-label">Events joined (RSVP)</span>
              </div>
            </div>

            <div className="event-history">
              <div className="event-history-section">
                <h3>Created events</h3>
                {createdEvents.length === 0 ? (
                  <p className="empty-history">No created events yet.</p>
                ) : (
                  <ul className="event-list">
                    {createdEvents.map((event) => (
                      <li key={event._id} className="event-list-item">
                        <Link to={`/events/${event._id}`} className="event-list-link">
                          <strong>{event.title}</strong>
                          <span>
                            {event.category} | {event.location} |{' '}
                            {event.schedule
                              ? format(new Date(event.schedule), 'MMM d, yyyy h:mm a')
                              : '—'}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="event-history-section">
                <h3>Joined events</h3>
                {joinedEvents.length === 0 ? (
                  <p className="empty-history">No joined events yet.</p>
                ) : (
                  <ul className="event-list">
                    {joinedEvents.map((event) => (
                      <li key={event._id} className="event-list-item">
                        <Link to={`/events/${event._id}`} className="event-list-link">
                          <strong>{event.title}</strong>
                          <span>
                            {event.category} | {event.location} |{' '}
                            {event.schedule
                              ? format(new Date(event.schedule), 'MMM d, yyyy h:mm a')
                              : '—'}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="profile-actions">
              <button type="button" onClick={logout} className="btn btn-danger">
                Logout
              </button>
            
            <button
  type="button"
  className="btn btn-danger delete-btn"
  onClick={async () => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete your account? This cannot be undone.'
    );

    if (!confirmDelete) return;

    const result = await deleteAccount();

    if (result.success) {
      alert('Account deleted');
      window.location.href = '/';
    } else {
      alert('Failed to delete account');
    }
  }}
>
  Delete Account
</button>
        </div>
        </div>
        </div>
      )}

      {section === 'calendar' && (
        <div className="profile-container profile-container-calendar">
          <div className="profile-card profile-card-calendar">
            <h2 className="calendar-section-title">Events you host or attend</h2>
            <p className="calendar-section-sub">
              Hosting = you created the event. Attending = you are on the attendee list (after RSVP /
              approval). Click a day to see details.
            </p>

            <div className="profile-cal-header">
              <button
                type="button"
                className="profile-cal-nav"
                onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
                aria-label="Previous month"
              >
                ←
              </button>
              <h3>{format(currentMonth, 'MMMM yyyy')}</h3>
              <button
                type="button"
                className="profile-cal-nav"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                aria-label="Next month"
              >
                →
              </button>
            </div>

            <div className="profile-cal-grid">
              <div className="profile-cal-weekdays">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="profile-cal-weekday">
                    {d}
                  </div>
                ))}
              </div>
              <div className="profile-cal-days">
                {getCalendarDays(currentMonth).map((day, index) => {
                  const dayEvents = getEventsForDate(day);
                  const isToday = isSameDay(day, new Date());
                  const inMonth = isSameMonth(day, currentMonth);
                  const isSelected = selectedDay && isSameDay(day, selectedDay);
                  return (
                    <button
                      key={index}
                      type="button"
                      className={`profile-cal-day ${isToday ? 'today' : ''} ${!inMonth ? 'other-month' : ''} ${dayEvents.length ? 'has-events' : ''} ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedDay(day)}
                    >
                      <span className="profile-cal-day-num">{format(day, 'd')}</span>
                      {dayEvents.length > 0 && (
                        <span className="profile-cal-dots" aria-hidden>
                          {dayEvents.slice(0, 3).map((ev) => (
                            <span
                              key={ev._id}
                              className={`profile-cal-dot ${ev.roles.includes('hosting') ? 'host' : 'join'}`}
                              title={ev.title}
                            />
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="profile-cal-legend">
              <span>
                <span className="profile-cal-dot host" /> Hosting
              </span>
              <span>
                <span className="profile-cal-dot join" /> Attending
              </span>
            </div>

            <div className="profile-cal-detail">
              <h4>
                {selectedDay
                  ? format(selectedDay, 'EEEE, MMMM d, yyyy')
                  : 'Select a day'}
              </h4>
              {!selectedDay && (
                <p className="muted">Click any day on the calendar above.</p>
              )}
              {selectedDay && selectedDayEvents.length === 0 && (
                <p className="muted">No events on this day.</p>
              )}
              {selectedDayEvents.length > 0 && (
                <ul className="profile-cal-event-list">
                  {selectedDayEvents.map((ev) => (
                    <li key={ev._id} className="profile-cal-event-card">
                      <div className="profile-cal-event-meta">
                        {ev.roles.map((r) => (
                          <span key={r} className={`role-pill ${r}`}>
                            {r === 'hosting' ? 'Hosting' : 'Attending'}
                          </span>
                        ))}
                      </div>
                      <h5>{ev.title}</h5>
                      <p className="profile-cal-event-when">
                        {format(new Date(ev.schedule), 'h:mm a')} · {ev.category}
                      </p>
                      <p className="profile-cal-event-loc">📍 {ev.location}</p>
                      {ev.description && (
                        <p className="profile-cal-event-desc">{ev.description}</p>
                      )}
                      <Link to={`/events/${ev._id}`} className="btn btn-primary btn-sm">
                        Open event
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
