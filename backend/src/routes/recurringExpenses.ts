import { Router } from 'express';
import prisma from '../../prisma/client';
import { authenticate, authorize, AuthRequest, tenantFilter } from '../middleware/auth';
import { logAction } from '../utils/audit';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.query;
    const where: any = { ...tenantFilter(req.tenantId) };
    if (projectId) where.projectId = projectId as string;

    const expenses = await prisma.recurringExpense.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recurring expenses' });
  }
});

router.post('/', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { projectId, name, description, type, amount, currency, conversionRate, frequency } = req.body;
    if (!name || !type || amount === undefined || amount === null) {
      return res.status(400).json({ error: 'Name, type, and amount are required' });
    }
    const cleanCurrency = currency || 'USD';
    const rate = cleanCurrency === 'PKR' ? (conversionRate || 0) : 1;
    const finalAmountUSD = cleanCurrency === 'PKR' ? amount * rate : amount;

    const expense = await prisma.recurringExpense.create({
      data: {
        projectId,
        name,
        description: description || null,
        type,
        amount,
        currency: cleanCurrency,
        conversionRate: cleanCurrency === 'PKR' ? rate : null,
        amountUSD: finalAmountUSD,
        frequency: frequency || 'Monthly',
        tenantId: req.tenantId!,
      },
    });
    await logAction(req.user!.id, 'CREATE', 'RecurringExpense', expense.id, null, JSON.stringify(req.body));
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create recurring expense' });
  }
});

router.put('/:id', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const old = await prisma.recurringExpense.findFirst({ where: { id: req.params.id, ...tenantFilter(req.tenantId) } });
    if (!old) return res.status(404).json({ error: 'Recurring expense not found' });
    const { name, description, type, amount, currency, conversionRate, frequency, isActive } = req.body;
    const existing = old as any;
    const cleanCurrency = currency || existing?.currency || 'USD';
    const rate = cleanCurrency === 'PKR' ? (conversionRate || existing?.conversionRate || 0) : 1;
    const finalAmountUSD = cleanCurrency === 'PKR' ? amount * rate : amount;

    const expense = await prisma.recurringExpense.update({
      where: { id: req.params.id },
      data: {
        name,
        description: description || null,
        type,
        amount,
        currency: cleanCurrency,
        conversionRate: cleanCurrency === 'PKR' ? rate : null,
        amountUSD: finalAmountUSD,
        frequency,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });
    await logAction(req.user!.id, 'UPDATE', 'RecurringExpense', req.params.id, JSON.stringify(old), JSON.stringify(req.body));
    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update recurring expense' });
  }
});

router.delete('/:id', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const expense = await prisma.recurringExpense.findFirst({ where: { id: req.params.id, ...tenantFilter(req.tenantId) } });
    if (!expense) return res.status(404).json({ error: 'Recurring expense not found' });
    await prisma.recurringExpense.delete({ where: { id: req.params.id } });
    await logAction(req.user!.id, 'DELETE', 'RecurringExpense', req.params.id, null, null);
    res.json({ message: 'Recurring expense deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete recurring expense' });
  }
});

export default router;
