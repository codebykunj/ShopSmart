import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireShopAccess, requireRole } from '../middleware/auth';
import { getActivityLogs, getStaffPerformance } from '../services/activityService';

const router = Router();
router.use(authenticate, requireShopAccess);

// GET /api/activity — only owner can see full activity log
router.get('/', requireRole('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId!;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '30', 10);
    const userId = req.query.userId as string | undefined;
    const action = req.query.action as string | undefined;

    let startDate: Date | undefined;
    let endDate: Date | undefined;
    if (req.query.startDate) startDate = new Date(req.query.startDate as string);
    if (req.query.endDate) endDate = new Date(req.query.endDate as string);

    const data = await getActivityLogs(shopId, { page, limit, userId, action, startDate, endDate });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/activity/staff-performance
router.get('/staff-performance', requireRole('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId!;
    const daysBack = parseInt(req.query.days as string || '7', 10);
    const performance = await getStaffPerformance(shopId, daysBack);
    res.json({ performance, daysBack });
  } catch (err) {
    next(err);
  }
});

export default router;
