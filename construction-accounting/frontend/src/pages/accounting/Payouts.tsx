import React, { useEffect, useState } from 'react';
import { api, formatCurrency, formatDate } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash2, Wallet } from 'lucide-react';

interface Payout {
  id: string;
  type: string;
  amount: number;
  recipient: string;
  description: string | null;
  date: string;
}

const Payouts = () => {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ type: 'Owner Draw', amount: '', recipient: '', description: '', date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = () => {
    api.get<Payout[]>('/payouts/').then(setPayouts).finally(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/payouts/', { ...formData, amount: parseFloat(formData.amount) });
    setShowModal(false);
    setFormData({ type: 'Owner Draw', amount: '', recipient: '', description: '', date: new Date().toISOString().split('T')[0] });
    fetchPayouts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this payout?')) return;
    await api.delete(`/payouts/${id}`);
    fetchPayouts();
  };

  const isOwner = user?.role === 'OWNER';
  const totalPayouts = payouts.reduce((s, p) => s + p.amount, 0);

  if (loading) return <div className="flex items-center justify-center h-64">Loading payouts...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payouts & Investments</h1>
          <p className="text-gray-500 mt-1">Owner draws, shareholder payouts, and investments</p>
        </div>
        {isOwner && (
          <button onClick={() => setShowModal(true)} className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Record Payout
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <span className="text-sm text-gray-500">Total Payouts</span>
          <p className="text-xl font-bold">{formatCurrency(totalPayouts)}</p>
        </div>
        <div className="card">
          <span className="text-sm text-gray-500">Records</span>
          <p className="text-xl font-bold">{payouts.length}</p>
        </div>
        <div className="card">
          <span className="text-sm text-gray-500">Average Payout</span>
          <p className="text-xl font-bold">{payouts.length > 0 ? formatCurrency(totalPayouts / payouts.length) : '$0.00'}</p>
        </div>
      </div>

      {payouts.length === 0 ? (
        <div className="card text-center py-12">
          <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-500">No payouts recorded</h3>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Recipient</th>
                <th>Amount</th>
                <th>Description</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payouts.map(p => (
                <tr key={p.id}>
                  <td>{formatDate(p.date)}</td>
                  <td><span className="badge badge-blue">{p.type}</span></td>
                  <td className="font-medium">{p.recipient}</td>
                  <td className="font-medium">{formatCurrency(p.amount)}</td>
                  <td className="max-w-xs truncate">{p.description || '-'}</td>
                  <td>
                    {isOwner && (
                      <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700">
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
            <h2 className="text-lg font-bold mb-4">Record Payout</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select className="select" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                  <option value="Owner Draw">Owner Draw</option>
                  <option value="Shareholder Payout">Shareholder Payout</option>
                  <option value="Investment">Investment</option>
                  <option value="Dividend">Dividend</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient</label>
                <input className="input" value={formData.recipient} onChange={e => setFormData({ ...formData, recipient: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                <input className="input" type="number" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="input" rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input className="input" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Record Payout</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payouts;
