import { useEffect, useState } from 'react';
import { api, formatCurrency, formatDate } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash2, Wallet, DollarSign, Check, Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';

interface Employee {
  id: string;
  name: string;
  role: string;
  isUnion: boolean;
  compensationType: string;
  employmentPeriods: { id: string }[];
}

interface PaymentLog {
  id: string;
  employeeId: string;
  employee: Employee;
  employmentPeriodId?: string;
  amount: number;
  date: string;
  paymentMethod: string;
  paymentType: string;
  description?: string | null;
}

interface Stats {
  byType: { paymentType: string; _sum: { amount: number } }[];
  byMethod: { paymentMethod: string; _sum: { amount: number } }[];
  total: number;
  count: number;
}

const PAYMENT_METHODS = ['WIRE', 'ZELLE', 'CASH', 'CHECK', 'OTHER'];
const PAYMENT_TYPES = ['SALARY', 'BONUS', 'OTHER'];

const methodLabel = (m: string) => {
  const map: Record<string, string> = { WIRE: 'Wire', ZELLE: 'Zelle', CASH: 'Cash', CHECK: 'Check', OTHER: 'Other' };
  return map[m] || m;
};

const typeLabel = (t: string) => {
  const map: Record<string, string> = { SALARY: 'Salary', BONUS: 'Bonus', OTHER: 'Other' };
  return map[t] || t;
};

