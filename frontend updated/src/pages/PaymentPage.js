import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './PaymentPage.css';

export default function PaymentPage() {
  const [amount, setAmount] = useState(99.99);
  const [organizerName, setOrganizerName] = useState('Event Organizer');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(5);

  const urlParams = new URLSearchParams(window.location.search);
  const paymentStatus = urlParams.get('status');

  useEffect(() => {
    if (paymentStatus === 'success') {
      setStatus('success');
      setMessage('✅ Payment Successful!');
      
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else if (paymentStatus === 'cancelled') {
      setStatus('cancelled');
      setMessage('❌ Payment Cancelled');
    }
  }, [paymentStatus]);

  const handleCheckout = async () => {
    setIsLoading(true);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/payments/create-checkout',
        { amount, organizerName, eventId }
      );

      window.location.href = response.data.url;
    } catch (error) {
      setStatus('error');
      setMessage(`Error: ${error.response?.data?.error || error.message}`);
      setIsLoading(false);
    }
  };

  const { id: eventId } = useParams();

  return (
    <div className="payment-container">
      {status === 'success' ? (
        <div className="success-message">
          <h2>{message}</h2>
          <p>Reloading in {countdown} seconds...</p>
        </div>
      ) : status === 'cancelled' ? (
        <div className="cancelled-message">
          <h2>{message}</h2>
          <button onClick={() => window.location.href = '/payment'}>
            Try Again
          </button>
        </div>
      ) : (
        <div className="payment-form">
          <h1>Payment</h1>
          
          <div className="organizer-info">
            <label>Organizer</label>
            <input
              type="text"
              value={organizerName}
              onChange={(e) => setOrganizerName(e.target.value)}
              placeholder="Event Organizer Name"
            />
          </div>

          <div className="amount-info">
            <label>Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value))}
              placeholder="0.00"
              step="0.01"
            />
          </div>

          <div className="amount-display">
            <p>Total: <strong>${amount.toFixed(2)}</strong></p>
            <p>by <strong>{organizerName}</strong></p>
          </div>

          <button
            onClick={handleCheckout}
            disabled={isLoading}
            className="pay-button"
          >
            {isLoading ? 'Loading...' : 'Pay with Card'}
          </button>

          {status === 'error' && (
            <div className="error-message">{message}</div>
          )}
        </div>
      )}
    </div>
  );
}