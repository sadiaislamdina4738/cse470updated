import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const EventContext = createContext();

export const useEvents = () => {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
};

export const EventProvider = ({ children }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    location: '',
    limit: 20
  });

  const fetchEvents = useCallback(async (customFilters = filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (customFilters.category) params.append('category', customFilters.category);
      if (customFilters.location) params.append('location', customFilters.location);
      if (customFilters.limit) params.append('limit', customFilters.limit);

      const response = await api.get(`/events?${params}`);
      setEvents(response.data.events);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to fetch events');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const createEvent = async (eventData) => {
    try {
      const response = await api.post('/events/create', eventData);
      const newEvent = response.data.event;

      setEvents(prev => [newEvent, ...prev]);
      toast.success('Event created successfully!');
      return { success: true, event: newEvent };
    } catch (error) {
      console.error('Create event error details:', error.response?.data);
      const message = error.response?.data?.message || 'Failed to create event';
      if (error.response?.data?.errors) {
        console.error('Validation errors:', error.response.data.errors);
        const validationErrors = error.response.data.errors.map(err => err.msg).join(', ');
        toast.error(`Validation errors: ${validationErrors}`);
      } else {
        toast.error(message);
      }
      return { success: false, message };
    }
  };

  const rsvpToEvent = async (eventId) => {
    try {
      const response = await api.post('/events/rsvp', { eventId });

      // Update the event in the local state with the response from backend
      const updatedEvent = response.data.event;
      setEvents(prev => prev.map(event => {
        if (event._id === eventId) {
          return updatedEvent;
        }
        return event;
      }));

      toast.success('Successfully RSVPed to event!');
      return { success: true, event: updatedEvent };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to RSVP to event';
      toast.error(message);
      return { success: false, message };
    }
  };

  const updateFilters = (newFilters) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    fetchEvents(updatedFilters);
  };

  const getEventById = (eventId) => {
    return events.find(event => event._id === eventId);
  };

  const refreshEvents = () => {
    fetchEvents();
  };

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const value = {
    events,
    loading,
    filters,
    fetchEvents,
    createEvent,
    rsvpToEvent,
    updateFilters,
    getEventById,
    refreshEvents
  };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
};
