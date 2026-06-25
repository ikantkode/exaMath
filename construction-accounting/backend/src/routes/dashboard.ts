import { Router } from 'express';
import prisma from '../../prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const projects = await prisma.project.findMany();
    const totalExpenses = await prisma.expense.aggregate({ _sum: { amount: true } });
    const totalTimesheets = await prisma.timesheet.aggregate({ _sum: { hours: true } });
    const officePayroll = await prisma.officePayroll.aggregate({ _sum: { grossPay: true } });
    const fixedAssets = await prisma.fixedAsset.aggregate({ _sum: { currentValue: true, purchasePrice: true } });
    const payouts = await prisma.payout.aggregate({ _sum: { amount: true } });
    const sovs = await prisma.scheduleOfValue.groupBy({ by: ['status'], _count: { id: true } });
    const activeProjects = await prisma.project.count({ where: { status: 'ACTIVE' } });

    const expenseByType = await prisma.expense.groupBy({
      by: ['expenseType'],
      _sum: { amount: true },
    });

    const expenseByCategory = await prisma.expense.groupBy({
      by: ['categoryId'],
      _sum: { amount: true },
    });

    res.json({
      summary: {
        totalExpenses: totalExpenses._sum.amount || 0,
        totalLaborHours: totalTimesheets._sum.hours || 0,
        totalOfficePayroll: officePayroll._sum.grossPay || 0,
        totalAssetsValue: fixedAssets._sum.currentValue || 0,
        totalAssetsOriginal: fixedAssets._sum.purchasePrice || 0,
        totalPayouts: payouts._sum.amount || 0,
        activeProjects,
        totalProjects: projects.length,
        sovs: sovs.reduce((acc: Record<string, number>, s: any) => ({ ...acc, [s.status]: s._count.id }), {}),
      },
      expenseByType,
      expenseByCategory,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
