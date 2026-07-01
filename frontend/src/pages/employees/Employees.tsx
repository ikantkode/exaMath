import { useEffect, useState } from 'react';
import { api, formatCurrency } from '../../utils/api';
import { Plus, Trash2, Building2, Users, Edit, FileText, Users as UsersIcon } from 'lucide-react';
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

interface Employee {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  compensationType: string;
  isUnion: boolean;
  dependents: number;
  notes?: string | null;
}

type ModalMode = 'add' | 'edit' | null;

const Employees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', address: '', phone: '', email: '',
    compensationType: 'W2',
    isUnion: false, dependents: '0', notes: '',
  });

  useEffect(() => { fetchEmployees(); }, []);

  const fetchEmployees = () => {
    api.get<Employee[]>('/employees/').then(setEmployees).finally(() => setLoading(false));
  };

  const openAdd = () => {
    setModalMode('add');
    setEditingId(null);
    setFormData({ name: '', address: '', phone: '', email: '', compensationType: 'W2', isUnion: false, dependents: '0', notes: '' });
  };

  const openEdit = (emp: Employee) => {
    setModalMode('edit');
    setEditingId(emp.id);
     setFormData({
        name: emp.name,
        address: emp.address || '',
        phone: emp.phone || '',
        email: emp.email || '',
        compensationType: emp.compensationType,
        isUnion: emp.isUnion,
        dependents: String(emp.dependents),
        notes: emp.notes || '',
      });
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        ...formData,
        dependents: formData.dependents ? parseInt(formData.dependents) : 0,
        notes: formData.notes || null,
      };
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
    if (!confirm('Delete this employee?')) return;
    try {
      await api.delete(`/employees/${id}`);
      fetchEmployees();
      toast.success('Employee deleted');
    } catch (err: any) { toast.error(err.message || 'Failed to delete employee'); }
  };

  const unionCount = employees.filter(e => e.isUnion).length;

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
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Union Members</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{unionCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs">Union</Badge>
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
                <TableHead>Contact</TableHead>
                <TableHead>Compensation</TableHead>
                <TableHead>Dependents</TableHead>
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
                        <div className="flex items-center gap-1">
                          {emp.isUnion && <Badge variant="outline" className="text-xs">Union</Badge>}
                          {emp.notes && <Badge variant="outline" className="text-xs"><FileText className="mr-1 h-3 w-3" />Notes</Badge>}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {emp.email && <div>{emp.email}</div>}
                    {emp.phone && <div>{emp.phone}</div>}
                    {emp.address && <div className="text-xs text-muted-foreground">{emp.address}</div>}
                    {!emp.email && !emp.phone && !emp.address && <span className="text-muted-foreground/50">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={emp.compensationType === 'W2' ? 'default' : 'secondary'}>
                      {emp.compensationType === 'W2' ? 'W2' : '1099'}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {emp.dependents > 0 ? <><UsersIcon className="mr-1 h-3 w-3 inline" />{emp.dependents}</> : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(emp)} className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(emp.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No employees yet. Add your first employee to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={modalMode !== null} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modalMode === 'edit' ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
            <DialogDescription>{modalMode === 'edit' ? 'Update employee information' : 'Enter employee information and compensation details'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emp-name">Full Name *</Label>
              <Input id="emp-name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
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
                <Label htmlFor="emp-dependents">Dependents</Label>
                <Input id="emp-dependents" type="number" min="0" value={formData.dependents} onChange={e => setFormData({ ...formData, dependents: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Checkbox id="emp-union" checked={formData.isUnion} onCheckedChange={v => setFormData({ ...formData, isUnion: !!v })} />
              <Label htmlFor="emp-union">Union employee</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-notes">Notes</Label>
              <Textarea id="emp-notes" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={3} placeholder="Any additional notes about this employee..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
              <Button type="submit">{modalMode === 'edit' ? 'Save Changes' : 'Add Employee'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employees;
