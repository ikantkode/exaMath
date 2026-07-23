import { Router } from 'express';
import prisma from '../../prisma/client';
import { authenticate, authorize, AuthRequest, withTenant } from '../middleware/auth';
import { logAction } from '../utils/audit';

const router = Router();

router.get('/', authenticate, withTenant, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const { projectId, categoryId, expenseType } = req.query;
    const where: any = { tenantId };
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

router.post('/', authenticate, withTenant, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
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
        tenantId: tenantId || req.body.tenantId,
      },
    });
    await logAction(req.user!.id, 'CREATE', 'Expense', expense.id, null, JSON.stringify(req.body));
    res.status(201).json(expense);
  } catch (error: any) {
    console.error('Expense create error:', error.message, error.errors);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

router.put('/:id', authenticate, withTenant, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const old = await prisma.expense.findUnique({ where: { id: req.params.id, tenantId } });
    if (!old) return res.status(404).json({ error: 'Expense not found' });
    
    const { amount, currency, conversionRate, description, expenseType, date, categoryId, projectId } = req.body;
    const cleanCurrency = currency || (old as any)?.currency || 'USD';
    const rate = cleanCurrency === 'PKR' ? (conversionRate || (old as any)?.conversionRate || 0) : 1;
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

router.delete('/:id', authenticate, withTenant, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const expense = await prisma.expense.findUnique({ where: { id: req.params.id, tenantId } });
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    
    await prisma.expense.delete({ where: { id: req.params.id } });
    await logAction(req.user!.id, 'DELETE', 'Expense', req.params.id, null, null);
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

export default router;
