import { Router } from 'express';
import prisma from '../../prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { logAction } from '../utils/audit';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    let projects;
    if (req.user!.role === 'CREW') {
      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      projects = await prisma.project.findMany({
        where: { id: { in: user?.assignedProjectIds || [] } },
        include: {
          budgetCategories: true,
          _count: { select: { expenses: true, timesheets: true } },
        },
      });
    } else if (req.user!.role === 'MANAGER') {
      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      projects = await prisma.project.findMany({
        where: { id: { in: user?.assignedProjectIds || [] } },
        include: {
          budgetCategories: true,
          _count: { select: { expenses: true, timesheets: true } },
        },
      });
    } else {
      projects = await prisma.project.findMany({
        include: {
          budgetCategories: true,
          _count: { select: { expenses: true, timesheets: true } },
        },
      });
    }

    const results = await Promise.all(projects.map(async (p) => {
      const totalExpenses = await prisma.expense.aggregate({
        where: { projectId: p.id },
        _sum: { amount: true },
      });
      const totalLabor = await prisma.timesheet.aggregate({
        where: { projectId: p.id },
        _sum: { hours: true },
      });
      return {
        ...p,
        totalExpenses: totalExpenses._sum.amount || 0,
        totalLaborHours: totalLabor._sum.hours || 0,
        totalContractValue: p.originalContract + p.totalChangeOrders,
      };
    }));

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        budgetCategories: { include: { expenses: true } },
        expenses: { orderBy: { date: 'desc' } },
        timesheets: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
      },
    });

    if (!project) return res.status(404).json({ error: 'Project not found' });

    const totalExpenses = project.expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalLabor = project.timesheets.reduce((sum, t) => sum + t.hours * t.rate, 0);

    res.json({
      ...project,
      totalExpenses,
      totalLabor,
      totalContractValue: project.originalContract + project.totalChangeOrders,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

router.post('/', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.create({
      data: req.body,
    });
    await logAction(req.user!.id, 'CREATE', 'Project', project.id, null, JSON.stringify(req.body));
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

router.put('/:id', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const old = await prisma.project.findUnique({ where: { id: req.params.id } });
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: req.body,
    });
    await logAction(req.user!.id, 'UPDATE', 'Project', req.params.id, JSON.stringify(old), JSON.stringify(req.body));
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

router.delete('/:id', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    await logAction(req.user!.id, 'DELETE', 'Project', req.params.id, null, null);
    res.json({ message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
