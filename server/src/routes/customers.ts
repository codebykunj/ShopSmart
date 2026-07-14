import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate, requireShopAccess, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logActivity } from '../services/activityService';

const router = Router();
router.use(authenticate, requireShopAccess);

const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  mobile: z.string().min(10, 'Valid mobile number required').max(15),
  email: z.string().email().optional().nullable(),
});

const updateCustomerSchema = createCustomerSchema.partial();

// GET /api/customers
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId!;
    const search = req.query.search as string | undefined;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '50', 10);
    const skip = (page - 1) * limit;
    const sortBy = (req.query.sortBy as string) || 'totalSpent';
    const sortOrder = (req.query.sortOrder as string) || 'desc';

    const where: any = { shopId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (['totalSpent', 'visitCount', 'loyaltyPoints', 'lastVisitAt', 'name', 'createdAt'].includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.totalSpent = 'desc';
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: { _count: { select: { bills: true } } },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      customers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/customers/lookup?mobile=xxx
router.get('/lookup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId!;
    const mobile = req.query.mobile as string;

    if (!mobile || mobile.length < 10) {
      res.json({ customer: null });
      return;
    }

    const customer = await prisma.customer.findUnique({
      where: { shopId_mobile: { shopId, mobile } },
    });

    res.json({ customer });
  } catch (err) {
    next(err);
  }
});

// GET /api/customers/insights
router.get('/insights', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId!;

    const [totalCustomers, topSpenders, recentVisitors, loyaltyStats] = await Promise.all([
      prisma.customer.count({ where: { shopId } }),
      prisma.customer.findMany({
        where: { shopId },
        orderBy: { totalSpent: 'desc' },
        take: 5,
      }),
      prisma.customer.findMany({
        where: { shopId, lastVisitAt: { not: null } },
        orderBy: { lastVisitAt: 'desc' },
        take: 5,
      }),
      prisma.customer.aggregate({
        where: { shopId },
        _sum: { totalSpent: true, loyaltyPoints: true },
        _avg: { visitCount: true, totalSpent: true },
      }),
    ]);

    // Repeat customers (visited more than once)
    const repeatCount = await prisma.customer.count({
      where: { shopId, visitCount: { gt: 1 } },
    });

    res.json({
      totalCustomers,
      repeatCustomers: repeatCount,
      repeatRate: totalCustomers > 0 ? Math.round((repeatCount / totalCustomers) * 100) : 0,
      avgVisits: Math.round(Number(loyaltyStats._avg.visitCount || 0) * 10) / 10,
      avgSpend: Math.round(Number(loyaltyStats._avg.totalSpent || 0)),
      totalLoyaltyPoints: Number(loyaltyStats._sum.loyaltyPoints || 0),
      topSpenders,
      recentVisitors,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/customers/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId!;
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id as string, shopId },
      include: {
        bills: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { items: true },
        },
      },
    });

    if (!customer) throw new AppError(404, 'Customer not found');

    res.json({ customer });
  } catch (err) {
    next(err);
  }
});

// POST /api/customers
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createCustomerSchema.parse(req.body);
    const shopId = req.user!.shopId!;

    // Check if customer with same mobile already exists
    const existing = await prisma.customer.findUnique({
      where: { shopId_mobile: { shopId, mobile: data.mobile } },
    });
    if (existing) {
      throw new AppError(409, 'A customer with this mobile number already exists');
    }

    const customer = await prisma.customer.create({
      data: { shopId, name: data.name, mobile: data.mobile, email: data.email || null },
    });

    await logActivity({
      shopId,
      userId: req.user!.userId,
      action: 'CUSTOMER_CREATED',
      entityType: 'Customer',
      entityId: customer.id,
      details: { name: data.name, mobile: data.mobile },
    });

    res.status(201).json({ customer });
  } catch (err) {
    next(err);
  }
});

// PUT /api/customers/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateCustomerSchema.parse(req.body);
    const shopId = req.user!.shopId!;

    const existing = await prisma.customer.findFirst({
      where: { id: req.params.id as string, shopId },
    });
    if (!existing) throw new AppError(404, 'Customer not found');

    const customer = await prisma.customer.update({
      where: { id: req.params.id as string },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.mobile !== undefined && { mobile: data.mobile }),
        ...(data.email !== undefined && { email: data.email }),
      },
    });

    await logActivity({
      shopId,
      userId: req.user!.userId,
      action: 'CUSTOMER_UPDATED',
      entityType: 'Customer',
      entityId: customer.id,
      details: data,
    });

    res.json({ customer });
  } catch (err) {
    next(err);
  }
});

// POST /api/customers/:id/redeem — redeem loyalty points
router.post('/:id/redeem', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId!;
    const points = parseInt(req.body.points, 10);

    if (!points || points <= 0) {
      throw new AppError(400, 'Points must be a positive number');
    }

    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id as string, shopId },
    });
    if (!customer) throw new AppError(404, 'Customer not found');

    if (customer.loyaltyPoints < points) {
      throw new AppError(400, `Customer only has ${customer.loyaltyPoints} points`);
    }

    // 1 point = ₹1 discount
    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: { loyaltyPoints: { decrement: points } },
    });

    res.json({ customer: updated, discountAmount: points });
  } catch (err) {
    next(err);
  }
});

export default router;
