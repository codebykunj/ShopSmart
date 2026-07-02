import PDFDocument from 'pdfkit';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

interface BillForPdf {
  id: string;
  invoiceNumber: string | null;
  totalAmount: any;
  paymentMethod: string;
  createdAt: Date;
  items: Array<{
    productNameSnapshot: string;
    quantity: number;
    unitPriceSnapshot: any;
    lineTotal: any;
  }>;
  cashier: { name: string };
  shop: {
    name: string;
    address: string | null;
    phone: string | null;
  };
}

export async function generateInvoicePdf(billId: string, shopId: string): Promise<Buffer> {
  const bill = await prisma.bill.findFirst({
    where: { id: billId, shopId },
    include: {
      items: true,
      cashier: { select: { name: true } },
      shop: { select: { name: true, address: true, phone: true } },
    },
  });

  if (!bill) {
    throw new AppError(404, 'Bill not found');
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [226.77, 600], // ~80mm thermal receipt width
      margins: { top: 20, bottom: 20, left: 15, right: 15 },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = 226.77 - 30; // minus margins

    // Header — Shop name
    doc.fontSize(14).font('Helvetica-Bold')
      .text(bill.shop.name, { align: 'center' });

    if (bill.shop.address) {
      doc.fontSize(7).font('Helvetica')
        .text(bill.shop.address, { align: 'center' });
    }

    if (bill.shop.phone) {
      doc.fontSize(7).font('Helvetica')
        .text(`Tel: ${bill.shop.phone}`, { align: 'center' });
    }

    // Divider
    doc.moveDown(0.3);
    doc.moveTo(15, doc.y).lineTo(15 + pageWidth, doc.y).dash(2, { space: 2 }).stroke();
    doc.undash();
    doc.moveDown(0.3);

    // Invoice details
    doc.fontSize(8).font('Helvetica');
    doc.text(`Invoice: ${bill.invoiceNumber || 'N/A'}`);
    doc.text(`Date: ${bill.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`);
    doc.text(`Time: ${bill.createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`);
    doc.text(`Cashier: ${bill.cashier.name}`);
    doc.text(`Payment: ${bill.paymentMethod.toUpperCase()}`);

    if (bill.customerName) {
      doc.text(`Customer: ${bill.customerName}`);
    }
    if (bill.customerMobile) {
      doc.text(`Mobile: ${bill.customerMobile}`);
    }

    // Divider
    doc.moveDown(0.3);
    doc.moveTo(15, doc.y).lineTo(15 + pageWidth, doc.y).dash(2, { space: 2 }).stroke();
    doc.undash();
    doc.moveDown(0.3);

    // Column headers
    const colItem = 15;
    const colQty = 115;
    const colPrice = 145;
    const colTotal = 175;

    doc.fontSize(7).font('Helvetica-Bold');
    doc.text('Item', colItem, doc.y, { width: 95 });
    const headerY = doc.y - doc.currentLineHeight();
    doc.text('Qty', colQty, headerY, { width: 25, align: 'right' });
    doc.text('Price', colPrice, headerY, { width: 30, align: 'right' });
    doc.text('Total', colTotal, headerY, { width: 37, align: 'right' });
    doc.moveDown(0.3);

    // Thin line
    doc.moveTo(15, doc.y).lineTo(15 + pageWidth, doc.y).lineWidth(0.5).stroke();
    doc.moveDown(0.2);

    // Line items
    doc.fontSize(7).font('Helvetica');
    for (const item of bill.items) {
      const y = doc.y;
      const name = item.productNameSnapshot.length > 18
        ? item.productNameSnapshot.substring(0, 18) + '..'
        : item.productNameSnapshot;

      doc.text(name, colItem, y, { width: 95 });
      doc.text(String(item.quantity), colQty, y, { width: 25, align: 'right' });
      doc.text(Number(item.unitPriceSnapshot).toFixed(2), colPrice, y, { width: 30, align: 'right' });
      doc.text(Number(item.lineTotal).toFixed(2), colTotal, y, { width: 37, align: 'right' });
      doc.moveDown(0.2);
    }

    // Total divider
    doc.moveDown(0.2);
    doc.moveTo(15, doc.y).lineTo(15 + pageWidth, doc.y).dash(2, { space: 2 }).stroke();
    doc.undash();
    doc.moveDown(0.3);

    // Total row
    doc.fontSize(10).font('Helvetica-Bold');
    const totalY = doc.y;
    doc.text('TOTAL', colItem, totalY, { width: 95 });
    doc.text(`Rs. ${Number(bill.totalAmount).toFixed(2)}`, colTotal - 15, totalY, { width: 52, align: 'right' }); // Shifted left to fit total properly

    // Footer
    doc.moveDown(0.5);
    doc.moveTo(15, doc.y).lineTo(15 + pageWidth, doc.y).dash(2, { space: 2 }).stroke();
    doc.undash();
    doc.moveDown(0.3);

    doc.fontSize(7).font('Helvetica')
      .text('Thank you for shopping with us! Powered by ShopSmart', 15, doc.y, { align: 'center', width: pageWidth });

    doc.end();
  });
}
