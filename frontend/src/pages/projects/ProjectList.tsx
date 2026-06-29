import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatCurrency } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Eye, FolderKanban, X, HardHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/toast';
import { Separator } from '@/components/ui/separator';

interface Project {
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
  totalLaborHours: number;
  totalContractValue: number;
  budgetCategories: any[];
  _count: { expenses: number; timesheets: number };
}

const ProjectList = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', clientName: '', originalContract: '', status: 'ACTIVE', description: '', identificationId: '', wageType: '' });
  const [identificationIds, setIdentificationIds] = useState<string[]>([]);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = () => {
    api.get<Project[]>('/projects/')
      .then(setProjects)
      .finally(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { identificationId, ...restForm } = formData;
    const data: Record<string, any> = { ...restForm, originalContract: parseFloat(restForm.originalContract), projectIdentificationIds: identificationIds };
    if (formData.wageType) data.wageType = formData.wageType;
    if (!data.clientName) delete data.clientName;
    await api.post('/projects/', data);
    setShowModal(false);
    setFormData({ name: '', clientName: '', originalContract: '', status: 'ACTIVE', description: '', identificationId: '', wageType: '' });
    setIdentificationIds([]);
    fetchProjects();
    toast({ title: 'Success', description: 'Project created successfully' });
  };

  const canCreate = user?.role === 'OWNER' || user?.role === 'MANAGER';

  const statusBadge = (status: string) => {
    const map: Record<string, 'default' | 'secondary' | 'outline'> = {
      ACTIVE: 'default',
      COMPLETED: 'secondary',
      ON_HOLD: 'outline',
    };
    return <Badge variant={map[status] || 'secondary'}>{status}</Badge>;
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
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">{projects.length} total projects</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        )}
      </div>

      {projects.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <CardContent className="flex flex-col items-center pt-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <FolderKanban className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="mt-4 text-lg font-medium">No projects yet</CardTitle>
            <CardDescription className="mt-1">Create your first project to get started</CardDescription>
            {canCreate && (
              <Button className="mt-4" onClick={() => setShowModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map(project => (
            <Link key={project.id} to={`/projects/${project.id}`} className="block">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base font-semibold truncate">{project.name}</CardTitle>
                    {statusBadge(project.status)}
                  </div>
                   {project.clientName && (
                     <CardDescription className="truncate">{project.clientName}</CardDescription>
                   )}
                   {project.wageType && (
                     <Badge variant="outline" className="mt-1">{project.wageType}</Badge>
                   )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contract Value</span>
                      <span className="font-medium">{formatCurrency(project.originalContract + project.totalChangeOrders)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Spent</span>
                      <span className="font-medium">{formatCurrency(project.totalExpenses)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Labor Hours</span>
                      <span className="font-medium">{project.totalLaborHours.toFixed(1)} hrs</span>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Completion</span>
                      <span className="font-medium">{project.estimatedCompletion}%</span>
                    </div>
                    <Progress value={project.estimatedCompletion} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>
              Create a new project to track expenses, timesheets, and SOV.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input id="project-name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-name">Client Name (optional)</Label>
              <Input id="client-name" value={formData.clientName} onChange={e => setFormData({ ...formData, clientName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract-value">Contract Value ($)</Label>
              <Input id="contract-value" type="number" step="0.01" value={formData.originalContract} onChange={e => setFormData({ ...formData, originalContract: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wage-type" className="flex items-center gap-1">
                <HardHat className="h-3.5 w-3.5" /> Wage Type
              </Label>
              <Select
                value={formData.wageType}
                onValueChange={wt => setFormData({ ...formData, wageType: wt ?? '' })}
              >
                <SelectTrigger id="wage-type"><SelectValue placeholder="Select wage type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIVATE">Private Wages</SelectItem>
                  <SelectItem value="PREVAILING">Prevailing Wages</SelectItem>
                  <SelectItem value="UNION">Union Wages</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Project ID Numbers (optional — add multiple)</p>
              <div className="space-y-2">
                {identificationIds.map((idVal, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span className="text-sm">{idVal}</span>
                    <button type="button" onClick={() => setIdentificationIds(identificationIds.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input value={formData.identificationId} onChange={e => setFormData({ ...formData, identificationId: e.target.value })} placeholder="e.g., D-2024-001" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (formData.identificationId.trim()) { setIdentificationIds([...identificationIds, formData.identificationId.trim()]); setFormData({ ...formData, identificationId: '' }); } } }} className="flex-1" />
                  <Button type="button" variant="outline" size="sm" onClick={() => { if (formData.identificationId.trim()) { setIdentificationIds([...identificationIds, formData.identificationId.trim()]); setFormData({ ...formData, identificationId: '' }); } }}>Add</Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit">Create Project</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectList;
