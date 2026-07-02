import { Request, Response, NextFunction } from 'express';

interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}

export class AppError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
    this.name = 'AppError';
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  // Don't leak stack traces or internal details in production
  const isDev = process.env.NODE_ENV === 'development';

  if (err instanceof AppError) {
    const response: ApiError = {
      status: err.status,
      message: err.message,
    };
    if (err.details && isDev) {
      response.details = err.details;
    }
    res.status(err.status).json(response);
    return;
  }

  // Prisma known request error
  if (err.name === 'PrismaClientKnownRequestError') {
    res.status(400).json({
      status: 400,
      message: 'Database operation failed',
      ...(isDev && { details: err.message }),
    });
    return;
  }

  // Zod validation error
  if (err.name === 'ZodError') {
    res.status(400).json({
      status: 400,
      message: 'Validation failed',
      details: (err as any).errors,
    });
    return;
  }

  // Unexpected error
  console.error('[Unexpected Error]', err);
  res.status(500).json({
    status: 500,
    message: isDev ? err.message : 'Internal server error',
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    status: 404,
    message: `Route ${req.method} ${req.path} not found`,
  });
}
