const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.product.updateMany({
    data: {
      quantityInStock: 100
    }
  });
  console.log('Stock updated successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
