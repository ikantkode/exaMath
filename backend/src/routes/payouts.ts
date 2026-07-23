import { Router } from 'express';
import prisma from '../../prisma/client';
import { authenticate, authorize, AuthRequest, withTenant } from '../middleware/auth';
import { logAction } from '../utils/audit';

const router = Router();

router.get('/', authenticate, withTenant, authorize('OWNER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    
    const payouts = await prisma.payout.findMany({
      where: { tenantId },
      orderBy: { date: 'desc' },
    });
    res.json(payouts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payouts' });
  }
});

router.post('/', authenticate, withTenant, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const { type, amount, currency, conversionRate, amountUSD, recipient, description, date } = req.body;
    if (!type || amount === undefined || !recipient || !date) {
      return res.status(400).json({ error: 'Type, amount, recipient, and date are required' });
    }

    const payout = await prisma.payout.create({
      data: {
        type,
        amount: parseFloat(amount),
        currency: currency || 'USD',
        conversionRate: conversionRate ? parseFloat(conversionRate) : null,
        amountUSD: parseFloat(amountUSD),
        recipient,
        description,
        date: new Date(date),
        tenantId: tenantId || req.body.tenantId,
      },
    });
    await logAction(req.user!.id, 'CREATE', 'Payout', payout.id, null, JSON.stringify(req.body));
    res.status(201).json(payout);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create payout' });
  }
});

router.put('/:id', authenticate, withTenant, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    
    const old = await prisma.payout.findUnique({ where: { id: req.params.id, tenantId } });
    if (!old) return res.status(404).json({ error: 'Payout not found' });
    
    const payout = await prisma.payout.update({
      where: { id: req.params.id },
      data: req.body,
    });
    await logAction(req.user!.id, 'UPDATE', 'Payout', req.params.id, JSON.stringify(old), JSON.stringify(req.body));
    res.json(payout);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update payout' });
  }
});

router.delete('/:id', authenticate, withTenant, authorize('OWNER'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    
    const payout = await prisma.payout.findUnique({ where: { id: req.params.id, tenantId } });
    if (!payout) return res.status(404).json({ error: 'Payout not found' });
    
    await prisma.payout.delete({ where: { id: req.params.id } });
    await logAction(req.user!.id, 'DELETE', 'Payout', req.params.id, null, null);
    res.json({ message: 'Payout deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete payout' });
  }
});

export default router;
