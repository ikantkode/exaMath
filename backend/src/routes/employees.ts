import { Router } from 'express';
import prisma from '../../prisma/client';
import { authenticate, authorize, AuthRequest, withTenant } from '../middleware/auth';
import { logAction } from '../utils/audit';

const router = Router();

router.get('/', authenticate, withTenant, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    
    const employees = await prisma.employee.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        employmentPeriods: { where: {}, orderBy: { startDate: 'desc' } },
        paymentLogs: { orderBy: { date: 'desc' }, take: 1 },
      },
    });
    res.json(employees);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch employees' }); }
});

router.post('/', authenticate, withTenant, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const { name, email, phone, role, address, compensationType, isUnion, dependents, isPerDiem, startDate, endDate, salary, hourlyRate, notes } = req.body;
    if (!name || !email || !phone || !role) return res.status(400).json({ error: 'Name, email, phone, and role are required' });
    if (!isPerDiem && salary === undefined) return res.status(400).json({ error: 'Salary or hourly rate is required for non per-diem employees' });
    if (!startDate) return res.status(400).json({ error: 'Start date is required' });

    const employee = await prisma.employee.create({
      data: {
        name, email, phone, role, address,
        compensationType: compensationType || 'W2',
        isUnion: !!isUnion,
        dependents: dependents ? parseInt(dependents) : 0,
        isPerDiem: !!isPerDiem,
        status: 'ACTIVE',
        notes: notes || null,
        tenantId: tenantId || req.body.tenantId,
        employmentPeriods: {
          create: {
            tenantId: tenantId || req.body.tenantId,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : null,
            salary: salary ? parseFloat(salary) : null,
            hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
          },
        },
      },
      include: {
        employmentPeriods: { orderBy: { startDate: 'desc' } },
      },
    });
    await logAction(req.user!.id, 'CREATE', 'Employee', employee.id);
    res.status(201).json(employee);
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to create employee' }); }
});

router.put('/:id', authenticate, withTenant, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    
    const { id } = req.params;
    const employee = await prisma.employee.findUnique({
      where: { id, tenantId },
      include: { employmentPeriods: { where: { endDate: null }, take: 1 } },
    });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    const { name, email, phone, role, address, compensationType, isUnion, dependents, isPerDiem, notes, salary, hourlyRate } = req.body;
    const employeeData: any = {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(role !== undefined && { role }),
      ...(address !== undefined && { address }),
      ...(compensationType !== undefined && { compensationType }),
      ...(typeof isUnion !== 'undefined' && { isUnion: !!isUnion }),
      ...(dependents !== undefined && { dependents: parseInt(dependents) || 0 }),
      ...(typeof isPerDiem !== 'undefined' && { isPerDiem: !!isPerDiem }),
      ...(notes !== undefined && { notes: notes || null }),
    };
    if (employee.employmentPeriods.length > 0 && (salary !== undefined || hourlyRate !== undefined)) {
      employeeData.employmentPeriods = {
        update: {
          where: { id: employee.employmentPeriods[0].id },
          data: {
            ...(salary !== undefined && { salary: salary ? parseFloat(salary) : null }),
            ...(hourlyRate !== undefined && { hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null }),
          },
        },
      };
    }
    const updated = await prisma.employee.update({
      where: { id },
      data: employeeData,
      include: {
        employmentPeriods: { orderBy: { startDate: 'desc' } },
      },
    });
    await logAction(req.user!.id, 'UPDATE', 'Employee', id);
    res.json(updated);
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to update employee' }); }
});

// Add a new employment period (re-hire)
router.post('/:id/employment-periods', authenticate, withTenant, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    
    const { id } = req.params;
    const { startDate, endDate, salary, hourlyRate } = req.body;
    if (!startDate) return res.status(400).json({ error: 'Start date is required' });

    const employee = await prisma.employee.findUnique({ where: { id, tenantId } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    if (!employee.isPerDiem && (!salary && !hourlyRate)) {
      return res.status(400).json({ error: 'Salary or hourly rate is required for non per-diem employees' });
    }

    const newPeriod = await prisma.employmentPeriod.create({
      data: {
        employeeId: id,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        salary: salary ? parseFloat(salary) : null,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        tenantId: tenantId || req.body.tenantId,
      },
    });

    const result = await prisma.employee.findUnique({
      where: { id },
      include: { employmentPeriods: { orderBy: { startDate: 'desc' } } },
    });
    await logAction(req.user!.id, 'CREATE', 'EmploymentPeriod', newPeriod.id);
    res.status(201).json(result);
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to add employment period' }); }
});

// Terminate an employment period
router.patch('/:id/employment-periods/:periodId/terminate', authenticate, withTenant, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    
    const { id, periodId } = req.params;
    const { endDate } = req.body;

    const employee = await prisma.employee.findUnique({ where: { id, tenantId } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const endDateVal = endDate ? new Date(endDate) : new Date();
    await prisma.employmentPeriod.update({
      where: { id: periodId },
      data: { endDate: endDateVal },
    });

    const updated = await prisma.employee.update({
      where: { id },
      data: { status: 'TERMINATED' },
      include: { employmentPeriods: { orderBy: { startDate: 'desc' } } },
    });
    await logAction(req.user!.id, 'TERMINATE', 'EmploymentPeriod', periodId);
    res.json(updated);
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to terminate employment period' }); }
});

// Reactivate employee
router.patch('/:id/reactivate', authenticate, withTenant, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    
    const { id } = req.params;
    const employee = await prisma.employee.findUnique({ where: { id, tenantId } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const updated = await prisma.employee.update({
      where: { id },
      data: { status: 'ACTIVE' },
      include: { employmentPeriods: { orderBy: { startDate: 'desc' } } },
    });
    await logAction(req.user!.id, 'REACTIVATE', 'Employee', id);
    res.json(updated);
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to reactivate employee' }); }
});

router.delete('/:id', authenticate, withTenant, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    
    const { id } = req.params;
    const employee = await prisma.employee.findUnique({ where: { id, tenantId } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    
    await prisma.employee.delete({ where: { id } });
    await logAction(req.user!.id, 'DELETE', 'Employee', id);
    res.json({ message: 'Employee deleted' });
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to delete employee' }); }
});

export default router;
