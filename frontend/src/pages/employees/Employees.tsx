import { useEffect, useState } from 'react';
import { api, formatCurrency, formatDate } from '../../utils/api';
import { Plus, Trash2, Building2, Users, Edit, FileText, UsersIcon, Clock, Calendar } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';

interface EmploymentPeriod {
  id: string;
  startDate: string;
  endDate: string | null;
  salary: number | null;
  hourlyRate: number | null;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  address?: string;
  compensationType: string;
  isUnion: boolean;
  dependents: number;
  isPerDiem: boolean;
  status: string;
  employmentPeriods: EmploymentPeriod[];
  notes?: string | null;
}

type ModalMode = 'add' | 'edit' | null;

const ROLES = [
  'President', 'Vice President', 'Director of Construction', 'Project Manager',
  'Assistant Project Manager', 'Superintendent', 'Assistant Superintendent',
  'Office Manager', 'Accountant', 'HR Manager', 'Estimator', 'Safety Manager',
];

const Employees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', role: '', address: '',
    compensationType: 'W2', isUnion: false, dependents: '0',
    isPerDiem: false, startDate: new Date().toISOString().split('T')[0],
    endDate: '', salary: '', hourlyRate: '', notes: '',
    customRole: '',
  });
  const [showEmploymentModal, setShowEmploymentModal] = useState(false);
  const [employmentEmpId, setEmploymentEmpId] = useState('');
  const [empPeriodData, setEmpPeriodData] = useState({
    startDate: '', endDate: '', salary: '', hourlyRate: '',
  });

  useEffect(() => { fetchEmployees(); }, []);

  const fetchEmployees = () => {
    api.get<Employee[]>('/employees/').then(setEmployees).finally(() => setLoading(false));
  };

  const openAdd = () => {
    setModalMode('add');
    setEditingId(null);
    setFormData({
      name: '', email: '', phone: '', role: '', address: '',
      compensationType: 'W2', isUnion: false, dependents: '0',
      isPerDiem: false, startDate: new Date().toISOString().split('T')[0],
      endDate: '', salary: '', hourlyRate: '', notes: '', customRole: '',
    });
  };

  const openEdit = (emp: Employee) => {
    setModalMode('edit');
    setEditingId(emp.id);
    const hasCustomRole = !ROLES.includes(emp.role);
    setFormData({
      name: emp.name, email: emp.email, phone: emp.phone,
      role: hasCustomRole ? 'Other' : emp.role,
      address: emp.address || '',
      compensationType: emp.compensationType,
      isUnion: emp.isUnion, dependents: String(emp.dependents),
      isPerDiem: emp.isPerDiem,
      startDate: emp.employmentPeriods[0]?.startDate?.split('T')[0] || '',
      endDate: '', salary: emp.employmentPeriods[0]?.salary != null ? String(emp.employmentPeriods[0].salary) : '',
      hourlyRate: emp.employmentPeriods[0]?.hourlyRate != null ? String(emp.employmentPeriods[0].hourlyRate) : '',
      notes: emp.notes || '',
      customRole: hasCustomRole ? emp.role : '',
    });
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const roleValue = formData.role === 'Other' ? formData.customRole : formData.role;
      if (!roleValue) { toast.error('Please select a role or enter a custom one'); return; }
      const body: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: roleValue,
        address: formData.address || null,
        compensationType: formData.compensationType,
        isUnion: formData.isUnion,
        dependents: parseInt(formData.dependents) || 0,
        isPerDiem: formData.isPerDiem,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        salary: formData.salary ? parseFloat(formData.salary) : null,
        hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
        notes: formData.notes || null,
      };
      if (formData.isPerDiem) { body.salary = null; }

      if (modalMode === 'add') {
        await api.post('/employees/', body);
        toast.success('Employee added');
      } else {
        await api.put(`/employees/${editingId}`, body);
        toast.success('Employee updated');
      }
      closeModal();
      fetchEmployees();
    } catch (err: any) { toast.error(err.message || 'Failed to save employee'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this employee and all their records?')) return;
    try {
      await api.delete(`/employees/${id}`);
      fetchEmployees();
      toast.success('Employee deleted');
    } catch (err: any) { toast.error(err.message || 'Failed to delete employee'); }
  };

  const handleTerminate = async (empId: string, periodId: string) => {
    if (!confirm('Terminate this employment period? The employee will be marked as terminated.')) return;
    try {
      await api.patch(`/employees/${empId}/employment-periods/${periodId}/terminate`);
      fetchEmployees();
      toast.success('Employment terminated');
    } catch (err: any) { toast.error(err.message || 'Failed to terminate'); }
  };

  const openRehire = (empId: string, emp: Employee) => {
    setEmploymentEmpId(empId);
    setEmpPeriodData({
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      salary: emp.employmentPeriods[0]?.salary != null ? String(emp.employmentPeriods[0].salary) : '',
      hourlyRate: emp.employmentPeriods[0]?.hourlyRate != null ? String(emp.employmentPeriods[0].hourlyRate) : '',
    });
    setShowEmploymentModal(true);
  };

  const handleRehire = async () => {
    try {
      await api.post(`/employees/${employmentEmpId}/employment-periods`, {
        startDate: empPeriodData.startDate,
        endDate: empPeriodData.endDate || null,
        salary: empPeriodData.salary ? parseFloat(empPeriodData.salary) : null,
        hourlyRate: empPeriodData.hourlyRate ? parseFloat(empPeriodData.hourlyRate) : null,
      });
      setShowEmploymentModal(false);
      fetchEmployees();
      toast.success('New employment period added');
    } catch (err: any) { toast.error(err.message || 'Failed to add employment period'); }
  };

  const handleReactivate = async (empId: string) => {
    try {
      await api.patch(`/employees/${empId}/reactivate`);
      fetchEmployees();
      toast.success('Employee reactivated');
    } catch (err: any) { toast.error(err.message || 'Failed to reactivate'); }
  };

  const totalPaid = employees.reduce((s, e) => s + e.employmentPeriods.reduce((ps, p) => ps + (p.salary || 0), 0), 0);
  const activeCount = employees.filter(e => e.status === 'ACTIVE').length;
  const terminatedCount = employees.filter(e => e.status === 'TERMINATED').length;

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
          <p className="text-muted-foreground">Manage office staff, roles, and compensation</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Employee
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Employees</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{employees.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <UsersIcon className="h-3 w-3" /> Office staff
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums text-green-600">{activeCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Badge variant="default" className="text-xs">Active</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Terminated</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums text-red-600">{terminatedCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Badge variant="destructive" className="text-xs">Terminated</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Annual</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{formatCurrency(totalPaid)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" /> Active salaries
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
                <TableHead>Role</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Compensation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>History</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map(emp => {
                const activePeriod = emp.employmentPeriods.find(p => p.endDate === null);
                const lastPeriod = emp.employmentPeriods[0];
                return (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <div>{emp.name}</div>
                          <div className="flex items-center gap-1">
                            {emp.isUnion && <Badge variant="outline" className="text-xs">Union</Badge>}
                            {emp.isPerDiem && <Badge variant="outline" className="text-xs">Per-Diem</Badge>}
                            {emp.notes && <Badge variant="outline" className="text-xs"><FileText className="mr-1 h-3 w-3" />Notes</Badge>}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">{emp.role}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      <div>{emp.email}</div>
                      <div>{emp.phone}</div>
                      {emp.address && <div className="text-xs text-muted-foreground/70">{emp.address}</div>}
                    </TableCell>
                    <TableCell className="font-medium tabular-nums">
                      {activePeriod ? (
                        activePeriod.salary ? formatCurrency(activePeriod.salary) + '/yr' :
                        activePeriod.hourlyRate ? formatCurrency(activePeriod.hourlyRate) + '/hr' : '—'
                      ) : lastPeriod?.salary ? formatCurrency(lastPeriod.salary) + '/yr' : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={emp.status === 'ACTIVE' ? 'default' : 'destructive'}>
                        {emp.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {emp.employmentPeriods.length} period{emp.employmentPeriods.length !== 1 ? 's' : ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(emp)} className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                        {emp.status === 'TERMINATED' && (
                          <Button variant="ghost" size="icon" onClick={() => openRehire(emp.id, emp)} className="h-8 w-8" title="Rehire">
                            <UsersIcon className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(emp.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No employees yet. Add your first employee to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Employee Dialog */}
      <Dialog open={modalMode !== null} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modalMode === 'edit' ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
            <DialogDescription>{modalMode === 'edit' ? 'Update employee information' : 'Enter employee information and employment details'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emp-name">Full Name *</Label>
                <Input id="emp-name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-role">Role *</Label>
                <Select value={formData.role} onValueChange={v => setFormData({ ...formData, role: v, customRole: v === 'Other' ? '' : v })}>
                  <SelectTrigger id="emp-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    <SelectItem value="Other">Other (custom)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formData.role === 'Other' && (
              <div className="space-y-2">
                <Label htmlFor="emp-custom-role">Custom Role *</Label>
                <Input id="emp-custom-role" value={formData.customRole}
                  onChange={e => setFormData({ ...formData, customRole: e.target.value })}
                  placeholder="e.g. Payroll Coordinator" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emp-email">Email *</Label>
                <Input id="emp-email" type="email" value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-phone">Phone *</Label>
                <Input id="emp-phone" value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-address">Address</Label>
              <Input id="emp-address" value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })} />
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
              <div className="flex items-center gap-2 pt-6">
                <Checkbox id="emp-union" checked={formData.isUnion}
                  onCheckedChange={v => setFormData({ ...formData, isUnion: !!v })} />
                <Label htmlFor="emp-union">Union employee</Label>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="emp-perdiem" checked={formData.isPerDiem}
                onCheckedChange={v => setFormData({ ...formData, isPerDiem: !!v })} />
              <Label htmlFor="emp-perdiem">Per-diem employee</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emp-start">Start Date *</Label>
                <Input id="emp-start" type="date" value={formData.startDate}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-end">End Date</Label>
                <Input id="emp-end" type="date" value={formData.endDate}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
              </div>
            </div>
            {!formData.isPerDiem && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emp-salary">Yearly Salary ($)</Label>
                  <Input id="emp-salary" type="number" step="0.01" value={formData.salary}
                    onChange={e => setFormData({ ...formData, salary: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emp-rate">Hourly Rate ($)</Label>
                  <Input id="emp-rate" type="number" step="0.01" value={formData.hourlyRate}
                    onChange={e => setFormData({ ...formData, hourlyRate: e.target.value })} />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emp-dependents">Dependents</Label>
                <Input id="emp-dependents" type="number" min="0" value={formData.dependents}
                  onChange={e => setFormData({ ...formData, dependents: e.target.value })} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox id="emp-union2" checked={formData.isUnion}
                  onCheckedChange={v => setFormData({ ...formData, isUnion: !!v })} />
                <Label htmlFor="emp-union2">Union employee</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-notes">Notes</Label>
              <Textarea id="emp-notes" value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                rows={3} placeholder="Any additional notes about this employee..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
              <Button type="submit">{modalMode === 'edit' ? 'Save Changes' : 'Add Employee'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rehire / New Employment Period Dialog */}
      <Dialog open={showEmploymentModal} onOpenChange={setShowEmploymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Employment Period</DialogTitle>
            <DialogDescription>Start a new employment period (re-hire)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emp-start">Start Date *</Label>
              <Input id="emp-start" type="date" value={empPeriodData.startDate}
                onChange={e => setEmpPeriodData({ ...empPeriodData, startDate: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-end">End Date (optional)</Label>
              <Input id="emp-end" type="date" value={empPeriodData.endDate}
                onChange={e => setEmpPeriodData({ ...empPeriodData, endDate: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emp-salary">Yearly Salary ($)</Label>
                <Input id="emp-salary" type="number" step="0.01" value={empPeriodData.salary}
                  onChange={e => setEmpPeriodData({ ...empPeriodData, salary: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-rate">Hourly Rate ($)</Label>
                <Input id="emp-rate" type="number" step="0.01" value={empPeriodData.hourlyRate}
                  onChange={e => setEmpPeriodData({ ...empPeriodData, hourlyRate: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowEmploymentModal(false)}>Cancel</Button>
            <Button onClick={handleRehire}>Add Period</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employment History Dialog */}
      <Dialog open={false} onOpenChange={() => {}}>
      </Dialog>
    </div>
  );
};

export default Employees;
