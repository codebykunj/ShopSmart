import prisma from '../config/database';

/**
 * Create a notification for a shop.
 */
export async function createNotification(data: {
  shopId: string;
  userId?: string;
  type: 'LOW_STOCK' | 'EXPIRY_WARNING' | 'DAILY_SUMMARY' | 'DEMAND_SPIKE' | 'VOID_BILL' | 'STOCK_IMPORTED' | 'GENERAL';
  title: string;
  message: string;
  extraData?: any;
}) {
  return prisma.notification.create({
    data: {
      shopId: data.shopId,
      userId: data.userId || null,
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.extraData || null,
    },
  });
}

/**
 * Get notifications for a shop/user.
 */
export async function getNotifications(shopId: string, opts: { limit?: number; unreadOnly?: boolean } = {}) {
  const { limit = 20, unreadOnly = false } = opts;

  const where: any = { shopId };
  if (unreadOnly) where.isRead = false;

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.notification.count({ where: { shopId, isRead: false } }),
  ]);

  return { notifications, unreadCount };
}

/**
 * Mark notifications as read.
 */
export async function markAsRead(shopId: string, notificationIds?: string[]) {
  const where: any = { shopId };
  if (notificationIds) {
    where.id = { in: notificationIds };
  }
  return prisma.notification.updateMany({ where, data: { isRead: true } });
}

/**
 * Check for alerts and generate notifications.
 */
export async function checkAndGenerateAlerts(shopId: string) {
  const notifications: any[] = [];

  // Check low stock
  const lowStockProducts = await prisma.$queryRaw<Array<{ id: string; name: string; quantity_in_stock: number; reorder_threshold: number }>>`
    SELECT id, name, quantity_in_stock, reorder_threshold
    FROM products
    WHERE shop_id = ${shopId}
      AND quantity_in_stock <= reorder_threshold
    ORDER BY quantity_in_stock ASC
    LIMIT 10
  `;

  if (lowStockProducts.length > 0) {
    const names = lowStockProducts.slice(0, 3).map((p) => p.name).join(', ');
    const more = lowStockProducts.length > 3 ? ` and ${lowStockProducts.length - 3} more` : '';

    // Check if we already sent a low stock alert today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existingAlert = await prisma.notification.findFirst({
      where: {
        shopId,
        type: 'LOW_STOCK',
        createdAt: { gte: today },
      },
    });

    if (!existingAlert) {
      const n = await createNotification({
        shopId,
        type: 'LOW_STOCK',
        title: `${lowStockProducts.length} products are running low`,
        message: `${names}${more} are below reorder threshold. Consider restocking soon.`,
        extraData: { productIds: lowStockProducts.map((p) => p.id) },
      });
      notifications.push(n);
    }
  }

  // Check expiring products
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiringProducts = await prisma.product.findMany({
    where: { shopId, expiryDate: { gte: now, lte: in7Days } },
    select: { id: true, name: true, expiryDate: true },
    take: 10,
  });

  if (expiringProducts.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existingAlert = await prisma.notification.findFirst({
      where: {
        shopId,
        type: 'EXPIRY_WARNING',
        createdAt: { gte: today },
      },
    });

    if (!existingAlert) {
      const names = expiringProducts.slice(0, 3).map((p) => p.name).join(', ');
      const n = await createNotification({
        shopId,
        type: 'EXPIRY_WARNING',
        title: `${expiringProducts.length} products expiring within 7 days`,
        message: `${names} — check these items and consider discounting or removing them.`,
        extraData: { productIds: expiringProducts.map((p) => p.id) },
      });
      notifications.push(n);
    }
  }

  return notifications;
}
