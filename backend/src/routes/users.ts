import { Router } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../../prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// List all users (OWNER, MANAGER)
router.get('/', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        assignedProjectIds: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create user (OWNER, MANAGER) — password auto-generated
router.post('/', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { name, email, role } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const autoPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(autoPassword, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'CREW',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        assignedProjectIds: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await logAction(req.user!.id, 'CREATE', 'User', user.id, null, JSON.stringify({ name, email, role: role || 'CREW' }));

    res.status(201).json({ user, password: autoPassword });
  } catch {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user role (OWNER only)
router.put('/:id', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { role, assignedProjectIds } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const data: any = {};
    if (role) data.role = role;
    if (assignedProjectIds) data.assignedProjectIds = assignedProjectIds;

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        assignedProjectIds: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await logAction(req.user!.id, 'UPDATE', 'User', id, JSON.stringify({ role: user.role, assignedProjectIds: user.assignedProjectIds }), JSON.stringify(data));

    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (OWNER only) — cannot delete self
router.delete('/:id', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const userCount = await prisma.user.count();
    if (userCount <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last user' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.user.delete({ where: { id } });
    await logAction(req.user!.id, 'DELETE', 'User', id, JSON.stringify({ name: user.name, email: user.email }), null);

    res.json({ message: 'User deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

function generatePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
  let pwd = '';
  for (let i = 0; i < 16; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

async function logAction(userId: string, action: string, entity: string, entityId: string | null, oldValue: string | null, newValue: string | null) {
  await prisma.auditLog.create({
    data: { userId, action, entity, entityId, oldValue, newValue },
  });
}

export default router;
