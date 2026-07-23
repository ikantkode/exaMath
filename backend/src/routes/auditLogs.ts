import { Router } from 'express';
import prisma from '../../prisma/client';
import { authenticate, authorize, AuthRequest, withTenant } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, withTenant, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    
    const logs = await prisma.auditLog.findMany({
      where: { tenantId },
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
