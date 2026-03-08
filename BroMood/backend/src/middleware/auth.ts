import { Request, Response, NextFunction } from 'express';

const APP_SECRET = process.env.APP_SECRET ?? 'bromood-dev-secret';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const secret = req.headers['x-app-secret'];

  if (!secret || secret !== APP_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
