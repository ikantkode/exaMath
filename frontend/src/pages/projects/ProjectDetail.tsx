import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, formatCurrency } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, DollarSign, Clock, Edit2, Save, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/toast';

interface ProjectDetail {
  id: string;
  name: string;
  clientName: string | null;
  originalContract: number;
  totalChangeOrders: number;
  status: string;
  estimatedCompletion: number;
  projectIdentificationIds: string[];
  wageType: string | null;
  totalExpenses: number;
  totalLabor: number;
  totalContractValue: number;
   budgetCategories: Array<{
     id: string;
     name: string;
     budget: number;
     expenses: Array<{ amountUSD: number }>;
   }>;

  expenses: any[];
  timesheets: any[];
}

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ estimatedCompletion: 0, totalChangeOrders: 0, status: 'ACTIVE' });

  useEffect(() => {
    api.get<ProjectDetail>(`/projects/${id}`)
      .then(data => {
        setProject(data);
        setEditData({
          estimatedCompletion: data.estimatedCompletion,
          totalChangeOrders: data.totalChangeOrders,
          status: data.status,
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    try {
      await api.put(`/projects/${id}`, editData);
      setEditing(false);
      api.get<ProjectDetail>(`/projects/${id}`).then(setProject);
      toast({ title: 'Success', description: 'Project updated successfully' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save project', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this project and all its data? This cannot be undone.')) return;
    try {
      await api.delete(`/projects/${id}`);
      navigate('/projects');
      toast({ title: 'Success', description: 'Project deleted successfully' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete project', variant: 'destructive' });
    }
  };

  const canEdit = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const isOwner = user?.role === 'OWNER';

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
  if (!project) return <div className="flex items-center justify-center h-64 text-muted-foreground">Project not found</div>;

  const budgetData = project.budgetCategories.map(cat => ({
    name: cat.name,
    budget: cat.budget,
     spent: cat.expenses.reduce((sum, e) => sum + e.amountUSD, 0),

  }));

  const profit = project.totalContractValue - project.totalExpenses - project.totalLabor;
  const budgetPercent = project.totalContractValue > 0 ? ((project.totalExpenses + project.totalLabor) / project.totalContractValue) * 100 : 0;

  const statusMap: Record<string, 'default' | 'secondary' | 'outline'> = {
    ACTIVE: 'default',
    COMPLETED: 'secondary',
    ON_HOLD: 'outline',
  };

  return (
    <div className="space-y-6">
      <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          {project.clientName && <p className="text-muted-foreground">{project.clientName}</p>}
          <div className="flex gap-1.5 pt-1">
            {project.projectIdentificationIds.map(pid => (
              <Badge key={pid} variant="secondary" className="text-xs">{pid}</Badge>
            ))}
            {project.wageType && <Badge variant={project.wageType === 'UNION' ? 'default' : project.wageType === 'PREVAILING' ? 'secondary' : 'outline'}>{project.wageType} Wages</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge(project.status)}
          {isOwner && !editing && (
            <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
          {canEdit && !editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Edit2 className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Project</CardTitle>
            <CardDescription>Update project details and status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="completion">Completion %</Label>
                <Input
                  id="completion"
                  type="number"
                  value={editData.estimatedCompletion}
                  onChange={e => setEditData({ ...editData, estimatedCompletion: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="changeOrders">Change Orders ($)</Label>
                <Input
                  id="changeOrders"
                  type="number"
                  step="0.01"
                  value={editData.totalChangeOrders}
                  onChange={e => setEditData({ ...editData, totalChangeOrders: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editData.status}
                  onValueChange={value => setEditData({ ...editData, status: value ?? 'ACTIVE' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Contract Value</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {formatCurrency(project.totalContractValue)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <DollarSign className="h-3 w-3" />
                  Original + change orders
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Expenses</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {formatCurrency(project.totalExpenses)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {project.expenses.length} expense records
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Labor Cost</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {formatCurrency(project.totalLabor)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {project.timesheets.length} time entries
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Estimated Profit</CardDescription>
                <CardTitle className={`text-2xl font-semibold tabular-nums ${profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {formatCurrency(profit)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className={profit >= 0 ? '' : 'text-destructive'}>
                  {profit >= 0 ? 'Under budget' : 'Over budget'}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Project Health */}
          <Card>
            <CardHeader>
              <CardTitle>Project Health</CardTitle>
              <CardDescription>Budget utilization and completion progress</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Budget Spent</span>
                  <span className="font-medium">{budgetPercent.toFixed(1)}%</span>
                </div>
                <div className="w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-3 rounded-full transition-all ${budgetPercent > 100 ? 'bg-destructive' : budgetPercent > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                  />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Physical Completion</span>
                  <span className="font-medium">{project.estimatedCompletion}%</span>
                </div>
                <Progress value={project.estimatedCompletion} className="h-3" />
              </div>
              <Separator />
              <Badge variant="outline" className={
                budgetPercent < project.estimatedCompletion ? 'text-green-600' :
                budgetPercent > project.estimatedCompletion + 10 ? 'text-destructive' :
                'text-yellow-600'
              }>
                {budgetPercent < project.estimatedCompletion ? 'Under budget — Good progress!' :
                 budgetPercent > project.estimatedCompletion + 10 ? 'Over budget — Action needed!' :
                 'On track — Monitor closely'}
              </Badge>
            </CardContent>
          </Card>

          {/* Budget Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Category Breakdown</CardTitle>
              <CardDescription>Budget vs actual spending by category</CardDescription>
            </CardHeader>
            <CardContent>
              {budgetData.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={budgetData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={formatCurrency} />
                      <YAxis type="category" dataKey="name" width={80} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="budget" fill="#93c5fd" name="Budget" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="spent" fill="#3b82f6" name="Spent" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <DollarSign className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">No budget categories defined</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link to={`/projects/${id}/expenses`} className="block">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Expenses</CardTitle>
                  <CardDescription>{project.expenses.length} expense records</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold tabular-nums">{formatCurrency(project.totalExpenses)}</p>
                </CardContent>
              </Card>
            </Link>
            <Link to={`/projects/${id}/sov`} className="block">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Schedule of Values</CardTitle>
                  <CardDescription>CSI-coded line items</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 text-sm font-medium text-primary">
                    Build SOV <ArrowLeft className="h-4 w-4 rotate-180" />
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link to={`/projects/${id}/timesheets`} className="block">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Timesheets</CardTitle>
                  <CardDescription>{project.timesheets.length} time entries</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold tabular-nums">{formatCurrency(project.totalLabor)}</p>
                </CardContent>
              </Card>
            </Link>
            <Link to={`/projects/${id}/field-workers`} className="block">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Field Workers</CardTitle>
                  <CardDescription>Assign & track payroll</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 text-sm font-medium text-primary">
                    View Workers <ArrowLeft className="h-4 w-4 rotate-180" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

function statusBadge(status: string) {
  const map: Record<string, 'default' | 'secondary' | 'outline'> = {
    ACTIVE: 'default',
    COMPLETED: 'secondary',
    ON_HOLD: 'outline',
  };
  return <Badge variant={map[status] || 'secondary'}>{status}</Badge>;
}

export default ProjectDetail;
