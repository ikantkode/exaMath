import { useEffect, useState } from 'react';
import { api, formatDate } from '../../utils/api';
import { Shield, ClipboardList, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface AuditLog {
  id: string;
  user: { name: string; email: string };
  action: string;
  entity: string;
  entityId: string | null;
  oldValue: string | null;
  newValue: string | null;
  timestamp: string;
}

const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<AuditLog[]>('/audit-logs/').then(setLogs).finally(() => setLoading(false));
  }, []);

  const actionVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    CREATE: 'default',
    UPDATE: 'secondary',
    DELETE: 'destructive',
    APPROVE: 'default',
    REJECT: 'outline',
    RECALCULATE: 'secondary',
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">Permanent record of all changes to financial data</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Entries</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{logs.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <ClipboardList className="h-3 w-3" /> All audit actions
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Creates</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {logs.filter(l => l.action === 'CREATE').length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" /> New records
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Deletes</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {logs.filter(l => l.action === 'DELETE').length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Separator />
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <AlertTriangle className="h-3 w-3" /> Removed records
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit Logs Table */}
      {logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Shield className="mb-3 h-12 w-12 text-muted-foreground" />
            <h3 className="font-medium">No audit entries yet</h3>
            <p className="text-sm text-muted-foreground">Actions will be logged here</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(log.timestamp)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{log.user.name}</p>
                        <p className="text-xs text-muted-foreground">{log.user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={actionVariants[log.action] || 'outline'}>{log.action}</Badge></TableCell>
                    <TableCell>{log.entity}</TableCell>
                    <TableCell className="max-w-xs text-xs text-muted-foreground">
                      {log.newValue ? (
                        <span className="truncate block">{log.newValue.substring(0, 100)}{log.newValue.length > 100 ? '...' : ''}</span>
                      ) : log.oldValue ? (
                        <span className="truncate block">{log.oldValue.substring(0, 100)}{log.oldValue.length > 100 ? '...' : ''}</span>
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AuditLogs;
