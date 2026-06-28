import { useEffect, useState } from 'react';
import { api, formatCurrency, formatDate } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash2, Wallet, TrendingUp, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/toast';

interface Payout {
  id: string;
  type: string;
  amount: number;
  recipient: string;
  description: string | null;
  date: string;
}

const Payouts = () => {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ type: 'Owner Draw', amount: '', recipient: '', description: '', date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = () => {
    api.get<Payout[]>('/payouts/').then(setPayouts).finally(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/payouts/', { ...formData, amount: parseFloat(formData.amount) });
    setShowModal(false);
    setFormData({ type: 'Owner Draw', amount: '', recipient: '', description: '', date: new Date().toISOString().split('T')[0] });
    fetchPayouts();
    toast.success('Payout recorded');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this payout?')) return;
    await api.delete(`/payouts/${id}`);
    fetchPayouts();
    toast.success('Payout deleted');
  };

  const isOwner = user?.role === 'OWNER';
  const totalPayouts = payouts.reduce((s, p) => s + p.amount, 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Payouts & Investments</h1>
          <p className="text-muted-foreground">Owner draws, shareholder payouts, and investments</p>
        </div>
        {isOwner && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" /> Record Payout
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Payouts</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{formatCurrency(totalPayouts)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Wallet className="h-3 w-3" /> All payouts combined
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Records</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{payouts.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Receipt className="h-3 w-3" /> Total payout entries
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Payout</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {payouts.length > 0 ? formatCurrency(totalPayouts / payouts.length) : formatCurrency(0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" /> Per payout entry
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payouts Table */}
      {payouts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Wallet className="mb-3 h-12 w-12 text-muted-foreground" />
            <h3 className="font-medium">No payouts recorded</h3>
            <p className="text-sm text-muted-foreground">Record your first owner draw or payout</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(p.date)}</TableCell>
                    <TableCell><Badge variant="secondary">{p.type}</Badge></TableCell>
                    <TableCell className="font-medium">{p.recipient}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(p.amount)}</TableCell>
                    <TableCell className="max-w-xs truncate">{p.description || '-'}</TableCell>
                    <TableCell>
                      {isOwner && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payout</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={formData.type || ''} onValueChange={value => setFormData({ ...formData, type: value ?? '' })}>
                <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Owner Draw">Owner Draw</SelectItem>
                  <SelectItem value="Shareholder Payout">Shareholder Payout</SelectItem>
                  <SelectItem value="Investment">Investment</SelectItem>
                  <SelectItem value="Dividend">Dividend</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient</Label>
              <Input id="recipient" value={formData.recipient} onChange={e => setFormData({ ...formData, recipient: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input id="amount" type="number" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit">Record Payout</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payouts;
