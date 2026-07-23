import { Router } from 'express';
import prisma from '../../prisma/client';
import { authenticate, authorize, AuthRequest, withTenant } from '../middleware/auth';
import { logAction } from '../utils/audit';

const router = Router();

router.get('/', authenticate, withTenant, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const { employeeId, paymentType, paymentMethod, startDate, endDate } = req.query;
    const where: any = { tenantId };
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
router.get('/stats', authenticate, withTenant, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const { employeeId, startDate, endDate } = req.query;
    const where: any = { tenantId };
    if (employeeId) where.employeeId = employeeId as string;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }
     const byType = await prisma.paymentLog.groupBy({
       by: ['paymentType'],
       where,
       _sum: { amountUSD: true },
     });
 
     const byMethod = await prisma.paymentLog.groupBy({
       by: ['paymentMethod'],
       where,
       _sum: { amountUSD: true },
     });
 
     const total = await prisma.paymentLog.aggregate({
       where,
       _sum: { amountUSD: true },
       _count: true,
     });
 
     res.json({
       byType,
       byMethod,
       total: total._sum.amountUSD || 0,
       count: total._count,
     });
 
   } catch (e) { res.status(500).json({ error: 'Failed to fetch stats' }); }
 });
 
// Employee summary with payment totals
router.get('/employees-summary', authenticate, withTenant, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const employees = await prisma.employee.findMany({
      where: { tenantId },
      include: {
        employmentPeriods: {
          include: {
            paymentLogs: true,
          },
        },
      },
    });
 
     const summary = employees.map((emp: any) => ({
        ...emp,
        activePeriod: emp.employmentPeriods.find((p: any) => p.endDate === null) ||
          emp.employmentPeriods[0] || null,
        totalPaid: emp.employmentPeriods.reduce((sum: number, p: any) =>
          sum + p.paymentLogs.reduce((s: number, pl: any) => s + pl.amountUSD, 0), 0),
        paymentCount: emp.employmentPeriods.reduce((sum: number, p: any) =>
          sum + p.paymentLogs.length, 0),
      }));
 
    res.json(summary);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch employee summary' }); }
});
  
router.post('/', authenticate, withTenant, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { employeeId, employmentPeriodId, amount, currency, conversionRate, amountUSD, date, paymentMethod, paymentType, description } = req.body;
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
        currency: currency || 'USD',
        conversionRate: conversionRate ? parseFloat(conversionRate) : null,
        amountUSD: parseFloat(amountUSD),
        date: new Date(date),
        paymentMethod,
        paymentType,
        description: (paymentType === 'OTHER' && description) ? description : null,
        tenantId: req.tenantId!,
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
  
router.delete('/:id', authenticate, withTenant, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const log = await prisma.paymentLog.findFirst({ where: { id, tenantId } });
    if (!log) return res.status(404).json({ error: 'Payment log not found' });
    await prisma.paymentLog.delete({ where: { id } });
    await logAction(req.user!.id, 'DELETE', 'PaymentLog', id);
    res.json({ message: 'Payment log deleted' });
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to delete payment log' }); }
});
  
export default router;
