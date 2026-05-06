import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useEvents } from '../contexts/EventContext';
import './CreateEvent.css';

const CreateEvent = () => {
  const { id: editEventId } = useParams();
  const isEdit = Boolean(editEventId);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const { createEvent, updateEvent, fetchEventById } = useEvents();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    defaultValues: {
      requiresApproval: true
    }
  });

  useEffect(() => {
    if (!editEventId) return;
    let cancelled = false;
    (async () => {
      try {
        const ev = await fetchEventById(editEventId);
        if (cancelled || !ev) return;
        const d = new Date(ev.schedule);
        reset({
          title: ev.title || '',
          description: ev.description || '',
          category: ev.category || '',
          location: ev.location || '',
          latitude: ev.coordinates?.lat ?? '',
          longitude: ev.coordinates?.lng ?? '',
          schedule: format(d, 'yyyy-MM-dd'),
          time: format(d, 'HH:mm'),
          maxAttendees: ev.maxAttendees ?? '',
          banner: ev.banner || '',
          requiresApproval: !!ev.requiresApproval
        });
      } catch (e) {
        if (!cancelled) setLoadError('Failed to load event');
      }
    })();
    return () => { cancelled = true; };
  }, [editEventId, fetchEventById, reset]);

  const categories = [
    'Technology', 'Business', 'Education', 'Entertainment', 'Sports', 'Health', 'Other'
  ];

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      // Convert date and time to ISO string
      const scheduleDate = new Date(data.schedule);
      const [hours, minutes] = data.time.split(':');
      scheduleDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      if (scheduleDate <= new Date()) {
        toast.error('Please choose a future date and time for your event.');
        setIsLoading(false);
        return;
      }

      const eventData = {
        ...data,
        schedule: scheduleDate.toISOString(),
        maxAttendees: data.maxAttendees ? parseInt(data.maxAttendees, 10) : undefined,
        requiresApproval: Boolean(data.requiresApproval)
      };

      // Only add coordinates if both latitude and longitude are provided
      if (data.latitude && data.longitude) {
        eventData.coordinates = {
          lat: parseFloat(data.latitude),
          lng: parseFloat(data.longitude)
        };
      }

      // Remove the time field as it's not needed by the backend
      delete eventData.time;
      delete eventData.latitude;
      delete eventData.longitude;

      const result = isEdit
        ? await updateEvent(editEventId, eventData)
        : await createEvent(eventData);
      if (result.success) {
        navigate(`/events/${result.event._id}`);
      }
    } catch (error) {
      console.error('Create event error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isEdit && loadError) {
    return (
      <div className="create-event-page">
        <div className="page-header">
          <h1>Edit Event</h1>
          <p>{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="create-event-page">
      <div className="page-header">
        <h1>{isEdit ? 'Edit Event' : 'Create New Event'}</h1>
        <p>{isEdit ? 'Update your event details' : 'Share your event with the community'}</p>
      </div>

      <div className="create-event-container">
        <form onSubmit={handleSubmit(onSubmit)} className="create-event-form">
          <div className="form-section">
            <h3>Basic Information</h3>

            <div className="form-group">
              <label htmlFor="title" className="form-label">Event Title *</label>
              <input
                type="text"
                id="title"
                className={`form-input ${errors.title ? 'error' : ''}`}
                placeholder="Enter event title"
                {...register('title', {
                  required: 'Event title is required',
                  minLength: {
                    value: 3,
                    message: 'Title must be at least 3 characters'
                  },
                  maxLength: {
                    value: 100,
                    message: 'Title cannot exceed 100 characters'
                  }
                })}
              />
              {errors.title && (
                <span className="error-message">{errors.title.message}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="description" className="form-label">Description</label>
              <textarea
                id="description"
                className={`form-input form-textarea ${errors.description ? 'error' : ''}`}
                placeholder="Describe your event (optional)"
                rows="4"
                {...register('description', {
                  maxLength: {
                    value: 1000,
                    message: 'Description cannot exceed 1000 characters'
                  }
                })}
              />
              {errors.description && (
                <span className="error-message">{errors.description.message}</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category" className="form-label">Category *</label>
                <select
                  id="category"
                  className={`form-select ${errors.category ? 'error' : ''}`}
                  {...register('category', {
                    required: 'Category is required'
                  })}
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                {errors.category && (
                  <span className="error-message">{errors.category.message}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="maxAttendees" className="form-label">Max Attendees</label>
                <input
                  type="number"
                  id="maxAttendees"
                  className={`form-input ${errors.maxAttendees ? 'error' : ''}`}
                  placeholder="100"
                  min="1"
                  {...register('maxAttendees', {
                    min: {
                      value: 1,
                      message: 'Maximum attendees must be at least 1'
                    }
                  })}
                />
                {errors.maxAttendees && (
                  <span className="error-message">{errors.maxAttendees.message}</span>
                )}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Event Details</h3>

            <div className="form-group">
              <label htmlFor="location" className="form-label">Location *</label>
              <input
                type="text"
                id="location"
                className={`form-input ${errors.location ? 'error' : ''}`}
                placeholder="Enter event location"
                {...register('location', {
                  required: 'Location is required'
                })}
              />
              {errors.location && (
                <span className="error-message">{errors.location.message}</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="latitude" className="form-label">Latitude (Optional)</label>
                <input
                  type="number"
                  id="latitude"
                  step="any"
                  className={`form-input ${errors.latitude ? 'error' : ''}`}
                  placeholder="e.g., 40.7128"
                  {...register('latitude', {
                    min: {
                      value: -90,
                      message: 'Latitude must be between -90 and 90'
                    },
                    max: {
                      value: 90,
                      message: 'Latitude must be between -90 and 90'
                    }
                  })}
                />
                {errors.latitude && (
                  <span className="error-message">{errors.latitude.message}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="longitude" className="form-label">Longitude (Optional)</label>
                <input
                  type="number"
                  id="longitude"
                  step="any"
                  className={`form-input ${errors.longitude ? 'error' : ''}`}
                  placeholder="e.g., -74.0060"
                  {...register('longitude', {
                    min: {
                      value: -180,
                      message: 'Longitude must be between -180 and 180'
                    },
                    max: {
                      value: 180,
                      message: 'Longitude must be between -180 and 180'
                    }
                  })}
                />
                {errors.longitude && (
                  <span className="error-message">{errors.longitude.message}</span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="schedule" className="form-label">Date *</label>
                <input
                  type="date"
                  id="schedule"
                  className={`form-input ${errors.schedule ? 'error' : ''}`}
                  {...register('schedule', {
                    required: 'Date is required',
                    validate: value => {
                      const selectedDate = new Date(value);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return selectedDate >= today || 'Event date must be in the future';
                    }
                  })}
                />
                {errors.schedule && (
                  <span className="error-message">{errors.schedule.message}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="time" className="form-label">Time *</label>
                <input
                  type="time"
                  id="time"
                  className={`form-input ${errors.time ? 'error' : ''}`}
                  {...register('time', {
                    required: 'Time is required'
                  })}
                />
                {errors.time && (
                  <span className="error-message">{errors.time.message}</span>
                )}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>RSVP settings</h3>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" {...register('requiresApproval')} />
                Require organizer approval for join requests
              </label>
              <small className="form-help">
                If unchecked, users can join immediately until the event is full.
              </small>
            </div>
          </div>

          <div className="form-section">
            <h3>Event Banner (Optional)</h3>

            <div className="form-group">
              <label htmlFor="banner" className="form-label">Banner URL</label>
              <input
                type="url"
                id="banner"
                className={`form-input ${errors.banner ? 'error' : ''}`}
                placeholder="https://your-image-url.com/image.jpg"
                {...register('banner', {
                  pattern: {
                    value: /^https?:\/\/.+/,
                    message: 'Please enter a valid URL starting with http:// or https://'
                  }
                })}
              />
              {errors.banner && (
                <span className="error-message">{errors.banner.message}</span>
              )}
              <small className="form-help">
                Provide a URL to an image that will be displayed as your event banner
              </small>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary btn-large"
              disabled={isLoading}
            >
              {isLoading ? (isEdit ? 'Saving...' : 'Creating Event...') : (isEdit ? 'Save Changes' : 'Create Event')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;
