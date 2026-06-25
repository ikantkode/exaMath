import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, formatCurrency, formatDate } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

interface Expense {
  id: string;
  amount: number;
  description: string;
  expenseType: string;
  date: string;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
}

const Expenses = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ amount: '', description: '', expenseType: 'MATERIAL', date: new Date().toISOString().split('T')[0], categoryId: '' });

  useEffect(() => {
    fetchExpenses();
  }, [id]);

  const fetchExpenses = () => {
    api.get<Expense[]>(`/expenses/?projectId=${id}`).then(setExpenses).finally(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/expenses/', {
      amount: parseFloat(formData.amount),
      description: formData.description,
      expenseType: formData.expenseType,
      date: formData.date,
      categoryId: formData.categoryId || null,
      projectId: id,
    });
    setShowModal(false);
    setFormData({ amount: '', description: '', expenseType: 'MATERIAL', date: new Date().toISOString().split('T')[0], categoryId: '' });
    fetchExpenses();
  };

  const handleDelete = async (expenseId: string) => {
    if (!confirm('Delete this expense?')) return;
    await api.delete(`/expenses/${expenseId}`);
    fetchExpenses();
  };

  const typeColors: Record<string, string> = {
    LABOR: 'badge-blue',
    MATERIAL: 'badge-green',
    EQUIPMENT: 'badge-yellow',
    SUBCONTRACTOR: 'badge-red',
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading expenses...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/projects/${id}`} className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <h1 className="text-xl font-bold">Expenses</h1>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {expenses.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400">No expenses recorded for this project</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Type</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Logged By</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(expense => (
                <tr key={expense.id}>
                  <td>{formatDate(expense.date)}</td>
                  <td>{expense.description}</td>
                  <td><span className={`badge ${typeColors[expense.expenseType] || 'badge-gray'}`}>{expense.expenseType}</span></td>
                  <td>{expense.category?.name || '-'}</td>
                  <td className="font-medium">{formatCurrency(expense.amount)}</td>
                  <td>{expense.createdBy.name}</td>
                  <td>
                    <button onClick={() => handleDelete(expense.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
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
            <h2 className="text-lg font-bold mb-4">Add Expense</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                <input className="input" type="number" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input className="input" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select className="select" value={formData.expenseType} onChange={e => setFormData({ ...formData, expenseType: e.target.value })}>
                  <option value="LABOR">Labor</option>
                  <option value="MATERIAL">Material</option>
                  <option value="EQUIPMENT">Equipment</option>
                  <option value="SUBCONTRACTOR">Subcontractor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input className="input" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Add Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
