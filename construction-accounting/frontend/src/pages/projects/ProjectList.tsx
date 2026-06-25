import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatCurrency } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Eye, FolderKanban } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  clientName: string;
  originalContract: number;
  totalChangeOrders: number;
  status: string;
 estimatedCompletion: number;
   designNumber?: string;
   agencyNumber?: string;
   agencyNumberType?: string;
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
  const [formData, setFormData] = useState({ name: '', clientName: '', originalContract: '', status: 'ACTIVE', description: '', designNumber: '', agencyNumber: '', agencyNumberType: '' });

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
    const data = { ...formData, originalContract: parseFloat(formData.originalContract) };
    if (!data.designNumber) delete data.designNumber;
    if (!data.agencyNumber) delete data.agencyNumber;
    if (!data.agencyNumberType) delete data.agencyNumberType;
    await api.post('/projects/', data);
    setShowModal(false);
    setFormData({ name: '', clientName: '', originalContract: '', status: 'ACTIVE', description: '', designNumber: '', agencyNumber: '', agencyNumberType: '' });
    fetchProjects();
  };

  const canCreate = user?.role === 'OWNER' || user?.role === 'MANAGER';

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      ACTIVE: 'badge-green',
      COMPLETED: 'badge-blue',
      ON_HOLD: 'badge-yellow',
    };
    return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading projects...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">{projects.length} total projects</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowModal(true)} className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Project
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="card text-center py-12">
          <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-500">No projects yet</h3>
          <p className="text-gray-400 mt-1">Create your first project to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <Link key={project.id} to={`/projects/${project.id}`} className="card hover:shadow-md transition-shadow block">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
                {statusBadge(project.status)}
              </div>
              <p className="text-sm text-gray-500 mb-4">{project.clientName}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Contract Value</span>
                  <span className="font-medium">{formatCurrency(project.originalContract + project.totalChangeOrders)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Spent</span>
                  <span className="font-medium">{formatCurrency(project.totalExpenses)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Labor Hours</span>
                  <span className="font-medium">{project.totalLaborHours.toFixed(1)} hrs</span>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Completion</span>
                    <span className="font-medium">{project.estimatedCompletion}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(project.estimatedCompletion, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">New Project</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                <input className="input" value={formData.clientName} onChange={e => setFormData({ ...formData, clientName: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contract Value ($)</label>
                <input className="input" type="number" step="0.01" value={formData.originalContract} onChange={e => setFormData({ ...formData, originalContract: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="input" rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="border-t border-gray-200 pt-3">
                <p className="text-xs text-gray-400 mb-2">Project ID Numbers (optional — set per your agency)</p>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Design Number</label>
                    <input className="input" value={formData.designNumber} onChange={e => setFormData({ ...formData, designNumber: e.target.value })} placeholder="e.g., D-2024-001" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Agency #</label>
                      <input className="input" value={formData.agencyNumber} onChange={e => setFormData({ ...formData, agencyNumber: e.target.value })} placeholder="e.g., LLW-1234" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select className="select" value={formData.agencyNumberType} onChange={e => setFormData({ ...formData, agencyNumberType: e.target.value })}>
                        <option value="">Select...</option>
                        <option value="LLW">LLW (NYC SCB)</option>
                        <option value="SED">SED (LI UFSD)</option>
                        <option value="Job">Job #</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;
