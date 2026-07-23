import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import prisma from '../../prisma/client';
import { authenticate, authorize, AuthRequest, withTenant } from '../middleware/auth';
import { logAction } from '../utils/audit';

const router = Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${baseName}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

function ensureUploadDirs(clientName: string | null | undefined, projectName: string) {
  const clientFolder = (clientName && clientName.trim()) ? clientName.trim().replace(/[<>:"/\\|?*]/g, '_') : 'Private Folder';
  const projectFolder = projectName.replace(/[<>:"/\\|?*]/g, '_');
  const dirPath = path.join(UPLOAD_DIR, clientFolder, projectFolder);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

function getRelativePath(clientName: string | null | undefined, projectName: string) {
  const clientFolder = (clientName && clientName.trim()) ? clientName.trim().replace(/[<>:"/\\|?*]/g, '_') : 'Private Folder';
  const projectFolder = projectName.replace(/[<>:"/\\|?*]/g, '_');
  return `${clientFolder}/${projectFolder}`;
}

// Agreements

router.get('/', authenticate, withTenant, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const { projectId } = req.query;
    const where: Record<string, unknown> = { tenantId };
    if (projectId) where.projectId = projectId as string;
    const agreements = await prisma.subcontractorAgreement.findMany({
      where,
      include: {
        files: true,
        changeOrders: { include: { files: true } },
        project: { select: { id: true, name: true, clientName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(agreements);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agreements' });
  }
});

router.post('/', authenticate, withTenant, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const { projectId, subcontractorName, contractValue, description } = req.body;
    if (!projectId || !subcontractorName || contractValue === undefined) return res.status(400).json({ error: 'Project, subcontractor name, and contract value are required' });
    const project = await prisma.project.findFirst({ where: { id: projectId, tenantId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const agreement = await prisma.subcontractorAgreement.create({
      data: { projectId, subcontractorName, contractValue: parseFloat(contractValue), description: description || null, tenantId: req.tenantId! },
    });
    ensureUploadDirs(project.clientName, project.name);
    const relPath = path.join(getRelativePath(project.clientName, project.name), agreement.id);
    if (!fs.existsSync(relPath)) fs.mkdirSync(path.join(UPLOAD_DIR, relPath), { recursive: true });
    await logAction(req.user!.id, 'CREATE', 'SubcontractorAgreement', agreement.id);
    res.status(201).json(agreement);
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to create agreement' }); }
});

router.put('/:id', authenticate, withTenant, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const agreement = await prisma.subcontractorAgreement.findFirst({ where: { id, tenantId } });
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    if (agreement.isFinalized && req.body.contractValue !== undefined) return res.status(400).json({ error: 'Cannot modify contract value of a finalized agreement' });
    const updated = await prisma.subcontractorAgreement.update({ where: { id }, data: req.body });
    await logAction(req.user!.id, 'UPDATE', 'SubcontractorAgreement', id);
    res.json(updated);
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to update agreement' }); }
});

router.patch('/:id/finalize', authenticate, withTenant, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const agreement = await prisma.subcontractorAgreement.findFirst({ where: { id, tenantId } });
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    const updated = await prisma.subcontractorAgreement.update({ where: { id }, data: { isFinalized: true } });
    await logAction(req.user!.id, 'FINALIZE', 'SubcontractorAgreement', id);
    res.json(updated);
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to finalize agreement' }); }
});

router.patch('/:id/unfinalize', authenticate, withTenant, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const agreement = await prisma.subcontractorAgreement.findFirst({ where: { id, tenantId } });
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    const updated = await prisma.subcontractorAgreement.update({ where: { id }, data: { isFinalized: false } });
    await logAction(req.user!.id, 'UNFINALIZE', 'SubcontractorAgreement', id);
    res.json(updated);
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to unfinalize agreement' }); }
});

router.delete('/:id', authenticate, withTenant, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const agreement = await prisma.subcontractorAgreement.findFirst({ where: { id, tenantId }, include: { files: true, changeOrders: { include: { files: true } }, project: { select: { clientName: true, name: true } } } });
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    for (const file of agreement.files) fs.unlinkSync(path.join(UPLOAD_DIR, file.filePath));
    for (const co of agreement.changeOrders) {
      for (const file of co.files) fs.unlinkSync(path.join(UPLOAD_DIR, file.filePath));
    }
    await prisma.subcontractorAgreement.delete({ where: { id } });
    const dirPath = path.join(UPLOAD_DIR, getRelativePath(agreement.project?.clientName ?? null, agreement.project?.name ?? 'unknown'));
    if (fs.existsSync(dirPath) && fs.readdirSync(dirPath).length === 0) fs.rmdirSync(dirPath);
    await logAction(req.user!.id, 'DELETE', 'SubcontractorAgreement', id);
    res.json({ message: 'Agreement deleted' });
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to delete agreement' }); }
});

// File uploads for agreements

router.post('/:id/files', authenticate, withTenant, authorize('OWNER', 'MANAGER'), upload.single('file'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const agreement = await prisma.subcontractorAgreement.findFirst({ where: { id, tenantId }, include: { project: true } });
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    if (agreement.isFinalized) return res.status(400).json({ error: 'Cannot upload files to a finalized agreement' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const relPath = getRelativePath(agreement.project?.clientName ?? null, agreement.project?.name);
    const fileDir = path.join(relPath, agreement.id);
    const targetDir = path.join(UPLOAD_DIR, fileDir);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    const oldPath = req.file.path;
    const newFilename = path.basename(oldPath);
    const newPath = path.join(targetDir, newFilename);
    fs.renameSync(oldPath, newPath);
    const fileRecord = await prisma.subcontractorFile.create({
      data: { agreementId: id, fileName: req.file.originalname, filePath: path.join(fileDir, newFilename), fileSize: req.file.size, fileType: req.file.mimetype, tenantId: req.tenantId! },
    });
    await logAction(req.user!.id, 'UPLOAD_FILE', 'SubcontractorAgreement', id);
    res.status(201).json(fileRecord);
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to upload file' }); }
});

// File uploads for change orders

router.post('/:agreementId/change-orders/:changeOrderId/files', authenticate, withTenant, authorize('OWNER', 'MANAGER'), upload.single('file'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const { changeOrderId } = req.params;
    const co = await prisma.subcontractorChangeOrder.findFirst({ where: { id: changeOrderId, tenantId }, include: { agreement: { include: { project: true } } } });
    if (!co) return res.status(404).json({ error: 'Change order not found' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const relPath = getRelativePath(co.agreement.project?.clientName ?? null, co.agreement.project?.name);
    const fileDir = path.join(relPath, co.agreement.id, 'change-orders', co.id);
    const targetDir = path.join(UPLOAD_DIR, fileDir);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    const oldPath = req.file.path;
    const newFilename = path.basename(oldPath);
    const newPath = path.join(targetDir, newFilename);
    fs.renameSync(oldPath, newPath);
    const fileRecord = await prisma.subcontractorFile.create({
      data: { changeOrderId: co.id, fileName: req.file.originalname, filePath: path.join(fileDir, newFilename), fileSize: req.file.size, fileType: req.file.mimetype, tenantId: req.tenantId! },
    });
    await logAction(req.user!.id, 'UPLOAD_FILE', 'SubcontractorChangeOrder', co.id);
    res.status(201).json(fileRecord);
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to upload file' }); }
});

// Delete file

router.delete('/files/:fileId', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { fileId } = req.params;
    const file = await prisma.subcontractorFile.findUnique({ where: { id: fileId } });
    if (!file) return res.status(404).json({ error: 'File not found' });
    const fullPath = path.join(UPLOAD_DIR, file.filePath);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    await prisma.subcontractorFile.delete({ where: { id: fileId } });
    await logAction(req.user!.id, 'DELETE_FILE', 'SubcontractorFile', fileId);
    res.json({ message: 'File deleted' });
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to delete file' }); }
});

// Change orders

router.get('/:agreementId/change-orders', authenticate, withTenant, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const { agreementId } = req.params;
    const changeOrders = await prisma.subcontractorChangeOrder.findMany({
      where: { agreementId, tenantId },
      include: { files: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(changeOrders);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch change orders' }); }
});

router.post('/:agreementId/change-orders', authenticate, withTenant, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const { agreementId } = req.params;
    const agreement = await prisma.subcontractorAgreement.findFirst({ where: { id: agreementId, tenantId }, include: { project: { select: { clientName: true, name: true } } } });
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    if (agreement.isFinalized) return res.status(400).json({ error: 'Cannot add change orders to a finalized agreement' });
    const { description, value } = req.body;
    if (!description || value === undefined) return res.status(400).json({ error: 'Description and value are required' });
    const co = await prisma.subcontractorChangeOrder.create({
      data: { agreementId, description, value: parseFloat(value), tenantId: req.tenantId! },
    });
    const project = agreement.project;
    const fileDir = path.join(getRelativePath(project?.clientName ?? null, project?.name), agreementId, 'change-orders', co.id);
    if (!fs.existsSync(path.join(UPLOAD_DIR, fileDir))) fs.mkdirSync(path.join(UPLOAD_DIR, fileDir), { recursive: true });
    await logAction(req.user!.id, 'CREATE', 'SubcontractorChangeOrder', co.id);
    res.status(201).json(co);
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to create change order' }); }
});

router.put('/:agreementId/change-orders/:changeOrderId', authenticate, withTenant, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const { changeOrderId } = req.params;
    const co = await prisma.subcontractorChangeOrder.findFirst({ where: { id: changeOrderId, tenantId } });
    if (!co) return res.status(404).json({ error: 'Change order not found' });
    const isFinalized = await agreementIsFinalized(co.agreementId, tenantId);
    if (isFinalized) return res.status(400).json({ error: 'Cannot modify change order for a finalized agreement' });
    const updated = await prisma.subcontractorChangeOrder.update({ where: { id: changeOrderId }, data: req.body });
    await logAction(req.user!.id, 'UPDATE', 'SubcontractorChangeOrder', changeOrderId);
    res.json(updated);
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to update change order' }); }
});

router.delete('/:agreementId/change-orders/:changeOrderId', authenticate, withTenant, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const { changeOrderId } = req.params;
    const co = await prisma.subcontractorChangeOrder.findFirst({ where: { id: changeOrderId, tenantId }, include: { files: true, agreement: true } });
    if (!co) return res.status(404).json({ error: 'Change order not found' });
    for (const file of co.files) fs.unlinkSync(path.join(UPLOAD_DIR, file.filePath));
    await prisma.subcontractorChangeOrder.delete({ where: { id: changeOrderId } });
    await logAction(req.user!.id, 'DELETE', 'SubcontractorChangeOrder', changeOrderId);
    res.json({ message: 'Change order deleted' });
  } catch (e: any) { res.status(500).json({ error: e.message || 'Failed to delete change order' }); }
});

async function agreementIsFinalized(agreementId: string, tenantId: string) {
  const agreement = await prisma.subcontractorAgreement.findUnique({ where: { id: agreementId, tenantId } });
  return agreement?.isFinalized ?? false;
}

export default router;
