import React, { useEffect, useState } from 'react';
import './EventMap.css';

const EventMap = ({ events, onEventClick, selectedEvent }) => {
    const [mapCenter, setMapCenter] = useState({ lat: 51.505, lng: -0.09 }); // Default to London
    const [userLocation, setUserLocation] = useState(null);
    const [mapLoading, setMapLoading] = useState(true);

    useEffect(() => {

        // Get user's location if available
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setUserLocation({ lat: latitude, lng: longitude });
                    setMapCenter({ lat: latitude, lng: longitude });
                    setMapLoading(false);
                },
                (error) => {
                    // If no user location, center on first event or default
                    if (events.length > 0 && events[0].coordinates && events[0].coordinates.lat && events[0].coordinates.lng) {
                        setMapCenter({ lat: events[0].coordinates.lat, lng: events[0].coordinates.lng });
                    }
                    setMapLoading(false);
                }
            );
        } else {
            // Fallback to first event location
            if (events.length > 0 && events[0].coordinates && events[0].coordinates.lat && events[0].coordinates.lng) {
                setMapCenter({ lat: events[0].coordinates.lat, lng: events[0].coordinates.lng });
            }
            setMapLoading(false);
        }
    }, [events]);

    const handleMarkerClick = (event) => {
        if (onEventClick) {
            onEventClick(event);
        }
    };

    const getEventColor = (event) => {
        if (selectedEvent && selectedEvent._id === event._id) {
            return '#28a745'; // Green for selected
        } else if (event.isFull) {
            return '#dc3545'; // Red for full events
        }
        return '#007bff'; // Default blue
    };

    if (mapLoading) {
        return (
            <div className="event-map-container">
                <div className="map-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading map...</p>
                </div>
            </div>
        );
    }

    // Check if we have any events with coordinates
    const eventsWithCoordinates = events.filter(e => e.coordinates && e.coordinates.lat && e.coordinates.lng);

    if (eventsWithCoordinates.length === 0) {
        return (
            <div className="event-map-container">
                <div className="map-no-coordinates">
                    <h4>🗺️ Map View</h4>
                    <p>No events with location coordinates available.</p>
                    <p>Events need to have location coordinates to be displayed on the map.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="event-map-container">
            <div className="custom-map">
                <div className="map-header">
                    <h4>🗺️ Event Locations</h4>
                    <p>Click on pins to view event details</p>
                </div>

                <div className="map-content">
                    {/* User location indicator */}
                    {userLocation && (
                        <div className="user-location-indicator">
                            <div className="user-pin">📍</div>
                            <span>Your Location</span>
                        </div>
                    )}

                    {/* Event markers */}
                    <div className="event-markers">
                        {eventsWithCoordinates.map((event) => (
                            <div
                                key={event._id}
                                className="event-marker"
                                style={{
                                    '--marker-color': getEventColor(event)
                                }}
                                onClick={() => handleMarkerClick(event)}
                            >
                                <div className="marker-pin">
                                    <span className="marker-icon">{event.category.charAt(0)}</span>
                                </div>
                                <div className="marker-tooltip">
                                    <h5>{event.title}</h5>
                                    <p><strong>Category:</strong> {event.category}</p>
                                    <p><strong>Date:</strong> {new Date(event.schedule).toLocaleDateString()}</p>
                                    <p><strong>Time:</strong> {new Date(event.schedule).toLocaleTimeString()}</p>
                                    <p><strong>Attendees:</strong> {event.attendees?.length || 0}</p>
                                    {event.maxAttendees && (
                                        <p><strong>Max:</strong> {event.maxAttendees}</p>
                                    )}
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleMarkerClick(event);
                                        }}
                                    >
                                        View Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Map legend */}
                    <div className="map-legend">
                        <h5>Legend:</h5>
                        <div className="legend-item">
                            <div className="legend-pin" style={{ '--marker-color': '#007bff' }}>
                                <span>A</span>
                            </div>
                            <span>Available Events</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-pin" style={{ '--marker-color': '#28a745' }}>
                                <span>S</span>
                            </div>
                            <span>Selected Event</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-pin" style={{ '--marker-color': '#dc3545' }}>
                                <span>F</span>
                            </div>
                            <span>Full Events</span>
                        </div>
                        {userLocation && (
                            <div className="legend-item">
                                <div className="user-pin">📍</div>
                                <span>Your Location</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventMap;
