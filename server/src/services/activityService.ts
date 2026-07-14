import prisma from '../config/database';

type Action = 'BILL_CREATED' | 'BILL_VOIDED' | 'PRODUCT_CREATED' | 'PRODUCT_UPDATED' | 'PRODUCT_DELETED' | 'STOCK_IMPORTED' | 'CUSTOMER_CREATED' | 'CUSTOMER_UPDATED' | 'LOGIN' | 'LOGOUT' | 'SETTINGS_UPDATED';

/**
 * Log an activity event.
 */
export async function logActivity(data: {
  shopId: string;
  userId: string;
  action: Action;
  entityType?: string;
  entityId?: string;
  details?: any;
}) {
  try {
    return await prisma.activityLog.create({
      data: {
        shopId: data.shopId,
        userId: data.userId,
        action: data.action,
        entityType: data.entityType || null,
        entityId: data.entityId || null,
        details: data.details || null,
      },
    });
  } catch (err) {
    // Don't let logging failures break the main operation
    console.error('[ActivityLog Error]', err);
    return null;
  }
}

/**
 * Get activity logs for a shop.
 */
export async function getActivityLogs(
  shopId: string,
  opts: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}
) {
  const { page = 1, limit = 30, userId, action, startDate, endDate } = opts;
  const skip = (page - 1) * limit;

  const where: any = { shopId };
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.activityLog.count({ where }),
  ]);

  return {
    logs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * Get staff performance summary.
 */
export async function getStaffPerformance(shopId: string, daysBack: number = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  startDate.setHours(0, 0, 0, 0);

  // Get all staff for this shop
  const staff = await prisma.user.findMany({
    where: { shopId },
    select: { id: true, name: true, role: true },
  });

  // Get bills per cashier in the period
  const billStats = await prisma.$queryRaw<
    Array<{
      cashier_id: string;
      total_bills: bigint;
      total_revenue: any;
      total_items: bigint;
    }>
  >`
    SELECT
      b.cashier_id,
      COUNT(b.id)::bigint AS total_bills,
      COALESCE(SUM(b.total_amount), 0) AS total_revenue,
      COALESCE(SUM(sub.item_count), 0)::bigint AS total_items
    FROM bills b
    LEFT JOIN (
      SELECT bill_id, SUM(quantity)::bigint AS item_count
      FROM bill_items
      GROUP BY bill_id
    ) sub ON sub.bill_id = b.id
    WHERE b.shop_id = ${shopId}
      AND b.status = 'FINALIZED'
      AND b.created_at >= ${startDate}
    GROUP BY b.cashier_id
  `;

  const statsMap = new Map<string, { totalBills: number; totalRevenue: number; totalItems: number }>();
  for (const s of billStats) {
    statsMap.set(s.cashier_id, {
      totalBills: Number(s.total_bills),
      totalRevenue: Number(s.total_revenue),
      totalItems: Number(s.total_items),
    });
  }

  const performance = staff.map((s) => {
    const stats = statsMap.get(s.id) || { totalBills: 0, totalRevenue: 0, totalItems: 0 };
    return {
      userId: s.id,
      name: s.name,
      role: s.role,
      ...stats,
      avgBillValue: stats.totalBills > 0 ? Math.round(stats.totalRevenue / stats.totalBills) : 0,
    };
  });

  return performance.sort((a, b) => b.totalRevenue - a.totalRevenue);
}
