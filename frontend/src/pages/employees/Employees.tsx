import { useEffect, useState } from 'react';
import { api, formatCurrency } from '../../utils/api';
import { Plus, Trash2, Building2, Users } from 'lucide-react';
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
import { toast } from '@/components/ui/toast';

interface Employee {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  position?: string;
  compensationType: string;
  salary: number;
  bonus: number;
  deductions: number;
  taxes: number;
  isUnion: boolean;
}

const Employees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '', address: '', phone: '', email: '', position: '',
    compensationType: 'W2', salary: '', bonus: '0', deductions: '0', taxes: '0', isUnion: false,
  });

  useEffect(() => { fetchEmployees(); }, []);

  const fetchEmployees = () => {
    api.get<Employee[]>('/employees/').then(setEmployees).finally(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/employees/', {
        ...formData,
        salary: parseFloat(formData.salary),
        bonus: parseFloat(formData.bonus),
        deductions: parseFloat(formData.deductions),
        taxes: parseFloat(formData.taxes),
      });
      setFormData({ name: '', address: '', phone: '', email: '', position: '', compensationType: 'W2', salary: '', bonus: '0', deductions: '0', taxes: '0', isUnion: false });
      fetchEmployees();
      toast.success('Employee added');
      setShowModal(false);
    } catch (err: any) { toast.error(err.message || 'Failed to add employee'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this employee?')) return;
    try {
      await api.delete(`/employees/${id}`);
      fetchEmployees();
      toast.success('Employee deleted');
    } catch (err: any) { toast.error(err.message || 'Failed to delete employee'); }
  };

  const totalSalary = employees.reduce((sum, e) => sum + e.salary, 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Office Employees</h1>
          <p className="text-muted-foreground">Manage office staff and compensation</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Employee
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Employees</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{employees.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" /> Office staff
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Monthly Payroll</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{formatCurrency(totalSalary)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" /> Combined salaries
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>W2 Employees</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {employees.filter(e => e.compensationType === 'W2').length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-xs">vs {employees.filter(e => e.compensationType === 'INDEPENDENT_CONTRACTOR').length} 1099</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Compensation</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Bonus</TableHead>
                <TableHead>Taxes</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map(emp => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <div>{emp.name}</div>
                        {emp.isUnion && <Badge variant="outline" className="text-xs">Union</Badge>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{emp.position || '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {emp.email && <div>{emp.email}</div>}
                    {emp.phone && <div>{emp.phone}</div>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={emp.compensationType === 'W2' ? 'default' : 'secondary'}>
                      {emp.compensationType === 'W2' ? 'W2' : '1099'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium tabular-nums">{formatCurrency(emp.salary)}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{emp.bonus > 0 ? formatCurrency(emp.bonus) : '—'}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{formatCurrency(emp.taxes)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(emp.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No employees yet. Add your first employee to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
            <DialogDescription>Enter employee information and compensation details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emp-name">Full Name *</Label>
                <Input id="emp-name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-position">Position</Label>
                <Input id="emp-position" value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emp-email">Email</Label>
                <Input id="emp-email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-phone">Phone</Label>
                <Input id="emp-phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-address">Address</Label>
              <Input id="emp-address" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emp-comp">Compensation Type</Label>
                <Select value={formData.compensationType} onValueChange={ct => setFormData({ ...formData, compensationType: ct ?? 'W2' })}>
                  <SelectTrigger id="emp-comp"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="W2">W2 Employee</SelectItem>
                    <SelectItem value="INDEPENDENT_CONTRACTOR">1099 Contractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-salary">Salary / Rate ($) *</Label>
                <Input id="emp-salary" type="number" step="0.01" value={formData.salary} onChange={e => setFormData({ ...formData, salary: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emp-bonus">Bonus ($)</Label>
                <Input id="emp-bonus" type="number" step="0.01" value={formData.bonus} onChange={e => setFormData({ ...formData, bonus: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-deductions">Deductions ($)</Label>
                <Input id="emp-deductions" type="number" step="0.01" value={formData.deductions} onChange={e => setFormData({ ...formData, deductions: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-taxes">Taxes ($)</Label>
                <Input id="emp-taxes" type="number" step="0.01" value={formData.taxes} onChange={e => setFormData({ ...formData, taxes: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="emp-union" checked={formData.isUnion} onCheckedChange={v => setFormData({ ...formData, isUnion: !!v })} />
              <Label htmlFor="emp-union">Union employee</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit">Add Employee</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employees;
