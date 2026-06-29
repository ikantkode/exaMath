import { useEffect, useState } from 'react';
import { api, formatCurrency, formatDate } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash2, RefreshCw, Truck, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/toast';

interface FixedAsset {
  id: string;
  name: string;
  category: string;
  purchasePrice: number;
  purchaseDate: string;
  usefulLife: number;
  accumulatedDepreciation: number;
  currentValue: number;
}

const FixedAssets = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '', category: '', purchasePrice: '', purchaseDate: new Date().toISOString().split('T')[0], usefulLife: '',
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = () => {
    api.get<FixedAsset[]>('/fixed-assets/').then(setAssets).finally(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/fixed-assets/', {
      ...formData,
      purchasePrice: parseFloat(formData.purchasePrice),
      usefulLife: parseInt(formData.usefulLife),
    });
    setShowModal(false);
    setFormData({ name: '', category: '', purchasePrice: '', purchaseDate: new Date().toISOString().split('T')[0], usefulLife: '' });
    fetchAssets();
    toast.success('Asset added');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this asset?')) return;
    await api.delete(`/fixed-assets/${id}`);
    fetchAssets();
    toast.success('Asset deleted');
  };

  const handleRecalculate = async () => {
    if (!confirm('Recalculate depreciation for all assets?')) return;
    await api.post('/fixed-assets/recalculate', {});
    fetchAssets();
    toast.success('Depreciation recalculated');
  };

  const isOwner = user?.role === 'OWNER';
  const totalOriginal = assets.reduce((s, a) => s + a.purchasePrice, 0);
  const totalCurrent = assets.reduce((s, a) => s + a.currentValue, 0);
  const totalDepreciated = totalOriginal - totalCurrent;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Fixed Assets</h1>
          <p className="text-muted-foreground">Company vehicles, equipment, and tools</p>
        </div>
        <div className="flex gap-2">
          {isOwner && (
            <>
              <Button variant="outline" onClick={handleRecalculate}>
                <RefreshCw className="h-4 w-4" /> Recalculate
              </Button>
              <Button onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4" /> Add Asset
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Assets</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{assets.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Truck className="h-3 w-3" /> Registered assets
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Original Value</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{formatCurrency(totalOriginal)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <p className="mt-2 text-xs text-muted-foreground">At time of purchase</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current Value</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{formatCurrency(totalCurrent)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <p className="mt-2 text-xs text-muted-foreground">After depreciation</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Depreciated</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{formatCurrency(totalDepreciated)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3" /> Accumulated depreciation
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assets Table */}
      {assets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Truck className="mb-3 h-12 w-12 text-muted-foreground" />
            <h3 className="font-medium">No fixed assets recorded</h3>
            <p className="text-sm text-muted-foreground">Add vehicles, equipment, or tools</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead className="text-right">Purchase Price</TableHead>
                  <TableHead>Useful Life</TableHead>
                  <TableHead className="text-right">Depreciated</TableHead>
                  <TableHead className="text-right">Current Value</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map(asset => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>{asset.category}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(asset.purchaseDate)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(asset.purchasePrice)}</TableCell>
                    <TableCell>{asset.usefulLife} years</TableCell>
                    <TableCell className="text-right text-destructive tabular-nums">{formatCurrency(asset.accumulatedDepreciation)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(asset.currentValue)}</TableCell>
                    <TableCell>
                      {isOwner && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(asset.id)} className="text-destructive hover:text-destructive">
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
            <DialogTitle>Add Fixed Asset</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Asset Name</Label>
              <Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category || ''} onValueChange={value => setFormData({ ...formData, category: value ?? '' })}>
                <SelectTrigger id="category"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vehicle">Vehicle</SelectItem>
                  <SelectItem value="Equipment">Equipment</SelectItem>
                  <SelectItem value="Tools">Tools</SelectItem>
                  <SelectItem value="Furniture">Furniture</SelectItem>
                  <SelectItem value="Technology">Technology</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Purchase Price ($)</Label>
              <Input id="purchasePrice" type="number" step="0.01" value={formData.purchasePrice} onChange={e => setFormData({ ...formData, purchasePrice: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchaseDate">Purchase Date</Label>
              <Input id="purchaseDate" type="date" value={formData.purchaseDate} onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usefulLife">Useful Life (years)</Label>
              <Input id="usefulLife" type="number" value={formData.usefulLife} onChange={e => setFormData({ ...formData, usefulLife: e.target.value })} required />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit">Add Asset</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FixedAssets;
