import { Router } from 'express';
import prisma from '../../prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { logAction } from '../utils/audit';
import { getTenantId } from '../utils/tenant';

const router = Router();

router.get('/', authenticate, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = getTenantId(req);
    const tenantFilter = tenantId ? { tenantId } : {};
    
    const assets = await prisma.fixedAsset.findMany({
      where: tenantFilter,
      orderBy: { purchaseDate: 'desc' },
    });
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fixed assets' });
  }
});

router.post('/', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = getTenantId(req);
    const { name, category, purchasePrice, purchaseDate, usefulLife } = req.body;
    const currentValue = purchasePrice;
    const asset = await prisma.fixedAsset.create({
      data: { name, category, purchasePrice, purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(), usefulLife, currentValue, tenantId: tenantId || req.body.tenantId },
    });
    await logAction(req.user!.id, 'CREATE', 'FixedAsset', asset.id, null, JSON.stringify(req.body));
    res.status(201).json(asset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create fixed asset' });
  }
});

router.post('/recalculate', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = getTenantId(req);
    const tenantFilter = tenantId ? { tenantId } : {};
    
    const assets = await prisma.fixedAsset.findMany({ where: tenantFilter });
    const now = new Date();
    const updates = assets.map(async (asset: any) => {
      const purchaseDate = new Date(asset.purchaseDate);
      const monthsOwned = (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth());
      const monthlyDepreciation = asset.purchasePrice / (asset.usefulLife * 12);
      const accumulatedDepreciation = Math.min(monthlyDepreciation * monthsOwned, asset.purchasePrice);
      const currentValue = Math.max(asset.purchasePrice - accumulatedDepreciation, 0);
      return prisma.fixedAsset.update({
        where: { id: asset.id },
        data: { accumulatedDepreciation, currentValue },
      });
    });
    await Promise.all(updates);
    await logAction(req.user!.id, 'RECALCULATE', 'FixedAsset', null, null, 'Depreciation recalculated');
    const updated = await prisma.fixedAsset.findMany({ where: tenantFilter });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to recalculate depreciation' });
  }
});

router.put('/:id', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = getTenantId(req);
    const tenantFilter = tenantId ? { tenantId } : {};
    
    const old = await prisma.fixedAsset.findUnique({ where: { id: req.params.id, ...tenantFilter } });
    if (!old) return res.status(404).json({ error: 'Fixed asset not found' });
    
    const asset = await prisma.fixedAsset.update({
      where: { id: req.params.id },
      data: req.body,
    });
    await logAction(req.user!.id, 'UPDATE', 'FixedAsset', req.params.id, JSON.stringify(old), JSON.stringify(req.body));
    res.json(asset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update fixed asset' });
  }
});

router.delete('/:id', authenticate, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = getTenantId(req);
    const tenantFilter = tenantId ? { tenantId } : {};
    
    const asset = await prisma.fixedAsset.findUnique({ where: { id: req.params.id, ...tenantFilter } });
    if (!asset) return res.status(404).json({ error: 'Fixed asset not found' });
    
    await prisma.fixedAsset.delete({ where: { id: req.params.id } });
    await logAction(req.user!.id, 'DELETE', 'FixedAsset', req.params.id, null, null);
    res.json({ message: 'Fixed asset deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete fixed asset' });
  }
});

export default router;
