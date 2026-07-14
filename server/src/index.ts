import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Routes
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import billRoutes from './routes/bills';
import scanRoutes from './routes/scans';
import analyticsRoutes from './routes/analytics';
import shopRoutes from './routes/shop';
import pdfRoutes from './routes/pdf';
import paymentsRoutes from './routes/payments';
import customerRoutes from './routes/customers';
import notificationRoutes from './routes/notifications';
import activityRoutes from './routes/activity';

const app = express();

// Ensure upload directory exists
const uploadDir = path.resolve(config.upload.dir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middleware
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));

// Serve uploaded files
app.use('/uploads', express.static(uploadDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/bills', pdfRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity', activityRoutes);

// Health check
app.get('/api/health', (_req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  console.log(`
  ┌─────────────────────────────────────────┐
  │                                         │
  │   ShopSmart API Server                  │
  │   Running on port ${config.port}                │
  │   Environment: ${config.nodeEnv.padEnd(23)}│
  │                                         │
  └─────────────────────────────────────────┘
  `);
});

export default app;
