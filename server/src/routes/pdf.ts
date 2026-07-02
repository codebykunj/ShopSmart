import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireShopAccess } from '../middleware/auth';
import { generateInvoicePdf } from '../services/pdfService';

const router = Router();
router.use(authenticate, requireShopAccess);

// GET /api/bills/:id/pdf
router.get('/:id/pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId!;
    const pdfBuffer = await generateInvoicePdf(req.params.id as string, shopId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${req.params.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

export default router;