const OfficePayroll = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<Stats>({ byType: [], byMethod: [], total: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({ employeeId: '', paymentType: '', paymentMethod: '', startDate: '', endDate: '' });

  const [formData, setFormData] = useState({
    employeeId: '', amount: '', date: new Date().toISOString().split('T')[0],
    paymentMethod: 'WIRE', paymentType: 'SALARY', description: '',
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = () => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) query.set(k, v); });
    Promise.all([
      api.get<PaymentLog[]>(`/office-payroll/?${query}`),
      api.get<Employee[]>('/employees/'),
      api.get<Stats>('/office-payroll/stats'),
    ]).then(([p, e, s]) => {
      setPayments(p);
      setEmployees(e);
      setStats(s);
    }).finally(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formData.paymentType === 'OTHER' && !formData.description) {
        toast.error('Description is required for "Other" payment type');
        return;
      }
      await api.post('/office-payroll/', {
        employeeId: formData.employeeId,
        amount: parseFloat(formData.amount),
        date: formData.date,
        paymentMethod: formData.paymentMethod,
        paymentType: formData.paymentType,
        description: formData.paymentType === 'OTHER' ? formData.description : null,
      });
      setFormData({
        employeeId: '', amount: '', date: new Date().toISOString().split('T')[0],
        paymentMethod: 'WIRE', paymentType: 'SALARY', description: '',
      });
      setShowModal(false);
      fetchData();
      toast.success('Payment log added');
    } catch (err: any) { toast.error(err.message || 'Failed to add payment log'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this payment record?')) return;
    try {
      await api.delete(`/office-payroll/${id}`);
      fetchData();
      toast.success('Payment deleted');
    } catch (err: any) { toast.error(err.message || 'Failed to delete payment'); }
  };

  const toggleEmployee = (id: string) => {
    setExpandedEmployees(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isManager = user?.role === 'OWNER' || user?.role === 'MANAGER';

  const grouped = employees.map(emp => ({
    employee: emp,
    entries: payments.filter(p => p.employeeId === emp.id).sort((a, b) => b.date.localeCompare(a.date)),
  })).filter(g => g.entries.length > 0);

  const methodBadge = (m: string) => {
    const colors: Record<string, string> = {
      WIRE: 'bg-blue-100 text-blue-800', ZELLE: 'bg-purple-100 text-purple-800',
      CASH: 'bg-green-100 text-green-800', CHECK: 'bg-yellow-100 text-yellow-800', OTHER: 'bg-gray-100 text-gray-800',
    };
    return <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${colors[m] || ''}`}>{methodLabel(m)}</span>;
  };

  const typeBadge = (t: string) => {
    const colors: Record<string, string> = {
      SALARY: 'bg-slate-100 text-slate-800', BONUS: 'bg-amber-100 text-amber-800',
      OTHER: 'bg-gray-100 text-gray-800',
    };
    return <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${colors[t] || ''}`}>{typeLabel(t)}</span>;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Office Payroll</h1>
          <p className="text-muted-foreground">Payment log — track all compensation</p>
        </div>
        {isManager && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Log Payment
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Paid</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{formatCurrency(stats.total)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" /> {stats.count} payment{stats.count !== 1 ? 's' : ''}
            </div>
          </CardContent>
        </Card>
        {(stats.byType || []).map(bt => (
          <Card key={bt.paymentType}>
            <CardHeader className="pb-2">
              <CardDescription>{typeLabel(bt.paymentType)}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">{formatCurrency(bt._sum.amount || 0)}</CardTitle>
            </CardHeader>
            <CardContent>
              <Separator />
              <div className="mt-2 text-xs text-muted-foreground">By type</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={filters.employeeId} onValueChange={v => setFilters({ ...filters, employeeId: v })}>
                <SelectTrigger className="w-48"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  {employees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={filters.paymentType} onValueChange={v => setFilters({ ...filters, paymentType: v })}>
                <SelectTrigger className="w-36"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map(t => <SelectItem key={t} value={t}>{typeLabel(t)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={filters.paymentMethod} onValueChange={v => setFilters({ ...filters, paymentMethod: v })}>
                <SelectTrigger className="w-36"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{methodLabel(m)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>From</Label>
              <Input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} className="w-40" />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} className="w-40" />
            </div>
            <Button variant="outline" onClick={() => setFilters({ employeeId: '', paymentType: '', paymentMethod: '', startDate: '', endDate: '' })}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Log by Employee */}
      {grouped.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Wallet className="mb-3 h-12 w-12 text-muted-foreground" />
            <h3 className="font-medium">No payment logs</h3>
            <p className="text-sm text-muted-foreground">Add employees first, then log payments</p>
            {isManager && (
              <Button className="mt-4" onClick={() => setShowModal(true)}>
                <Plus className="mr-2 h-4 w-4" /> Log Payment
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ employee, entries }) => {
            const isExpanded = expandedEmployees.has(employee.id);
            const totalPaid = entries.reduce((s, e) => s + e.amount, 0);
            return (
              <Card key={employee.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost" size="icon" className="h-6 w-6"
                        onClick={() => toggleEmployee(employee.id)}
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                      <div>
                        <CardTitle className="text-base">{employee.name}</CardTitle>
                        <CardDescription>{employee.role} · {entries.length} payment{entries.length !== 1 ? 's' : ''}</CardDescription>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-muted-foreground">Total Paid</div>
                      <div className="font-medium tabular-nums">{formatCurrency(totalPaid)}</div>
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          {isManager && <TableHead></TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entries.map(entry => (
                          <TableRow key={entry.id}>
                            <TableCell className="whitespace-nowrap text-sm">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {formatDate(entry.date)}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium tabular-nums">{formatCurrency(entry.amount)}</TableCell>
                            <TableCell>{methodBadge(entry.paymentMethod)}</TableCell>
                            <TableCell>{typeBadge(entry.paymentType)}</TableCell>
                            <TableCell className="text-sm max-w-xs truncate">
                              {entry.description || '—'}
                            </TableCell>
                            {isManager && (
                              <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id)} className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Log Payment Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Payment</DialogTitle>
            <DialogDescription>Record a compensation payment to an employee</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payroll-employee">Employee *</Label>
              <Select value={formData.employeeId || ''} onValueChange={id => setFormData({ ...formData, employeeId: id ?? '' })}>
                <SelectTrigger id="payroll-employee"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payroll-amount">Amount ($) *</Label>
                <Input id="payroll-amount" type="number" step="0.01" value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payroll-date">Date *</Label>
                <Input id="payroll-date" type="date" value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payroll-method">Payment Method *</Label>
                <Select value={formData.paymentMethod} onValueChange={v => setFormData({ ...formData, paymentMethod: v ?? 'WIRE' })}>
                  <SelectTrigger id="payroll-method"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{methodLabel(m)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payroll-type">Payment Type *</Label>
                <Select value={formData.paymentType} onValueChange={v => setFormData({ ...formData, paymentType: v ?? 'SALARY', description: v !== 'OTHER' ? '' : formData.description })}>
                  <SelectTrigger id="payroll-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TYPES.map(t => <SelectItem key={t} value={t}>{typeLabel(t)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formData.paymentType === 'OTHER' && (
              <div className="space-y-2">
                <Label htmlFor="payroll-desc">Description *</Label>
                <Textarea id="payroll-desc" value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What is this payment for?" rows={2} required />
              </div>
            )}
            {formData.paymentType !== 'OTHER' && formData.description && (
              <div className="space-y-2">
                <Label htmlFor="payroll-desc">Description</Label>
                <Textarea id="payroll-desc" value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional note" rows={2} />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit">Log Payment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OfficePayroll;
