import { useEffect, useState } from 'react';
import { api, formatCurrency, formatDate } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash2, Users, Wallet, DollarSign, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface Employee {
  id: string;
  name: string;
  position?: string;
  compensationType: string;
}

interface PayrollEntry {
  id: string;
  employeeId: string;
  employee: Employee;
  grossPay: number;
  wages: number;
  benefits: number;
  taxes: number;
  deductions: number;
  netPay: number;
  periodStart: string;
  periodEnd: string;
  paid: boolean;
}

const OfficePayroll = () => {
  const { user } = useAuth();
  const [payroll, setPayroll] = useState<PayrollEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '', grossPay: '', wages: '', benefits: '', taxes: '', deductions: '', netPay: '',
    periodStart: new Date().toISOString().split('T')[0],
    periodEnd: new Date().toISOString().split('T')[0],
    paid: false,
  });

  useEffect(() => {
    Promise.all([
      api.get<PayrollEntry[]>('/office-payroll/'),
      api.get<Employee[]>('/employees/'),
    ]).then(([p, e]) => { setPayroll(p); setEmployees(e); })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const grossPay = parseFloat(formData.wages) + (parseFloat(formData.benefits) || 0);
      const netPay = grossPay - (parseFloat(formData.taxes) || 0) - (parseFloat(formData.deductions) || 0);
      await api.post('/office-payroll/', {
        employeeId: formData.employeeId,
        grossPay,
        wages: parseFloat(formData.wages),
        benefits: parseFloat(formData.benefits) || 0,
        taxes: parseFloat(formData.taxes) || 0,
        deductions: parseFloat(formData.deductions) || 0,
        netPay,
        periodStart: formData.periodStart,
        periodEnd: formData.periodEnd,
        paid: formData.paid,
      });
      setFormData({
        employeeId: '', grossPay: '', wages: '', benefits: '', taxes: '', deductions: '', netPay: '',
        periodStart: new Date().toISOString().split('T')[0],
        periodEnd: new Date().toISOString().split('T')[0],
        paid: false,
      });
      setShowModal(false);
      const [p, e] = await Promise.all([
        api.get<PayrollEntry[]>('/office-payroll/'),
        api.get<Employee[]>('/employees/'),
      ]);
      setPayroll(p);
      setEmployees(e);
      toast.success('Payroll record added');
    } catch (err: any) { toast.error(err.message || 'Failed to add payroll record'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this payroll record?')) return;
    try {
      await api.delete(`/office-payroll/${id}`);
      const p = await api.get<PayrollEntry[]>('/office-payroll/');
      setPayroll(p);
      toast.success('Record deleted');
    } catch (err: any) { toast.error(err.message || 'Failed to delete record'); }
  };

  const isManager = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const totalGross = payroll.reduce((s, p) => s + p.grossPay, 0);
  const totalNet = payroll.reduce((s, p) => s + p.netPay, 0);
  const totalBenefits = payroll.reduce((s, p) => s + p.benefits, 0);

  // Group payroll by employee
  const grouped = employees.map(emp => ({
    employee: emp,
    entries: payroll.filter(p => p.employeeId === emp.id).sort((a, b) => b.periodEnd.localeCompare(a.periodEnd)),
  })).filter(g => g.entries.length > 0);

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
          <p className="text-muted-foreground">Track office staff compensation and deductions</p>
        </div>
        {isManager && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Record
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Gross Pay</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{formatCurrency(totalGross)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" /> Wages + Benefits
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Benefits (Union)</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{formatCurrency(totalBenefits)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" /> Paid end of month
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Net Pay</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{formatCurrency(totalNet)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Wallet className="h-3 w-3" /> After deductions
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Records</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{payroll.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" /> Payroll entries
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payroll by Employee */}
      {grouped.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <DollarSign className="mb-3 h-12 w-12 text-muted-foreground" />
            <h3 className="font-medium">No payroll records</h3>
            <p className="text-sm text-muted-foreground">Add employees first, then create payroll records</p>
            {isManager && (
              <Button className="mt-4" onClick={() => setShowModal(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Record
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ employee, entries }) => (
            <Card key={employee.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-base font-medium">
                      {employee.name.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="text-base">{employee.name}</CardTitle>
                      <CardDescription>
                        {employee.position || 'No position'}
                        {' · '}
                        <Badge variant={employee.compensationType === 'W2' ? 'default' : 'secondary'}>
                          {employee.compensationType === 'W2' ? 'W2' : '1099'}
                        </Badge>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-muted-foreground">Total Paid</div>
                    <div className="font-medium tabular-nums">
                      {formatCurrency(entries.reduce((s, e) => s + e.netPay, 0))}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Wages</TableHead>
                      <TableHead className="text-right">Benefits</TableHead>
                      <TableHead className="text-right">Taxes</TableHead>
                      <TableHead className="text-right">Deductions</TableHead>
                      <TableHead className="text-right">Net Pay</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDate(entry.periodStart)} — {formatDate(entry.periodEnd)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(entry.wages)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(entry.benefits)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{formatCurrency(entry.taxes)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{formatCurrency(entry.deductions)}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{formatCurrency(entry.netPay)}</TableCell>
                        <TableCell>
                          <Badge variant={entry.paid ? 'default' : 'secondary'}>
                            {entry.paid ? (
                              <><Check className="mr-1 h-3 w-3" /> Paid</>
                            ) : 'Unpaid'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isManager && (
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id)} className="text-destructive hover:text-destructive">
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
          ))}
        </div>
      )}

      {/* Add Record Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Payroll Record</DialogTitle>
            <DialogDescription>Select an employee and enter payroll details for the period</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payroll-employee">Employee *</Label>
              <Select value={formData.employeeId || ''} onValueChange={id => setFormData({ ...formData, employeeId: id ?? '' })}>
                <SelectTrigger id="payroll-employee">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} {emp.position && `(${emp.position})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payroll-wages">Wages ($)</Label>
                <Input id="payroll-wages" type="number" step="0.01" value={formData.wages}
                  onChange={e => setFormData({ ...formData, wages: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payroll-benefits">Benefits ($)</Label>
                <Input id="payroll-benefits" type="number" step="0.01" value={formData.benefits}
                  onChange={e => setFormData({ ...formData, benefits: e.target.value })} />
                <p className="text-xs text-muted-foreground">For union employees</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payroll-taxes">Taxes ($)</Label>
                <Input id="payroll-taxes" type="number" step="0.01" value={formData.taxes}
                  onChange={e => setFormData({ ...formData, taxes: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payroll-deductions">Deductions ($)</Label>
                <Input id="payroll-deductions" type="number" step="0.01" value={formData.deductions}
                  onChange={e => setFormData({ ...formData, deductions: e.target.value })} />
              </div>
            </div>
            <div className="rounded-lg border bg-muted/50 p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gross Pay</span>
                <span className="font-medium tabular-nums">
                  {formData.wages ? formatCurrency(parseFloat(formData.wages) + (parseFloat(formData.benefits) || 0)) : '$0.00'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium">Net Pay</span>
                <span className="font-medium tabular-nums">
                  {formData.wages ? formatCurrency(
                    (parseFloat(formData.wages) + (parseFloat(formData.benefits) || 0)) -
                    (parseFloat(formData.taxes) || 0) - (parseFloat(formData.deductions) || 0)
                  ) : '$0.00'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payroll-start">Period Start *</Label>
                <Input id="payroll-start" type="date" value={formData.periodStart}
                  onChange={e => setFormData({ ...formData, periodStart: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payroll-end">Period End *</Label>
                <Input id="payroll-end" type="date" value={formData.periodEnd}
                  onChange={e => setFormData({ ...formData, periodEnd: e.target.value })} required />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="payroll-paid" checked={formData.paid}
                onCheckedChange={v => setFormData({ ...formData, paid: !!v })} />
              <Label htmlFor="payroll-paid">Mark as paid</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit">Add Record</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OfficePayroll;
