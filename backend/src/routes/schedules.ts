import { Router } from 'express';
import { XMLParser } from 'fast-xml-parser';
import { create } from 'xmlbuilder2';
import multer from 'multer';
import prisma from '../../prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { logAction } from '../utils/audit';

const router = Router();

// ─── Multer file upload middleware (XML only) ──────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = (file.originalname || '').toLowerCase();
    if (file.mimetype === 'text/xml' || file.mimetype === 'application/xml' || file.mimetype === '' || name.endsWith('.xml') || name.endsWith('.mpp')) {
      cb(null, true);
    } else {
      cb(new Error(`Only XML/MPP files are accepted (got: ${file.mimetype} / ${file.originalname})`));
    }
  },
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function detectFormat(xml: string): 'MSPDI' | 'PMXML' {
  const rootTag = xml.match(/<(\w+)[>\s]/)?.[1] || '';
  if (rootTag === 'Project') return 'MSPDI';
  return 'PMXML';
}

function statusFromPercent(pct: number): string {
  if (pct >= 100) return 'COMPLETED';
  if (pct > 0) return 'IN_PROGRESS';
  return 'NOT_STARTED';
}

function getActivities(obj: any): any[] {
  const pxExport = obj?.PXExport || obj?.P3XML || obj?.Project;
  const apiObjects = obj?.APIBusinessObjects || obj?.APIBusinessObjectsList;

  if (pxExport) {
    const activities = pxExport?.Activity || [];
    return Array.isArray(activities) ? activities : activities ? [activities] : [];
  }
  if (apiObjects) {
    const project = apiObjects?.Project;
    if (project) {
      const activities = project?.Activity || [];
      return Array.isArray(activities) ? activities : activities ? [activities] : [];
    }
    const activities = apiObjects?.Activity || [];
    return Array.isArray(activities) ? activities : activities ? [activities] : [];
  }
  return [];
}

// ─── MSPDI Parser ──────────────────────────────────────────────────────────

function parseMSPDI(xml: string) {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const obj = parser.parse(xml);
  const tasks: any[] = [];
  const project = obj?.Project || obj?.MSPProject;
  const taskNodes = project?.Task || [];

  const taskList = Array.isArray(taskNodes) ? taskNodes : taskNodes ? [taskNodes] : [];

  for (const t of taskList) {
    const numId = t?.['@_UID'] ?? t?.UID ?? '';
    const name = t?.['@_Name'] ?? t?.Name ?? '';
    const start = t?.['@_Start'] ?? t?.Start ?? null;
    const finish = t?.['@_Finish'] ?? t?.Finish ?? null;
    const actualStart = t?.['@_ActualStart'] ?? t?.ActualStart ?? null;
    const actualFinish = t?.['@_ActualFinish'] ?? t?.ActualFinish ?? null;
    const remainDur = parseFloat(t?.['@_RemainingDuration'] ?? t?.RemainingDuration ?? '0') || 0;
    const pct = parseFloat(t?.['@_PercentComplete'] ?? t?.PercentComplete ?? '0') || 0;

    tasks.push({
      activityId: String(numId),
      name,
      startDate: start ? new Date(start) : null,
      finishDate: finish ? new Date(finish) : null,
      actualStart: actualStart ? new Date(actualStart) : null,
      actualFinish: actualFinish ? new Date(actualFinish) : null,
      remainingDuration: remainDur,
      physicalPercentComplete: pct,
      status: statusFromPercent(pct),
      isCritical: false,
    });
  }

  return tasks;
}

// ─── PMXML / P6 Professional Parser ────────────────────────────────────────

function extractValue(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === 'object' && obj['@_xsi:nil'] === 'true') return null;
  return obj;
}

