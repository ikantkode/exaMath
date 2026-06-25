import { Router } from 'express';
import prisma from '../../prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const payroll = await prisma.officePayroll.findMany({
      orderBy: { periodEnd: 'desc' },
    });
    res.json(payroll);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch office payroll' });
  }
});

router.post('/', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const payroll = await prisma.officePayroll.create({ data: req.body });
    await logAction(req.user!.id, 'CREATE', 'OfficePayroll', payroll.id, null, JSON.stringify(req.body));
    res.status(201).json(payroll);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create payroll record' });
  }
});

router.put('/:id', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const old = await prisma.officePayroll.findUnique({ where: { id: req.params.id } });
    const payroll = await prisma.officePayroll.update({
      where: { id: req.params.id },
      data: req.body,
    });
    await logAction(req.user!.id, 'UPDATE', 'OfficePayroll', req.params.id, JSON.stringify(old), JSON.stringify(req.body));
    res.json(payroll);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update payroll record' });
  }
});

router.delete('/:id', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    await prisma.officePayroll.delete({ where: { id: req.params.id } });
    await logAction(req.user!.id, 'DELETE', 'OfficePayroll', req.params.id, null, null);
    res.json({ message: 'Payroll record deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete payroll record' });
  }
});

async function logAction(userId: string, action: string, entity: string, entityId: string | null, oldValue: string | null, newValue: string | null) {
  await prisma.auditLog.create({
    data: { userId, action, entity, entityId, oldValue, newValue },
  });
}

export default router;
