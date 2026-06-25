import React, { useEffect, useState } from 'react';
import { api, formatCurrency } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DollarSign, FolderKanban, Clock, TrendingUp, FileText, Truck, Users } from 'lucide-react';

interface DashboardData {
  summary: {
    totalExpenses: number;
    totalLaborHours: number;
    totalOfficePayroll: number;
    totalAssetsValue: number;
    totalAssetsOriginal: number;
    totalPayouts: number;
    activeProjects: number;
    totalProjects: number;
    sovs: Record<string, number>;
  };
  expenseByType: Array<{ expenseType: string; _sum: { amount: number } }>;
  expenseByCategory: Array<{ categoryId: string; _sum: { amount: number } }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<DashboardData>('/dashboard/')
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64">Loading dashboard...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;
  if (!data) return null;

  const { summary, expenseByType } = data;

  const stats = [
    { label: 'Total Project Expenses', value: formatCurrency(summary.totalExpenses), icon: DollarSign, color: 'bg-blue-500' },
    { label: 'Active Projects', value: summary.activeProjects, icon: FolderKanban, color: 'bg-green-500' },
    { label: 'Labor Hours', value: summary.totalLaborHours.toFixed(0), icon: Clock, color: 'bg-yellow-500' },
    { label: 'Office Payroll', value: formatCurrency(summary.totalOfficePayroll), icon: Users, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your construction business</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className={`${stat.color} w-10 h-10 rounded-lg flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Expenses by Type</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseByType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="expenseType" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="_sum.amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Expense Distribution</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseByType}
                  dataKey="_sum.amount"
                  nameKey="expenseType"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name }) => name}
                >
                  {expenseByType.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <Truck className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold">Fixed Assets</h3>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(summary.totalAssetsValue)}</p>
          <p className="text-sm text-gray-500">Current value (originally {formatCurrency(summary.totalAssetsOriginal)})</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold">Total Payouts</h3>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(summary.totalPayouts)}</p>
          <p className="text-sm text-gray-500">Owner draws, shareholder payouts</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold">Schedules of Value</h3>
          </div>
          <p className="text-2xl font-bold">{(summary.sovs?.SUBMITTED || 0) + (summary.sovs?.DRAFT || 0)}</p>
          <p className="text-sm text-gray-500">{summary.sovs?.SUBMITTED || 0} awaiting approval, {summary.sovs?.DRAFT || 0} in draft</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
