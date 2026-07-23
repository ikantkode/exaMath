import { Router } from 'express';
import prisma from '../../prisma/client';
import { authenticate, authorize, AuthRequest, withTenant } from '../middleware/auth';
import { logAction } from '../utils/audit';

const router = Router();

router.get('/', authenticate, withTenant, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    
    let projects: any[];
    if (req.user!.tenantRole === 'OWNER' || req.user!.tenantRole === 'MANAGER') {
      projects = await prisma.project.findMany({
        where: { tenantId },
        include: {
          budgetCategories: true,
          _count: { select: { expenses: true, timesheets: true } },
        },
      });
    } else {
      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      const projectIds = user?.assignedProjectIds || [];
      if (projectIds.length > 0) {
        projects = await prisma.project.findMany({
          where: { 
            id: { in: projectIds },
            tenantId,
          },
          include: {
            budgetCategories: true,
            _count: { select: { expenses: true, timesheets: true } },
          },
        });
      } else {
        projects = [];
      }
    }

    const results = await Promise.all(projects.map(async (p: any) => {
       const totalExpenses = await prisma.expense.aggregate({
         where: { projectId: p.id, tenantId },
         _sum: { amountUSD: true },
       });

      const totalLabor = await prisma.timesheet.aggregate({
        where: { projectId: p.id, tenantId },
        _sum: { hours: true },
      });
      return {
        ...p,
         totalExpenses: totalExpenses._sum.amountUSD || 0,

        totalLaborHours: totalLabor._sum.hours || 0,
        totalContractValue: p.originalContract + p.totalChangeOrders,
      };
    }));

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

router.get('/:id', authenticate, withTenant, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    
    const project = await prisma.project.findUnique({
      where: { 
        id: req.params.id,
        tenantId,
      },
      include: {
        budgetCategories: { include: { expenses: true } },
        expenses: { orderBy: { date: 'desc' } },
        timesheets: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
      },
    });

    if (!project) return res.status(404).json({ error: 'Project not found' });

     const totalExpenses = project.expenses.reduce((sum: number, e: any) => sum + e.amountUSD, 0);

    const totalLabor = project.timesheets.reduce((sum: number, t: any) => sum + t.hours * t.rate, 0);

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

router.post('/', authenticate, withTenant, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const project = await prisma.project.create({
      data: {
        ...req.body,
        tenantId,
        originalContract: req.body.originalContract ?? 0,
        totalChangeOrders: req.body.totalChangeOrders ?? 0,
        estimatedCompletion: req.body.estimatedCompletion ?? 0,
      },
    });
    await logAction(req.user!.id, 'CREATE', 'Project', project.id, null, JSON.stringify(req.body));
    res.status(201).json(project);
  } catch (error: any) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project', detail: error.message });
  }
});

router.put('/:id', authenticate, withTenant, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    
    const old = await prisma.project.findUnique({ where: { id: req.params.id, tenantId } });
    if (!old) return res.status(404).json({ error: 'Project not found' });
    
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { ...req.body, tenantId },
    });
    await logAction(req.user!.id, 'UPDATE', 'Project', req.params.id, JSON.stringify(old), JSON.stringify(req.body));
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

router.delete('/:id', authenticate, withTenant, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    
    const project = await prisma.project.findUnique({ where: { id: req.params.id, tenantId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    
    await prisma.project.delete({ where: { id: req.params.id } });
    await logAction(req.user!.id, 'DELETE', 'Project', req.params.id, null, null);
    res.json({ message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
