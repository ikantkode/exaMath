import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../prisma/client';
import { authenticate, AuthRequest, AuthUser } from '../middleware/auth';
import { JWT_SECRET } from '../index';

const router = Router();

// Check if app needs initial setup (no users exist)
router.get('/setup-status', async (_req, res) => {
  try {
    const count = await prisma.user.count();
    res.json({ needsSetup: count === 0 });
  } catch {
    res.json({ needsSetup: true });
  }
});

// Register — first user becomes OWNER automatically
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const userCount = await prisma.user.count();
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: userCount === 0 ? 'OWNER' : 'CREW',
      },
    });

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Resolve tenant context from TenantUser
    const tenantUser = await prisma.tenantUser.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });

    const payload: AuthUser = {
      id: user.id,
      role: user.role,
      email: user.email,
    };

    if (tenantUser) {
      payload.tenantId = tenantUser.tenantId;
      payload.tenantRole = tenantUser.role;
    }

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res) => {
   try {
     const user = await prisma.user.findUnique({
       where: { id: req.user!.id },
       include: {
         tenantUsers: {
           include: {
             tenant: { select: { id: true, name: true, slug: true } },
           },
         },
       },
     });
     if (!user) return res.status(404).json({ error: 'User not found' });

     res.json({
       id: user.id,
       name: user.name,
       email: user.email,
       role: user.role,
       assignedProjectIds: user.assignedProjectIds,
        tenants: user.tenantUsers.map((tu: any) => ({
         tenantId: tu.tenant.id,
         tenantName: tu.tenant.name,
         tenantSlug: tu.tenant.slug,
         role: tu.role,
       })),
     });
   } catch (error) {
     res.status(500).json({ error: 'Failed to get user' });
   }
});

// Update current user settings
router.put('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (email && email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(409).json({ error: 'Email already in use' });
    }

    if (newPassword) {
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const data: any = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (newPassword) data.password = await bcrypt.hash(newPassword, 10);

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data,
    });

    res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      assignedProjectIds: updated.assignedProjectIds,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

export default router;
