import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { authenticate, requireShopAccess, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate, requireShopAccess);

// GET /api/analytics/sales?range=day|week|month
router.get('/sales', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId!;
    const range = (req.query.range as string) || 'week';

    let daysBack: number;
    switch (range) {
      case 'day': daysBack = 1; break;
      case 'month': daysBack = 30; break;
      case 'week':
      default: daysBack = 7; break;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    startDate.setHours(0, 0, 0, 0);

    const bills = await prisma.bill.findMany({
      where: {
        shopId,
        status: 'FINALIZED',
        createdAt: { gte: startDate },
      },
      select: {
        totalAmount: true,
        createdAt: true,
        items: {
          select: { quantity: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const dailySales: Record<string, { revenue: number; transactions: number; itemsSold: number }> = {};

    for (let d = 0; d <= daysBack; d++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + d);
      const key = date.toISOString().slice(0, 10);
      dailySales[key] = { revenue: 0, transactions: 0, itemsSold: 0 };
    }

    let totalRevenue = 0;
    let totalTransactions = 0;
    let totalItemsSold = 0;

    for (const bill of bills) {
      const key = bill.createdAt.toISOString().slice(0, 10);
      const amount = Number(bill.totalAmount);
      const items = bill.items.reduce((sum: number, i: any) => sum + i.quantity, 0);

      if (dailySales[key]) {
        dailySales[key].revenue += amount;
        dailySales[key].transactions += 1;
        dailySales[key].itemsSold += items;
      }

      totalRevenue += amount;
      totalTransactions += 1;
      totalItemsSold += items;
    }

    const chartData = Object.entries(dailySales).map(([date, data]) => ({
      date,
      ...data,
    }));

    res.json({
      summary: {
        totalRevenue,
        totalTransactions,
        totalItemsSold,
        avgTransaction: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
      },
      chartData,
      range,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/top-products?range=day|week|month
router.get('/top-products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId!;
    const range = (req.query.range as string) || 'week';
    const limitCount = parseInt(req.query.limit as string || '10', 10);

    let daysBack: number;
    switch (range) {
      case 'day': daysBack = 1; break;
      case 'month': daysBack = 30; break;
      case 'week':
      default: daysBack = 7; break;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    startDate.setHours(0, 0, 0, 0);

    const topProducts = await prisma.$queryRaw<Array<{
      product_name_snapshot: string;
      total_quantity: bigint;
      total_revenue: any;
    }>>`
      SELECT
        bi.product_name_snapshot,
        SUM(bi.quantity)::bigint AS total_quantity,
        SUM(bi.line_total) AS total_revenue
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      WHERE b.shop_id = ${shopId}
        AND b.status = 'FINALIZED'
        AND b.created_at >= ${startDate}
      GROUP BY bi.product_name_snapshot
      ORDER BY total_quantity DESC
      LIMIT ${limitCount}
    `;

    const products = topProducts.map((p: any) => ({
      name: p.product_name_snapshot,
      quantity: Number(p.total_quantity),
      revenue: Number(p.total_revenue),
    }));

    res.json({ products, range });
  } catch (err) {
    next(err);
  }
});

export default router;
