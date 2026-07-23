import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { platformApi } from '@/utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Users, FolderKanban, ArrowRight } from 'lucide-react';

interface PlatformStats {
  totalUsers: number;
  totalTenants: number;
  totalProjects: number;
  recentTenants: { id: string; name: string; slug: string; memberCount: number }[];
}

const PlatformDashboard = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformApi.get<PlatformStats>('/platform/stats')
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Platform Admin</h1>
        <Link to="/platform/tenants">
          <Button variant="outline">
            View All Tenants
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTenants || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProjects || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recentTenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tenants found.</p>
          ) : (
            <div className="space-y-4">
              {stats?.recentTenants.map(tenant => (
                <div key={tenant.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <Link
                      to={`/platform/tenants/${tenant.id}`}
                      className="font-medium hover:underline"
                    >
                      {tenant.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {tenant.memberCount} member{tenant.memberCount !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PlatformDashboard;
