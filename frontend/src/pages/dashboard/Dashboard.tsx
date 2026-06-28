import { useEffect, useState } from 'react';
import { api, formatCurrency } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DollarSign, FolderKanban, Clock, TrendingUp, FileText, Truck, Users, Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
  if (error) return (
    <Card className="border-destructive/50">
      <CardContent className="py-6 text-center text-destructive">Error: {error}</CardContent>
    </Card>
  );
  if (!data) return null;

  const { summary, expenseByType } = data;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your construction business</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Project Expenses</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {formatCurrency(summary.totalExpenses)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              Across all projects
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Projects</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {summary.activeProjects}
              <span className="ml-1 text-sm font-normal text-muted-foreground">/ {summary.totalProjects}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <FolderKanban className="h-3 w-3" />
              Currently active
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Labor Hours</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {summary.totalLaborHours.toFixed(0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Total hours logged
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Office Payroll</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {formatCurrency(summary.totalOfficePayroll)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              Monthly office payroll
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Type</CardTitle>
            <CardDescription>Breakdown of project expenses by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseByType}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="expenseType" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="_sum.amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expense Distribution</CardTitle>
            <CardDescription>Proportion of expenses by type</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      {/* Additional Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Fixed Assets</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {formatCurrency(summary.totalAssetsValue)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <p className="mt-2 text-xs text-muted-foreground">
              Current value (originally {formatCurrency(summary.totalAssetsOriginal)})
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Payouts</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {formatCurrency(summary.totalPayouts)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <p className="mt-2 text-xs text-muted-foreground">
              Owner draws, shareholder payouts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Schedules of Value</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {(summary.sovs?.SUBMITTED || 0) + (summary.sovs?.DRAFT || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex gap-2">
              <Badge variant="secondary" className="text-xs">{summary.sovs?.SUBMITTED || 0} submitted</Badge>
              <Badge variant="outline" className="text-xs">{summary.sovs?.DRAFT || 0} drafts</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
