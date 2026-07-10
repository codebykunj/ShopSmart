import Razorpay from 'razorpay';

// Initialize razorpay instance if keys are provided
export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY || 'rzp_test_placeholder_key',
  key_secret: process.env.RAZORPAY_SECRET || 'placeholder_secret',
});
