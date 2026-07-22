import { Router } from 'express';
import prisma from '../../prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { getTenantId } from '../utils/tenant';

const router = Router();

router.get('/', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = getTenantId(req);
    const tenantFilter = tenantId ? { tenantId } : {};
    
    const projects = await prisma.project.findMany({ where: tenantFilter });
    const totalExpenses = await prisma.expense.aggregate({ where: tenantFilter, _sum: { amountUSD: true } });
    const totalTimesheets = await prisma.timesheet.aggregate({ where: tenantFilter, _sum: { hours: true } });
    const officePayroll = await prisma.officePayroll.aggregate({ where: tenantFilter, _sum: { netPay: true } });
    const fixedAssets = await prisma.fixedAsset.aggregate({ where: tenantFilter, _sum: { currentValue: true, purchasePrice: true } });
    const payouts = await prisma.payout.aggregate({ where: tenantFilter, _sum: { amountUSD: true } });
    const sovs = await prisma.scheduleOfValue.groupBy({ by: ['status'], where: tenantFilter, _count: { id: true } });
    const activeProjects = await prisma.project.count({ where: { status: 'ACTIVE', ...tenantFilter } });

    const expenseByType = await prisma.expense.groupBy({
      by: ['expenseType'],
      where: tenantFilter,
      _sum: { amountUSD: true },
    });

    const expenseByCategory = await prisma.expense.groupBy({
      by: ['categoryId'],
      where: tenantFilter,
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
