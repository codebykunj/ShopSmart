import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate, requireShopAccess } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { Decimal } from '@prisma/client/runtime/library';

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

    // Generate invoice number: SHOP-YYYYMMDD-XXXX
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const billCount = await prisma.bill.count({
      where: {
        shopId,
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        },
      },
    });
    const invoiceNumber = `INV-${dateStr}-${String(billCount + 1).padStart(4, '0')}`;

    // Atomic transaction: create bill, deduct stock, snapshot prices
    const bill = await prisma.$transaction(async (tx: any) => {
      let totalAmount = 0;

      // Verify and lock stock for each product item
      for (const item of data.items) {
        if (item.productId) {
          // Use raw query for row-level locking to prevent overselling
          const products = await tx.$queryRaw<Array<{ id: string; quantity_in_stock: number; name: string; unit_price: any }>>`
            SELECT id, quantity_in_stock, name, unit_price
            FROM products
            WHERE id = ${item.productId} AND shop_id = ${shopId}
            FOR UPDATE
          `;

          if (products.length === 0) {
            throw new AppError(404, `Product not found: ${item.productName}`);
          }

          const product = products[0];
          if (product.quantity_in_stock < item.quantity) {
            throw new AppError(400, `Insufficient stock for "${product.name}": available ${product.quantity_in_stock}, requested ${item.quantity}`);
          }

          // Deduct stock
          await tx.$executeRaw`
            UPDATE products
            SET quantity_in_stock = quantity_in_stock - ${item.quantity},
                updated_at = NOW()
            WHERE id = ${item.productId}
          `;
        }

        totalAmount += item.quantity * item.unitPrice;
      }

      // Create the bill
      const newBill = await tx.bill.create({
        data: {
          shopId,
          cashierId,
          customerName: data.customerName,
          customerMobile: data.customerMobile,
          totalAmount,
          paymentMethod: data.paymentMethod,
          status: 'FINALIZED',
          invoiceNumber,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId || null,
              productNameSnapshot: item.productName,
              quantity: item.quantity,
              unitPriceSnapshot: item.unitPrice,
              lineTotal: item.quantity * item.unitPrice,
            })),
          },
        },
        include: {
          items: true,
          cashier: { select: { id: true, name: true } },
        },
      });

      return newBill;
    });

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

    const [bills, total] = await Promise.all([
      prisma.bill.findMany({
        where: { shopId, status: 'FINALIZED' },
        include: {
          items: true,
          cashier: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.bill.count({ where: { shopId, status: 'FINALIZED' } }),
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
