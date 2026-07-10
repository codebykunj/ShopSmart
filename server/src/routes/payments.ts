import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { authenticate, requireShopAccess } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { razorpay } from '../config/razorpay';
import { createBillTransaction } from '../services/billService';

const router = Router();
router.use(authenticate, requireShopAccess);

const createOrderSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
});

const billItemSchema = z.object({
  productId: z.string().uuid().optional(),
  productName: z.string().min(1),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  unitPrice: z.number().positive('Price must be positive'),
});

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  // Bill data
  items: z.array(billItemSchema).min(1, 'At least one item is required'),
  paymentMethod: z.enum(['card', 'upi']).default('card'),
  customerName: z.string().optional(),
  customerMobile: z.string().optional(),
});

// POST /api/payments/create-order
router.post('/create-order', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount } = createOrderSchema.parse(req.body);

    console.log('[Razorpay] Creating order with amount:', amount);
    console.log('[Razorpay] RAZORPAY_KEY loaded:', process.env.RAZORPAY_KEY ? 'Yes' : 'No');
    console.log('[Razorpay] RAZORPAY_SECRET loaded:', process.env.RAZORPAY_SECRET ? 'Yes' : 'No');

    const options = {
      amount: Math.round(amount * 100), // convert to paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      data: order,
    });
  } catch (err: any) {
    console.error('[Razorpay] Order creation error:', err?.message || err);
    console.error('[Razorpay] Full error:', JSON.stringify(err, null, 2));
    res.status(500).json({
      success: false,
      message: err?.error?.description || err?.message || 'Could not initiate order',
    });
  }
});

// POST /api/payments/verify
router.post('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = verifyPaymentSchema.parse(req.body);
    const shopId = req.user!.shopId!;
    const cashierId = req.user!.userId;

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, ...billData } = data;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_SECRET || 'placeholder_secret')
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw new AppError(400, 'Invalid payment signature');
    }

    // Payment is authentic, create the bill
    const bill = await createBillTransaction(shopId, cashierId, billData);

    res.status(201).json({
      success: true,
      message: 'Payment Verified',
      bill,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
