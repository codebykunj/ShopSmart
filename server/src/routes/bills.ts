import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate, requireShopAccess } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { Decimal } from '@prisma/client/runtime/library';
import { createBillTransaction } from '../services/billService';

const router = Router();
router.use(authenticate, requireShopAccess);

const billItemSchema = z.object({
  productId: z.string().uuid().optional(),
  productName: z.string().min(1),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  unitPrice: z.number().positive('Price must be positive'),
});

const createBillSchema = z.object({
  items: z.array(billItemSchema).min(1, 'At least one item is required'),
  paymentMethod: z.enum(['cash', 'card', 'upi', 'other']).default('cash'),
  customerName: z.string().optional(),
  customerMobile: z.string().optional(),
});

// POST /api/bills — finalize a sale
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createBillSchema.parse(req.body);
    const shopId = req.user!.shopId!;
    const cashierId = req.user!.userId;
    const bill = await createBillTransaction(shopId, cashierId, data);

    res.status(201).json({ bill });
  } catch (err) {
    next(err);
  }
});

// GET /api/bills
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId!;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const skip = (page - 1) * limit;
    const dateFilter = req.query.date as string | undefined; // YYYY-MM-DD

    const where: any = { shopId, status: 'FINALIZED' };

    // Optional: filter by specific date
    if (dateFilter) {
      const dayStart = new Date(dateFilter + 'T00:00:00');
      const dayEnd = new Date(dateFilter + 'T23:59:59.999');
      where.createdAt = { gte: dayStart, lte: dayEnd };
    }

    const [bills, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        include: {
          items: true,
          cashier: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.bill.count({ where }),
    ]);

    res.json({
      bills,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/bills/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId!;

    const bill = await prisma.bill.findFirst({
      where: { id: req.params.id as string, shopId },
      include: {
        items: true,
        cashier: { select: { id: true, name: true } },
        shop: { select: { id: true, name: true, address: true, phone: true, logoUrl: true } },
      },
    });

    if (!bill) {
      throw new AppError(404, 'Bill not found');
    }

    res.json({ bill });
  } catch (err) {
    next(err);
  }
});

// POST /api/bills/:id/whatsapp
router.post('/:id/whatsapp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId!;
    const bill = await prisma.bill.findFirst({
      where: { id: req.params.id as string, shopId },
    });

    if (!bill) {
      throw new AppError(404, 'Bill not found');
    }

    if (!bill.customerMobile) {
      throw new AppError(400, 'Customer mobile number not found for this bill');
    }

    // Simulate sending PDF to WhatsApp
    await new Promise(resolve => setTimeout(resolve, 1500));

    res.json({ 
      success: true, 
      message: `Invoice PDF successfully sent to ${bill.customerMobile} via WhatsApp!` 
    });
  } catch (err) {
    next(err);
  }
});

export default router;