function parsePMXML(xml: string) {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const obj = parser.parse(xml);
  const tasks: any[] = [];
  const activityNodes = getActivities(obj);

  for (const a of activityNodes) {
    const actId = a?.Id ?? a?.ID ?? a?.Code ?? a?.['@_ID'] ?? a?.['@_Code'] ?? a?.UID ?? a?.['@_UID'] ?? '';
    const name = a?.Name ?? a?.Description ?? a?.['@_Name'] ?? a?.['@_Description'] ?? '';
    const startDate = extractValue(a?.StartDate ?? a?.['@_StartDate'] ?? a?.EarlyStartDate ?? a?.['@_EarlyStartDate'] ?? a?.EarlyStart ?? a?.['@_EarlyStart'] ?? a?.ScheduleStart ?? a?.['@_ScheduleStart']);
    const finishDate = extractValue(a?.FinishDate ?? a?.['@_FinishDate'] ?? a?.LateFinishDate ?? a?.['@_LateFinishDate'] ?? a?.EarlyFinish ?? a?.['@_EarlyFinish'] ?? a?.LateFinish ?? a?.['@_LateFinish'] ?? a?.ScheduleFinish ?? a?.['@_ScheduleFinish']);
    const actualStart = extractValue(a?.ActualStartDate ?? a?.['@_ActualStartDate'] ?? a?.ActualStart ?? a?.['@_ActualStart']);
    const actualFinish = extractValue(a?.ActualFinishDate ?? a?.['@_ActualFinishDate'] ?? a?.ActualFinish ?? a?.['@_ActualFinish']);
    const remainDur = extractValue(a?.RemainingDuration ?? a?.['@_RemainingDuration'] ?? a?.TotalFloat ?? a?.['@_TotalFloat'] ?? '0');
    const pct = parseFloat(extractValue(a?.PhysicalPercentComplete ?? a?.['@_PhysicalPercentComplete'] ?? a?.PercentComplete ?? a?.['@_PercentComplete']) ?? '0') || 0;
    const isCritRaw = extractValue(a?.IsCritical ?? a?.['@_IsCritical'] ?? a?.Critical ?? a?.['@_Critical'] ?? false);
    const isCritical = isCritRaw === true || isCritRaw === 'true' || isCritRaw === 1;

    tasks.push({
      activityId: String(actId),
      name,
      startDate: startDate ? new Date(startDate) : null,
      finishDate: finishDate ? new Date(finishDate) : null,
      actualStart: actualStart ? new Date(actualStart) : null,
      actualFinish: actualFinish ? new Date(actualFinish) : null,
      remainingDuration: parseFloat(String(remainDur ?? '0').replace('h', '').trim()) || 0,
      physicalPercentComplete: pct,
      status: statusFromPercent(pct),
      isCritical,
    });
  }

  return tasks;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function cleanForExport(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cleanForExport);
  if (typeof obj === 'object' && obj['@_xsi:nil'] === 'true') return null;
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('@_') || key === 'toString' || key === 'valueOf') continue;
    const cleanedValue = cleanForExport(value);
    if (cleanedValue !== null) {
      cleaned[key] = cleanedValue;
    }
  }
  return cleaned;
}

// ─── MSPDI Builder (Round-Trip Export) ─────────────────────────────────────

function buildMSPDI(tasks: any[], originalXml: string): string {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const obj = parser.parse(originalXml);
  const project = obj?.Project || obj?.MSPProject;
  const taskNodes = project?.Task || [];

  const taskList = Array.isArray(taskNodes) ? taskNodes : taskNodes ? [taskNodes] : [];

  for (const task of tasks) {
    for (const existing of taskList) {
      if (String(existing?.['@_UID'] ?? existing?.UID ?? '') === String(task.activityId)) {
        if (task.actualStart) existing['@_ActualStart'] = task.actualStart.toISOString();
        if (task.actualFinish) existing['@_ActualFinish'] = task.actualFinish.toISOString();
        if (task.remainingDuration !== undefined) existing['@_RemainingDuration'] = String(task.remainingDuration);
        if (task.physicalPercentComplete !== undefined) existing['@_PercentComplete'] = String(task.physicalPercentComplete);

        if (task.actualFinish && task.physicalPercentComplete >= 100) {
          existing['@_Status'] = 'Complete';
        } else if (task.physicalPercentComplete > 0) {
          existing['@_Status'] = 'In progress';
        } else {
          existing['@_Status'] = 'Not started';
        }
        break;
      }
    }
  }

  const cleaned = cleanForExport(obj);
  const xml = create(cleaned).end();
  return xml;
}

