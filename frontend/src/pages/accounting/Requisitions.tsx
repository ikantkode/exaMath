import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, formatCurrency } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, X, Lock, Unlock, ChevronLeft, FileText, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface SovItem {
  id: string;
  itemNumber: number;
  csiCode: string;
  csiCodeTitle: string;
  description: string;
  value: number;
}

interface ScheduleOfValue {
  id: string;
  projectId: string;
  name: string;
  status: 'DRAFT' | 'SUBMITTED' | 'LOCKED';
  approvedBy: string | null;
  approvedAt: string | null;
  totalValue: number;
  createdAt: string;
  updatedAt: string;
  items: SovItem[];
}

interface ProjectInfo {
  id: string;
  name: string;
  clientName: string | null;
  projectIdentificationIds: string[];
}

interface EditCell {
  rowId: string;
  field: string;
}

const FIELDS = ['csiCode', 'csiCodeTitle', 'description', 'value'] as const;

const SchedulesOfValue = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [sov, setSov] = useState<ScheduleOfValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingCell, setEditingCell] = useState<EditCell | null>(null);
  const [editValue, setEditValue] = useState('');
  const cellInputRef = useRef<HTMLInputElement>(null);

  const refreshSov = async (): Promise<ScheduleOfValue | null> => {
    if (!projectId || !sov?.id) return null;
    const fresh = await api.get<ScheduleOfValue>(`/schedules-of-value/sov/${sov.id}`);
    setSov(fresh);
    return fresh;
  };

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    Promise.all([
      api.get<ProjectInfo>(`/projects/${projectId}`),
      api.get<ScheduleOfValue[]>(`/schedules-of-value/project/${projectId}`),
    ])
      .then(([p, s]) => {
        setProject(p);
        if (s.length > 0) setSov(s[0]);
        else setSov(null);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    if (editingCell && cellInputRef.current) {
      cellInputRef.current.focus();
    }
  }, [editingCell]);

  const createSov = async () => {
    if (!projectId) return;
    try {
      const newSov = await api.post<ScheduleOfValue>(`/schedules-of-value/project/${projectId}`, {
        name: 'Schedule of Values',
        items: [{ itemNumber: 1, csiCode: '', csiCodeTitle: '', description: '', value: 0 }],
      });
      setSov(newSov);
      toast.success('Schedule of Values created');
    } catch (err: any) {
      setError(err.message || 'Failed to create SOV');
    }
  };

  const addRow = async () => {
    if (!sov) return;
    try {
      const nextNum = sov.items.length + 1;
      await api.post(`/schedules-of-value/sov/${sov.id}/items`, {
        itemNumber: nextNum,
        csiCode: '',
        csiCodeTitle: '',
        description: '',
        value: 0,
      });
      await refreshSov();
      toast.success('Row added');
    } catch (err: any) {
      setError(err.message || 'Failed to add row');
    }
  };

  const deleteRow = async (itemId: string) => {
    if (!sov) return;
    try {
      await api.delete(`/schedules-of-value/sov/${sov.id}/items/${itemId}`);
      await refreshSov();
      toast.success('Row deleted');
    } catch (err: any) {
      setError(err.message || 'Failed to delete row');
    }
  };

  const startEdit = (row: SovItem, field: string) => {
    setEditingCell({ rowId: row.id, field });
    setEditValue(field === 'value' ? String(row.value) : String(row[field as keyof SovItem]));
  };

  const commitCurrentEdit = async (): Promise<boolean> => {
    if (!sov || !editingCell) return false;
    const row = sov.items.find(i => i.id === editingCell.rowId);
    if (!row) return false;

    const data: any = {};
    if (editingCell.field === 'value') {
      data.value = parseFloat(editValue) || 0;
    } else {
      data[editingCell.field] = editValue;
    }

    try {
      await api.put(`/schedules-of-value/sov/${sov.id}/items/${row.id}`, data);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to update item');
      return false;
    }
  };

  const commitEdit = useCallback(async () => {
    await commitCurrentEdit();
    await refreshSov();
    setEditingCell(null);
  }, [sov, editingCell, editValue]);

  const navigateToNextCell = async (e: React.KeyboardEvent) => {
    e.preventDefault();
    if (!sov || !editingCell) return;

    const fieldIdx = FIELDS.indexOf(editingCell.field as any);
    const row = sov.items.find(i => i.id === editingCell.rowId);
    if (!row) {
      setEditingCell(null);
      return;
    }
    const rowIdx = sov.items.indexOf(row);

    const committed = await commitCurrentEdit();
    if (!committed) {
      setEditingCell(null);
      return;
    }

    let targetRowId = '';
    let targetField = '';
    let needAddRow = false;

    if (fieldIdx < FIELDS.length - 1) {
      targetRowId = editingCell.rowId;
      targetField = FIELDS[fieldIdx + 1];
    } else if (rowIdx < sov.items.length - 1) {
      targetRowId = sov.items[rowIdx + 1].id;
      targetField = 'csiCode';
    } else {
      needAddRow = true;
      targetField = 'csiCode';
    }

    if (needAddRow) {
      const nextNum = sov.items.length + 1;
      try {
        await api.post(`/schedules-of-value/sov/${sov.id}/items`, {
          itemNumber: nextNum,
          csiCode: '',
          csiCodeTitle: '',
          description: '',
          value: 0,
        });
        const fresh = await refreshSov();
        const newRow = fresh?.items.find(i => i.itemNumber === nextNum);
        if (newRow) {
          const val = targetField === 'value' ? String(newRow.value) : String(newRow[targetField as keyof SovItem]);
          setEditValue(val || '');
          setEditingCell({ rowId: newRow.id, field: targetField });
        } else {
          setEditingCell(null);
          setEditValue('');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to add row');
        setEditingCell(null);
        setEditValue('');
      }
    } else {
      const fresh = await refreshSov();
      const targetRow = fresh?.items.find(i => i.id === targetRowId);
      if (targetRow) {
        const val = targetField === 'value' ? String(targetRow.value) : String(targetRow[targetField as keyof SovItem]);
        setEditValue(val || '');
        setEditingCell({ rowId: targetRowId, field: targetField });
      } else {
        setEditingCell(null);
        setEditValue('');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      navigateToNextCell(e);
    }
    if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const submitSov = async () => {
    if (!sov) return;
    try {
      await api.post(`/schedules-of-value/sov/${sov.id}/submit`, {});
      await refreshSov();
      toast.success('SOV submitted for approval');
    } catch (err: any) {
      setError(err.message || 'Failed to submit SOV');
    }
  };

  const approveSov = async () => {
    if (!sov) return;
    try {
      await api.post(`/schedules-of-value/sov/${sov.id}/approve`, {});
      await refreshSov();
      toast.success('SOV approved and locked');
    } catch (err: any) {
      setError(err.message || 'Failed to approve SOV');
    }
  };

  const revertSov = async () => {
    if (!sov) return;
    try {
      await api.post(`/schedules-of-value/sov/${sov.id}/revert`, {});
      await refreshSov();
      toast.success('SOV unlocked');
    } catch (err: any) {
      setError(err.message || 'Failed to revert SOV');
    }
  };

  const exportToExcel = () => {
    if (!sov || !project) return;
    const wsData: any[][] = [
      ['CSI Code', 'CSI Title', 'Description', 'Value'],
      ...sov.items.map(item => [
        item.csiCode || '',
        item.csiCodeTitle || '',
        item.description || '',
        item.value,
      ]),
      ['', '', 'Total', sov.totalValue],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 40 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Schedule of Values');
    XLSX.writeFile(wb, `${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_SOV.xlsx`);
    toast.success('SOV exported to Excel');
  };

  const canEdit = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const isOwner = user?.role === 'OWNER';
  const isDraft = sov?.status === 'DRAFT';
  const isSubmitted = sov?.status === 'SUBMITTED';
  const isLocked = sov?.status === 'LOCKED';

  const statusBadge = (status: string) => {
    const variantMap: Record<string, 'default' | 'secondary' | 'destructive'> = {
      DRAFT: 'secondary',
      SUBMITTED: 'default',
      LOCKED: 'destructive',
    };
    return (
      <Badge variant={variantMap[status] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  const isEditing = (rowId: string, field: string) =>
    editingCell?.rowId === rowId && editingCell?.field === field;

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
  if (!project) return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-muted-foreground">Project not found</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/projects/${projectId}`)} className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold tracking-tight">Schedule of Values</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {project.name} {project.clientName && `— ${project.clientName}`}
          </p>
          <div className="flex gap-2">
            {project.projectIdentificationIds.map(pid => (
              <Badge key={pid} variant="outline" className="text-xs font-mono">{pid}</Badge>
            ))}
          </div>
        </div>
      </div>

      {/* SOV Status Banner */}
      {sov && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  {statusBadge(sov.status)}
                  <CardTitle className="text-base">{sov.name}</CardTitle>
                </div>
                <CardDescription>Total: {formatCurrency(sov.totalValue)}</CardDescription>
              </div>
              <div className="flex gap-2">
                {isDraft && canEdit && (
                  <Button onClick={submitSov} size="sm">Submit</Button>
                )}
                {isSubmitted && (
                  <>
                    <Button onClick={approveSov} size="sm">Approve & Lock</Button>
                    <Button onClick={revertSov} variant="secondary" size="sm">Revert to Draft</Button>
                  </>
                )}
                {isLocked && isOwner && (
                  <Button onClick={revertSov} variant="secondary" size="sm">
                    <Unlock className="h-3.5 w-3.5" /> Unlock
                  </Button>
                )}
                {isLocked && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4" /> Locked
                  </span>
                )}
                <Button onClick={exportToExcel} variant="outline" size="sm">
                  <Download className="h-3.5 w-3.5" /> Export
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* SOV Table */}
      {sov && sov.items ? (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="py-2.5 px-3 text-left font-medium text-muted-foreground w-12">#</th>
                  <th className="py-2.5 px-3 text-left font-medium text-muted-foreground w-28">CSI Code</th>
                  <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">CSI Title</th>
                  <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">Description</th>
                  <th className="py-2.5 px-3 text-right font-medium text-muted-foreground w-32">Value</th>
                  {isDraft && <th className="w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {sov.items.map((item) => (
                  <tr key={item.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-1.5 px-3 text-muted-foreground font-mono text-xs">{item.itemNumber}</td>

                    {/* CSI Code */}
                    <td className="py-1.5 px-3">
                      {isEditing(item.id, 'csiCode') ? (
                        <input
                          ref={cellInputRef}
                          className="w-full px-1.5 py-0.5 text-sm border border-primary rounded focus:outline-none focus:ring-2 focus:ring-ring"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={handleKeyDown}
                        />
                      ) : (
                        <span
                          onDoubleClick={() => isDraft && canEdit && startEdit(item, 'csiCode')}
                          className={`block px-1.5 py-0.5 rounded min-h-[28px] ${
                            isDraft && canEdit ? 'cursor-text hover:bg-muted' : ''
                          }`}
                        >
                          {item.csiCode || <span className="text-muted-foreground">—</span>}
                        </span>
                      )}
                    </td>

                    {/* CSI Title */}
                    <td className="py-1.5 px-3">
                      {isEditing(item.id, 'csiCodeTitle') ? (
                        <input
                          ref={cellInputRef}
                          className="w-full px-1.5 py-0.5 text-sm border border-primary rounded focus:outline-none focus:ring-2 focus:ring-ring"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={handleKeyDown}
                        />
                      ) : (
                        <span
                          onDoubleClick={() => isDraft && canEdit && startEdit(item, 'csiCodeTitle')}
                          className={`block px-1.5 py-0.5 rounded min-h-[28px] ${
                            isDraft && canEdit ? 'cursor-text hover:bg-muted' : ''
                          }`}
                        >
                          {item.csiCodeTitle || <span className="text-muted-foreground">—</span>}
                        </span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="py-1.5 px-3">
                      {isEditing(item.id, 'description') ? (
                        <input
                          ref={cellInputRef}
                          className="w-full px-1.5 py-0.5 text-sm border border-primary rounded focus:outline-none focus:ring-2 focus:ring-ring"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={handleKeyDown}
                        />
                      ) : (
                        <span
                          onDoubleClick={() => isDraft && canEdit && startEdit(item, 'description')}
                          className={`block px-1.5 py-0.5 rounded min-h-[28px] ${
                            isDraft && canEdit ? 'cursor-text hover:bg-muted' : ''
                          }`}
                        >
                          {item.description || <span className="text-muted-foreground">—</span>}
                        </span>
                      )}
                    </td>

                    {/* Value */}
                    <td className="py-1.5 px-3 text-right">
                      {isEditing(item.id, 'value') ? (
                        <input
                          ref={cellInputRef}
                          type="number"
                          step="0.01"
                          className="w-full px-1.5 py-0.5 text-sm text-right border border-primary rounded focus:outline-none focus:ring-2 focus:ring-ring"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={handleKeyDown}
                        />
                      ) : (
                        <span
                          onDoubleClick={() => isDraft && canEdit && startEdit(item, 'value')}
                          className={`block px-1.5 py-0.5 rounded min-h-[28px] tabular-nums ${
                            isDraft && canEdit ? 'cursor-text hover:bg-muted' : ''
                          }`}
                        >
                          {formatCurrency(item.value)}
                        </span>
                      )}
                    </td>

                    {/* Delete */}
                    {isDraft && (
                      <td className="py-1.5 px-3 text-center">
                        <button
                          onClick={() => deleteRow(item.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete row"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-bold">
                  <td colSpan={4} className="py-2.5 px-3 text-right">Total Value</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatCurrency(sov.totalValue)}</td>
                  {isDraft && <td></td>}
                </tr>
              </tfoot>
            </table>

            {isDraft && (
              <div className="p-3">
                <Button onClick={addRow} variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <Plus className="h-4 w-4" /> Add row
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <FileText className="mb-3 h-12 w-12 text-muted-foreground" />
            <h3 className="font-medium">No Schedule of Values yet</h3>
            <p className="text-sm text-muted-foreground">Create one to start building your SOV</p>
            <Separator className="my-4 w-32" />
            {canEdit && (
              <Button onClick={createSov}>Create Schedule of Values</Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Inline edit help */}
      {isDraft && canEdit && (
        <p className="text-xs text-muted-foreground">Double-click any cell to edit. Press Enter or Tab to move to the next field. Press Escape to cancel.</p>
      )}
    </div>
  );
};

export default SchedulesOfValue;
