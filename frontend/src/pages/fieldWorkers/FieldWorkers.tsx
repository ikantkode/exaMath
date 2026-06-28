import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, formatCurrency } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash2, Calendar, Clock, UserPlus, HardHat } from 'lucide-react';
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

interface FieldWorker {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  compensationType: string;
  isUnion: boolean;
}

interface Assignment {
  id: string;
  fieldWorkerId: string;
  fieldWorker: FieldWorker;
  wageRate: number;
  benefitRate: number;
  payrollEntries: PayrollEntry[];
}

interface PayrollEntry {
  id: string;
  hoursWorked: number;
  grossWages: number;
  grossBenefits: number;
  taxes: number;
  deductions: number;
  netPay: number;
  periodStart: string;
  periodEnd: string;
  paid: boolean;
}

const FieldWorkers = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allWorkers, setAllWorkers] = useState<FieldWorker[]>([]);
  const [loading, setLoading] = useState(true);

  // Assign worker modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignData, setAssignData] = useState({ fieldWorkerId: '', wageRate: '', benefitRate: '' });

  // Payroll modal
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [payrollData, setPayrollData] = useState({ hoursWorked: '', periodStart: '', periodEnd: '', taxes: '0', deductions: '0' });

  const isManager = user?.role === 'OWNER' || user?.role === 'MANAGER';

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      api.get<any>(`/projects/${projectId}`),
      api.get<Assignment[]>('/field-workers/assignments/' + projectId),
      api.get<FieldWorker[]>('/field-workers/workers'),
    ]).then(([proj, asgn, workers]) => {
      setProject(proj);
      setAssignments(asgn);
      setAllWorkers(workers);
    }).finally(() => setLoading(false));
  }, [projectId]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/field-workers/assignments', {
        fieldWorkerId: assignData.fieldWorkerId,
        projectId,
        wageRate: parseFloat(assignData.wageRate),
        benefitRate: parseFloat(assignData.benefitRate) || 0,
      });
      setAssignData({ fieldWorkerId: '', wageRate: '', benefitRate: '' });
      setShowAssignModal(false);
      const assignments = await api.get<Assignment[]>('/field-workers/assignments/' + projectId);
      setAssignments(assignments);
      toast.success('Worker assigned');
    } catch (err: any) { toast.error(err.message || 'Failed to assign worker'); }
  };

  const handleUnassign = async (id: string) => {
    if (!confirm('Remove this worker from the project?')) return;
    try {
      await api.delete(`/field-workers/assignments/${id}`);
      const assignments = await api.get<Assignment[]>('/field-workers/assignments/' + projectId);
      setAssignments(assignments);
      toast.success('Worker removed');
    } catch (err: any) { toast.error(err.message || 'Failed to remove worker'); }
  };

  const handlePayrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;
    try {
      await api.post('/field-workers/payroll', {
        assignmentId: selectedAssignment.id,
        hoursWorked: parseFloat(payrollData.hoursWorked),
        periodStart: payrollData.periodStart,
        periodEnd: payrollData.periodEnd,
        taxes: parseFloat(payrollData.taxes) || 0,
        deductions: parseFloat(payrollData.deductions) || 0,
      });
      setPayrollData({ hoursWorked: '', periodStart: '', periodEnd: '', taxes: '0', deductions: '0' });
      setShowPayrollModal(false);
      setSelectedAssignment(null);
      const assignments = await api.get<Assignment[]>('/field-workers/assignments/' + projectId);
      setAssignments(assignments);
      toast.success('Payroll entry created');
    } catch (err: any) { toast.error(err.message || 'Failed to create payroll'); }
  };

  const openPayroll = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    const today = new Date().toISOString().split('T')[0];
    setPayrollData({ hoursWorked: '', periodStart: today, periodEnd: today, taxes: '0', deductions: '0' });
    setShowPayrollModal(true);
  };

  const wageType = project?.wageType || 'PRIVATE';
  const totalWages = assignments.reduce((sum, a) => sum + a.payrollEntries.reduce((s, p) => s + p.grossWages, 0), 0);
  const totalBenefits = wageType === 'UNION' ? assignments.reduce((sum, a) => sum + a.payrollEntries.reduce((s, p) => s + p.grossBenefits, 0), 0) : 0;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}`)} className="h-8 text-muted-foreground">
              ← Back
            </Button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Field Workers</h1>
          <p className="text-muted-foreground">
            {project?.name} — <Badge variant={wageType === 'UNION' ? 'default' : wageType === 'PREVAILING' ? 'secondary' : 'outline'}>{wageType} Wages</Badge>
          </p>
        </div>
        {isManager && (
          <Button onClick={() => setShowAssignModal(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Assign Worker
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Assigned Workers</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{assignments.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <HardHat className="h-3 w-3" /> On this project
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Wages</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{formatCurrency(totalWages)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> All payroll entries
            </div>
          </CardContent>
        </Card>
        {wageType === 'UNION' && (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Benefits (Monthly)</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">{formatCurrency(totalBenefits)}</CardTitle>
            </CardHeader>
            <CardContent>
              <Separator />
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" /> Paid end of month
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {assignments.length > 0 ? (
        <div className="space-y-4">
          {assignments.map(assignment => (
            <Card key={assignment.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-base font-medium">
                      {assignment.fieldWorker.name.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="text-base">{assignment.fieldWorker.name}</CardTitle>
                      <CardDescription>
                        {assignment.fieldWorker.email || 'No email'}
                        {assignment.fieldWorker.isUnion && <Badge variant="outline" className="ml-2">Union</Badge>}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right text-sm">
                      <div className="text-muted-foreground">Wage Rate</div>
                      <div className="font-medium tabular-nums">{formatCurrency(assignment.wageRate)}/hr</div>
                    </div>
                    {wageType === 'UNION' && (
                      <div className="text-right text-sm">
                        <div className="text-muted-foreground">Benefit Rate</div>
                        <div className="font-medium tabular-nums">{formatCurrency(assignment.benefitRate)}/hr</div>
                      </div>
                    )}
                    {isManager && (
                      <Button variant="outline" size="sm" onClick={() => openPayroll(assignment)}>
                        <Plus className="mr-1 h-3.5 w-3.5" /> Log Hours
                      </Button>
                    )}
                    {isManager && (
                      <Button variant="ghost" size="icon" onClick={() => handleUnassign(assignment.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              {assignment.payrollEntries.length > 0 && (
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Wages</TableHead>
                        {wageType === 'UNION' && <TableHead>Benefits</TableHead>}
                        <TableHead>Taxes</TableHead>
                        <TableHead>Deductions</TableHead>
                        <TableHead>Net Pay</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignment.payrollEntries.map(entry => (
                        <TableRow key={entry.id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {new Date(entry.periodStart).toLocaleDateString()} — {new Date(entry.periodEnd).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="tabular-nums">{entry.hoursWorked} hrs</TableCell>
                          <TableCell className="font-medium tabular-nums">{formatCurrency(entry.grossWages)}</TableCell>
                          {wageType === 'UNION' && <TableCell className="tabular-nums">{formatCurrency(entry.grossBenefits)}</TableCell>}
                          <TableCell className="tabular-nums text-muted-foreground">{formatCurrency(entry.taxes)}</TableCell>
                          <TableCell className="tabular-nums text-muted-foreground">{formatCurrency(entry.deductions)}</TableCell>
                          <TableCell className="font-medium tabular-nums">{formatCurrency(entry.netPay)}</TableCell>
                          <TableCell>
                            <Badge variant={entry.paid ? 'default' : 'secondary'}>{entry.paid ? 'Paid' : 'Unpaid'}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center py-16">
          <CardContent className="flex flex-col items-center pt-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <HardHat className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="mt-4 text-lg font-medium">No workers assigned</CardTitle>
            <CardDescription className="mt-1">Assign field workers to start tracking payroll</CardDescription>
            {isManager && (
              <Button className="mt-4" onClick={() => setShowAssignModal(true)}>
                <UserPlus className="mr-2 h-4 w-4" /> Assign Worker
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assign Worker Dialog */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Worker to Project</DialogTitle>
            <DialogDescription>Select a worker and set wage rates for this project</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssign} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assign-worker">Worker</Label>
              <Select value={assignData.fieldWorkerId || ''} onValueChange={id => setAssignData({ ...assignData, fieldWorkerId: id ?? '' })}>
                <SelectTrigger id="assign-worker"><SelectValue placeholder="Select a worker" /></SelectTrigger>
                <SelectContent>
                  {allWorkers.filter(w => !assignments.some(a => a.fieldWorkerId === w.id)).map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assign-wage">Wage Rate ($/hr) *</Label>
              <Input id="assign-wage" type="number" step="0.01" value={assignData.wageRate} onChange={e => setAssignData({ ...assignData, wageRate: e.target.value })} required />
              {wageType === 'PREVAILING' || wageType === 'PRIVATE' ? (
                <p className="text-xs text-muted-foreground">Enter combined wage + benefit rate</p>
              ) : (
                <p className="text-xs text-muted-foreground">Hourly wage only</p>
              )}
            </div>
            {wageType === 'UNION' && (
              <div className="space-y-2">
                <Label htmlFor="assign-benefit">Benefit Rate ($/hr) *</Label>
                <Input id="assign-benefit" type="number" step="0.01" value={assignData.benefitRate} onChange={e => setAssignData({ ...assignData, benefitRate: e.target.value })} required />
                <p className="text-xs text-muted-foreground">Paid at end of each month</p>
              </div>
            )}
            {(wageType === 'PREVAILING' || wageType === 'PRIVATE') && (
              <div className="space-y-2">
                <Label htmlFor="assign-benefit-opt">Benefit Rate ($/hr) — optional</Label>
                <Input id="assign-benefit-opt" type="number" step="0.01" value={assignData.benefitRate} onChange={e => setAssignData({ ...assignData, benefitRate: e.target.value })} />
                <p className="text-xs text-muted-foreground">Leave blank if included in wage rate</p>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAssignModal(false)}>Cancel</Button>
              <Button type="submit">Assign Worker</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Log Hours Dialog */}
      <Dialog open={showPayrollModal} onOpenChange={setShowPayrollModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Hours — {selectedAssignment?.fieldWorker.name}</DialogTitle>
            <DialogDescription>Enter hours worked for this pay period</DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePayrollSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payroll-hours">Hours Worked *</Label>
              <Input id="payroll-hours" type="number" step="0.25" value={payrollData.hoursWorked} onChange={e => setPayrollData({ ...payrollData, hoursWorked: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payroll-start">Start Date *</Label>
                <Input id="payroll-start" type="date" value={payrollData.periodStart} onChange={e => setPayrollData({ ...payrollData, periodStart: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payroll-end">End Date *</Label>
                <Input id="payroll-end" type="date" value={payrollData.periodEnd} onChange={e => setPayrollData({ ...payrollData, periodEnd: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payroll-taxes">Taxes ($)</Label>
                <Input id="payroll-taxes" type="number" step="0.01" value={payrollData.taxes} onChange={e => setPayrollData({ ...payrollData, taxes: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payroll-deductions">Deductions ($)</Label>
                <Input id="payroll-deductions" type="number" step="0.01" value={payrollData.deductions} onChange={e => setPayrollData({ ...payrollData, deductions: e.target.value })} />
              </div>
            </div>
            {selectedAssignment && (
              <div className="rounded-lg border bg-muted/50 p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wages</span>
                  <span className="font-medium tabular-nums">
                    {payrollData.hoursWorked ? formatCurrency(parseFloat(payrollData.hoursWorked) * selectedAssignment.wageRate) : '$0.00'}
                  </span>
                </div>
                {wageType === 'UNION' && selectedAssignment.benefitRate > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Benefits</span>
                    <span className="font-medium tabular-nums">
                      {payrollData.hoursWorked ? formatCurrency(parseFloat(payrollData.hoursWorked) * selectedAssignment.benefitRate) : '$0.00'}
                    </span>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowPayrollModal(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FieldWorkers;
