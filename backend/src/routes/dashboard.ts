import { Router } from 'express';
import prisma from '../../prisma/client';
import { authenticate, authorize, AuthRequest, withTenant } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, withTenant, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    
    const projects = await prisma.project.findMany({ where: { tenantId } });
    const totalExpenses = await prisma.expense.aggregate({ where: { tenantId }, _sum: { amountUSD: true } });
    const totalTimesheets = await prisma.timesheet.aggregate({ where: { tenantId }, _sum: { hours: true } });
    const officePayroll = await prisma.officePayroll.aggregate({ where: { tenantId }, _sum: { netPay: true } });
    const fixedAssets = await prisma.fixedAsset.aggregate({ where: { tenantId }, _sum: { currentValue: true, purchasePrice: true } });
    const payouts = await prisma.payout.aggregate({ where: { tenantId }, _sum: { amountUSD: true } });
    const sovs = await prisma.scheduleOfValue.groupBy({ by: ['status'], where: { tenantId }, _count: { id: true } });
    const activeProjects = await prisma.project.count({ where: { status: 'ACTIVE', tenantId } });

    const expenseByType = await prisma.expense.groupBy({
      by: ['expenseType'],
      where: { tenantId },
      _sum: { amountUSD: true },
    });

    const expenseByCategory = await prisma.expense.groupBy({
      by: ['categoryId'],
      where: { tenantId },
      _sum: { amountUSD: true },
    });

    res.json({
      summary: {
        totalExpenses: totalExpenses._sum.amountUSD || 0,
        totalLaborHours: totalTimesheets._sum.hours || 0,
        totalOfficePayroll: officePayroll._sum.netPay || 0,
        totalAssetsValue: fixedAssets._sum.currentValue || 0,
        totalAssetsOriginal: fixedAssets._sum.purchasePrice || 0,
        totalPayouts: payouts._sum.amountUSD || 0,
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
