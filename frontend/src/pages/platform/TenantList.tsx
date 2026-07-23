import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { platformApi } from '@/utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Trash2, Search, Plus } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  memberCount: number;
  projectCount: number;
  createdAt: string;
}

interface TenantListResponse {
  tenants: Tenant[];
  total: number;
  page: number;
  pageSize: number;
}

const TenantList = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: '20',
    });
    if (search) params.set('search', search);

    platformApi.get<TenantListResponse>(`/platform/tenants?${params}`)
      .then(data => {
        setTenants(data.tenants);
        setTotal(data.total);
      })
      .finally(() => setLoading(false));
  }, [page, search]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This will delete the tenant and all associated data.')) return;
    try {
      await platformApi.delete(`/platform/tenants/${id}`);
      setTenants(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      alert('Failed to delete tenant');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/platform">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Tenants</h1>
        </div>
        <Link to="/platform/tenants/create">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Account
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {total} tenant{total !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or slug..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Members</TableHead>
                  <TableHead className="text-right">Projects</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No tenants found.
                    </TableCell>
                  </TableRow>
                ) : (
                  tenants.map(tenant => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.name}</TableCell>
                      <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          tenant.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {tenant.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{tenant.memberCount}</TableCell>
                      <TableCell className="text-right">{tenant.projectCount}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/platform/tenants/${tenant.id}`}>
                            <Button variant="outline" size="sm">View</Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(tenant.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Page {page} of {Math.ceil(total / 20) || 1}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * 20 >= total}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantList;
