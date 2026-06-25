import React, { useEffect, useState } from 'react';
import { api, formatDate } from '../../utils/api';
import { Shield } from 'lucide-react';

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

  const actionColors: Record<string, string> = {
    CREATE: 'badge-green',
    UPDATE: 'badge-blue',
    DELETE: 'badge-red',
    APPROVE: 'badge-green',
    REJECT: 'badge-yellow',
    RECALCULATE: 'badge-blue',
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading audit logs...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-gray-500 mt-1">Permanent record of all changes to financial data</p>
      </div>

      {logs.length === 0 ? (
        <div className="card text-center py-12">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-500">No audit entries yet</h3>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap">{formatDate(log.timestamp)}</td>
                  <td>
                    <div>
                      <p className="font-medium">{log.user.name}</p>
                      <p className="text-xs text-gray-400">{log.user.email}</p>
                    </div>
                  </td>
                  <td><span className={`badge ${actionColors[log.action] || 'badge-gray'}`}>{log.action}</span></td>
                  <td>{log.entity}</td>
                  <td className="max-w-xs text-xs text-gray-500">
                    {log.newValue ? (
                      <span className="truncate block">{log.newValue.substring(0, 100)}{log.newValue.length > 100 ? '...' : ''}</span>
                    ) : log.oldValue ? (
                      <span className="truncate block">{log.oldValue.substring(0, 100)}{log.oldValue.length > 100 ? '...' : ''}</span>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
