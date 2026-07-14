import prisma from '../config/database';

interface ScannedProductItem {
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
  sku?: string;
  expiryDate?: string;
  include: boolean;
  updatePriceIfExists: boolean;
}

interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  details: Array<{ name: string; action: 'created' | 'updated' | 'skipped'; newStock?: number }>;
}

/**
 * Parse supplier/wholesale bill OCR text into product items.
 * Supplier bills typically have: product name, qty, rate/MRP, amount, HSN, batch, etc.
 */
export function parseSupplierBill(rawText: string): {
  supplierInfo: { name?: string; invoiceNo?: string; date?: string };
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    confidence: number;
  }>;
  overallConfidence: number;
} {
  const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  const supplierInfo: { name?: string; invoiceNo?: string; date?: string } = {};
  const items: Array<{ name: string; quantity: number; unitPrice: number; confidence: number }> = [];

  // Date patterns
  const datePattern = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/;
  // Invoice/bill number
  const invoicePattern = /(?:invoice|inv|bill|receipt|no|ref|#)\s*[:\.\-]?\s*([A-Z0-9\-\/]+)/i;
  
  // Supplier bill line item patterns (more flexible than sales receipt)
  // Pattern: ProductName  Qty  Rate  Amount
  const lineItemPatterns = [
    // name  qty  rate  amount (4 columns)
    /^(.+?)\s+(\d+(?:\.\d+)?)\s+(?:₹|rs\.?|\$)?\s*(\d+(?:\.\d{0,2})?)\s+(?:₹|rs\.?|\$)?\s*(\d+(?:\.\d{0,2})?)$/i,
    // name  qty x rate
    /^(.+?)\s+(\d+)\s*[xX×]\s*(?:₹|rs\.?|\$)?\s*(\d+(?:\.\d{0,2})?)$/i,
    // name  qty  rate (3 columns)
    /^(.+?)\s+(\d+(?:\.\d+)?)\s+(?:₹|rs\.?|\$)?\s*(\d+(?:\.\d{0,2})?)$/i,
  ];

  let confidenceSum = 0;
  let itemCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Extract header info from first few lines
    if (i < 5) {
      if (!supplierInfo.name && i === 0) {
        supplierInfo.name = line;
      }
      const dateMatch = line.match(datePattern);
      if (dateMatch && !supplierInfo.date) {
        supplierInfo.date = dateMatch[1];
      }
      const invMatch = line.match(invoicePattern);
      if (invMatch && !supplierInfo.invoiceNo) {
        supplierInfo.invoiceNo = invMatch[1];
      }
    }

    // Skip header-like lines
    if (/^(sr|s\.?no|item|product|description|particular|qty|rate|amount|total|sub|grand|gst|tax|hsn|batch)/i.test(line)) {
      continue;
    }
    // Skip total lines
    if (/^(total|sub[\s-]?total|grand[\s-]?total|net|round|discount)/i.test(line)) {
      continue;
    }

    // Try each pattern
    for (const pattern of lineItemPatterns) {
      const match = line.match(pattern);
      if (match) {
        const productName = match[1].trim()
          .replace(/\s+/g, ' ')  // normalize whitespace
          .replace(/^\d+[\.\)]\s*/, ''); // remove leading serial number

        const qty = parseFloat(match[2]);
        const rate = parseFloat(match[3]);

        if (productName.length > 1 && qty > 0 && rate > 0 && productName.length < 100) {
          // Avoid duplicating if we already have this item
          const existing = items.find(
            (it) => it.name.toLowerCase() === productName.toLowerCase()
          );
          if (!existing) {
            const confidence = match[4] ? 0.85 : 0.7; // higher if we got the amount column
            items.push({ name: productName, quantity: Math.round(qty), unitPrice: rate, confidence });
            confidenceSum += confidence;
            itemCount++;
          }
        }
        break; // matched this line, move to next
      }
    }
  }

  const overallConfidence = itemCount > 0 ? confidenceSum / itemCount : 0.3;

  return { supplierInfo, items, overallConfidence };
}

/**
 * Bulk import products into a shop.
 * - Case-insensitive exact name match for existing products
 * - Creates new products for unmatched items
 * - Updates stock quantity for matched items
 */
export async function bulkImportProducts(
  shopId: string,
  items: ScannedProductItem[]
): Promise<ImportResult> {
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, details: [] };

  const includedItems = items.filter((item) => item.include);

  if (includedItems.length === 0) {
    return result;
  }

  return prisma.$transaction(async (tx: any) => {
    // Fetch all existing products for this shop for matching
    const existingProducts = await tx.product.findMany({
      where: { shopId },
      select: { id: true, name: true, quantityInStock: true, unitPrice: true, costPrice: true },
    });

    // Build a case-insensitive lookup map
    const productMap = new Map<string, typeof existingProducts[0]>();
    for (const p of existingProducts) {
      productMap.set(p.name.toLowerCase().trim(), p);
    }

    for (const item of includedItems) {
      if (!item.name || item.quantity <= 0) {
        result.skipped++;
        result.details.push({ name: item.name || 'Unknown', action: 'skipped' });
        continue;
      }

      const key = item.name.toLowerCase().trim();
      const existing = productMap.get(key);

      if (existing) {
        // Update existing product — add to stock
        const newStock = existing.quantityInStock + item.quantity;
        const updateData: any = {
          quantityInStock: newStock,
        };

        // Update prices if user toggled it
        if (item.updatePriceIfExists) {
          if (item.unitPrice > 0) updateData.unitPrice = item.unitPrice;
          if (item.costPrice && item.costPrice > 0) updateData.costPrice = item.costPrice;
        }

        // Always update cost price if provided and not set yet
        if (item.costPrice && item.costPrice > 0 && !existing.costPrice) {
          updateData.costPrice = item.costPrice;
        }

        await tx.product.update({
          where: { id: existing.id },
          data: updateData,
        });

        result.updated++;
        result.details.push({ name: item.name, action: 'updated', newStock });
      } else {
        // Create new product
        await tx.product.create({
          data: {
            shopId,
            name: item.name,
            category: item.category || 'General',
            unitPrice: item.unitPrice,
            costPrice: item.costPrice || null,
            quantityInStock: item.quantity,
            reorderThreshold: 10,
            sku: item.sku || null,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          },
        });

        result.created++;
        result.details.push({ name: item.name, action: 'created', newStock: item.quantity });
      }
    }

    return result;
  });
}
