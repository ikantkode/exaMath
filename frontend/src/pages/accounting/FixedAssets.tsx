import React, { useEffect, useState } from 'react';
import { api, formatCurrency, formatDate } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash2, RefreshCw, Truck } from 'lucide-react';

interface FixedAsset {
  id: string;
  name: string;
  category: string;
  purchasePrice: number;
  purchaseDate: string;
  usefulLife: number;
  accumulatedDepreciation: number;
  currentValue: number;
}

const FixedAssets = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '', category: '', purchasePrice: '', purchaseDate: new Date().toISOString().split('T')[0], usefulLife: '',
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = () => {
    api.get<FixedAsset[]>('/fixed-assets/').then(setAssets).finally(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/fixed-assets/', {
      ...formData,
      purchasePrice: parseFloat(formData.purchasePrice),
      usefulLife: parseInt(formData.usefulLife),
    });
    setShowModal(false);
    setFormData({ name: '', category: '', purchasePrice: '', purchaseDate: new Date().toISOString().split('T')[0], usefulLife: '' });
    fetchAssets();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this asset?')) return;
    await api.delete(`/fixed-assets/${id}`);
    fetchAssets();
  };

  const handleRecalculate = async () => {
    if (!confirm('Recalculate depreciation for all assets?')) return;
    await api.post('/fixed-assets/recalculate', {});
    fetchAssets();
  };

  const isOwner = user?.role === 'OWNER';
  const totalOriginal = assets.reduce((s, a) => s + a.purchasePrice, 0);
  const totalCurrent = assets.reduce((s, a) => s + a.currentValue, 0);
  const totalDepreciated = totalOriginal - totalCurrent;

  if (loading) return <div className="flex items-center justify-center h-64">Loading assets...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fixed Assets</h1>
          <p className="text-gray-500 mt-1">Company vehicles, equipment, and tools</p>
        </div>
        <div className="flex gap-2">
          {isOwner && (
            <>
              <button onClick={handleRecalculate} className="btn btn-secondary flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Recalculate Depreciation
              </button>
              <button onClick={() => setShowModal(true)} className="btn btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Asset
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <span className="text-sm text-gray-500">Total Assets</span>
          <p className="text-xl font-bold">{assets.length}</p>
        </div>
        <div className="card">
          <span className="text-sm text-gray-500">Original Value</span>
          <p className="text-xl font-bold">{formatCurrency(totalOriginal)}</p>
        </div>
        <div className="card">
          <span className="text-sm text-gray-500">Current Value</span>
          <p className="text-xl font-bold">{formatCurrency(totalCurrent)}</p>
        </div>
        <div className="card">
          <span className="text-sm text-gray-500">Total Depreciated</span>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalDepreciated)}</p>
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="card text-center py-12">
          <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-500">No fixed assets recorded</h3>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Purchase Date</th>
                <th>Purchase Price</th>
                <th>Useful Life</th>
                <th>Depreciated</th>
                <th>Current Value</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {assets.map(asset => (
                <tr key={asset.id}>
                  <td className="font-medium">{asset.name}</td>
                  <td>{asset.category}</td>
                  <td>{formatDate(asset.purchaseDate)}</td>
                  <td>{formatCurrency(asset.purchasePrice)}</td>
                  <td>{asset.usefulLife} years</td>
                  <td className="text-red-600">{formatCurrency(asset.accumulatedDepreciation)}</td>
                  <td className="font-medium">{formatCurrency(asset.currentValue)}</td>
                  <td>
                    {isOwner && (
                      <button onClick={() => handleDelete(asset.id)} className="text-red-500 hover:text-red-700">
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
            <h2 className="text-lg font-bold mb-4">Add Fixed Asset</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name</label>
                <input className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select className="select" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                  <option value="">Select category</option>
                  <option value="Vehicle">Vehicle</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Tools">Tools</option>
                  <option value="Furniture">Furniture</option>
                  <option value="Technology">Technology</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price ($)</label>
                <input className="input" type="number" step="0.01" value={formData.purchasePrice} onChange={e => setFormData({ ...formData, purchasePrice: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                <input className="input" type="date" value={formData.purchaseDate} onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Useful Life (years)</label>
                <input className="input" type="number" value={formData.usefulLife} onChange={e => setFormData({ ...formData, usefulLife: e.target.value })} required />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Add Asset</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FixedAssets;
