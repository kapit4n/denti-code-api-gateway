import { Request, Response, NextFunction } from 'express'
import axios from 'axios'
import { config } from '../config'

interface AuthResponse {
  active: boolean;
  userId?: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'UnAuthorized: Missing or invalid token format.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  if (!config.services.auth) {
    console.error('Auth Service URL is not configured.');
    res.status(503).json({ message: 'Service Unavailable: Auth service not configured.'});
    return;
  }

  try {
    const introspectionUrl = `${config.services.auth}/auth/introspect`;

    const response = await axios.post<AuthResponse>(introspectionUrl, { token });
    const authData = response.data;

    if (authData  && authData.active) {
      req.headers['x-user-id'] = authData.userId || '';
      req.headers['x-user-email'] = authData.email || '';
      req.headers['x-user-roles'] = (authData.roles || []).join(',');

      next();
    } else {
      res.status(401).json({ message: 'Unauthorized: Invalid or inactive token.' });
    }
  } catch (error ){
    console.error('Auth Introspection Error:', error);
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      res.status(401).json({ message: 'Unauthorized: Token validation failed'});
    }
    res.status(503).json({ message: 'Service Unavailable: Could not connect to authentication service.'})
  }
}