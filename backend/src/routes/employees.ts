import { Router } from 'express';
import prisma from '../../prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { logAction } from '../utils/audit';

const router = Router();

router.get('/', authenticate, async (_req: AuthRequest, res) => {
  try {
    const employees = await prisma.employee.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(employees);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch employees' }); }
});

router.post('/', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { name, address, phone, email, compensationType, salary, bonus, deductions, taxes, isUnion, dependents, notes } = req.body;
    if (!name || !compensationType) return res.status(400).json({ error: 'Name and compensation type are required' });
    const employee = await prisma.employee.create({
      data: {
        name, address, phone, email, compensationType,
        salary: salary ? parseFloat(salary) : null,
        bonus: bonus ? parseFloat(bonus) : 0,
        deductions: deductions ? parseFloat(deductions) : 0,
        taxes: taxes ? parseFloat(taxes) : 0,
        isUnion: !!isUnion,
        dependents: dependents ? parseInt(dependents) : 0,
        notes: notes || null,
      },
    });
    await logAction(req.user!.id, 'CREATE', 'Employee', employee.id);
    res.status(201).json(employee);
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to create employee' }); }
});

router.put('/:id', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    const { name, salary, bonus, deductions, taxes, dependents, notes, compensationType, address, phone, email, isUnion } = req.body;
    const updated = await prisma.employee.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(compensationType !== undefined && { compensationType }),
        ...(salary !== undefined && { salary: salary ? parseFloat(salary) : null }),
        ...(bonus !== undefined && { bonus: bonus ? parseFloat(bonus) : 0 }),
        ...(deductions !== undefined && { deductions: deductions ? parseFloat(deductions) : 0 }),
        ...(taxes !== undefined && { taxes: taxes ? parseFloat(taxes) : 0 }),
        ...(typeof isUnion !== 'undefined' && { isUnion: !!isUnion }),
        ...(dependents !== undefined && { dependents: dependents ? parseInt(dependents) : 0 }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
      },
    });
    await logAction(req.user!.id, 'UPDATE', 'Employee', id);
    res.json(updated);
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to update employee' }); }
});

router.delete('/:id', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.employee.delete({ where: { id } });
    await logAction(req.user!.id, 'DELETE', 'Employee', id);
    res.json({ message: 'Employee deleted' });
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to delete employee' }); }
});

export default router;
