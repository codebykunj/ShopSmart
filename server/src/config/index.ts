import dotenv from 'dotenv';
import path from 'path';

// Load .env from server root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// Also load .env from project root (for keys like RAZORPAY that may be defined there)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
  },

  rateLimit: {
    auth: {
      windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10),
      max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '20', 10),
    },
  },
} as const;
