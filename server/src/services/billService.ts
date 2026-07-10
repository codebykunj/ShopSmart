import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

interface BillItemData {
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface CreateBillData {
  items: BillItemData[];
  paymentMethod: string;
  customerName?: string;
  customerMobile?: string;
}

export async function createBillTransaction(shopId: string, cashierId: string, data: CreateBillData) {
  // Generate invoice number: SHOP-YYYYMMDD-XXXX
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const billCount = await prisma.bill.count({
    where: {
      shopId,
      createdAt: {
        gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      },
    },
  });
  const invoiceNumber = `INV-${dateStr}-${String(billCount + 1).padStart(4, '0')}`;

  // Atomic transaction: create bill, deduct stock, snapshot prices
  return prisma.$transaction(async (tx: any) => {
    let totalAmount = 0;

    // Verify and lock stock for each product item
    for (const item of data.items) {
      if (item.productId) {
        // Use raw query for row-level locking to prevent overselling
        const products = await tx.$queryRaw<Array<{ id: string; quantity_in_stock: number; name: string; unit_price: any }>>`
          SELECT id, quantity_in_stock, name, unit_price
          FROM products
          WHERE id = ${item.productId} AND shop_id = ${shopId}
          FOR UPDATE
        `;

        if (products.length === 0) {
          throw new AppError(404, `Product not found: ${item.productName}`);
        }

        const product = products[0];
        if (product.quantity_in_stock < item.quantity) {
          throw new AppError(400, `Insufficient stock for "${product.name}": available ${product.quantity_in_stock}, requested ${item.quantity}`);
        }

        // Deduct stock
        await tx.$executeRaw`
          UPDATE products
          SET quantity_in_stock = quantity_in_stock - ${item.quantity},
              updated_at = NOW()
          WHERE id = ${item.productId}
        `;
      }

      totalAmount += item.quantity * item.unitPrice;
    }

    // Create the bill
    const newBill = await tx.bill.create({
      data: {
        shopId,
        cashierId,
        customerName: data.customerName,
        customerMobile: data.customerMobile,
        totalAmount,
        paymentMethod: data.paymentMethod,
        status: 'FINALIZED',
        invoiceNumber,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId || null,
            productNameSnapshot: item.productName,
            quantity: item.quantity,
            unitPriceSnapshot: item.unitPrice,
            lineTotal: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        items: true,
        cashier: { select: { id: true, name: true } },
      },
    });

    return newBill;
  });
}
