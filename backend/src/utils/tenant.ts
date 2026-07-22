import { AuthRequest } from '../middleware/auth';

// Tenant scoping helper — returns Prisma where clause with tenantId
export function tenantFilter(tenantId: string | undefined) {
  if (!tenantId) return {};
  return { tenantId };
}

// Helper to extract tenantId from request (query param, header, or token)
export function getTenantId(req: AuthRequest): string | undefined {
  return req.query.tenantId as string || req.headers['x-tenant-id'] as string || req.tenantId;
}
