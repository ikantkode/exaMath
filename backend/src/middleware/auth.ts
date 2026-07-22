import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../index';

export interface AuthUser {
  id: string;
  role: string;
  email: string;
  tenantId?: string;
  tenantRole?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  tenantId?: string;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;

    // Attach full user info
    req.user = decoded;

    // If tenantId is in the token, use it; otherwise resolve from TenantUser
    if (decoded.tenantId) {
      req.tenantId = decoded.tenantId;
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Tenant-aware middleware: ensures all queries are scoped to the user's tenant
export const withTenant = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Tenant can be passed explicitly via query/header, or resolved from token
  req.tenantId = req.query.tenantId as string || req.headers['x-tenant-id'] as string || req.tenantId;

  if (!req.tenantId) {
    // Resolve tenant from TenantUser table — for now, user's first tenant
    // In the future, this could be a multi-tenant switcher
    return res.status(400).json({ error: 'Tenant context required. Provide tenantId in request.' });
  }

  next();
};

// Tenant scoping helper — add tenantId filter to Prisma queries
export function tenantFilter(tenantId: string | undefined) {
  if (!tenantId) return {};
  return { tenantId };
}
