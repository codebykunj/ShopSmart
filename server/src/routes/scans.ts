import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { config } from '../config';
import { authenticate, requireShopAccess } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate, requireShopAccess);

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.upload.dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `scan-${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'Only JPEG, PNG, WebP, and BMP images are allowed') as any);
    }
  },
});

// Simple OCR parsing heuristics
function parseOcrText(rawText: string): {
  headerFields: { shopName?: string; date?: string; billNumber?: string };
  lineItems: Array<{ productName: string; quantity: number; unitPrice: number; confidence: number }>;
  overallConfidence: number;
} {
  const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  const headerFields: { shopName?: string; date?: string; billNumber?: string } = {};
  const lineItems: Array<{ productName: string; quantity: number; unitPrice: number; confidence: number }> = [];

  // Date patterns
  const datePattern = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/;
  // Bill/invoice number patterns
  const billNumPattern = /(?:bill|invoice|receipt|inv|no|#)\s*[:\.\-]?\s*([A-Z0-9\-]+)/i;
  // Price pattern: number with decimal (₹, $, Rs. prefix optional)
  const pricePattern = /(?:₹|rs\.?|\$)?\s*(\d+\.?\d{0,2})\s*$/i;
  // Quantity pattern: number followed by common units or standalone
  const qtyPattern = /(\d+)\s*(?:x|pcs?|nos?|kg|g|l|ml|units?)?\s/i;
  // Line item pattern: some text + number + price-like number
  const lineItemPattern = /^(.+?)\s+(\d+)\s+(?:x\s+)?(?:₹|rs\.?|\$)?\s*(\d+\.?\d{0,2})(?:\s+(?:₹|rs\.?|\$)?\s*(\d+\.?\d{0,2}))?$/i;

  let confidenceSum = 0;
  let itemCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Try to extract header fields from first few lines
    if (i < 5) {
      if (!headerFields.shopName && i === 0) {
        headerFields.shopName = line;
      }

      const dateMatch = line.match(datePattern);
      if (dateMatch && !headerFields.date) {
        headerFields.date = dateMatch[1];
      }

      const billMatch = line.match(billNumPattern);
      if (billMatch && !headerFields.billNumber) {
        headerFields.billNumber = billMatch[1];
      }
    }

    // Try to parse as line item
    const itemMatch = line.match(lineItemPattern);
    if (itemMatch) {
      const productName = itemMatch[1].trim();
      const qty = parseInt(itemMatch[2], 10);
      const price1 = parseFloat(itemMatch[3]);
      const price2 = itemMatch[4] ? parseFloat(itemMatch[4]) : undefined;

      // If two numbers, first is unit price, second is total; otherwise single is unit price
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

// POST /api/scans — upload and process an image
router.post('/', upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError(400, 'No image file uploaded');
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    // Create scan record immediately (pending review)
    const scan = await prisma.scan.create({
      data: {
        originalImageUrl: imageUrl,
        status: 'PENDING_REVIEW',
      },
    });

    // OCR will be done asynchronously — for now, return the scan record
    // The client will poll or the processing will happen inline
    // For MVP: do inline OCR
    let rawText = '';
    let parsed = { headerFields: {}, lineItems: [] as any[], overallConfidence: 0 };

    try {
      // Dynamically import tesseract.js
      const Tesseract = require('tesseract.js');
      const imagePath = path.resolve(config.upload.dir, req.file.filename);

      // Pre-process with sharp
      const sharp = require('sharp');
      const processedPath = imagePath.replace(/(\.\w+)$/, '-processed$1');

      await sharp(imagePath)
        .greyscale()
        .normalize()
        .sharpen()
        .toFile(processedPath);

      const { data } = await Tesseract.recognize(processedPath, 'eng', {
        logger: () => {}, // suppress logs
      });

      rawText = data.text;
      parsed = parseOcrText(rawText);

      // Update scan with results
      await prisma.scan.update({
        where: { id: scan.id },
        data: {
          rawOcrText: rawText,
          parsedJson: parsed as any,
          confidenceScore: parsed.overallConfidence,
        },
      });
    } catch (ocrErr) {
      console.error('[OCR Error]', ocrErr);
      // Still return the scan — user can manually enter items
      await prisma.scan.update({
        where: { id: scan.id },
        data: {
          rawOcrText: 'OCR processing failed — please enter items manually',
          confidenceScore: 0,
        },
      });
    }

    res.status(201).json({
      scan: {
        id: scan.id,
        originalImageUrl: imageUrl,
        rawOcrText: rawText,
        parsed,
        status: 'PENDING_REVIEW',
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/scans/:id/confirm
router.put('/:id/confirm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scan = await prisma.scan.findUnique({ where: { id: req.params.id as string } });

    if (!scan) {
      throw new AppError(404, 'Scan not found');
    }

    if (scan.status !== 'PENDING_REVIEW') {
      throw new AppError(400, 'Scan has already been processed');
    }

    const updated = await prisma.scan.update({
      where: { id: req.params.id as string },
      data: {
        status: 'CONFIRMED',
        billId: req.body.billId || null,
        parsedJson: req.body.correctedData || scan.parsedJson,
      },
    });

    res.json({ scan: updated });
  } catch (err) {
    next(err);
  }
});

// PUT /api/scans/:id/reject
router.put('/:id/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await prisma.scan.update({
      where: { id: req.params.id as string },
      data: { status: 'REJECTED' },
    });

    res.json({ scan: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