// ─── PMXML Builder (Round-Trip Export) ─────────────────────────────────────

function buildPMXML(tasks: any[], originalXml: string): string {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const obj = parser.parse(originalXml);
  const activityNodes = getActivities(obj);

  const activityList = Array.isArray(activityNodes) ? activityNodes : activityNodes ? [activityNodes] : [];

  for (const task of tasks) {
    for (const existing of activityList) {
      if (String(existing?.Id ?? existing?.ID ?? existing?.Code ?? existing?.['@_ID'] ?? existing?.['@_Code'] ?? '') === String(task.activityId)) {
        if (task.actualStart) {
          existing.ActualStartDate = task.actualStart.toISOString();
          delete existing['@_xsi:nil'];
        }
        if (task.actualFinish) {
          existing.ActualFinishDate = task.actualFinish.toISOString();
          delete existing['@_xsi:nil'];
        }
        if (task.remainingDuration !== undefined) {
          existing.RemainingDuration = task.remainingDuration;
        }
        if (task.physicalPercentComplete !== undefined) {
          existing.PhysicalPercentComplete = String(task.physicalPercentComplete);
        }
        break;
      }
    }
  }

  const cleaned = cleanForExport(obj);
  const xml = create(cleaned).end();
  return xml;
}

// ─── Versioning helpers ──────────────────────────────────────────────────────

async function snapshotVersion(sessionId: string, userId: string): Promise<number> {
  const session = await prisma.scheduleSession.findUnique({
    where: { id: sessionId },
    include: { parsedTasks: true },
  });
  if (!session) throw new Error('Schedule not found');

  const existingVersions = await prisma.scheduleVersion.count({ where: { sessionId } });
  const versionNumber = existingVersions + 1;

  const snapshot = session.parsedTasks.map((t: any) => ({
    id: t.id,
    activityId: t.activityId,
    name: t.name,
    startDate: t.startDate?.toISOString() || null,
    finishDate: t.finishDate?.toISOString() || null,
    actualStart: t.actualStart?.toISOString() || null,
    actualFinish: t.actualFinish?.toISOString() || null,
    remainingDuration: t.remainingDuration,
    physicalPercentComplete: t.physicalPercentComplete,
    status: t.status,
    isCritical: t.isCritical,
  }));

  await prisma.scheduleVersion.create({
    data: {
      sessionId,
      versionNumber,
      taskSnapshot: JSON.stringify(snapshot),
      createdById: userId,
    },
  });

  return versionNumber;
}

async function restoreVersion(sessionId: string, versionNumber: number, userId: string) {
  const version = await prisma.scheduleVersion.findFirst({
    where: { sessionId, versionNumber },
    include: { createdBy: { select: { name: true } } },
  });
  if (!version) throw new Error('Version not found');

  const tasks = JSON.parse(version.taskSnapshot);

  await prisma.$transaction(
    tasks.map((t: any) =>
      prisma.scheduleTask.update({
        where: { id: t.id },
        data: {
          actualStart: t.actualStart ? new Date(t.actualStart) : null,
          actualFinish: t.actualFinish ? new Date(t.actualFinish) : null,
          remainingDuration: t.remainingDuration,
          physicalPercentComplete: t.physicalPercentComplete,
          status: t.status as any,
        },
      })
    )
  );

  await logAction(userId, 'RESTORE', 'ScheduleVersion', version.id);

  const session = await prisma.scheduleSession.findUnique({
    where: { id: sessionId },
    include: { parsedTasks: { orderBy: { activityId: 'asc' } } },
  });

  return session;
}

