import React, { useEffect, useState } from 'react';
import { api, formatCurrency, formatDate } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash2, FileText } from 'lucide-react';

interface Payroll {
  id: string;
  employeeName: string;
  position: string;
  grossPay: number;
  taxes: number;
  insurance: number;
  netPay: number;
  periodStart: string;
  periodEnd: string;
}

const OfficePayroll = () => {
  const { user } = useAuth();
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    employeeName: '', position: '', grossPay: '', taxes: '', insurance: '', netPay: '',
    periodStart: new Date().toISOString().split('T')[0], periodEnd: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchPayroll();
  }, []);

  const fetchPayroll = () => {
    api.get<Payroll[]>('/office-payroll/').then(setPayroll).finally(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/office-payroll/', {
      ...formData,
      grossPay: parseFloat(formData.grossPay),
      taxes: parseFloat(formData.taxes),
      insurance: parseFloat(formData.insurance),
      netPay: parseFloat(formData.netPay),
    });
    setShowModal(false);
    setFormData({
      employeeName: '', position: '', grossPay: '', taxes: '', insurance: '', netPay: '',
      periodStart: new Date().toISOString().split('T')[0], periodEnd: new Date().toISOString().split('T')[0],
    });
    fetchPayroll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this payroll record?')) return;
    await api.delete(`/office-payroll/${id}`);
    fetchPayroll();
  };

  const isOwner = user?.role === 'OWNER';
  const totalGross = payroll.reduce((s, p) => s + p.grossPay, 0);
  const totalNet = payroll.reduce((s, p) => s + p.netPay, 0);

  if (loading) return <div className="flex items-center justify-center h-64">Loading payroll...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Office Payroll</h1>
          <p className="text-gray-500 mt-1">Non-field staff compensation</p>
        </div>
        {isOwner && (
          <button onClick={() => setShowModal(true)} className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Record
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <span className="text-sm text-gray-500">Total Gross Pay</span>
          <p className="text-xl font-bold">{formatCurrency(totalGross)}</p>
        </div>
        <div className="card">
          <span className="text-sm text-gray-500">Total Net Pay</span>
          <p className="text-xl font-bold">{formatCurrency(totalNet)}</p>
        </div>
        <div className="card">
          <span className="text-sm text-gray-500">Records</span>
          <p className="text-xl font-bold">{payroll.length}</p>
        </div>
      </div>

      {payroll.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-500">No payroll records</h3>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Position</th>
                <th>Period</th>
                <th>Gross Pay</th>
                <th>Taxes</th>
                <th>Insurance</th>
                <th>Net Pay</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payroll.map(p => (
                <tr key={p.id}>
                  <td className="font-medium">{p.employeeName}</td>
                  <td>{p.position}</td>
                  <td>{formatDate(p.periodStart)} - {formatDate(p.periodEnd)}</td>
                  <td>{formatCurrency(p.grossPay)}</td>
                  <td>{formatCurrency(p.taxes)}</td>
                  <td>{formatCurrency(p.insurance)}</td>
                  <td className="font-medium">{formatCurrency(p.netPay)}</td>
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold mb-4">Add Payroll Record</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name</label>
                  <input className="input" value={formData.employeeName} onChange={e => setFormData({ ...formData, employeeName: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <input className="input" value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gross Pay ($)</label>
                  <input className="input" type="number" step="0.01" value={formData.grossPay} onChange={e => setFormData({ ...formData, grossPay: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Taxes ($)</label>
                  <input className="input" type="number" step="0.01" value={formData.taxes} onChange={e => setFormData({ ...formData, taxes: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Insurance ($)</label>
                  <input className="input" type="number" step="0.01" value={formData.insurance} onChange={e => setFormData({ ...formData, insurance: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Net Pay ($)</label>
                <input className="input" type="number" step="0.01" value={formData.netPay} onChange={e => setFormData({ ...formData, netPay: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period Start</label>
                  <input className="input" type="date" value={formData.periodStart} onChange={e => setFormData({ ...formData, periodStart: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period End</label>
                  <input className="input" type="date" value={formData.periodEnd} onChange={e => setFormData({ ...formData, periodEnd: e.target.value })} required />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Add Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficePayroll;
