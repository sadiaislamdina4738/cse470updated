import React, { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import './CalendarIntegration.css';

const CalendarIntegration = ({ event, isAttending }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [userEvents, setUserEvents] = useState([]);

  // Get the week days for the calendar
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    
    // Load user's events from localStorage or context
    const savedEvents = localStorage.getItem('userEvents');
    if (savedEvents) {
      setUserEvents(JSON.parse(savedEvents));
    }
  }, [event, isAttending]);

  const addEventToCalendar = () => {
    if (!isAttending) {
      return;
    }

    const eventData = {
      id: event._id,
      title: event.title,
      date: event.schedule,
      location: event.location,
      description: event.description,
      addedAt: new Date().toISOString()
    };

    const updatedEvents = [...userEvents, eventData];
    setUserEvents(updatedEvents);
    localStorage.setItem('userEvents', JSON.stringify(updatedEvents));
  };

  const removeEventFromCalendar = (eventId) => {
    const updatedEvents = userEvents.filter(e => e.id !== eventId);
    setUserEvents(updatedEvents);
    localStorage.setItem('userEvents', JSON.stringify(updatedEvents));
  };

  const isEventOnDate = (date) => {
    return userEvents.some(event => isSameDay(new Date(event.date), date));
  };

  const getEventsForDate = (date) => {
    return userEvents.filter(event => isSameDay(new Date(event.date), date));
  };

  const navigateWeek = (direction) => {
    setCurrentDate(addDays(currentDate, direction * 7));
  };

  const isEventInCalendar = userEvents.some(e => e.id === event._id);

  if (!isAttending) {
    return (
      <div className="calendar-integration">
        <h4>📅 Add to Calendar</h4>
        <p className="calendar-note">
          RSVP to this event to add it to your calendar
        </p>
      </div>
    );
  }

  return (
    <div className="calendar-integration">
      <h4>📅 Event Calendar</h4>
      <p className="calendar-description">
        Manage your events in the in-app calendar
      </p>

      <div className="calendar-actions">
        {!isEventInCalendar ? (
          <button
            className="calendar-add-btn"
            onClick={addEventToCalendar}
          >
            Add to My Calendar
          </button>
        ) : (
          <button
            className="calendar-remove-btn"
            onClick={() => removeEventFromCalendar(event._id)}
          >
            Remove from Calendar
          </button>
        )}
      </div>

      <div className="calendar-view">
        <div className="calendar-header">
          <button onClick={() => navigateWeek(-1)} className="calendar-nav-btn">
            ←
          </button>
          <h5>{format(weekStart, 'MMM yyyy')}</h5>
          <button onClick={() => navigateWeek(1)} className="calendar-nav-btn">
            →
          </button>
        </div>

        <div className="calendar-grid">
          <div className="calendar-weekdays">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="weekday-header">{day}</div>
            ))}
          </div>

          <div className="calendar-days">
            {weekDays.map((day, index) => {
              const eventsOnDay = getEventsForDate(day);
              const isToday = isSameDay(day, new Date());
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <div
                  key={index}
                  className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isEventOnDate(day) ? 'has-events' : ''}`}
                  onClick={() => setSelectedDate(day)}
                >
                  <span className="day-number">{format(day, 'd')}</span>
                  {eventsOnDay.length > 0 && (
                    <div className="day-events">
                      {eventsOnDay.slice(0, 2).map(event => (
                        <div key={event.id} className="day-event-dot" title={event.title}></div>
                      ))}
                      {eventsOnDay.length > 2 && (
                        <div className="day-event-more">+{eventsOnDay.length - 2}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {selectedDate && (
          <div className="selected-date-events">
            <h6>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</h6>
            {getEventsForDate(selectedDate).length > 0 ? (
              <div className="date-events-list">
                {getEventsForDate(selectedDate).map(event => (
                  <div key={event.id} className="date-event-item">
                    <div className="event-time">{format(new Date(event.date), 'h:mm a')}</div>
                    <div className="event-title">{event.title}</div>
                    <div className="event-location">{event.location}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-events">No events scheduled for this date</p>
            )}
          </div>
        )}
      </div>

      <div className="calendar-info">
        <p>
          <strong>Note:</strong> This is an in-app calendar that stores your events locally.
          Your events are saved in your browser and will persist between sessions.
        </p>
      </div>
    </div>
  );
};

export default CalendarIntegration;
