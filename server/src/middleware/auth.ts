import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../config/database';

export interface AuthPayload {
  userId: string;
  shopId: string | null;
  role: 'OWNER' | 'STAFF';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as AuthPayload;
    req.user = payload;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired access token' });
  }
}

export function requireRole(...roles: ('OWNER' | 'STAFF')[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

export async function requireShopAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user || !req.user.shopId) {
    res.status(403).json({ error: 'No shop associated with this account' });
    return;
  }

  const shop = await prisma.shop.findUnique({ where: { id: req.user.shopId } });
  if (!shop) {
    res.status(404).json({ error: 'Shop not found' });
    return;
  }

  next();
}
