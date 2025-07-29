// src/app.ts
import express, { Application, Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import apiRoutes from './routes';
import { config } from './config';
import { errorHandler, notFoundError } from './middleware/error-handler'

const app: Application = express();

const corsOptions = {
  // The origin is the URL of your frontend application
  origin: 'http://localhost:3000', // 👈 Your Next.js app's URL
  // The HTTP methods you want to allow
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  // The headers you want to allow in requests
  allowedHeaders: ['Content-Type', 'Authorization'],
  // Allow cookies to be sent (if you use them for sessions)
  credentials: true,
};

app.use(cors(corsOptions));

// Security Middleware
app.use(helmet());

// Mount Proxy Routes under /api/gateway
app.use('/api/gateway', apiRoutes);

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


// Not Found Handler for gateway paths
app.use(notFoundError);

app.use((req, res, next) => {
  console.log(`[APP PRE-ROUTER] OriginalURL: ${req.originalUrl}, URL: ${req.url}, BaseURL: ${req.baseUrl}, Path: ${req.path}`);
  next();
});

// Global Error Handler for the gateway itself
app.use(errorHandler);

export default app;