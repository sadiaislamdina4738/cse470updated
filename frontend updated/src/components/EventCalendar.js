import React, { useState, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useNavigate } from 'react-router-dom';
import './EventCalendar.css';

import { enUS } from 'date-fns/locale';

const locales = {
    'en-US': enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

const EventCalendar = ({ events, onEventClick }) => {
    const navigate = useNavigate();
    const [selectedEvent, setSelectedEvent] = useState(null);

    const getEventClassName = useCallback((event) => {
        let className = 'event-calendar-item';

        if (event.isFull) {
            className += ' event-full';
        } else if (event.attendees?.length > event.maxAttendees * 0.8) {
            className += ' event-nearly-full';
        }

        return className;
    }, []);

    // Convert events to calendar format
    const calendarEvents = useMemo(() => {
        return events.map(event => ({
            id: event._id,
            title: event.title,
            start: new Date(event.schedule),
            end: new Date(new Date(event.schedule).getTime() + 2 * 60 * 60 * 1000), // 2 hours duration
            resource: event,
            className: getEventClassName(event),
        }));
    }, [events, getEventClassName]);

    const handleEventClick = (event) => {
        setSelectedEvent(event.resource);
        if (onEventClick) {
            onEventClick(event.resource);
        }
    };

    const handleEventSelect = (event) => {
        navigate(`/events/${event.id}`);
    };

    const eventStyleGetter = (event) => {
        let style = {
            backgroundColor: '#007bff',
            borderRadius: '4px',
            opacity: 0.8,
            color: 'white',
            border: '0px',
            display: 'block',
            padding: '2px 5px',
        };

        if (event.resource.isFull) {
            style.backgroundColor = '#dc3545';
        } else if (event.resource.attendees?.length > event.resource.maxAttendees * 0.8) {
            style.backgroundColor = '#ffc107';
            style.color = '#212529';
        }

        return {
            style,
        };
    };

    const CustomToolbar = (toolbar) => {
        const goToToday = () => {
            toolbar.onNavigate('TODAY');
        };

        const goToPrev = () => {
            toolbar.onNavigate('PREV');
        };

        const goToNext = () => {
            toolbar.onNavigate('NEXT');
        };

        const viewNames = {
            month: 'Month',
            week: 'Week',
            day: 'Day',
            agenda: 'Agenda',
        };

        return (
            <div className="calendar-toolbar">
                <div className="toolbar-left">
                    <button className="btn btn-secondary" onClick={goToToday}>
                        Today
                    </button>
                    <button className="btn btn-secondary" onClick={goToPrev}>
                        ‹
                    </button>
                    <button className="btn btn-secondary" onClick={goToNext}>
                        ›
                    </button>
                    <h2 className="toolbar-title">
                        {toolbar.label}
                    </h2>
                </div>
                <div className="toolbar-right">
                    <div className="view-buttons">
                        {toolbar.views.map(view => (
                            <button
                                key={view}
                                className={`btn ${toolbar.view === view ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => toolbar.onView(view)}
                            >
                                {viewNames[view]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="event-calendar-container">
            <div className="calendar-header">
                <h3>Event Calendar</h3>
                <p>View all events in calendar format</p>
            </div>

            <div className="calendar-wrapper">
                <Calendar
                    localizer={localizer}
                    events={calendarEvents}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: 600 }}
                    onSelectEvent={handleEventSelect}
                    onSelectSlot={handleEventClick}
                    eventPropGetter={eventStyleGetter}
                    components={{
                        toolbar: CustomToolbar,
                    }}
                    views={['month', 'week', 'day', 'agenda']}
                    defaultView="month"
                    selectable
                    popup
                    step={60}
                    timeslots={1}
                />
            </div>

            {/* Event Legend */}
            <div className="calendar-legend">
                <div className="legend-item">
                    <div className="legend-color available"></div>
                    <span>Available</span>
                </div>
                <div className="legend-item">
                    <div className="legend-color nearly-full"></div>
                    <span>Nearly Full</span>
                </div>
                <div className="legend-item">
                    <div className="legend-color full"></div>
                    <span>Full</span>
                </div>
            </div>
        </div>
    );
};

export default EventCalendar;
