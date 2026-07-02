import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding ShopSmart database...\n');

  // Clear existing data
  await prisma.billItem.deleteMany();
  await prisma.scan.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.updateMany({ data: { shopId: null } });
  await prisma.shop.deleteMany();
  await prisma.user.deleteMany();

  // Create owner
  const passwordHash = await bcrypt.hash('password123', 12);

  const owner = await prisma.user.create({
    data: {
      name: 'Rajesh Sharma',
      email: 'rajesh@shopsmart.demo',
      passwordHash,
      role: 'OWNER',
    },
  });

  // Create shop
  const shop = await prisma.shop.create({
    data: {
      name: 'Sharma General Store',
      address: '42, MG Road, Sector 14, Gurgaon 122001',
      phone: '+91 98765 43210',
      ownerId: owner.id,
    },
  });

  // Link owner to shop
  await prisma.user.update({
    where: { id: owner.id },
    data: { shopId: shop.id },
  });

  // Create staff
  const staff = await prisma.user.create({
    data: {
      name: 'Priya Verma',
      email: 'priya@shopsmart.demo',
      passwordHash,
      role: 'STAFF',
      shopId: shop.id,
    },
  });

  console.log('✅ Users created: owner (rajesh@shopsmart.demo) + staff (priya@shopsmart.demo)');
  console.log('   Password for both: password123\n');

  // Create products across categories
  const now = new Date();
  const daysFromNow = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

  const products = await Promise.all([
    // Groceries
    prisma.product.create({ data: { shopId: shop.id, name: 'Tata Salt (1kg)', category: 'Groceries', unitPrice: 28, quantityInStock: 45, reorderThreshold: 15, sku: 'GR001' } }),
    prisma.product.create({ data: { shopId: shop.id, name: 'Fortune Sunflower Oil (1L)', category: 'Groceries', unitPrice: 185, quantityInStock: 20, reorderThreshold: 8, sku: 'GR002' } }),
    prisma.product.create({ data: { shopId: shop.id, name: 'Aashirvaad Atta (5kg)', category: 'Groceries', unitPrice: 295, quantityInStock: 12, reorderThreshold: 5, sku: 'GR003' } }),
    prisma.product.create({ data: { shopId: shop.id, name: 'Toor Dal (1kg)', category: 'Groceries', unitPrice: 165, quantityInStock: 25, reorderThreshold: 10, sku: 'GR004' } }),
    prisma.product.create({ data: { shopId: shop.id, name: 'Basmati Rice (5kg)', category: 'Groceries', unitPrice: 420, quantityInStock: 8, reorderThreshold: 5, sku: 'GR005' } }),
    prisma.product.create({ data: { shopId: shop.id, name: 'MDH Chana Masala (100g)', category: 'Groceries', unitPrice: 72, quantityInStock: 30, reorderThreshold: 12, sku: 'GR006' } }),

    // Beverages
    prisma.product.create({ data: { shopId: shop.id, name: 'Coca-Cola (750ml)', category: 'Beverages', unitPrice: 40, quantityInStock: 48, reorderThreshold: 20, sku: 'BV001', expiryDate: daysFromNow(90) } }),
    prisma.product.create({ data: { shopId: shop.id, name: 'Parle Frooti (200ml) Pack of 6', category: 'Beverages', unitPrice: 60, quantityInStock: 24, reorderThreshold: 10, sku: 'BV002', expiryDate: daysFromNow(45) } }),
    prisma.product.create({ data: { shopId: shop.id, name: 'Red Label Tea (500g)', category: 'Beverages', unitPrice: 285, quantityInStock: 15, reorderThreshold: 5, sku: 'BV003' } }),
    prisma.product.create({ data: { shopId: shop.id, name: 'Nescafe Classic (100g)', category: 'Beverages', unitPrice: 350, quantityInStock: 10, reorderThreshold: 4, sku: 'BV004' } }),

    // Snacks
    prisma.product.create({ data: { shopId: shop.id, name: 'Lays Classic Salted (52g)', category: 'Snacks', unitPrice: 20, quantityInStock: 60, reorderThreshold: 25, sku: 'SN001', expiryDate: daysFromNow(60) } }),
    prisma.product.create({ data: { shopId: shop.id, name: 'Parle-G Biscuits (800g)', category: 'Snacks', unitPrice: 80, quantityInStock: 35, reorderThreshold: 15, sku: 'SN002', expiryDate: daysFromNow(120) } }),
    prisma.product.create({ data: { shopId: shop.id, name: 'Haldiram Bhujia (400g)', category: 'Snacks', unitPrice: 120, quantityInStock: 18, reorderThreshold: 8, sku: 'SN003', expiryDate: daysFromNow(30) } }),
    prisma.product.create({ data: { shopId: shop.id, name: 'Cadbury Dairy Milk (50g)', category: 'Snacks', unitPrice: 50, quantityInStock: 40, reorderThreshold: 15, sku: 'SN004', expiryDate: daysFromNow(150) } }),
    prisma.product.create({ data: { shopId: shop.id, name: 'KitKat (37.3g)', category: 'Snacks', unitPrice: 40, quantityInStock: 30, reorderThreshold: 12, sku: 'SN005', expiryDate: daysFromNow(120) } }),

    // Personal Care
    prisma.product.create({ data: { shopId: shop.id, name: 'Colgate MaxFresh (150g)', category: 'Personal Care', unitPrice: 105, quantityInStock: 22, reorderThreshold: 8, sku: 'PC001', expiryDate: daysFromNow(365) } }),
    prisma.product.create({ data: { shopId: shop.id, name: 'Dove Soap (100g)', category: 'Personal Care', unitPrice: 65, quantityInStock: 30, reorderThreshold: 10, sku: 'PC002' } }),
    prisma.product.create({ data: { shopId: shop.id, name: 'Head & Shoulders Shampoo (180ml)', category: 'Personal Care', unitPrice: 199, quantityInStock: 12, reorderThreshold: 5, sku: 'PC003', expiryDate: daysFromNow(270) } }),
    prisma.product.create({ data: { shopId: shop.id, name: 'Dettol Handwash (200ml)', category: 'Personal Care', unitPrice: 89, quantityInStock: 18, reorderThreshold: 6, sku: 'PC004' } }),
    prisma.product.create({ data: { shopId: shop.id, name: 'Nivea Body Lotion (200ml)', category: 'Personal Care', unitPrice: 245, quantityInStock: 8, reorderThreshold: 4, sku: 'PC005', expiryDate: daysFromNow(180) } }),

    // Stationery
    prisma.product.create({ data: { shopId: shop.id, name: 'Classmate Notebook (200pg)', category: 'Stationery', unitPrice: 70, quantityInStock: 50, reorderThreshold: 20, sku: 'ST001' } }),
    prisma.product.create({ data: { shopId: shop.id, name: 'Reynolds Pen (Pack of 10)', category: 'Stationery', unitPrice: 100, quantityInStock: 25, reorderThreshold: 10, sku: 'ST002' } }),
    prisma.product.create({ data: { shopId: shop.id, name: 'Fevicol (200g)', category: 'Stationery', unitPrice: 62, quantityInStock: 15, reorderThreshold: 5, sku: 'ST003' } }),

    // Household
    prisma.product.create({ data: { shopId: shop.id, name: 'Vim Dishwash Bar (300g)', category: 'Household', unitPrice: 35, quantityInStock: 40, reorderThreshold: 15, sku: 'HH001' } }),
    prisma.product.create({ data: { shopId: shop.id, name: 'Harpic Power Plus (500ml)', category: 'Household', unitPrice: 109, quantityInStock: 14, reorderThreshold: 5, sku: 'HH002' } }),
    prisma.product.create({ data: { shopId: shop.id, name: 'Surf Excel Matic (1kg)', category: 'Household', unitPrice: 225, quantityInStock: 10, reorderThreshold: 4, sku: 'HH003' } }),
    prisma.product.create({ data: { shopId: shop.id, name: 'Lizol Floor Cleaner (500ml)', category: 'Household', unitPrice: 119, quantityInStock: 16, reorderThreshold: 6, sku: 'HH004' } }),

    // Low stock items (for demo)
    prisma.product.create({ data: { shopId: shop.id, name: 'Amul Butter (500g)', category: 'Dairy', unitPrice: 275, quantityInStock: 3, reorderThreshold: 8, sku: 'DY001', expiryDate: daysFromNow(5) } }),
    prisma.product.create({ data: { shopId: shop.id, name: 'Mother Dairy Milk (1L)', category: 'Dairy', unitPrice: 64, quantityInStock: 2, reorderThreshold: 10, sku: 'DY002', expiryDate: daysFromNow(3) } }),
    prisma.product.create({ data: { shopId: shop.id, name: 'Britannia Cheese Slices (200g)', category: 'Dairy', unitPrice: 120, quantityInStock: 1, reorderThreshold: 5, sku: 'DY003', expiryDate: daysFromNow(-2) } }),
  ]);

  console.log(`✅ ${products.length} products created across 7 categories\n`);

  // Create past bills
  const billsData = [
    {
      items: [
        { product: products[0], qty: 2 },
        { product: products[6], qty: 3 },
        { product: products[10], qty: 5 },
      ],
      daysAgo: 6,
      payment: 'cash',
    },
    {
      items: [
        { product: products[2], qty: 1 },
        { product: products[8], qty: 1 },
        { product: products[15], qty: 2 },
      ],
      daysAgo: 5,
      payment: 'upi',
    },
    {
      items: [
        { product: products[1], qty: 1 },
        { product: products[3], qty: 2 },
        { product: products[13], qty: 4 },
        { product: products[23], qty: 2 },
      ],
      daysAgo: 4,
      payment: 'cash',
    },
    {
      items: [
        { product: products[20], qty: 3 },
        { product: products[21], qty: 2 },
        { product: products[11], qty: 1 },
      ],
      daysAgo: 3,
      payment: 'card',
    },
    {
      items: [
        { product: products[4], qty: 1 },
        { product: products[9], qty: 1 },
        { product: products[16], qty: 3 },
        { product: products[24], qty: 1 },
      ],
      daysAgo: 2,
      payment: 'upi',
    },
    {
      items: [
        { product: products[5], qty: 2 },
        { product: products[7], qty: 1 },
        { product: products[12], qty: 1 },
        { product: products[17], qty: 1 },
      ],
      daysAgo: 1,
      payment: 'cash',
    },
    {
      items: [
        { product: products[14], qty: 2 },
        { product: products[18], qty: 1 },
        { product: products[22], qty: 1 },
        { product: products[25], qty: 1 },
      ],
      daysAgo: 1,
      payment: 'upi',
    },
    {
      items: [
        { product: products[0], qty: 1 },
        { product: products[6], qty: 2 },
        { product: products[10], qty: 3 },
        { product: products[13], qty: 2 },
        { product: products[23], qty: 1 },
      ],
      daysAgo: 0,
      payment: 'cash',
    },
  ];

  for (let i = 0; i < billsData.length; i++) {
    const bd = billsData[i];
    const billDate = new Date(now.getTime() - bd.daysAgo * 24 * 60 * 60 * 1000);
    billDate.setHours(10 + i, 30, 0, 0);

    const dateStr = billDate.toISOString().slice(0, 10).replace(/-/g, '');
    const invoiceNumber = `INV-${dateStr}-${String(i + 1).padStart(4, '0')}`;

    let total = 0;
    const items = bd.items.map((item) => {
      const lineTotal = item.qty * Number(item.product.unitPrice);
      total += lineTotal;
      return {
        productId: item.product.id,
        productNameSnapshot: item.product.name,
        quantity: item.qty,
        unitPriceSnapshot: Number(item.product.unitPrice),
        lineTotal,
      };
    });

    await prisma.bill.create({
      data: {
        shopId: shop.id,
        cashierId: i % 2 === 0 ? owner.id : staff.id,
        totalAmount: total,
        paymentMethod: bd.payment,
        status: 'FINALIZED',
        invoiceNumber,
        createdAt: billDate,
        items: { create: items },
      },
    });
  }

  console.log(`✅ ${billsData.length} sample bills created\n`);
  console.log('🎉 Seed complete! You can now log in with:');
  console.log('   Owner: rajesh@shopsmart.demo / password123');
  console.log('   Staff: priya@shopsmart.demo / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
