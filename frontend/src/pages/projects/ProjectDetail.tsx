import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, formatCurrency } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, DollarSign, Clock, Edit2, Save, X, Trash2 } from 'lucide-react';

interface ProjectDetail {
  id: string;
  name: string;
  clientName: string | null;
  originalContract: number;
  totalChangeOrders: number;
  status: string;
  estimatedCompletion: number;
  projectIdentificationIds: string[];
  totalExpenses: number;
  totalLabor: number;
  totalContractValue: number;
  budgetCategories: Array<{
    id: string;
    name: string;
    budget: number;
    expenses: Array<{ amount: number }>;
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
    } catch (err: any) {
      alert(err.message || 'Failed to save project');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this project and all its data? This cannot be undone.')) return;
    try {
      await api.delete(`/projects/${id}`);
      navigate('/projects');
    } catch (err: any) {
      alert(err.message || 'Failed to delete project');
    }
  };

  const canEdit = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const isOwner = user?.role === 'OWNER';

  if (loading) return <div className="flex items-center justify-center h-64">Loading project details...</div>;
  if (!project) return <div>Project not found</div>;

  const budgetData = project.budgetCategories.map(cat => ({
    name: cat.name,
    budget: cat.budget,
    spent: cat.expenses.reduce((sum, e) => sum + e.amount, 0),
  }));

  const profit = project.totalContractValue - project.totalExpenses - project.totalLabor;
  const budgetPercent = project.totalContractValue > 0 ? ((project.totalExpenses + project.totalLabor) / project.totalContractValue) * 100 : 0;

  return (
    <div className="space-y-6">
      <Link to="/projects" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          {project.clientName && <p className="text-gray-500">{project.clientName}</p>}
          <div className="flex gap-2 mt-1 text-xs text-gray-400">
            {project.projectIdentificationIds.map(pid => (
              <span key={pid} className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{pid}</span>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {isOwner && !editing && (
            <button onClick={handleDelete} className="btn btn-secondary text-red-600 hover:text-red-800 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          )}
          {canEdit && !editing && (
            <button onClick={() => setEditing(true)} className="btn btn-secondary flex items-center gap-2">
              <Edit2 className="w-4 h-4" /> Edit
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Completion %</label>
              <input
                type="number"
                className="input"
                value={editData.estimatedCompletion}
                onChange={e => setEditData({ ...editData, estimatedCompletion: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Change Orders ($)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={editData.totalChangeOrders}
                onChange={e => setEditData({ ...editData, totalChangeOrders: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="select"
                value={editData.status}
                onChange={e => setEditData({ ...editData, status: e.target.value })}
              >
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="ON_HOLD">On Hold</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="btn btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" /> Save
            </button>
            <button onClick={() => setEditing(false)} className="btn btn-secondary flex items-center gap-2">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Contract Value</span>
              </div>
              <p className="text-xl font-bold">{formatCurrency(project.totalContractValue)}</p>
            </div>
            <div className="card">
              <span className="text-sm text-gray-500">Total Expenses</span>
              <p className="text-xl font-bold">{formatCurrency(project.totalExpenses)}</p>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Labor Cost</span>
              </div>
              <p className="text-xl font-bold">{formatCurrency(project.totalLabor)}</p>
            </div>
            <div className="card">
              <span className="text-sm text-gray-500">Estimated Profit</span>
              <p className={`text-xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(profit)}
              </p>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Project Health Gauge</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Budget Spent</span>
                  <span className="font-medium">{budgetPercent.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full transition-all ${budgetPercent > 100 ? 'bg-red-500' : budgetPercent > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Physical Completion</span>
                  <span className="font-medium">{project.estimatedCompletion}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div className="bg-blue-600 h-4 rounded-full transition-all" style={{ width: `${Math.min(project.estimatedCompletion, 100)}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {budgetPercent < project.estimatedCompletion ? (
                  <span className="text-green-600 font-medium">Under budget - Good progress!</span>
                ) : budgetPercent > project.estimatedCompletion + 10 ? (
                  <span className="text-red-600 font-medium">Over budget - Action needed!</span>
                ) : (
                  <span className="text-yellow-600 font-medium">On track - Monitor closely</span>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Cost Category Breakdown</h2>
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
              <p className="text-gray-400 text-center py-8">No budget categories defined</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to={`/projects/${id}/expenses`} className="card hover:shadow-md transition-shadow block">
              <h3 className="font-semibold mb-2">Expenses</h3>
              <p className="text-sm text-gray-500">{project.expenses.length} expense records</p>
              <p className="text-lg font-bold mt-2">{formatCurrency(project.totalExpenses)}</p>
            </Link>
            <Link to={`/projects/${id}/sov`} className="card hover:shadow-md transition-shadow block">
              <h3 className="font-semibold mb-2">Schedule of Values</h3>
              <p className="text-sm text-gray-500">CSI-coded line items</p>
              <p className="text-sm font-medium text-blue-600 mt-2">Build SOV →</p>
            </Link>
            <Link to={`/projects/${id}/timesheets`} className="card hover:shadow-md transition-shadow block">
              <h3 className="font-semibold mb-2">Timesheets</h3>
              <p className="text-sm text-gray-500">{project.timesheets.length} time entries</p>
              <p className="text-lg font-bold mt-2">{formatCurrency(project.totalLabor)}</p>
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default ProjectDetail;
