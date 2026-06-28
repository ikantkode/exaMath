import { Router } from 'express';
import prisma from '../../prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
const logAction = async (userId: string, action: string, entity: string, entityId?: string) => {
  await prisma.auditLog.create({ data: { userId, action, entity, entityId } });
};

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const payroll = await prisma.officePayroll.findMany({
      include: { employee: true },
      orderBy: { periodEnd: 'desc' },
    });
    res.json(payroll);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch office payroll' }); }
});

router.post('/', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { employeeId, grossPay, wages, benefits, taxes, deductions, netPay, periodStart, periodEnd, paid } = req.body;
    if (!employeeId || grossPay === undefined || !periodStart || !periodEnd) return res.status(400).json({ error: 'Employee, gross pay, and period dates are required' });
    const payroll = await prisma.officePayroll.create({
      data: { employeeId, grossPay, wages: wages || 0, benefits: benefits || 0, taxes: taxes || 0, deductions: deductions || 0, netPay, periodStart, periodEnd, paid: paid || false },
    });
    await logAction(req.user!.id, 'CREATE', 'OfficePayroll', payroll.id);
    res.status(201).json(payroll);
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to create payroll record' }); }
});

router.put('/:id', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const payroll = await prisma.officePayroll.findUnique({ where: { id } });
    if (!payroll) return res.status(404).json({ error: 'Payroll record not found' });
    const updated = await prisma.officePayroll.update({ where: { id }, data: req.body });
    await logAction(req.user!.id, 'UPDATE', 'OfficePayroll', id);
    res.json(updated);
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to update payroll record' }); }
});

router.delete('/:id', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.officePayroll.delete({ where: { id } });
    await logAction(req.user!.id, 'DELETE', 'OfficePayroll', id);
    res.json({ message: 'Payroll record deleted' });
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to delete payroll record' }); }
});

export default router;
