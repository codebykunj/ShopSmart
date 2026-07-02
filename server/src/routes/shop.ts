import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate, requireShopAccess, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate, requireShopAccess);

// GET /api/shop/profile
router.get('/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId!;
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        staff: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!shop) {
      throw new AppError(404, 'Shop not found');
    }

    res.json({ shop });
  } catch (err) {
    next(err);
  }
});

// PUT /api/shop/profile
const updateShopSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  address: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
});

router.put('/profile', requireRole('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateShopSchema.parse(req.body);
    const shopId = req.user!.shopId!;

    const shop = await prisma.shop.update({
      where: { id: shopId },
      data,
    });

    res.json({ shop });
  } catch (err) {
    next(err);
  }
});

// POST /api/shop/staff — add staff member
const addStaffSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

router.post('/staff', requireRole('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = addStaffSchema.parse(req.body);
    const shopId = req.user!.shopId!;
    const bcrypt = require('bcryptjs');

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new AppError(409, 'An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const staff = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: 'STAFF',
        shopId,
      },
    });

    res.status(201).json({
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
