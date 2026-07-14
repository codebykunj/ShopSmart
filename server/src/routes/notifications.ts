import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireShopAccess } from '../middleware/auth';
import { getNotifications, markAsRead, checkAndGenerateAlerts } from '../services/notificationService';

const router = Router();
router.use(authenticate, requireShopAccess);

// GET /api/notifications
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId!;
    const limit = parseInt(req.query.limit as string || '20', 10);
    const unreadOnly = req.query.unreadOnly === 'true';

    const data = await getNotifications(shopId, { limit, unreadOnly });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /api/notifications/check — trigger alert generation
router.post('/check', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId!;
    const alerts = await checkAndGenerateAlerts(shopId);
    res.json({ generated: alerts.length, alerts });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/read
router.put('/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId!;
    const ids = req.body.ids as string[] | undefined;
    await markAsRead(shopId, ids);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
