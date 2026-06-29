import { Router } from 'express';
import prisma from '../../prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { logAction } from '../utils/audit';

const router = Router();

// --- SOV Routes ---

// Get all SOVs for a project
router.get('/project/:projectId', authenticate, async (req: AuthRequest, res) => {
  try {
    const sovs = await prisma.scheduleOfValue.findMany({
      where: { projectId: req.params.projectId },
      include: { items: { orderBy: { itemNumber: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(sovs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schedules of values' });
  }
});

// Create SOV for a project (single SOV per project enforced)
router.post('/project/:projectId', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.scheduleOfValue.findFirst({ where: { projectId: req.params.projectId } });
    if (existing) return res.status(409).json({ error: 'Project already has a Schedule of Values' });

    const { name, items } = req.body;
    const totalValue = items ? items.reduce((sum: number, item: any) => sum + (item.value || 0), 0) : 0;
    const sov = await prisma.scheduleOfValue.create({
      data: {
        projectId: req.params.projectId,
        name: name || 'Schedule of Values',
        totalValue,
        items: items ? { create: items } : undefined,
      },
      include: { items: true },
    });
    await logAction(req.user!.id, 'CREATE', 'ScheduleOfValue', sov.id);
    res.status(201).json(sov);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create schedule of value' });
  }
});

// Get single SOV with items
router.get('/sov/:sovId', authenticate, async (req: AuthRequest, res) => {
  try {
    const sov = await prisma.scheduleOfValue.findUnique({
      where: { id: req.params.sovId },
      include: {
        items: { orderBy: { itemNumber: 'asc' } },
        changeOrders: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!sov) return res.status(404).json({ error: 'Schedule of Value not found' });
    res.json(sov);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schedule of value' });
  }
});

// Update SOV name (only in DRAFT)
router.put('/sov/:sovId', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const sov = await prisma.scheduleOfValue.findUnique({ where: { id: req.params.sovId } });
    if (!sov) return res.status(404).json({ error: 'Not found' });
    if (sov.status !== 'DRAFT') return res.status(400).json({ error: 'Cannot update locked SOV' });
    const updated = await prisma.scheduleOfValue.update({
      where: { id: req.params.sovId },
      data: { name: req.body.name },
    });
    await logAction(req.user!.id, 'UPDATE', 'ScheduleOfValue', req.params.sovId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update schedule of value' });
  }
});

// Submit SOV for approval
router.post('/sov/:sovId/submit', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const sov = await prisma.scheduleOfValue.findUnique({ where: { id: req.params.sovId } });
    if (!sov) return res.status(404).json({ error: 'Not found' });
    if (sov.status !== 'DRAFT') return res.status(400).json({ error: 'Only drafts can be submitted' });
    const updated = await prisma.scheduleOfValue.update({
      where: { id: req.params.sovId },
      data: { status: 'SUBMITTED' },
    });
    await logAction(req.user!.id, 'SUBMIT', 'ScheduleOfValue', req.params.sovId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit schedule of value' });
  }
});

// Approve SOV (locks it)
router.post('/sov/:sovId/approve', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const sov = await prisma.scheduleOfValue.findUnique({ where: { id: req.params.sovId } });
    if (!sov) return res.status(404).json({ error: 'Not found' });
    if (sov.status !== 'SUBMITTED') return res.status(400).json({ error: 'Only submitted SOVs can be approved' });
    const updated = await prisma.scheduleOfValue.update({
      where: { id: req.params.sovId },
      data: { status: 'LOCKED', approvedBy: req.user!.id, approvedAt: new Date() },
    });
    await logAction(req.user!.id, 'APPROVE', 'ScheduleOfValue', req.params.sovId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve schedule of value' });
  }
});

// Revert SOV to draft (only OWNER)
router.post('/sov/:sovId/revert', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const sov = await prisma.scheduleOfValue.findUnique({ where: { id: req.params.sovId } });
    if (!sov) return res.status(404).json({ error: 'Not found' });
    if (sov.status === 'DRAFT') return res.status(400).json({ error: 'Already a draft' });
    const updated = await prisma.scheduleOfValue.update({
      where: { id: req.params.sovId },
      data: { status: 'DRAFT', approvedBy: null, approvedAt: null },
    });
    await logAction(req.user!.id, 'REVERT', 'ScheduleOfValue', req.params.sovId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to revert schedule of value' });
  }
});

// Delete SOV (only DRAFT)
router.delete('/sov/:sovId', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const sov = await prisma.scheduleOfValue.findUnique({ where: { id: req.params.sovId } });
    if (!sov) return res.status(404).json({ error: 'Not found' });
    if (sov.status !== 'DRAFT') return res.status(400).json({ error: 'Cannot delete non-draft SOV' });
    await prisma.scheduleOfValue.delete({ where: { id: req.params.sovId } });
    await logAction(req.user!.id, 'DELETE', 'ScheduleOfValue', req.params.sovId);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete schedule of value' });
  }
});

