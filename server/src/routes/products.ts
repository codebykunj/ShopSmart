import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate, requireRole, requireShopAccess } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logActivity } from '../services/activityService';

const router = Router();

// All product routes require authentication and shop access
router.use(authenticate, requireShopAccess);

// Validation schemas
const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  category: z.string().default('General'),
  unitPrice: z.number().positive('Price must be positive'),
  costPrice: z.number().positive().optional().nullable(),
  quantityInStock: z.number().int().min(0, 'Quantity cannot be negative').default(0),
  reorderThreshold: z.number().int().min(0).default(10),
  sku: z.string().optional(),
  expiryDate: z.string().datetime().optional().nullable(),
});

const updateProductSchema = createProductSchema.partial();

const querySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.enum(['name', 'category', 'unitPrice', 'quantityInStock', 'createdAt', 'expiryDate']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// GET /api/products
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = querySchema.parse(req.query);
    const shopId = req.user!.shopId!;
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '50', 10);
    const skip = (page - 1) * limit;

    const where: any = { shopId };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { category: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.category) {
      where.category = query.category;
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.sortOrder || 'asc';
    } else {
      orderBy.name = 'asc';
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, orderBy, skip, take: limit }),
      prisma.product.count({ where }),
    ]);

    res.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/low-stock
router.get('/low-stock', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId!;

    const products = await prisma.$queryRaw`
      SELECT * FROM products
      WHERE shop_id = ${shopId}
        AND quantity_in_stock <= reorder_threshold
      ORDER BY quantity_in_stock ASC
    `;

    res.json({ products });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/expiring
router.get('/expiring', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId!;
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [expired, within7Days, within30Days] = await Promise.all([
      prisma.product.findMany({
        where: { shopId, expiryDate: { lt: now } },
        orderBy: { expiryDate: 'asc' },
      }),
      prisma.product.findMany({
        where: { shopId, expiryDate: { gte: now, lte: in7Days } },
        orderBy: { expiryDate: 'asc' },
      }),
      prisma.product.findMany({
        where: { shopId, expiryDate: { gt: in7Days, lte: in30Days } },
        orderBy: { expiryDate: 'asc' },
      }),
    ]);

    res.json({ expired, within7Days, within30Days });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/categories
router.get('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId!;
    const categories = await prisma.product.findMany({
      where: { shopId },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });

    res.json({ categories: categories.map((c: any) => c.category) });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId!;
    const product = await prisma.product.findFirst({
      where: { id: req.params.id as string, shopId },
    });

    if (!product) {
      throw new AppError(404, 'Product not found');
    }

    res.json({ product });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/profit-stats
router.get('/profit-stats', requireRole('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId!;

    const products = await prisma.product.findMany({
      where: { shopId, costPrice: { not: null } },
      select: { id: true, name: true, category: true, unitPrice: true, costPrice: true, quantityInStock: true },
    });

    const margins = products.map((p) => {
      const sell = Number(p.unitPrice);
      const cost = Number(p.costPrice);
      const margin = sell > 0 ? ((sell - cost) / sell) * 100 : 0;
      return {
        id: p.id,
        name: p.name,
        category: p.category,
        sellingPrice: sell,
        costPrice: cost,
        profit: sell - cost,
        marginPercent: Math.round(margin * 10) / 10,
        stockValue: p.quantityInStock * cost,
        potentialRevenue: p.quantityInStock * sell,
      };
    });

    const totalCostValue = margins.reduce((s, m) => s + m.stockValue, 0);
    const totalRevenueValue = margins.reduce((s, m) => s + m.potentialRevenue, 0);
    const avgMargin = margins.length > 0 ? margins.reduce((s, m) => s + m.marginPercent, 0) / margins.length : 0;

    const bestMargin = [...margins].sort((a, b) => b.marginPercent - a.marginPercent).slice(0, 5);
    const worstMargin = [...margins].sort((a, b) => a.marginPercent - b.marginPercent).slice(0, 5);

    res.json({
      summary: {
        productsWithCost: margins.length,
        totalCostValue: Math.round(totalCostValue),
        totalRevenueValue: Math.round(totalRevenueValue),
        totalProfit: Math.round(totalRevenueValue - totalCostValue),
        avgMarginPercent: Math.round(avgMargin * 10) / 10,
      },
      bestMargin,
      worstMargin,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/products
router.post('/', requireRole('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createProductSchema.parse(req.body);
    const shopId = req.user!.shopId!;

    const product = await prisma.product.create({
      data: {
        shopId,
        name: data.name,
        category: data.category,
        unitPrice: data.unitPrice,
        costPrice: data.costPrice || null,
        quantityInStock: data.quantityInStock,
        reorderThreshold: data.reorderThreshold,
        sku: data.sku || null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      },
    });

    await logActivity({
      shopId,
      userId: req.user!.userId,
      action: 'PRODUCT_CREATED',
      entityType: 'Product',
      entityId: product.id,
      details: { name: data.name, unitPrice: data.unitPrice, costPrice: data.costPrice },
    });

    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
});

// PUT /api/products/:id
router.put('/:id', requireRole('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateProductSchema.parse(req.body);
    const shopId = req.user!.shopId!;

    // Verify product belongs to shop
    const existing = await prisma.product.findFirst({
      where: { id: req.params.id as string, shopId },
    });

    if (!existing) {
      throw new AppError(404, 'Product not found');
    }

    const product = await prisma.product.update({
      where: { id: req.params.id as string },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.unitPrice !== undefined && { unitPrice: data.unitPrice }),
        ...(data.costPrice !== undefined && { costPrice: data.costPrice }),
        ...(data.quantityInStock !== undefined && { quantityInStock: data.quantityInStock }),
        ...(data.reorderThreshold !== undefined && { reorderThreshold: data.reorderThreshold }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.expiryDate !== undefined && { expiryDate: data.expiryDate ? new Date(data.expiryDate) : null }),
      },
    });

    await logActivity({
      shopId,
      userId: req.user!.userId,
      action: 'PRODUCT_UPDATED',
      entityType: 'Product',
      entityId: product.id,
      details: data,
    });

    res.json({ product });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:id
router.delete('/:id', requireRole('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId!;

    const existing = await prisma.product.findFirst({
      where: { id: req.params.id as string, shopId },
    });

    if (!existing) {
      throw new AppError(404, 'Product not found');
    }

    await prisma.product.delete({ where: { id: req.params.id as string } });

    await logActivity({
      shopId,
      userId: req.user!.userId,
      action: 'PRODUCT_DELETED',
      entityType: 'Product',
      entityId: req.params.id as string,
      details: { name: existing.name },
    });

    res.json({ message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
