import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, formatCurrency, formatDate } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

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
  };

  const handleDelete = async (tsId: string) => {
    if (!confirm('Delete this timesheet entry?')) return;
    await api.delete(`/timesheets/${tsId}`);
    fetchTimesheets();
  };

  const canDelete = user?.role === 'OWNER';
  const totalHours = timesheets.reduce((sum, t) => sum + t.hours, 0);
  const totalCost = timesheets.reduce((sum, t) => sum + t.hours * t.rate, 0);

  if (loading) return <div className="flex items-center justify-center h-64">Loading timesheets...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/projects/${id}`} className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <h1 className="text-xl font-bold">Timesheets</h1>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Log Hours
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <span className="text-sm text-gray-500">Total Hours</span>
          <p className="text-xl font-bold">{totalHours.toFixed(1)} hrs</p>
        </div>
        <div className="card">
          <span className="text-sm text-gray-500">Total Labor Cost</span>
          <p className="text-xl font-bold">{formatCurrency(totalCost)}</p>
        </div>
        <div className="card">
          <span className="text-sm text-gray-500">Entries</span>
          <p className="text-xl font-bold">{timesheets.length}</p>
        </div>
      </div>

      {timesheets.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400">No timesheet entries for this project</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Hours</th>
                <th>Rate</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {timesheets.map(ts => (
                <tr key={ts.id}>
                  <td>{formatDate(ts.date)}</td>
                  <td>{ts.user.name}</td>
                  <td>{ts.hours}</td>
                  <td>{formatCurrency(ts.rate)}</td>
                  <td className="font-medium">{formatCurrency(ts.hours * ts.rate)}</td>
                  <td>
                    {canDelete && (
                      <button onClick={() => handleDelete(ts.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Log Hours</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
                <input className="input" type="number" step="0.5" value={formData.hours} onChange={e => setFormData({ ...formData, hours: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($)</label>
                <input className="input" type="number" step="0.01" value={formData.rate} onChange={e => setFormData({ ...formData, rate: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input className="input" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Log Hours</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timesheets;
