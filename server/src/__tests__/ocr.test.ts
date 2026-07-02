import { describe, it, expect } from 'vitest';

// We extract the parsing logic from the route to test it independently
function parseOcrText(rawText: string) {
  const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  const headerFields: { shopName?: string; date?: string; billNumber?: string } = {};
  const lineItems: Array<{ productName: string; quantity: number; unitPrice: number; confidence: number }> = [];

  const datePattern = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/;
  const billNumPattern = /(?:bill|invoice|receipt|inv|no|#)\s*[:\.\-]?\s*([A-Z0-9\-]+)/i;
  const lineItemPattern = /^(.+?)\s+(\d+)\s+(?:x\s+)?(?:₹|rs\.?|\$)?\s*(\d+\.?\d{0,2})(?:\s+(?:₹|rs\.?|\$)?\s*(\d+\.?\d{0,2}))?$/i;

  let confidenceSum = 0;
  let itemCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (i < 5) {
      if (!headerFields.shopName && i === 0) headerFields.shopName = line;
      const dateMatch = line.match(datePattern);
      if (dateMatch && !headerFields.date) headerFields.date = dateMatch[1];
      const billMatch = line.match(billNumPattern);
      if (billMatch && !headerFields.billNumber) headerFields.billNumber = billMatch[1];
    }

    const itemMatch = line.match(lineItemPattern);
    if (itemMatch) {
      const productName = itemMatch[1].trim();
      const qty = parseInt(itemMatch[2], 10);
      const price1 = parseFloat(itemMatch[3]);
      const price2 = itemMatch[4] ? parseFloat(itemMatch[4]) : undefined;
      const unitPrice = price2 ? price1 : price1;
      const confidence = price2 ? 0.85 : 0.7;

      if (productName.length > 0 && qty > 0 && unitPrice > 0) {
        lineItems.push({ productName, quantity: qty, unitPrice, confidence });
        confidenceSum += confidence;
        itemCount++;
      }
    }
  }

  const overallConfidence = itemCount > 0 ? confidenceSum / itemCount : 0.3;
  return { headerFields, lineItems, overallConfidence };
}

describe('OCR Parsing Logic', () => {
  it('should extract header fields from raw text', () => {
    const rawText = `
      SUPER MART
      Date: 12/04/2024
      Invoice No: INV-1002
      Apple 2 50.00 100.00
      Banana 1 20.00 20.00
      Total 120.00
    `;
    const result = parseOcrText(rawText);
    expect(result.headerFields.shopName).toBe('SUPER MART');
    expect(result.headerFields.date).toBe('12/04/2024');
    expect(result.headerFields.billNumber).toBe('INV-1002');
  });

  it('should parse line items with quantity and unit price', () => {
    const rawText = `
      SUPER MART
      Date: 12/04/2024
      Apple 2 50.00 100.00
      Banana 1 20.00
    `;
    const result = parseOcrText(rawText);
    expect(result.lineItems.length).toBe(2);
    expect(result.lineItems[0]).toEqual(expect.objectContaining({
      productName: 'Apple',
      quantity: 2,
      unitPrice: 50.00
    }));
    expect(result.lineItems[1]).toEqual(expect.objectContaining({
      productName: 'Banana',
      quantity: 1,
      unitPrice: 20.00
    }));
  });
});
