import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, formatCurrency, formatDate } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Plus, Trash2, ClipboardList, TrendingUp, FileBarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface Expense {
  id: string;
  amount: number;
  description: string;
  expenseType: string;
  date: string;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
}

const Expenses = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ amount: '', description: '', expenseType: 'MATERIAL', date: new Date().toISOString().split('T')[0], categoryId: '' });

  useEffect(() => {
    fetchExpenses();
  }, [id]);

  const fetchExpenses = () => {
    api.get<Expense[]>(`/expenses/?projectId=${id}`).then(setExpenses).finally(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/expenses/', {
      amount: parseFloat(formData.amount),
      description: formData.description,
      expenseType: formData.expenseType,
      date: formData.date,
      categoryId: formData.categoryId || null,
      projectId: id,
    });
    setShowModal(false);
    setFormData({ amount: '', description: '', expenseType: 'MATERIAL', date: new Date().toISOString().split('T')[0], categoryId: '' });
    fetchExpenses();
    toast.success('Expense recorded');
  };

  const handleDelete = async (expenseId: string) => {
    if (!confirm('Delete this expense?')) return;
    await api.delete(`/expenses/${expenseId}`);
    fetchExpenses();
    toast.success('Expense deleted');
  };

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  const typeVariants: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
    LABOR: 'default',
    MATERIAL: 'secondary',
    EQUIPMENT: 'outline',
    SUBCONTRACTOR: 'destructive',
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/projects/${id}`} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
            <p className="text-muted-foreground">Track and manage project expenses</p>
          </div>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" /> Add Expense
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Expenses</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{formatCurrency(totalAmount)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <p className="mt-2 text-xs text-muted-foreground">Sum of all recorded expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Expense Count</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{expenses.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <p className="mt-2 text-xs text-muted-foreground">Total expense entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Expense</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {expenses.length > 0 ? formatCurrency(totalAmount / expenses.length) : formatCurrency(0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <p className="mt-2 text-xs text-muted-foreground">Per expense entry</p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      {expenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <FileBarChart className="mb-3 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No expenses recorded for this project</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Logged By</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map(expense => (
                  <TableRow key={expense.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(expense.date)}</TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell><Badge variant={typeVariants[expense.expenseType] || 'secondary'}>{expense.expenseType}</Badge></TableCell>
                    <TableCell>{expense.category?.name || '-'}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(expense.amount)}</TableCell>
                    <TableCell>{expense.createdBy.name}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(expense.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input id="amount" type="number" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={formData.expenseType || ''} onValueChange={value => setFormData({ ...formData, expenseType: value ?? '' })}>
                <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LABOR">Labor</SelectItem>
                  <SelectItem value="MATERIAL">Material</SelectItem>
                  <SelectItem value="EQUIPMENT">Equipment</SelectItem>
                  <SelectItem value="SUBCONTRACTOR">Subcontractor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit">Add Expense</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Expenses;
