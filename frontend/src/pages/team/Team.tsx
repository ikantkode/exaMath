import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash2, Copy, Users, Shield, UserCheck, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: string;
  assignedProjectIds: string[];
  createdAt: string;
  updatedAt: string;
}

const Team = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newUserPassword, setNewUserPassword] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', role: 'CREW' });

  const isOwner = user?.role === 'OWNER';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = () => {
    api.get<TeamUser[]>('/users/').then(setUsers).finally(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result: any = await api.post('/users/', {
        name: formData.name,
        email: formData.email,
        role: formData.role,
      });
      setNewUserPassword(result.password || '');
      setFormData({ name: '', email: '', role: 'CREW' });
      fetchUsers();
      toast.success(`${result.user.name} added to the team`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add user');
    }
  };

  const handleDelete = async (id: string) => {
    const targetUser = users.find(u => u.id === id);
    if (!confirm(`Delete ${targetUser?.name}? This action cannot be undone.`)) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
      toast.success('User removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user');
    }
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    try {
      await api.put(`/users/${id}`, { role: newRole });
      fetchUsers();
      toast.success('Role updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role');
    }
  };

  const copyPassword = () => {
    if (newUserPassword) {
      navigator.clipboard.writeText(newUserPassword);
      toast.success('Password copied to clipboard');
    }
  };

  const roleBadge = (role: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      OWNER: 'default',
      MANAGER: 'secondary',
      CREW: 'outline',
    };
    return <Badge variant={variants[role] || 'outline'}>{role}</Badge>;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground">Manage team members and access permissions</p>
        </div>
        <Button onClick={() => { setNewUserPassword(''); setShowModal(true); }}>
          <Plus className="h-4 w-4" /> Add Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Members</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{users.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" /> Active team members
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Managers</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {users.filter(u => u.role === 'MANAGER').length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <UserCheck className="h-3 w-3" /> With elevated access
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Owners</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {users.filter(u => u.role === 'OWNER').length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" /> Full access
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assigned Projects</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                        {u.name.charAt(0)}
                      </div>
                      {u.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    {isOwner ? (
                      <Select
                        value={u.role}
                        onValueChange={role => handleRoleChange(u.id, role ?? u.role)}
                      >
                        <SelectTrigger className="h-8 w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OWNER">Owner</SelectItem>
                          <SelectItem value="MANAGER">Manager</SelectItem>
                          <SelectItem value="CREW">Crew</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      roleBadge(u.role)
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.assignedProjectIds?.length || 0} projects
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {isOwner && u.id !== user?.id && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          {newUserPassword ? (
            <>
              <DialogHeader>
                <DialogTitle>User Added</DialogTitle>
                <DialogDescription>
                  {formData.name || 'The user'} has been added. Their auto-generated password:
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <code className="text-sm font-mono break-all">{newUserPassword}</code>
                  <Button variant="ghost" size="sm" onClick={copyPassword} className="shrink-0">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this password with {formData.name || 'the user'}. They should change it after first login.
                </p>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
                <Button onClick={() => setNewUserPassword('')}>Add Another</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>
                  A password will be generated automatically.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="team-name">Full Name</Label>
                  <Input id="team-name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team-email">Email</Label>
                  <Input id="team-email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team-role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={role => setFormData({ ...formData, role: role ?? 'CREW' })}
                  >
                    <SelectTrigger id="team-role"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CREW">Crew</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      {isOwner && <SelectItem value="OWNER">Owner</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                  <Button type="submit">Add Member</Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Team;
