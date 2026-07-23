import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { platformApi } from '@/utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, UserPlus, Trash2, Search, Shield } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  memberCount: number;
  projectCount: number;
  createdAt: string;
}

interface TenantMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  userRole: string;
  role: string;
  isPlatformAdmin: boolean;
  joinedAt: string;
}

interface TenantMembersResponse {
  members: TenantMember[];
  total: number;
  page: number;
  pageSize: number;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

const TenantMembers = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('CREW');
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    Promise.all([
      platformApi.get<Tenant>(`/platform/tenants/${id}`),
      fetchMembers(),
    ]).then(([tenantData]) => {
      setTenant(tenantData);
    }).finally(() => setLoading(false));
  }, [id, page, search]);

  const fetchMembers = () => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: '20',
    });
    if (search) params.set('search', search);

    return platformApi.get<TenantMembersResponse>(`/platform/tenants/${id}/members?${params}`)
      .then(data => {
        setMembers(data.members);
        setTotal(data.total);
      });
  };

  const fetchUsers = async () => {
    try {
      const users = await platformApi.get<UserOption[]>('/platform/users');
      setAllUsers(users);
    } catch (e) {
      console.error('Failed to fetch users:', e);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) return;
    setAdding(true);
    try {
      await platformApi.post(`/platform/tenants/${id}/members`, {
        userId: selectedUserId,
        role: selectedRole,
      });
      setAddDialogOpen(false);
      setSelectedUserId('');
      fetchMembers();
    } catch (e) {
      alert('Failed to add member');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this member from the tenant?')) return;
    setRemoving(userId);
    try {
      await platformApi.delete(`/platform/tenants/${id}/members/${userId}`);
      setMembers(prev => prev.filter(m => m.userId !== userId));
    } catch (e: any) {
      alert(e.message || 'Failed to remove member');
    } finally {
      setRemoving(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;
  if (!tenant) return <div className="flex items-center justify-center h-64">Tenant not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/platform/tenants">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{tenant.name}</h1>
          <p className="text-sm text-muted-foreground">{tenant.slug}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenant.memberCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
          </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tenant.projectCount}</div>
            </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
              tenant.isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {tenant.isActive ? 'Active' : 'Inactive'}
            </span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Members</CardTitle>
          <Button onClick={() => { fetchUsers(); setAddDialogOpen(true); }}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
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
                  <TableHead>Email</TableHead>
                  <TableHead>Platform Role</TableHead>
                  <TableHead>Tenant Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No members found.
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map(member => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.name}
                        {member.isPlatformAdmin && <Shield className="h-3 w-3 ml-2 text-amber-600 inline" />}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{member.email}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                          {member.userRole}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800">
                          {member.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          disabled={removing === member.userId || member.isPlatformAdmin}
                          onClick={() => handleRemoveMember(member.userId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>
              Add a user to {tenant.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>User</Label>
              <Select value={selectedUserId} onValueChange={v => setSelectedUserId(v || '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tenant Role</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v || 'CREW')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWNER">OWNER</SelectItem>
                  <SelectItem value="MANAGER">MANAGER</SelectItem>
                  <SelectItem value="CREW">CREW</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={!selectedUserId || adding}>
              {adding ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TenantMembers;
