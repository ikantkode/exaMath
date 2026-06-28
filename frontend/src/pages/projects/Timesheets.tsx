import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, formatCurrency, formatDate } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Plus, Trash2, Clock, DollarSign, FileClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface Timesheet {
  id: string;
  hours: number;
  rate: number;
  date: string;
  user: { id: string; name: string };
}

const Timesheets = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ hours: '', rate: '', date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    fetchTimesheets();
  }, [id]);

  const fetchTimesheets = () => {
    api.get<Timesheet[]>(`/timesheets/?projectId=${id}`).then(setTimesheets).finally(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/timesheets/', {
      hours: parseFloat(formData.hours),
      rate: parseFloat(formData.rate),
      date: formData.date,
      projectId: id,
    });
    setShowModal(false);
    setFormData({ hours: '', rate: '', date: new Date().toISOString().split('T')[0] });
    fetchTimesheets();
    toast.success('Hours logged');
  };

  const handleDelete = async (tsId: string) => {
    if (!confirm('Delete this timesheet entry?')) return;
    await api.delete(`/timesheets/${tsId}`);
    fetchTimesheets();
    toast.success('Entry deleted');
  };

  const canDelete = user?.role === 'OWNER';
  const totalHours = timesheets.reduce((sum, t) => sum + t.hours, 0);
  const totalCost = timesheets.reduce((sum, t) => sum + t.hours * t.rate, 0);

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
            <h1 className="text-2xl font-bold tracking-tight">Timesheets</h1>
            <p className="text-muted-foreground">Track labor hours for this project</p>
          </div>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" /> Log Hours
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Hours</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{totalHours.toFixed(1)} hrs</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> Cumulative hours logged
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Labor Cost</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{formatCurrency(totalCost)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" /> Based on hourly rates
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Entries</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{timesheets.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <FileClock className="h-3 w-3" /> Total time entries
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timesheets Table */}
      {timesheets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <FileClock className="mb-3 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No timesheet entries for this project</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timesheets.map(ts => (
                  <TableRow key={ts.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(ts.date)}</TableCell>
                    <TableCell>{ts.user.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{ts.hours}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(ts.rate)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(ts.hours * ts.rate)}</TableCell>
                    <TableCell>
                      {canDelete && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(ts.id)} className="text-destructive hover:text-destructive">
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
            <DialogTitle>Log Hours</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hours">Hours</Label>
              <Input id="hours" type="number" step="0.5" value={formData.hours} onChange={e => setFormData({ ...formData, hours: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">Hourly Rate ($)</Label>
              <Input id="rate" type="number" step="0.01" value={formData.rate} onChange={e => setFormData({ ...formData, rate: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit">Log Hours</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Timesheets;
