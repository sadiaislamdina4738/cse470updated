const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// Create checkout session
router.post('/create-checkout', async (req, res) => {
  const { amount, organizerName, eventId } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: organizerName || 'Event Payment',
              description: `Event ID: ${eventId}`
            },
            unit_amount: Math.round(amount * 100)
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/events/${eventId}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/events/${eventId}?payment=cancelled`,
      metadata: { eventId }
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Verify payment
router.post('/verify-payment', async (req, res) => {
  const { sessionId } = req.body;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    res.json({
      paymentStatus: session.payment_status,
      customerId: session.customer,
      eventId: session.metadata.eventId
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;