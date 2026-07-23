import { Router, Response, NextFunction } from 'express';
import prisma from '../../prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logAction } from '../utils/audit';

const router = Router();

// Platform admin only middleware
const platformAdminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.isPlatformAdmin) {
    return res.status(403).json({ error: 'Platform admin access required' });
  }
  next();
};

// POST /platform/tenants
router.post('/tenants', authenticate, platformAdminOnly, async (req: AuthRequest, res) => {
  try {
    const { name, slug, isActive } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }

    const existing = await prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      return res.status(409).json({ error: 'Tenant slug already exists' });
    }

    const schemaName = `tenant_${slug.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug,
        schemaName,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    await logAction(req.user!.id, 'CREATE', 'Tenant', tenant.id, null, JSON.stringify({ name, slug }));

    res.status(201).json({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      schemaName: tenant.schemaName,
      isActive: tenant.isActive,
      createdAt: tenant.createdAt,
    });
  } catch (error: any) {
    console.error('Create tenant error:', error);
    res.status(500).json({ error: 'Failed to create tenant', detail: error.message });
  }
});

// POST /platform/tenants-with-user (create tenant + owner account)
router.post('/tenants-with-user', authenticate, platformAdminOnly, async (req: AuthRequest, res) => {
  try {
    const { companyName, ownerName, ownerEmail, ownerRole } = req.body;

    if (!companyName || !ownerName || !ownerEmail) {
      return res.status(400).json({ error: 'Company name, owner name, and owner email are required' });
    }

    const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
    if (existingTenant) {
      return res.status(409).json({ error: 'A tenant with this name already exists' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: ownerEmail } });
    if (existingUser) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    // Generate a random password
    const generatePassword = () => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
      let password = '';
      for (let i = 0; i < 12; i++) {
        password += chars[Math.floor(Math.random() * chars.length)];
      }
      return password;
    };

    const password = generatePassword();

    // Hash password
    const hashedPassword = await require('bcrypt').hash(password, 10);

    // Create user first (tenantId is optional on User model)
    const user = await prisma.user.create({
      data: {
        name: ownerName,
        email: ownerEmail,
        password: hashedPassword,
        role: ownerRole || 'OWNER',
      },
    });

    // Create tenant
    const schemaName = `tenant_${slug.replace(/[^a-z0-9]/g, '_')}`;
    const tenant = await prisma.tenant.create({
      data: {
        name: companyName,
        slug,
        schemaName,
        isActive: true,
      },
    });

    // Link user to tenant
    await prisma.tenantUser.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        role: 'OWNER',
      },
    });

    await logAction(req.user!.id, 'CREATE', 'TenantWithUser', tenant.id, null, JSON.stringify({
      companyName,
      ownerName,
      ownerEmail,
      tenantId: tenant.id,
      userId: user.id,
    }));

    // Return credentials for admin to copy
    res.status(201).json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        schemaName: tenant.schemaName,
        isActive: tenant.isActive,
        createdAt: tenant.createdAt,
      },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      credentials: {
        email: user.email,
        password: password,
      },
    });
  } catch (error: any) {
    console.error('Create tenant with user error:', error);
    res.status(500).json({ error: 'Failed to create tenant and user', detail: error.message });
  }
});

// GET /platform/users
router.get('/users', authenticate, platformAdminOnly, async (_req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });

    res.json(users);
  } catch (error: any) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to fetch users', detail: error.message });
  }
});

// GET /platform/stats
router.get('/stats', authenticate, platformAdminOnly, async (_req: AuthRequest, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalTenants = await prisma.tenant.count();
    const totalProjects = await prisma.project.count();

    const tenants = await prisma.tenant.findMany({
      include: {
        _count: { select: { tenantUsers: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    res.json({
      totalUsers,
      totalTenants,
      totalProjects,
      recentTenants: tenants.map((t: any) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        memberCount: t._count.tenantUsers,
      })),
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch platform stats' });
  }
});

// GET /platform/tenants
router.get('/tenants', authenticate, platformAdminOnly, async (req: AuthRequest, res) => {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const search = (req.query.search as string) || '';
    const offset = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        include: {
          _count: { select: { tenantUsers: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.tenant.count({ where }),
    ]);

    res.json({
      tenants: tenants.map((t: any) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        schemaName: t.schemaName,
        isActive: t.isActive,
        createdAt: t.createdAt,
        memberCount: t._count.tenantUsers,
      })),
      total,
      page,
      limit,
    });
  } catch (error: any) {
    console.error('Platform tenants error:', error);
    res.status(500).json({ error: 'Failed to fetch tenants', detail: error.message });
  }
});

// GET /platform/tenants/:id
router.get('/tenants/:id', authenticate, platformAdminOnly, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: { select: { tenantUsers: true } },
        tenantUsers: {
          include: {
          user: { select: { id: true, name: true, email: true, role: true, createdAt: true, isPlatformAdmin: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const projects = await prisma.project.findMany({
      where: { tenantId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      schemaName: tenant.schemaName,
      isActive: tenant.isActive,
      createdAt: tenant.createdAt,
      memberCount: tenant._count.tenantUsers,
      members: tenant.tenantUsers.map((tu: any) => ({
        userId: tu.user.id,
        name: tu.user.name,
        email: tu.user.email,
        role: tu.role,
        userRole: tu.user.role,
        joinedAt: tu.createdAt,
      })),
      projects: projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        createdAt: p.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Tenant detail error:', error);
    res.status(500).json({ error: 'Failed to fetch tenant details', detail: error.message });
  }
});

// GET /platform/tenants/:id/members
router.get('/tenants/:id/members', authenticate, platformAdminOnly, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const search = (req.query.search as string) || '';
    const offset = (page - 1) * limit;

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const where: any = { tenantId: id };
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [members, total] = await Promise.all([
      prisma.tenantUser.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, role: true, createdAt: true, isPlatformAdmin: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.tenantUser.count({ where }),
    ]);

    res.json({
      members: members.map((mu: any) => ({
        id: mu.id,
        userId: mu.user.id,
        name: mu.user.name,
        email: mu.user.email,
        role: mu.role,
        userRole: mu.user.role,
        isPlatformAdmin: mu.user.isPlatformAdmin,
        joinedAt: mu.createdAt,
      })),
      total,
      page,
      limit,
    });
  } catch (error: any) {
    console.error('Tenant members error:', error);
    res.status(500).json({ error: 'Failed to fetch tenant members', detail: error.message });
  }
});

// POST /platform/tenants/:id/members
router.post('/tenants/:id/members', authenticate, platformAdminOnly, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.body;

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existing = await prisma.tenantUser.findUnique({
      where: { userId_tenantId: { userId, tenantId: id } },
    });

    if (existing) {
      return res.status(409).json({ error: 'User is already a member of this tenant' });
    }

    const tenantUser = await prisma.tenantUser.create({
      data: {
        tenantId: id,
        userId,
        role: role || 'CREW',
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await logAction(req.user!.id, 'CREATE', 'TenantMembership', tenantUser.id, null, JSON.stringify({ tenantId: id, userId, role: role || 'CREW' }));

    res.status(201).json(tenantUser);
  } catch (error: any) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Failed to add member', detail: error.message });
  }
});

// DELETE /platform/tenants/:id/members/:userId
router.delete('/tenants/:id/members/:userId', authenticate, platformAdminOnly, async (req: AuthRequest, res) => {
  try {
    const { id, userId } = req.params;

    if (userId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot remove yourself' });
    }

    const existing = await prisma.tenantUser.findUnique({
      where: { userId_tenantId: { userId, tenantId: id } },
      include: { user: { select: { isPlatformAdmin: true } } },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    if (existing.user?.isPlatformAdmin) {
      return res.status(400).json({ error: 'Cannot remove a platform administrator' });
    }

    await prisma.tenantUser.delete({
      where: { userId_tenantId: { userId, tenantId: id } },
    });

    await logAction(req.user!.id, 'DELETE', 'TenantMembership', existing.id, JSON.stringify({ tenantId: id, userId }), null);

    res.json({ message: 'Member removed from tenant' });
  } catch (error: any) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member', detail: error.message });
  }
});

// DELETE /platform/tenants/:id
router.delete('/tenants/:id', authenticate, platformAdminOnly, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Delete tenant users (cascades to related records)
    await prisma.tenantUser.deleteMany({ where: { tenantId: id } });

    // Delete projects (cascade)
    await prisma.project.deleteMany({ where: { tenantId: id } });

    // Delete tenant
    await prisma.tenant.delete({ where: { id } });

    await logAction(req.user!.id, 'DELETE', 'Tenant', id, JSON.stringify({ name: tenant.name, slug: tenant.slug }), null);

    res.json({ message: 'Tenant deleted' });
  } catch (error: any) {
    console.error('Delete tenant error:', error);
    res.status(500).json({ error: 'Failed to delete tenant', detail: error.message });
  }
});

// PATCH /platform/tenants/:id
router.patch('/tenants/:id', authenticate, platformAdminOnly, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const data: any = {};
    if (name) data.name = name;
    if (typeof isActive === 'boolean') data.isActive = isActive;

    const updated = await prisma.tenant.update({
      where: { id },
      data,
    });

    await logAction(req.user!.id, 'UPDATE', 'Tenant', id, JSON.stringify({ name: tenant.name, isActive: tenant.isActive }), JSON.stringify(data));

    res.json(updated);
  } catch (error: any) {
    console.error('Update tenant error:', error);
    res.status(500).json({ error: 'Failed to update tenant', detail: error.message });
  }
});

export default router;
