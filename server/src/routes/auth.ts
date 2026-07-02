import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import prisma from '../config/database';
import { config } from '../config';
import { authenticate, AuthPayload } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Rate limit on auth endpoints
const authLimiter = rateLimit({
  windowMs: config.rateLimit.auth.windowMs,
  max: config.rateLimit.auth.max,
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation schemas
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  shopName: z.string().min(2, 'Shop name must be at least 2 characters').max(200),
  shopAddress: z.string().optional(),
  shopPhone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

function generateAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn as any,
  });
}

function generateRefreshToken(payload: AuthPayload): string {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as any,
  });
}

// POST /api/auth/register
router.post('/register', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      throw new AppError(409, 'An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create user and shop in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash,
          role: 'OWNER',
        },
      });

      const shop = await tx.shop.create({
        data: {
          name: data.shopName,
          address: data.shopAddress || null,
          phone: data.shopPhone || null,
          ownerId: user.id,
        },
      });

      // Link user to shop
      await tx.user.update({
        where: { id: user.id },
        data: { shopId: shop.id },
      });

      return { user, shop };
    });

    const payload: AuthPayload = {
      userId: result.user.id,
      shopId: result.shop.id,
      role: 'OWNER',
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.status(201).json({
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
      shop: {
        id: result.shop.id,
        name: result.shop.name,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { shop: true, ownedShops: true },
    });

    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }

    const validPassword = await bcrypt.compare(data.password, user.passwordHash);
    if (!validPassword) {
      throw new AppError(401, 'Invalid email or password');
    }

    const shopId = user.shopId || (user.ownedShops.length > 0 ? user.ownedShops[0].id : null);

    const payload: AuthPayload = {
      userId: user.id,
      shopId,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const shop = user.shop || (user.ownedShops.length > 0 ? user.ownedShops[0] : null);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      shop: shop ? {
        id: shop.id,
        name: shop.name,
      } : null,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new AppError(400, 'Refresh token is required');
    }

    const payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as AuthPayload;

    // Verify user still exists
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      throw new AppError(401, 'User no longer exists');
    }

    const newPayload: AuthPayload = {
      userId: payload.userId,
      shopId: payload.shopId,
      role: payload.role,
    };

    const newAccessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken(newPayload);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, (_req: Request, res: Response) => {
  // With JWT, logout is client-side (discard tokens)
  // In production, you'd add the token to a blacklist
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me — get current user info
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { shop: true, ownedShops: true },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const shop = user.shop || (user.ownedShops.length > 0 ? user.ownedShops[0] : null);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      shop: shop ? {
        id: shop.id,
        name: shop.name,
        address: shop.address,
        phone: shop.phone,
        logoUrl: shop.logoUrl,
      } : null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