function checkAutoVersion(sessionId: string, userId: string) {
  prisma.scheduleVersion.findFirst({
    where: { sessionId },
    orderBy: { versionNumber: 'desc' },
  }).then((existingVersion: any) => {
    const lastVersionTime = existingVersion?.createdAt;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (!lastVersionTime || lastVersionTime < fiveMinutesAgo) {
      snapshotVersion(sessionId, userId).catch(() => {});
    }
  });
}

// ─── Routes ────────────────────────────────────────────────────────────────

// Upload schedule XML
router.post('/upload', upload.single('file'), authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { name, projectId } = req.body;
    const file = (req as any).file;

    if (!file || !file.buffer) {
      console.error('No file uploaded — file:', JSON.stringify(file));
      return res.status(400).json({ error: 'XML file is required' });
    }

    console.log('File received:', file.originalname, file.mimetype, file.size, 'bytes');

    const xml = file.buffer.toString('utf-8');
    console.log('XML length:', xml.length);

    const format = detectFormat(xml);
    console.log('Detected format:', format);

    let tasks: any[] = [];
    try {
      if (format === 'MSPDI') {
        tasks = parseMSPDI(xml);
      } else {
        tasks = parsePMXML(xml);
      }
      console.log('Parsed', tasks.length, 'tasks');
    } catch (parseError: any) {
      console.error('Parse error:', parseError.message, parseError.stack);
      return res.status(400).json({ error: `Failed to parse schedule: ${parseError.message}` });
    }

    const session = await prisma.scheduleSession.create({
      data: {
        name: name || `Schedule ${new Date().toLocaleDateString()}`,
        format,
        projectId,
        originalXml: xml,
        parsedTasks: {
          create: tasks.map((t) => ({
            activityId: t.activityId,
            name: t.name,
            startDate: t.startDate,
            finishDate: t.finishDate,
            actualStart: t.actualStart,
            actualFinish: t.actualFinish,
            remainingDuration: t.remainingDuration,
            physicalPercentComplete: t.physicalPercentComplete,
            status: t.status as any,
            isCritical: t.isCritical,
          })),
        },
      },
      include: { parsedTasks: true },
    });

    await logAction(req.user!.id, 'CREATE', 'ScheduleSession', session.id);
    res.status(201).json(session);
  } catch (e: any) {
    console.error('Upload error:', e.message);
    res.status(500).json({ error: e.message || 'Failed to upload schedule' });
  }
});

