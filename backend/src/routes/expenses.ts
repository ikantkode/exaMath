import { Router } from 'express';
import prisma from '../../prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { logAction } from '../utils/audit';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { projectId, categoryId, expenseType } = req.query;
    const where: any = {};
    if (projectId) where.projectId = projectId as string;
    if (categoryId) where.categoryId = categoryId as string;
    if (expenseType) where.expenseType = expenseType as string;

    const expenses = await prisma.expense.findMany({
      where,
      include: { category: true, createdBy: true },
      orderBy: { date: 'desc' },
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

router.post('/', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { amount, currency, conversionRate, description, expenseType, date, categoryId, projectId } = req.body;
    const cleanCurrency = currency || 'USD';
    const rate = cleanCurrency === 'PKR' ? (conversionRate || 0) : 1;
    const amountUSD = cleanCurrency === 'PKR' ? amount * rate : amount;
    const expense = await prisma.expense.create({
      data: {
        amount,
        currency: cleanCurrency,
        conversionRate: cleanCurrency === 'PKR' ? rate : null,
        amountUSD,
        description,
        expenseType,
        date: date ? new Date(date) : new Date(),
        categoryId: categoryId || null,
        projectId,
        createdById: req.user!.id,
      },
    });
    await logAction(req.user!.id, 'CREATE', 'Expense', expense.id, null, JSON.stringify(req.body));
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

router.put('/:id', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const old = await prisma.expense.findUnique({ where: { id: req.params.id } });
    const { amount, currency, conversionRate, description, expenseType, date, categoryId, projectId } = req.body;
    const existing = old as any;
    const cleanCurrency = currency || existing?.currency || 'USD';
    const rate = cleanCurrency === 'PKR' ? (conversionRate || existing?.conversionRate || 0) : 1;
    const amountUSD = cleanCurrency === 'PKR' ? amount * rate : amount;
    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: {
        amount,
        currency: cleanCurrency,
        conversionRate: cleanCurrency === 'PKR' ? rate : null,
        amountUSD,
        description,
        expenseType,
        date: date ? new Date(date) : undefined,
        categoryId: categoryId || null,
        projectId,
      },
    });
    await logAction(req.user!.id, 'UPDATE', 'Expense', req.params.id, JSON.stringify(old), JSON.stringify(req.body));
    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

router.delete('/:id', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    await prisma.expense.delete({ where: { id: req.params.id } });
    await logAction(req.user!.id, 'DELETE', 'Expense', req.params.id, null, null);
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

export default router;
