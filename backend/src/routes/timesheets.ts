import { Router } from 'express';
import prisma from '../../prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { logAction } from '../utils/audit';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.query;
    const where: any = {};
    if (projectId) where.projectId = projectId as string;

    const timesheets = await prisma.timesheet.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { date: 'desc' },
    });
    res.json(timesheets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch timesheets' });
  }
});

router.post('/', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { hours, rate, date, projectId } = req.body;
    const timesheet = await prisma.timesheet.create({
      data: {
        hours,
        rate,
        date: date ? new Date(date) : new Date(),
        projectId,
        userId: req.user!.id,
      },
    });
    await logAction(req.user!.id, 'CREATE', 'Timesheet', timesheet.id, null, JSON.stringify(req.body));
    res.status(201).json(timesheet);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create timesheet' });
  }
});

router.put('/:id', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const old = await prisma.timesheet.findUnique({ where: { id: req.params.id } });
    const timesheet = await prisma.timesheet.update({
      where: { id: req.params.id },
      data: req.body,
    });
    await logAction(req.user!.id, 'UPDATE', 'Timesheet', req.params.id, JSON.stringify(old), JSON.stringify(req.body));
    res.json(timesheet);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update timesheet' });
  }
});

router.delete('/:id', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    await prisma.timesheet.delete({ where: { id: req.params.id } });
    await logAction(req.user!.id, 'DELETE', 'Timesheet', req.params.id, null, null);
    res.json({ message: 'Timesheet deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete timesheet' });
  }
});

export default router;
