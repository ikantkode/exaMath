import { Router } from 'express';
import prisma from '../../prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { logAction } from '../utils/audit';

const router = Router();

// Field worker master CRUD
router.get('/workers', authenticate, async (_req: AuthRequest, res) => {
  try {
    const workers = await prisma.fieldWorker.findMany({
      include: { assignments: { include: { project: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(workers);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch field workers' }); }
});

router.post('/workers', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { name, address, phone, email, compensationType, isUnion } = req.body;
    if (!name || !compensationType) return res.status(400).json({ error: 'Name and compensation type are required' });
    const worker = await prisma.fieldWorker.create({ data: { name, address, phone, email, compensationType, isUnion } });
    await logAction(req.user!.id, 'CREATE', 'FieldWorker', worker.id);
    res.status(201).json(worker);
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to create field worker' }); }
});

router.put('/workers/:id', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const worker = await prisma.fieldWorker.findUnique({ where: { id } });
    if (!worker) return res.status(404).json({ error: 'Worker not found' });
    const updated = await prisma.fieldWorker.update({ where: { id }, data: req.body });
    await logAction(req.user!.id, 'UPDATE', 'FieldWorker', id);
    res.json(updated);
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to update worker' }); }
});

router.delete('/workers/:id', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.fieldWorker.delete({ where: { id } });
    await logAction(req.user!.id, 'DELETE', 'FieldWorker', id);
    res.json({ message: 'Worker deleted' });
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to delete worker' }); }
});

// Assignments
router.get('/assignments/:projectId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const assignments = await prisma.fieldWorkerAssignment.findMany({
      where: { projectId },
      include: { fieldWorker: true, payrollEntries: { orderBy: { createdAt: 'desc' } } },
    });
    res.json(assignments);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch assignments' }); }
});

router.post('/assignments', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { fieldWorkerId, projectId, wageRate, benefitRate } = req.body;
    if (!fieldWorkerId || !projectId) return res.status(400).json({ error: 'Worker and project are required' });
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.wageType === 'UNION' && (!wageRate || wageRate <= 0)) return res.status(400).json({ error: 'Wage rate is required for union projects' });
    if (project.wageType === 'UNION' && (!benefitRate || benefitRate <= 0)) return res.status(400).json({ error: 'Benefit rate is required for union projects' });
    if ((project.wageType === 'PREVAILING' || project.wageType === 'PRIVATE') && !wageRate) return res.status(400).json({ error: 'Wage rate is required' });
    const assignment = await prisma.fieldWorkerAssignment.create({
      data: { fieldWorkerId, projectId, wageRate: wageRate || 0, benefitRate: benefitRate || 0 },
    });
    await logAction(req.user!.id, 'CREATE', 'FieldWorkerAssignment', assignment.id);
    res.status(201).json(assignment);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Worker already assigned to this project' });
    res.status(500).json({ error: e.message || 'Failed to create assignment' });
  }
});

router.delete('/assignments/:id', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.fieldWorkerAssignment.delete({ where: { id } });
    await logAction(req.user!.id, 'DELETE', 'FieldWorkerAssignment', id);
    res.json({ message: 'Assignment deleted' });
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to delete assignment' }); }
});

// Payroll entries
router.get('/payroll/:projectId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const assignments = await prisma.fieldWorkerAssignment.findMany({
      where: { projectId },
      include: {
        fieldWorker: true,
        payrollEntries: { include: { assignment: true }, orderBy: { createdAt: 'desc' } },
      },
    });
    const allEntries = assignments.flatMap(a => a.payrollEntries.map(p => ({
      ...p,
      fieldWorker: a.fieldWorker,
      wageRate: a.wageRate,
      benefitRate: a.benefitRate,
    })));
    res.json(allEntries);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch payroll' }); }
});

router.post('/payroll', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { assignmentId, hoursWorked, periodStart, periodEnd, taxes, deductions } = req.body;
    if (!assignmentId || !hoursWorked) return res.status(400).json({ error: 'Assignment and hours are required' });
    const assignment = await prisma.fieldWorkerAssignment.findUnique({
      where: { id: assignmentId },
      include: { project: true },
    });
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
    const wageType = assignment.project.wageType || 'PRIVATE';
    let grossWages: number, grossBenefits: number;
    if (wageType === 'UNION') {
      grossWages = hoursWorked * assignment.wageRate;
      grossBenefits = hoursWorked * assignment.benefitRate;
    } else {
      grossWages = hoursWorked * assignment.wageRate;
      grossBenefits = 0;
    }
    const netPay = grossWages + grossBenefits - (taxes || 0) - (deductions || 0);
    const entry = await prisma.fieldWorkerPayroll.create({
      data: { assignmentId, hoursWorked, grossWages, grossBenefits, taxes: taxes || 0, deductions: deductions || 0, netPay, periodStart, periodEnd },
    });
    await logAction(req.user!.id, 'CREATE', 'FieldWorkerPayroll', entry.id);
    res.status(201).json(entry);
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to create payroll entry' }); }
});

export default router;
