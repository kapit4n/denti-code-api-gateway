import { Router, Request, Response } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { config } from '../config';
import morgan from 'morgan';
import { IncomingMessage } from 'http';

interface ProxyOptions extends Options {
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent';
  onError?: (err: Error, req: Request, res: Response) => void;
  pathRewrite: (path: string, req: IncomingMessage) => string;
}

const router = Router();

// Proxy options helper
const createProxyOptions = (
  target: string | undefined,
  rewritePrefix: string // The prefix the target service expects (e.g., '/api/patients', '/api/v1/doctors')
): ProxyOptions => {
  if (!target) {
    // This case should ideally be caught on startup if a service URL is missing
    console.error(`ERROR: Target service URL is undefined for rewritePrefix: ${rewritePrefix}. Proxy will not be configured.`);
    // Return a dummy middleware or handle appropriately, though throwing on startup is better
    // For now, let's assume target is always defined due to startup checks or env validation
    // If it could be undefined at runtime and you want to handle it gracefully:
    // return (req, res, next) => {
    //   res.status(503).json({ message: `Service for ${rewritePrefix} is not configured.`});
    // };
    // However, http-proxy-middleware expects a valid target if it's used.
    // For robustness, ensure config.services.* are validated on startup.
    // Let's proceed assuming target is valid here.
  }
  return {
    target,
    changeOrigin: true,
    pathRewrite: (path: string, req: IncomingMessage) => {
      const originalUrl = (req as any).originalUrl ?? path;
      const newPath = rewritePrefix + path;

      if (config.nodeEnv === 'development') {
        console.log(`[GW] Proxying '${originalUrl}' to '${target}${newPath}'`);
      }

      return newPath;
    },
    logLevel: config.nodeEnv === 'development' ? 'debug' : 'info',
    onError: (err: Error, req: Request, res: Response) => {
      console.error(`[GW] Proxy error for ${req.method} ${req.originalUrl}:`, err.message);
      // Ensure types for res.writeHead and res.end
      const response = res as import('http').ServerResponse;
      if (!response.headersSent) {
        response.writeHead(503, { 'Content-Type': 'application/json' }); // 503 Service Unavailable
      }
      if (!response.writableEnded) {
        response.end(JSON.stringify({ message: 'Error connecting to the downstream service.' }));
      }
    },
  };
};

// --- Patient Management Service Proxy ---
// Client calls: GET /api/gateway/patients/:id
// Proxies to: PATIENT_SERVICE_URL/api/patients/:id
if (config.services.patients) {
  router.use(
    '/patients',
    morgan('dev'), // Request logging for this specific proxy
    createProxyMiddleware(
      createProxyOptions(config.services.patients, '/api/patients')
    )
  );
}

// --- Clinic & Provider Management Service Proxies ---
// Client calls: GET /api/gateway/doctors
// Proxies to: CLINIC_PROVIDER_SERVICE_URL/api/v1/doctors
if (config.services.clinic) {
  router.use(
    '/doctors',
    morgan('dev'),
    createProxyMiddleware(
      createProxyOptions(config.services.clinic, '/api/v1/doctors')
    )
  );

  // Client calls: GET /api/gateway/specializations
  // Proxies to: CLINIC_PROVIDER_SERVICE_URL/api/v1/specializations
  router.use(
    '/specializations',
    morgan('dev'),
    createProxyMiddleware(
      createProxyOptions(config.services.clinic, '/api/v1/specializations')
    )
  );

  // Client calls: GET /api/gateway/procedures/categories
  // Proxies to: CLINIC_PROVIDER_SERVICE_URL/api/v1/procedures/categories
  router.use(
    '/procedures/categories',
    morgan('dev'),
    createProxyMiddleware(
      createProxyOptions(config.services.clinic, '/api/v1/procedures/categories')
    )
  );

  // Client calls: GET /api/gateway/procedures/types
  // Proxies to: CLINIC_PROVIDER_SERVICE_URL/api/v1/procedures/types
  router.use(
    '/procedures/types',
    morgan('dev'),
    createProxyMiddleware(
      createProxyOptions(config.services.clinic, '/api/v1/procedures/types')
    )
  );
}


// --- Appointments & Clinical Records Service Proxies ---
// Client calls: POST /api/gateway/appointments
// Proxies to: APPOINTMENTS_RECORDS_SERVICE_URL/api/v1/appointments
if (config.services.appointments) {
  router.use(
    '/appointments',
    morgan('dev'),
    createProxyMiddleware(
      createProxyOptions(config.services.appointments, '/api/v1/appointments')
    )
  );

  // Client calls: POST /api/gateway/appointments/:appointmentId/actions
  // Proxies to: APPOINTMENTS_RECORDS_SERVICE_URL/api/v1/appointments/:appointmentId/actions
  // Note: http-proxy-middleware handles dynamic parts of the path automatically.
  // The pathRewrite for '/actions' ensures that if client calls /api/gateway/actions, it's also routed.
  router.use(
    '/actions', // This will catch /api/gateway/actions/*
    morgan('dev'),
    createProxyMiddleware(
      createProxyOptions(config.services.appointments, '/api/v1/actions')
    )
  );

  router.use((req, res, next) => {
    console.log(`[APIROUTES PRE-PROXY] OriginalURL: ${req.originalUrl}, URL: ${req.url}, BaseURL: ${req.baseUrl}, Path: ${req.path}`);
    next();
  });
}


export default router;