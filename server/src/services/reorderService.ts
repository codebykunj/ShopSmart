import prisma from '../config/database';

/**
 * Analyze sales velocity and predict reorder needs.
 */
export async function getReorderSuggestions(shopId: string) {
  // Get all products with stock info
  const products = await prisma.product.findMany({
    where: { shopId },
    select: {
      id: true,
      name: true,
      category: true,
      quantityInStock: true,
      reorderThreshold: true,
      unitPrice: true,
      costPrice: true,
    },
  });

  // Get sales data for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const salesData = await prisma.$queryRaw<
    Array<{
      product_id: string;
      product_name_snapshot: string;
      total_quantity: bigint;
      total_revenue: any;
    }>
  >`
    SELECT
      bi.product_id,
      bi.product_name_snapshot,
      SUM(bi.quantity)::bigint AS total_quantity,
      SUM(bi.line_total) AS total_revenue
    FROM bill_items bi
    JOIN bills b ON bi.bill_id = b.id
    WHERE b.shop_id = ${shopId}
      AND b.status = 'FINALIZED'
      AND b.created_at >= ${thirtyDaysAgo}
      AND bi.product_id IS NOT NULL
    GROUP BY bi.product_id, bi.product_name_snapshot
  `;

  // Build a map of product_id -> sales velocity
  const salesMap = new Map<string, { totalSold: number; dailyRate: number }>();
  for (const s of salesData) {
    const totalSold = Number(s.total_quantity);
    const dailyRate = totalSold / 30;
    salesMap.set(s.product_id, { totalSold, dailyRate });
  }

  // Calculate reorder suggestions
  const suggestions = products
    .map((product) => {
      const sales = salesMap.get(product.id) || { totalSold: 0, dailyRate: 0 };
      const daysOfStockLeft = sales.dailyRate > 0
        ? Math.round(product.quantityInStock / sales.dailyRate)
        : product.quantityInStock > 0 ? 999 : 0;

      // Suggested reorder quantity: enough to last 30 days
      const suggestedOrderQty = Math.max(
        0,
        Math.ceil(sales.dailyRate * 30) - product.quantityInStock
      );

      // Priority: 1 = critical (out of stock or < 3 days), 2 = urgent (< 7 days), 3 = normal (< 14 days)
      let urgency: 'critical' | 'urgent' | 'normal' | 'ok' = 'ok';
      if (product.quantityInStock === 0 || daysOfStockLeft <= 3) urgency = 'critical';
      else if (daysOfStockLeft <= 7) urgency = 'urgent';
      else if (daysOfStockLeft <= 14 || product.quantityInStock <= product.reorderThreshold) urgency = 'normal';

      return {
        productId: product.id,
        name: product.name,
        category: product.category,
        currentStock: product.quantityInStock,
        reorderThreshold: product.reorderThreshold,
        unitsSoldLast30Days: sales.totalSold,
        dailySalesRate: Math.round(sales.dailyRate * 100) / 100,
        daysOfStockLeft,
        suggestedOrderQty,
        estimatedCost: product.costPrice
          ? suggestedOrderQty * Number(product.costPrice)
          : suggestedOrderQty * Number(product.unitPrice),
        urgency,
      };
    })
    .filter((s) => s.urgency !== 'ok')
    .sort((a, b) => {
      const urgencyOrder = { critical: 0, urgent: 1, normal: 2, ok: 3 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency] || a.daysOfStockLeft - b.daysOfStockLeft;
    });

  return {
    suggestions,
    summary: {
      totalSuggestions: suggestions.length,
      critical: suggestions.filter((s) => s.urgency === 'critical').length,
      urgent: suggestions.filter((s) => s.urgency === 'urgent').length,
      normal: suggestions.filter((s) => s.urgency === 'normal').length,
      totalEstimatedCost: suggestions.reduce((sum, s) => sum + s.estimatedCost, 0),
    },
  };
}
