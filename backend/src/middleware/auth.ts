import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../../prisma/client';
import { JWT_SECRET } from '../index';

export interface AuthUser {
  id: string;
  role: string;
  email: string;
  tenantId?: string;
  tenantRole?: string;
  isPlatformAdmin?: boolean;
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

    req.user = decoded;

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

    const effectiveRole = req.user.tenantRole || req.user.role;
    if (!roles.includes(effectiveRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const withTenant = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Tenant can be passed explicitly via query/header, or resolved from token
  const requestedTenantId = (req.query.tenantId as string) || (req.headers['x-tenant-id'] as string);
  req.tenantId = requestedTenantId || req.tenantId;

  if (!req.tenantId) {
    return res.status(400).json({ error: 'Tenant context required. Provide tenantId in request.' });
  }

  // Verify the user is a member of the requested tenant
  const tenantUser = await prisma.tenantUser.findFirst({
    where: {
      userId: req.user.id,
      tenantId: req.tenantId,
    },
  });

  if (!tenantUser) {
    return res.status(403).json({ error: 'Access denied to this tenant' });
  }

  // Set the tenant role from TenantUser for authorization
  req.user.tenantId = req.tenantId;
  req.user.tenantRole = tenantUser.role;

  next();
};

// Tenant scoping helper — add tenantId filter to Prisma queries
export function tenantFilter(tenantId: string | undefined) {
  if (!tenantId) return {};
  return { tenantId };
}
