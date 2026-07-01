import { Router } from 'express';
import prisma from '../../prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { logAction } from '../utils/audit';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { employeeId, paymentType, paymentMethod, startDate, endDate } = req.query;
    const where: any = {};
    if (employeeId) where.employeeId = employeeId as string;
    if (paymentType) where.paymentType = paymentType as string;
    if (paymentMethod) where.paymentMethod = paymentMethod as string;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const logs = await prisma.paymentLog.findMany({
      where,
      include: {
        employee: true,
        employmentPeriod: true,
      },
      orderBy: { date: 'desc' },
    });
    res.json(logs);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch payment logs' }); }
});

// Stats endpoint
router.get('/stats', authenticate, async (req: AuthRequest, res) => {
  try {
    const { employeeId, startDate, endDate } = req.query;
    const where: any = {};
    if (employeeId) where.employeeId = employeeId as string;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const byType = await prisma.paymentLog.groupBy({
      by: ['paymentType'],
      where,
      _sum: { amount: true },
    });

    const byMethod = await prisma.paymentLog.groupBy({
      by: ['paymentMethod'],
      where,
      _sum: { amount: true },
    });

    const total = await prisma.paymentLog.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
    });

    res.json({
      byType,
      byMethod,
      total: total._sum.amount || 0,
      count: total._count,
    });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch stats' }); }
});

// Employee summary with payment totals
router.get('/employees-summary', authenticate, async (_req: AuthRequest, res) => {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        employmentPeriods: {
          include: {
            paymentLogs: true,
          },
        },
      },
    });

    const summary = employees.map(emp => ({
      ...emp,
      activePeriod: emp.employmentPeriods.find((p: any) => p.endDate === null) ||
        emp.employmentPeriods[0] || null,
      totalPaid: emp.employmentPeriods.reduce((sum: number, p: any) =>
        sum + p.paymentLogs.reduce((s: number, pl: any) => s + pl.amount, 0), 0),
      paymentCount: emp.employmentPeriods.reduce((sum: number, p: any) =>
        sum + p.paymentLogs.length, 0),
    }));

    res.json(summary);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch employee summary' }); }
});

router.post('/', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { employeeId, employmentPeriodId, amount, date, paymentMethod, paymentType, description } = req.body;
    if (!employeeId || amount === undefined || !date || !paymentMethod || !paymentType) {
      return res.status(400).json({ error: 'Employee, amount, date, payment method, and payment type are required' });
    }
    if (paymentType === 'OTHER' && !description) {
      return res.status(400).json({ error: 'Description is required when payment type is Other' });
    }

    const paymentLog = await prisma.paymentLog.create({
      data: {
        employeeId,
        employmentPeriodId: employmentPeriodId || null,
        amount: parseFloat(amount),
        date: new Date(date),
        paymentMethod,
        paymentType,
        description: (paymentType === 'OTHER' && description) ? description : null,
      },
      include: {
        employee: true,
        employmentPeriod: true,
      },
    });
    await logAction(req.user!.id, 'CREATE', 'PaymentLog', paymentLog.id);
    res.status(201).json(paymentLog);
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to create payment log' }); }
});

router.delete('/:id', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.paymentLog.delete({ where: { id } });
    await logAction(req.user!.id, 'DELETE', 'PaymentLog', id);
    res.json({ message: 'Payment log deleted' });
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to delete payment log' }); }
});

export default router;
