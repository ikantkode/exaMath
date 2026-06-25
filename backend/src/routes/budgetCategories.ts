import { Router } from 'express';
import prisma from '../../prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { name, budget, projectId } = req.body;
    const category = await prisma.budgetCategory.create({
      data: { name, budget, projectId },
    });
    await logAction(req.user!.id, 'CREATE', 'BudgetCategory', category.id, null, JSON.stringify(req.body));
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create budget category' });
  }
});

router.put('/:id', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const old = await prisma.budgetCategory.findUnique({ where: { id: req.params.id } });
    const category = await prisma.budgetCategory.update({
      where: { id: req.params.id },
      data: req.body,
    });
    await logAction(req.user!.id, 'UPDATE', 'BudgetCategory', req.params.id, JSON.stringify(old), JSON.stringify(req.body));
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update budget category' });
  }
});

router.delete('/:id', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    await prisma.budgetCategory.delete({ where: { id: req.params.id } });
    await logAction(req.user!.id, 'DELETE', 'BudgetCategory', req.params.id, null, null);
    res.json({ message: 'Budget category deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete budget category' });
  }
});

async function logAction(userId: string, action: string, entity: string, entityId: string | null, oldValue: string | null, newValue: string | null) {
  await prisma.auditLog.create({
    data: { userId, action, entity, entityId, oldValue, newValue },
  });
}

export default router;
