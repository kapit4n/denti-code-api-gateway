import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export const notFoundError = (req: Request, res: Response, next: NextFunction) => {
  if (!res.headersSent) {
    res.status(404).json({ message: 'Resource not found on API Gateway.' });
  }
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Gateway global error:', err.stack);
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      message: err.message || 'An unexpected error occurred on the gateway.',
      error: config.nodeEnv === 'development' ? err : undefined,
    });
  }
}
