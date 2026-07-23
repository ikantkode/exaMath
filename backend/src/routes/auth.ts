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

// Register — first user becomes OWNER automatically and creates default tenant
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const userCount = await prisma.user.count();
    const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            role: userCount === 0 ? 'OWNER' : 'CREW',
            isPlatformAdmin: userCount === 0,
          },
        });

        const slug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-');
        const schemaName = `tenant_${slug}`;
        const tenant = await tx.tenant.create({
          data: {
            name: `${name}'s Company`,
            slug,
            schemaName,
          },
        });
        await tx.tenantUser.create({
          data: {
            tenantId: tenant.id,
            userId: u.id,
            role: 'OWNER',
          },
        });

        return u;
      });

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email, isPlatformAdmin: user.isPlatformAdmin },
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
        isPlatformAdmin: user.isPlatformAdmin,
      },
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to create user', detail: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenantUsers: { include: { tenant: { select: { id: true, name: true, slug: true } } } } },
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Resolve tenant context from TenantUser — respect X-Tenant-Id header
    const requestedTenantId = (req as any).headers?.['x-tenant-id'] || (req as any).query?.tenantId;
    
    let tenantUser: any = null;
    if (requestedTenantId) {
      tenantUser = await prisma.tenantUser.findFirst({
        where: { userId: user.id, tenantId: requestedTenantId },
      });
    }
    if (!tenantUser) {
      tenantUser = await prisma.tenantUser.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      });
    }

    const payload: AuthUser = {
      id: user.id,
      role: user.role,
      email: user.email,
      isPlatformAdmin: user.isPlatformAdmin,
    };

    if (tenantUser) {
      payload.tenantId = tenantUser.tenantId;
      payload.tenantRole = tenantUser.role;
    }

    const token = jwt.sign(
      { ...payload, tenantRole: tenantUser?.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isPlatformAdmin: user.isPlatformAdmin,
        tenantId: tenantUser?.tenantId,
        tenantRole: tenantUser?.role,
        assignedProjectIds: user.assignedProjectIds,
        tenants: user.tenantUsers?.map((tu: any) => ({
          tenantId: tu.tenantId,
          tenantName: tu.tenant.name,
          tenantSlug: tu.tenant.slug,
          role: tu.role,
        })),
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
        isPlatformAdmin: user.isPlatformAdmin,
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
