import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { format } from 'date-fns';
import './FeedbackDisplay.css';

const FeedbackDisplay = ({ eventId }) => {
  const [feedback, setFeedback] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalFeedback, setTotalFeedback] = useState(0);
  const [ratingDistribution, setRatingDistribution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFeedback = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/events/feedback/${eventId}`);
      setFeedback(response.data.feedback);
      setAverageRating(response.data.averageRating);
      setTotalFeedback(response.data.totalFeedback);
      setRatingDistribution(response.data.ratingDistribution || null);
    } catch (error) {
      setError('Failed to load feedback');
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          className={`star ${i <= rating ? 'filled' : ''}`}
        >
          ★
        </span>
      );
    }
    return stars;
  };

  const getRatingText = (rating) => {
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="feedback-display-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading feedback...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="feedback-display-container">
        <div className="feedback-error">
          <p>{error}</p>
          <button onClick={fetchFeedback} className="btn btn-secondary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (totalFeedback === 0) {
    return (
      <div className="feedback-display-container">
        <div className="no-feedback">
          <h3>No Feedback Yet</h3>
          <p>Be the first to share your experience with this event!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-display-container">
      <div className="feedback-summary">
        <div className="rating-overview">
          <div className="average-rating">
            <span className="rating-number">{averageRating}</span>
            <div className="rating-stars">
              {renderStars(Math.round(averageRating))}
            </div>
            <span className="rating-text">{getRatingText(Math.round(averageRating))}</span>
          </div>
          <div className="rating-stats">
            <p>Based on {totalFeedback} review{totalFeedback !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {ratingDistribution && (
          <div className="rating-distribution">
            <h4>Rating breakdown</h4>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingDistribution[star] || 0;
              const pct = totalFeedback ? Math.round((count / totalFeedback) * 100) : 0;
              return (
                <div key={star} className="dist-row">
                  <span className="dist-label">{star}★</span>
                  <div className="dist-bar-wrap">
                    <div className="dist-bar" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="dist-count">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="feedback-list">
        <h3>Recent Reviews</h3>
        {feedback.map((item) => (
          <div key={item._id} className="feedback-item">
            <div className="feedback-header">
              <div className="feedback-rating">
                {renderStars(item.rating)}
                <span className="rating-label">{getRatingText(item.rating)}</span>
              </div>
              <div className="feedback-meta">
                <span className="feedback-author">{item.userID.username}</span>
                <span className="feedback-date">
                  {format(new Date(item.createdAt), 'MMM dd, yyyy')}
                </span>
              </div>
            </div>

            {item.comments && (
              <div className="feedback-comments">
                <p>{item.comments}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeedbackDisplay;
