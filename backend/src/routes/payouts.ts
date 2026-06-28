import { Router } from 'express';
import prisma from '../../prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { logAction } from '../utils/audit';

const router = Router();

router.get('/', authenticate, authorize('OWNER', 'MANAGER'), async (_req: AuthRequest, res) => {
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

router.put('/:id', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const old = await prisma.payout.findUnique({ where: { id: req.params.id } });
    const payout = await prisma.payout.update({
      where: { id: req.params.id },
      data: req.body,
    });
    await logAction(req.user!.id, 'UPDATE', 'Payout', req.params.id, JSON.stringify(old), JSON.stringify(req.body));
    res.json(payout);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update payout' });
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

export default router;
