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
    q: '',
    from: '',
    to: '',
    sort: 'schedule_asc',
    limit: 20
  });

  const patchEventInList = useCallback((updatedEvent) => {
    if (!updatedEvent?._id) return;
    setEvents((prev) => {
      const idx = prev.findIndex((e) => e._id === updatedEvent._id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updatedEvent;
        return next;
      }
      return [...prev, updatedEvent];
    });
  }, []);

  const fetchEvents = useCallback(async (customFilters = filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (customFilters.category) params.append('category', customFilters.category);
      if (customFilters.location) params.append('location', customFilters.location);
      if (customFilters.q) params.append('q', customFilters.q);
      if (customFilters.from) params.append('from', new Date(customFilters.from).toISOString());
      if (customFilters.to) params.append('to', new Date(customFilters.to).toISOString());
      if (customFilters.sort) params.append('sort', customFilters.sort);
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

  const fetchEventById = useCallback(async (eventId) => {
    const response = await api.get(`/events/${eventId}`);
    const ev = response.data.event;
    patchEventInList(ev);
    return ev;
  }, [patchEventInList]);

  const createEvent = async (eventData) => {
    try {
      const response = await api.post('/events/create', eventData);
      const newEvent = response.data.event;

      setEvents((prev) => [newEvent, ...prev]);
      toast.success('Event created successfully!');
      return { success: true, event: newEvent };
    } catch (error) {
      console.error('Create event error details:', error.response?.data);
      const message = error.response?.data?.message || 'Failed to create event';
      if (error.response?.data?.errors) {
        console.error('Validation errors:', error.response.data.errors);
        const validationErrors = error.response.data.errors.map((err) => err.msg).join(', ');
        toast.error(`Validation errors: ${validationErrors}`);
      } else {
        toast.error(message);
      }
      return { success: false, message };
    }
  };

  const updateEvent = async (eventId, payload) => {
    try {
      const response = await api.put(`/events/${eventId}`, payload);
      const updated = response.data.event;
      patchEventInList(updated);
      toast.success('Event updated successfully!');
      return { success: true, event: updated };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update event';
      toast.error(message);
      return { success: false, message };
    }
  };

  const deleteEvent = async (eventId) => {
    try {
      await api.delete(`/events/${eventId}`);
      setEvents((prev) => prev.filter((e) => e._id !== eventId));
      toast.success('Event deleted');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete event';
      toast.error(message);
      return { success: false, message };
    }
  };

  const rsvpToEvent = async (eventId) => {
    try {
      const response = await api.post('/events/rsvp', { eventId });

      const updatedEvent = response.data.event;
      patchEventInList(updatedEvent);

      toast.success(response.data.message || 'RSVP updated');
      return { success: true, event: updatedEvent, waitlisted: response.data.waitlisted };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to RSVP to event';
      toast.error(message);
      return { success: false, message };
    }
  };

  const cancelRsvp = async (eventId) => {
    try {
      const response = await api.post('/events/cancel-rsvp', { eventId });
      const updatedEvent = response.data.event;
      patchEventInList(updatedEvent);
      toast.success(response.data.message || 'RSVP cancelled');
      return { success: true, event: updatedEvent };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to cancel RSVP';
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
    return events.find((event) => event._id === eventId);
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
    fetchEventById,
    createEvent,
    updateEvent,
    deleteEvent,
    rsvpToEvent,
    cancelRsvp,
    patchEventInList,
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
