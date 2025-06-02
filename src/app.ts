// src/app.ts
import express, { Application, Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import apiRoutes from './routes'; // Your proxy routes
import { config } from './config';

const app: Application = express();

// Security Middleware
app.use(helmet());

// Body Parsers (Gateway might not need to parse bodies itself if just proxying,
// but useful if you add middleware that needs it before proxying)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger (Global for gateway's own requests, specific proxies have their own)
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Health Check endpoint for the gateway itself
app.get('/api/gateway/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'UP', message: 'Gateway is healthy' });
});

// Mount Proxy Routes under /api/gateway
app.use('/api/gateway', apiRoutes);


// Not Found Handler for gateway paths
app.use((req: Request, res: Response, next: NextFunction) => {
  if (!res.headersSent) {
    res.status(404).json({ message: 'Resource not found on API Gateway.' });
  }
});

app.use((req, res, next) => {
  console.log(`[APP PRE-ROUTER] OriginalURL: ${req.originalUrl}, URL: ${req.url}, BaseURL: ${req.baseUrl}, Path: ${req.path}`);
  next();
});

// Global Error Handler for the gateway itself
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Gateway global error:', err.stack);
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      message: err.message || 'An unexpected error occurred on the gateway.',
      error: config.nodeEnv === 'development' ? err : undefined,
    });
  }
});

export default app;