// Upsert an item in an SOV
router.put('/sov/:sovId/items/:itemId', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const sov = await prisma.scheduleOfValue.findUnique({ where: { id: req.params.sovId } });
    if (!sov) return res.status(404).json({ error: 'Not found' });
    if (sov.status !== 'DRAFT') return res.status(400).json({ error: 'Cannot edit locked SOV' });

    const { itemNumber, csiCode, csiCodeTitle, description, value } = req.body;
    let item = await prisma.sovItem.findUnique({ where: { id: req.params.itemId } });
    if (item && item.sovId !== req.params.sovId) return res.status(400).json({ error: 'Item not in this SOV' });

    if (item) {
      item = await prisma.sovItem.update({
        where: { id: req.params.itemId },
        data: { itemNumber, csiCode, csiCodeTitle, description, value },
      });
    } else {
      item = await prisma.sovItem.create({
        data: { sovId: req.params.sovId, itemNumber, csiCode, csiCodeTitle, description, value },
      });
    }

    const totalValue = await prisma.sovItem.aggregate({
      where: { sovId: req.params.sovId },
      _sum: { value: true },
    });
    await prisma.scheduleOfValue.update({
      where: { id: req.params.sovId },
      data: { totalValue: totalValue._sum.value || 0 },
    });

    await logAction(req.user!.id, 'UPDATE', 'SovItem', item.id);
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Create new item
router.post('/sov/:sovId/items', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const sov = await prisma.scheduleOfValue.findUnique({ where: { id: req.params.sovId } });
    if (!sov) return res.status(404).json({ error: 'Not found' });
    if (sov.status !== 'DRAFT') return res.status(400).json({ error: 'Cannot add items to locked SOV' });

    const nextNum = await prisma.sovItem.aggregate({
      where: { sovId: req.params.sovId },
      _max: { itemNumber: true },
    });

    const item = await prisma.sovItem.create({
      data: {
        sovId: req.params.sovId,
        itemNumber: (nextNum._max.itemNumber || 0) + 1,
        csiCode: '',
        csiCodeTitle: '',
        description: '',
        value: 0,
        ...req.body,
      },
    });

    const totalValue = await prisma.sovItem.aggregate({
      where: { sovId: req.params.sovId },
      _sum: { value: true },
    });
    await prisma.scheduleOfValue.update({
      where: { id: req.params.sovId },
      data: { totalValue: totalValue._sum.value || 0 },
    });

    await logAction(req.user!.id, 'CREATE', 'SovItem', item.id);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Delete item
router.delete('/sov/:sovId/items/:itemId', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const sov = await prisma.scheduleOfValue.findUnique({ where: { id: req.params.sovId } });
    if (!sov) return res.status(404).json({ error: 'Not found' });
    if (sov.status !== 'DRAFT') return res.status(400).json({ error: 'Cannot delete items from locked SOV' });

    await prisma.sovItem.delete({ where: { id: req.params.itemId } });

    const totalValue = await prisma.sovItem.aggregate({
      where: { sovId: req.params.sovId },
      _sum: { value: true },
    });
    await prisma.scheduleOfValue.update({
      where: { id: req.params.sovId },
      data: { totalValue: totalValue._sum.value || 0 },
    });

    await logAction(req.user!.id, 'DELETE', 'SovItem', req.params.itemId);
    res.json({ message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// --- Change Order Routes ---

// Create change order for a project
router.post('/project/:projectId/change-orders', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const co = await prisma.changeOrder.create({
      data: {
        projectId: req.params.projectId,
        ...req.body,
      },
    });
    await logAction(req.user!.id, 'CREATE', 'ChangeOrder', co.id);
    res.status(201).json(co);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create change order' });
  }
});

// Get change orders for a project
router.get('/project/:projectId/change-orders', authenticate, async (req: AuthRequest, res) => {
  try {
    const cos = await prisma.changeOrder.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(cos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch change orders' });
  }
});

// Update change order
router.put('/project/:projectId/change-orders/:coId', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const co = await prisma.changeOrder.findUnique({ where: { id: req.params.coId } });
    if (!co) return res.status(404).json({ error: 'Not found' });
    if (co.status === 'LOCKED') return res.status(400).json({ error: 'Cannot edit locked change order' });
    const updated = await prisma.changeOrder.update({
      where: { id: req.params.coId },
      data: req.body,
    });
    await logAction(req.user!.id, 'UPDATE', 'ChangeOrder', req.params.coId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update change order' });
  }
});

// Approve change order
router.post('/project/:projectId/change-orders/:coId/approve', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const co = await prisma.changeOrder.findUnique({ where: { id: req.params.coId } });
    if (!co) return res.status(404).json({ error: 'Not found' });
    if (co.status === 'LOCKED') return res.status(400).json({ error: 'Already approved' });
    const updated = await prisma.changeOrder.update({
      where: { id: req.params.coId },
      data: { status: 'LOCKED', approvedBy: req.user!.id, approvedAt: new Date() },
    });
    const allCos = await prisma.changeOrder.aggregate({
      where: { projectId: co.projectId, status: 'LOCKED' },
      _sum: { value: true },
    });
    await prisma.project.update({
      where: { id: co.projectId },
      data: { totalChangeOrders: allCos._sum.value || 0 },
    });
    await logAction(req.user!.id, 'APPROVE', 'ChangeOrder', req.params.coId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve change order' });
  }
});

// Delete change order (only DRAFT)
router.delete('/project/:projectId/change-orders/:coId', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const co = await prisma.changeOrder.findUnique({ where: { id: req.params.coId } });
    if (!co) return res.status(404).json({ error: 'Not found' });
    if (co.status !== 'DRAFT') return res.status(400).json({ error: 'Cannot delete non-draft change order' });
    await prisma.changeOrder.delete({ where: { id: req.params.coId } });
    await logAction(req.user!.id, 'DELETE', 'ChangeOrder', req.params.coId);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete change order' });
  }
});

export default router;
