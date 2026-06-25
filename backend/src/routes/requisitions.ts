import { Router } from 'express';
import prisma from '../../prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const requisitions = await prisma.requisition.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(requisitions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch requisitions' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { title, description, amount } = req.body;
    const requisition = await prisma.requisition.create({
      data: { title, description, amount, requestedBy: req.user!.id },
    });
    await logAction(req.user!.id, 'CREATE', 'Requisition', requisition.id, null, JSON.stringify(req.body));
    res.status(201).json(requisition);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create requisition' });
  }
});

router.put('/:id/approve', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const requisition = await prisma.requisition.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED', approvedBy: req.user!.id },
    });
    await logAction(req.user!.id, 'APPROVE', 'Requisition', req.params.id, null, 'APPROVED');
    res.json(requisition);
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve requisition' });
  }
});

router.put('/:id/reject', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const requisition = await prisma.requisition.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', approvedBy: req.user!.id },
    });
    await logAction(req.user!.id, 'REJECT', 'Requisition', req.params.id, null, 'REJECTED');
    res.json(requisition);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject requisition' });
  }
});

router.delete('/:id', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    await prisma.requisition.delete({ where: { id: req.params.id } });
    await logAction(req.user!.id, 'DELETE', 'Requisition', req.params.id, null, null);
    res.json({ message: 'Requisition deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete requisition' });
  }
});

async function logAction(userId: string, action: string, entity: string, entityId: string | null, oldValue: string | null, newValue: string | null) {
  await prisma.auditLog.create({
    data: { userId, action, entity, entityId, oldValue, newValue },
  });
}

export default router;
