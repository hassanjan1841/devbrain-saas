import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { apiEnv } from '../env.js';
import { fail } from '../utils.js';
import type { AuthenticatedRequest } from '../types.js';

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    const result = fail('Missing or invalid Authorization header.', 401);
    return res.status(result.status).json(result.body);
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    const decoded = jwt.verify(token, apiEnv.jwtSecret) as { userId: string; email: string };
    req.user = decoded;
    next();
  } catch {
    const result = fail('Invalid or expired token.', 401);
    return res.status(result.status).json(result.body);
  }
}
