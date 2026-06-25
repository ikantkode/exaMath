import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, formatCurrency } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, X, Lock, Unlock, ChevronLeft, FileText, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

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
    } catch (err: any) {
      setError(err.message || 'Failed to add row');
    }
  };

  const deleteRow = async (itemId: string) => {
    if (!sov) return;
    try {
      await api.delete(`/schedules-of-value/sov/${sov.id}/items/${itemId}`);
      await refreshSov();
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
          setEditingCell({ rowId: newRow.id, field: targetField });
        } else {
          setEditingCell(null);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to add row');
        setEditingCell(null);
      }
    } else {
      await refreshSov();
      setEditingCell({ rowId: targetRowId, field: targetField });
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

  const cancelEdit = () => {
    setEditingCell(null);
  };

  const submitSov = async () => {
    if (!sov) return;
    try {
      await api.post(`/schedules-of-value/sov/${sov.id}/submit`, {});
      await refreshSov();
    } catch (err: any) {
      setError(err.message || 'Failed to submit SOV');
    }
  };

  const approveSov = async () => {
    if (!sov) return;
    try {
      await api.post(`/schedules-of-value/sov/${sov.id}/approve`, {});
      await refreshSov();
    } catch (err: any) {
      setError(err.message || 'Failed to approve SOV');
    }
  };

  const revertSov = async () => {
    if (!sov) return;
    try {
      await api.post(`/schedules-of-value/sov/${sov.id}/revert`, {});
      await refreshSov();
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
  };

  const canEdit = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const isOwner = user?.role === 'OWNER';
  const isDraft = sov?.status === 'DRAFT';
  const isSubmitted = sov?.status === 'SUBMITTED';
  const isLocked = sov?.status === 'LOCKED';

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700',
      SUBMITTED: 'bg-blue-100 text-blue-700',
      LOCKED: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-700'}`}>
        {status}
      </span>
    );
  };

  const isEditing = (rowId: string, field: string) =>
    editingCell?.rowId === rowId && editingCell?.field === field;

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;
  if (error) return <div className="text-red-600 card p-6">Error: {error}</div>;
  if (!project) return <div className="card text-center py-12">Project not found</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => navigate(`/projects/${projectId}`)} className="text-gray-400 hover:text-gray-600">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Schedule of Values</h1>
          </div>
          <p className="text-gray-500 text-sm">
            {project.name} {project.clientName && ` — ${project.clientName}`}
          </p>
          <div className="flex gap-3 mt-1 text-xs text-gray-400">
            {project.projectIdentificationIds.map(pid => (
                <span key={pid} className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{pid}</span>
              ))}
          </div>
        </div>
      </div>

      {/* SOV Status Banner */}
      {sov && (
        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            {statusBadge(sov.status)}
            <span className="font-medium">{sov.name}</span>
            <span className="text-sm text-gray-500">Total: {formatCurrency(sov.totalValue)}</span>
          </div>
          <div className="flex gap-2">
            {isDraft && canEdit && (
              <button onClick={submitSov} className="btn btn-primary text-sm">Submit for Approval</button>
            )}
            {isSubmitted && canEdit && (
              <button onClick={approveSov} className="btn btn-primary text-sm">Approve & Lock</button>
            )}
            {isSubmitted && canEdit && (
              <button onClick={revertSov} className="btn btn-secondary text-sm text-orange-600 hover:text-orange-800">Revert to Draft</button>
            )}
            {isLocked && isOwner && (
              <button onClick={revertSov} className="btn btn-secondary text-sm flex items-center gap-1">
                <Unlock className="w-3.5 h-3.5" /> Unlock
              </button>
            )}
            {isLocked && (
              <span className="flex items-center gap-1 text-sm text-red-600">
                <Lock className="w-4 h-4" /> Locked
              </span>
            )}
            {sov && (
              <button onClick={exportToExcel} className="btn btn-secondary text-sm flex items-center gap-1">
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            )}
          </div>
        </div>
      )}

      {/* SOV Table */}
      {sov && sov.items ? (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 w-12">#</th>
                <th className="text-left py-2 px-2 w-28">CSI Code</th>
                <th className="text-left py-2 px-2">CSI Title</th>
                <th className="text-left py-2 px-2">Description</th>
                <th className="text-right py-2 px-2 w-32">Value</th>
                {isDraft && <th className="w-10"></th>}
              </tr>
            </thead>
            <tbody>
              {sov.items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-1.5 px-2 text-gray-400 font-mono text-xs">{item.itemNumber}</td>

                  {/* CSI Code */}
                  <td className="py-1.5 px-2">
                    {isEditing(item.id, 'csiCode') ? (
                      <input
                        ref={cellInputRef}
                        className="w-full px-1.5 py-0.5 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={handleKeyDown}
                      />
                    ) : (
                      <span
                        onDoubleClick={() => isDraft && canEdit && startEdit(item, 'csiCode')}
                        className={`block px-1.5 py-0.5 rounded min-h-[28px] ${
                          isDraft && canEdit ? 'cursor-text hover:bg-blue-50' : ''
                        }`}
                      >
                        {item.csiCode || <span className="text-gray-300">—</span>}
                      </span>
                    )}
                  </td>

                  {/* CSI Title */}
                  <td className="py-1.5 px-2">
                    {isEditing(item.id, 'csiCodeTitle') ? (
                      <input
                        ref={cellInputRef}
                        className="w-full px-1.5 py-0.5 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={handleKeyDown}
                      />
                    ) : (
                      <span
                        onDoubleClick={() => isDraft && canEdit && startEdit(item, 'csiCodeTitle')}
                        className={`block px-1.5 py-0.5 rounded min-h-[28px] ${
                          isDraft && canEdit ? 'cursor-text hover:bg-blue-50' : ''
                        }`}
                      >
                        {item.csiCodeTitle || <span className="text-gray-300">—</span>}
                      </span>
                    )}
                  </td>

                  {/* Description */}
                  <td className="py-1.5 px-2">
                    {isEditing(item.id, 'description') ? (
                      <input
                        ref={cellInputRef}
                        className="w-full px-1.5 py-0.5 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={handleKeyDown}
                      />
                    ) : (
                      <span
                        onDoubleClick={() => isDraft && canEdit && startEdit(item, 'description')}
                        className={`block px-1.5 py-0.5 rounded min-h-[28px] ${
                          isDraft && canEdit ? 'cursor-text hover:bg-blue-50' : ''
                        }`}
                      >
                        {item.description || <span className="text-gray-300">—</span>}
                      </span>
                    )}
                  </td>

                  {/* Value */}
                  <td className="py-1.5 px-2 text-right">
                    {isEditing(item.id, 'value') ? (
                      <input
                        ref={cellInputRef}
                        type="number"
                        step="0.01"
                        className="w-full px-1.5 py-0.5 text-sm text-right border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={handleKeyDown}
                      />
                    ) : (
                      <span
                        onDoubleClick={() => isDraft && canEdit && startEdit(item, 'value')}
                        className={`block px-1.5 py-0.5 rounded min-h-[28px] ${
                          isDraft && canEdit ? 'cursor-text hover:bg-blue-50' : ''
                        }`}
                      >
                        {formatCurrency(item.value)}
                      </span>
                    )}
                  </td>

                  {/* Delete */}
                  {isDraft && (
                    <td className="py-1.5 px-2 text-center">
                      <button
                        onClick={() => deleteRow(item.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                        title="Delete row"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td colSpan={4} className="py-2 px-2 text-right">Total Value</td>
                <td className="py-2 px-2 text-right">{formatCurrency(sov.totalValue)}</td>
                {isDraft && <td></td>}
              </tr>
            </tfoot>
          </table>

          {isDraft && (
            <button onClick={addRow} className="mt-3 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add row
            </button>
          )}
        </div>
      ) : (
        <div className="card text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-500">No Schedule of Values yet</h3>
          <p className="text-gray-400 text-sm mt-1 mb-4">Create one to start building your SOV</p>
          {canEdit && (
            <button onClick={createSov} className="btn btn-primary">Create Schedule of Values</button>
          )}
        </div>
      )}

      {/* Inline edit help */}
      {isDraft && canEdit && (
        <p className="text-xs text-gray-400">Double-click any cell to edit. Press Enter or Tab to move to the next field. Press Escape to cancel.</p>
      )}
    </div>
  );
};

export default SchedulesOfValue;
