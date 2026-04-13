import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../utils/api';
import toast from 'react-hot-toast';
import './FeedbackForm.css';

const FeedbackForm = ({ eventId, onSubmitSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm();

  const handleRatingChange = (newRating) => {
    setRating(newRating);
  };

  const handleRatingHover = (hoveredRating) => {
    setHoveredRating(hoveredRating);
  };

  const handleRatingLeave = () => {
    setHoveredRating(0);
  };

  const onSubmit = async (data) => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    try {
      const requestData = {
        eventId,
        rating,
        comments: data.comments
      };

      const response = await api.post('/events/feedback', requestData);

      toast.success('Feedback submitted successfully!');
      reset();
      setRating(0);

      if (onSubmitSuccess) {
        onSubmitSuccess(response.data.feedback);
      }
    } catch (error) {
      console.error('Feedback submission error:', error.response?.data);
      const message = error.response?.data?.message || 'Failed to submit feedback';
      if (error.response?.data?.errors) {
        console.error('Validation errors:', error.response.data.errors);
        const validationErrors = error.response.data.errors.map(err => err.msg).join(', ');
        toast.error(`Validation errors: ${validationErrors}`);
      } else {
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    const stars = [];
    const displayRating = hoveredRating || rating;

    for (let i = 1; i <= 5; i++) {
      stars.push(
        <button
          key={i}
          type="button"
          className={`star ${i <= displayRating ? 'filled' : ''} ${i <= rating ? 'selected' : ''}`}
          onClick={() => handleRatingChange(i)}
          onMouseEnter={() => handleRatingHover(i)}
          onMouseLeave={handleRatingLeave}
          aria-label={`Rate ${i} star${i > 1 ? 's' : ''}`}
        >
          ★
        </button>
      );
    }

    return stars;
  };

  return (
    <div className="feedback-form-container">
      <div className="feedback-form-header">
        <h3>Share Your Experience</h3>
        <p>Help others by rating this event and sharing your thoughts</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="feedback-form">
        <div className="rating-section">
          <label className="rating-label">Your Rating *</label>
          <div className="star-rating">
            {renderStars()}
          </div>
          <div className="rating-text">
            {rating > 0 && (
              <span className="rating-description">
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </span>
            )}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="comments" className="form-label">Comments (Optional)</label>
          <textarea
            id="comments"
            className={`form-input form-textarea ${errors.comments ? 'error' : ''}`}
            placeholder="Share your experience, suggestions, or any other thoughts..."
            rows="4"
            maxLength="500"
            {...register('comments', {
              maxLength: {
                value: 500,
                message: 'Comments cannot exceed 500 characters'
              }
            })}
          />
          {errors.comments && (
            <span className="error-message">{errors.comments.message}</span>
          )}
          <small className="form-help">
            Your feedback helps improve future events
          </small>
        </div>

        <button
          type="submit"
          className="btn btn-primary feedback-submit"
          disabled={isSubmitting || rating === 0}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
};

export default FeedbackForm;