// List sessions
router.get('/', authenticate, async (_req: AuthRequest, res) => {
  try {
    const sessions = await prisma.scheduleSession.findMany({
      include: { parsedTasks: { orderBy: { activityId: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(sessions);
  } catch {
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

// Get single session with tasks
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const session = await prisma.scheduleSession.findUnique({
      where: { id: req.params.id },
      include: {
        parsedTasks: { orderBy: { activityId: 'asc' } },
        chatMessages: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!session) return res.status(404).json({ error: 'Schedule not found' });
    res.json(session);
  } catch {
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// List versions for a session
router.get('/:id/versions', authenticate, async (req: AuthRequest, res) => {
  try {
    const versions = await prisma.scheduleVersion.findMany({
      where: { sessionId: req.params.id },
      include: { createdBy: { select: { name: true } } },
      orderBy: { versionNumber: 'asc' },
    });
    res.json(versions);
  } catch {
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

// Create a manual version snapshot
router.post('/:id/versions', authenticate, async (req: AuthRequest, res) => {
  try {
    const versionNumber = await snapshotVersion(req.params.id, req.user!.id);
    await logAction(req.user!.id, 'CREATE_VERSION', 'ScheduleVersion', req.params.id);
    res.status(201).json({
      message: `Version ${versionNumber} created`,
      versionNumber,
    });
  } catch (e: any) {
    if (e.message === 'Schedule not found') return res.status(404).json({ error: 'Schedule not found' });
    res.status(500).json({ error: e.message || 'Failed to create version' });
  }
});

// Restore a specific version
router.post('/:id/versions/:versionNumber/restore', authenticate, async (req: AuthRequest, res) => {
  try {
    const versionNumber = parseInt(req.params.versionNumber, 10);
    const session = await restoreVersion(req.params.id, versionNumber, req.user!.id);
    if (!session) return res.status(404).json({ error: 'Version not found' });
    res.json(session);
  } catch (e: any) {
    if (e.message === 'Schedule not found' || e.message === 'Version not found') {
      return res.status(404).json({ error: e.message });
    }
    res.status(500).json({ error: e.message || 'Failed to restore version' });
  }
});

// Update task progress (with auto-version)
router.put('/:id/tasks/:taskId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { actualStart, actualFinish, remainingDuration, physicalPercentComplete, status } = req.body;

    const updates: any = {};
    if (actualStart !== undefined) updates.actualStart = actualStart ? new Date(actualStart) : null;
    if (actualFinish !== undefined) updates.actualFinish = actualFinish ? new Date(actualFinish) : null;
    if (remainingDuration !== undefined) updates.remainingDuration = remainingDuration;
    if (physicalPercentComplete !== undefined) updates.physicalPercentComplete = physicalPercentComplete;
    if (status !== undefined) updates.status = status;

    if (physicalPercentComplete !== undefined && !status) {
      updates.status = statusFromPercent(physicalPercentComplete);
    }

    checkAutoVersion(req.params.id, req.user!.id);

    const task = await prisma.scheduleTask.update({
      where: { id: req.params.taskId },
      data: updates,
    });

    await logAction(req.user!.id, 'UPDATE', 'ScheduleTask', task.id);
    res.json(task);
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Task not found' });
    res.status(500).json({ error: e.message || 'Failed to update task' });
  }
});

// Update multiple tasks at once (with auto-version)
router.put('/:id/tasks/batch', authenticate, async (req: AuthRequest, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates)) return res.status(400).json({ error: 'updates array required' });

    checkAutoVersion(req.params.id, req.user!.id);

    const results = await Promise.all(
      updates.map(async (u: any) => {
        const data: any = {};
        if (u.actualStart !== undefined) data.actualStart = u.actualStart ? new Date(u.actualStart) : null;
        if (u.actualFinish !== undefined) data.actualFinish = u.actualFinish ? new Date(u.actualFinish) : null;
        if (u.remainingDuration !== undefined) data.remainingDuration = u.remainingDuration;
        if (u.physicalPercentComplete !== undefined) data.physicalPercentComplete = u.physicalPercentComplete;
        if (u.status !== undefined) data.status = u.status;
        return prisma.scheduleTask.update({ where: { id: u.id }, data });
      })
    );

    await logAction(req.user!.id, 'UPDATE', 'ScheduleTasks', req.params.id);
    res.json(results);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to update tasks' });
  }
});

// Export schedule (round-trip)
router.post('/:id/export', authenticate, async (req: AuthRequest, res) => {
  try {
    const session = await prisma.scheduleSession.findUnique({
      where: { id: req.params.id },
      include: { parsedTasks: true },
    });
    if (!session) return res.status(404).json({ error: 'Schedule not found' });

    let xml: string;
    if (session.format === 'MSPDI') {
      xml = buildMSPDI(session.parsedTasks, session.originalXml);
    } else {
      xml = buildPMXML(session.parsedTasks, session.originalXml);
    }

    const ext = session.format === 'MSPDI' ? 'mpp' : 'xml';
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${session.name.replace(/[^a-z0-9]/gi, '_')}_updated.${ext}"`
    );
    res.send(xml);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to export schedule' });
  }
});

// Chat
router.post('/:id/chat', authenticate, async (req: AuthRequest, res) => {
  try {
    const { message, taskIds } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const chat = await prisma.scheduleChat.create({
      data: {
        sessionId: req.params.id,
        userId: req.user!.id,
        message,
        taskIds: taskIds ? JSON.stringify(taskIds) : null,
      },
      include: { user: { select: { name: true } } },
    });

    res.status(201).json(chat);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to send message' });
  }
});

// Get chat messages
router.get('/:id/chat', authenticate, async (req: AuthRequest, res) => {
  try {
    const messages = await prisma.scheduleChat.findMany({
      where: { sessionId: req.params.id },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
  } catch {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Rename schedule
router.patch('/:id', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

    const session = await prisma.scheduleSession.update({
      where: { id: req.params.id },
      data: { name: name.trim() },
    });

    await logAction(req.user!.id, 'UPDATE', 'ScheduleSession', session.id);
    res.json(session);
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Schedule not found' });
    res.status(500).json({ error: e.message || 'Failed to rename schedule' });
  }
});

// Import new XML into existing session (replaces schedule)
router.post('/:id/import', upload.single('file'), authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const file = (req as any).file;
    if (!file || !file.buffer) {
      return res.status(400).json({ error: 'XML file is required' });
    }

    const session = await prisma.scheduleSession.findUnique({
      where: { id: req.params.id },
      include: { parsedTasks: true },
    });
    if (!session) return res.status(404).json({ error: 'Schedule not found' });

    // Check for started tasks before replacement
    const startedTasks = session.parsedTasks.filter((t: any) => t.actualStart);
    if (startedTasks.length > 0) {
      return res.status(409).json({
        error: 'Cannot import new schedule while tasks have started. Please restore to a baseline version first.',
        startedTaskCount: startedTasks.length,
        startedTaskIds: startedTasks.map((t: any) => t.activityId),
      });
    }

    const xml = file.buffer.toString('utf-8');
    const format = detectFormat(xml);

    let tasks: any[] = [];
    try {
      if (format === 'MSPDI') {
        tasks = parseMSPDI(xml);
      } else {
        tasks = parsePMXML(xml);
      }
    } catch (parseError: any) {
      return res.status(400).json({ error: `Failed to parse schedule: ${parseError.message}` });
    }

    // Snapshot current state before replacing
    const currentVersion = await snapshotVersion(req.params.id, req.user!.id);

    // Delete old tasks and create new ones
    await prisma.$transaction([
      prisma.scheduleTask.deleteMany({ where: { sessionId: req.params.id } }),
      prisma.scheduleSession.update({
        where: { id: req.params.id },
        data: {
          originalXml: xml,
          format,
          parsedTasks: {
            create: tasks.map((t) => ({
              activityId: t.activityId,
              name: t.name,
              startDate: t.startDate,
              finishDate: t.finishDate,
              actualStart: t.actualStart,
              actualFinish: t.actualFinish,
              remainingDuration: t.remainingDuration,
              physicalPercentComplete: t.physicalPercentComplete,
              status: t.status as any,
              isCritical: t.isCritical,
            })),
          },
        },
      }),
    ]);

    const updated = await prisma.scheduleSession.findUnique({
      where: { id: req.params.id },
      include: { parsedTasks: { orderBy: { activityId: 'asc' } } },
    });

    await logAction(req.user!.id, 'IMPORT', 'ScheduleSession', req.params.id);
    res.json({ ...updated, message: `Schedule imported. Saved as Version ${currentVersion}.` });
  } catch (e: any) {
    console.error('Import error:', e.message);
    res.status(500).json({ error: e.message || 'Failed to import schedule' });
  }
});

// Delete schedule
router.delete('/:id', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const session = await prisma.scheduleSession.delete({ where: { id: req.params.id } });
    await logAction(req.user!.id, 'DELETE', 'ScheduleSession', session.id);
    res.json({ message: 'Schedule deleted' });
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Schedule not found' });
    res.status(500).json({ error: e.message || 'Failed to delete schedule' });
  }
});

export default router;
