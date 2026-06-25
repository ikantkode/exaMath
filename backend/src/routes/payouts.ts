import { Router } from 'express';
import prisma from '../../prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const payouts = await prisma.payout.findMany({
      orderBy: { date: 'desc' },
    });
    res.json(payouts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payouts' });
  }
});

router.post('/', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const payout = await prisma.payout.create({ data: req.body });
    await logAction(req.user!.id, 'CREATE', 'Payout', payout.id, null, JSON.stringify(req.body));
    res.status(201).json(payout);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create payout' });
  }
});

router.delete('/:id', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    await prisma.payout.delete({ where: { id: req.params.id } });
    await logAction(req.user!.id, 'DELETE', 'Payout', req.params.id, null, null);
    res.json({ message: 'Payout deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete payout' });
  }
});

async function logAction(userId: string, action: string, entity: string, entityId: string | null, oldValue: string | null, newValue: string | null) {
  await prisma.auditLog.create({
    data: { userId, action, entity, entityId, oldValue, newValue },
  });
}

export default router;
