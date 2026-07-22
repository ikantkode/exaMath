import { Router } from 'express';
import prisma from '../../prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { getTenantId } from '../utils/tenant';

const router = Router();

router.get('/', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = getTenantId(req);
    const tenantFilter = tenantId ? { tenantId } : {};
    
    const logs = await prisma.auditLog.findMany({
      where: tenantFilter,
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { timestamp: 'desc' },
      take: 500,
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
