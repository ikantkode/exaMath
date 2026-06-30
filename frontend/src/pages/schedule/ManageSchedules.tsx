import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useScheduleStore, type ScheduleSession, type ScheduleVersion, type ScheduleTask } from '@/store/scheduleStore';
import ScheduleView from './ScheduleView';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/utils/api';
import { toast } from 'sonner';
import {
  MoreHorizontal,
  Eye,
  Trash2,
  RotateCcw,
  History,
  Calendar,
  FileText,
  Loader2,
  Pencil,
  Upload,
  AlertTriangle,
} from 'lucide-react';

function hasStartedTasks(session: ScheduleSession): ScheduleTask[] {
  return (session.parsedTasks || []).filter((t) => t.actualStart !== null);
}

export default function ManageSchedules() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { sessions, activeSession, loading, fetchSessions, deleteSession, restoreVersion, renameSession, loadSession } = useScheduleStore();
  const [showEditName, setShowEditName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showStartedTasksWarning, setShowStartedTasksWarning] = useState<{ type: 'delete' | 'import'; sessionId: string } | null>(null);
  const [showImportDialog, setShowImportDialog] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState<string | null>(null);
  const [versions, setVersions] = useState<ScheduleVersion[]>([]);
  const [restoreConfirm, setRestoreConfirm] = useState<number | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    const sessionId = searchParams.get('session');
    if (sessionId && !activeSession) {
      loadSession(sessionId);
    }
  }, [searchParams.get('session'), activeSession, loadSession]);

  const handleView = (id: string) => {
    navigate(`/schedule?session=${id}`);
  };

  const handleOpenEditName = (session: ScheduleSession) => {
    setEditNameValue(session.name);
    setShowEditName(session.id);
  };

  const handleSaveName = async () => {
    if (!showEditName || !editNameValue.trim()) return;
    try {
      await renameSession(showEditName, editNameValue.trim());
      toast.success('Schedule renamed');
      setShowEditName(null);
      setEditNameValue('');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSession(id);
      toast.success('Schedule deleted');
    } catch (e: any) {
      toast.error(e.message);
    }
    setShowDeleteConfirm(null);
    setShowStartedTasksWarning(null);
  };

  const handleRestore = async (sessionId: string, versionNumber: number) => {
    try {
      await restoreVersion(sessionId, versionNumber);
      toast.success(`Restored to Version ${versionNumber}`);
      fetchSessions();
    } catch (e: any) {
      toast.error(e.message);
    }
    setRestoreConfirm(null);
    setShowVersions(null);
  };

  const openVersions = async (sessionId: string) => {
    setShowVersions(sessionId);
    try {
      const data = await api.get<ScheduleVersion[]>(`/schedules/${sessionId}/versions`);
      setVersions(data);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      const ext = f.name.split('.').pop()?.toLowerCase();
      if (ext !== 'xml' && ext !== 'mpp') {
        toast.error('Please upload an XML or MPP file');
        return;
      }
      setImportFile(f);
    }
  };

  const handleImport = async () => {
    if (!showImportDialog || !importFile) return;
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      await api.post(`/schedules/${showImportDialog}/import`, formData);
      toast.success('Schedule imported successfully');
      setShowImportDialog(null);
      setImportFile(null);
      if (importFileRef.current) importFileRef.current.value = '';
      fetchSessions();
    } catch (e: any) {
      if (e.message.includes('Cannot import')) {
        setShowImportDialog(null);
        setShowStartedTasksWarning({ type: 'import', sessionId: showImportDialog });
      } else {
        toast.error(e.message);
      }
    }
  };

  const clearImportFile = () => {
    setImportFile(null);
    if (importFileRef.current) importFileRef.current.value = '';
  };

  const handleNewUpload = () => {
    navigate('/schedule/upload');
  };

  const getStartedTaskCount = (sessionId: string): number => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return 0;
    return hasStartedTasks(session).length;
  };

  if (activeSession && activeSession.parsedTasks && activeSession.parsedTasks.length > 0) {
    return <ScheduleView />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage Schedules</h1>
          <p className="text-muted-foreground text-sm">
            View, edit, and manage all uploaded project schedules
          </p>
        </div>
        <Button onClick={handleNewUpload}>
          <Calendar className="mr-2 h-4 w-4" />
          New Upload
        </Button>
      </div>

      <div className="rounded-lg border">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground text-sm">No schedules uploaded yet</p>
            <Button onClick={handleNewUpload}>Import Your First Schedule</Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-4 text-left font-medium">Schedule Name</th>
                <th className="p-4 text-left font-medium">Format</th>
                <th className="p-4 text-center font-medium">Tasks</th>
                <th className="p-4 text-center font-medium">Versions</th>
                <th className="p-4 text-left font-medium">Created</th>
                <th className="p-4 text-left font-medium">Updated</th>
                <th className="p-4 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => {
                const startedCount = hasStartedTasks(session).length;
                return (
                  <tr key={session.id} className="border-b hover:bg-muted/30">
                    <td className="p-4 font-medium">{session.name}</td>
                    <td className="p-4">
                      <Badge variant="outline">{session.format}</Badge>
                    </td>
                    <td className="p-4 text-center">{session.parsedTasks.length}</td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => openVersions(session.id)}
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <History className="h-3.5 w-3.5" />
                        {versions.find((v) => v.sessionId === session.id)?.versionNumber || 0}
                      </button>
                    </td>
                    <td className="p-4 text-muted-foreground text-xs">
                      {new Date(session.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-muted-foreground text-xs">
                      {startedCount > 0 && (
                        <Badge variant="outline" className="mr-1 bg-amber-50 text-amber-700 border-amber-200 text-xs">
                          {startedCount} started
                        </Badge>
                      )}
                      {new Date(session.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(session.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenEditName(session)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            const cnt = hasStartedTasks(session).length;
                            if (cnt === 0) {
                              setShowImportDialog(session.id);
                            } else {
                              setShowStartedTasksWarning({ type: 'import', sessionId: session.id });
                            }
                          }}>
                            <Upload className="mr-2 h-4 w-4" />
                            Import New
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openVersions(session.id)}>
                            <History className="mr-2 h-4 w-4" />
                            Version History
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              const cnt = hasStartedTasks(session).length;
                              if (cnt === 0) {
                                setShowDeleteConfirm(session.id);
                              } else {
                                setShowStartedTasksWarning({ type: 'delete', sessionId: session.id });
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Rename dialog */}
      <Dialog open={!!showEditName} onOpenChange={(open) => !open && setShowEditName(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Schedule</DialogTitle>
            <DialogDescription>
              Give this schedule a new name to help you identify it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="schedule-name">Schedule Name</Label>
            <Input
              id="schedule-name"
              value={editNameValue}
              onChange={(e) => setEditNameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditName(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveName}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import new XML dialog */}
      <Dialog open={!!showImportDialog} onOpenChange={(open) => !open && setShowImportDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import New Schedule</DialogTitle>
            <DialogDescription>
              Upload a new XML/MPP file to replace the current schedule. The original file will be saved as a version first.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="import-file">Schedule File</Label>
            <div
              onClick={() => importFileRef.current?.click()}
              className="relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center hover:border-primary/50 hover:bg-muted/30"
            >
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="font-medium text-sm">
                {importFile ? importFile.name : 'Select XML or MPP file'}
              </p>
              <p className="text-xs text-muted-foreground">
                {importFile ? `${(importFile.size / 1024).toFixed(1)} KB` : '.xml, .mpp up to 50MB'}
              </p>
              <input
                ref={importFileRef}
                type="file"
                accept=".xml,.mpp"
                className="hidden"
                onChange={handleImportFileChange}
              />
            </div>
            {importFile && (
              <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2">
                <FileText className="h-4 w-4 text-primary" />
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearImportFile}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!importFile || loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Started tasks warning dialog */}
      <AlertDialog open={!!showStartedTasksWarning} onOpenChange={(open) => !open && setShowStartedTasksWarning(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Schedule Has Started Tasks
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This schedule has <strong>{getStartedTaskCount(showStartedTasksWarning!.sessionId)} tasks</strong> that have been started with actual start dates.
              </p>
              {showStartedTasksWarning?.type === 'delete' ? (
                <p>
                  In P6 and Microsoft Project, once tasks have actual start dates, they are committed to the baseline.
                  You should <strong>restore to a baseline version</strong> first before deleting.
                </p>
              ) : (
                <p>
                  In P6 and Microsoft Project, once tasks have actual start dates, they are committed to the baseline.
                  You should <strong>restore to a baseline version</strong> first before importing a new schedule.
                </p>
              )}
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">
                  Tip: Open the Version History, find a version before tasks were started, and restore it. Then you can delete or import a new schedule safely.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              if (showStartedTasksWarning?.type === 'delete') {
                setShowDeleteConfirm(showStartedTasksWarning.sessionId);
              }
            }}>
              {showStartedTasksWarning?.type === 'delete' ? 'Delete Anyway' : 'Import Anyway'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowStartedTasksWarning(null);
              if (showStartedTasksWarning) {
                openVersions(showStartedTasksWarning.sessionId);
              }
            }}>
              <History className="mr-2 h-4 w-4" />
              View Versions
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Schedule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this schedule? This action cannot be undone.
              The original XML file and all task data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Versions dialog */}
      <Dialog open={!!showVersions} onOpenChange={(open) => !open && setShowVersions(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History
            </DialogTitle>
            <DialogDescription>
              Track all updates made to this schedule. Restore any previous version if needed.
            </DialogDescription>
          </DialogHeader>

          {versions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No versions created yet. Versions are automatically saved when you update tasks.
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
                      {version.versionNumber}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Version {version.versionNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        by {version.createdBy.name} ·{' '}
                        {new Date(version.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {version.versionNumber === Math.max(...versions.map((v) => v.versionNumber))
                        ? '(current)'
                        : ''}
                    </span>
                    {version.versionNumber !== Math.max(...versions.map((v) => v.versionNumber)) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setRestoreConfirm(version.versionNumber)}
                      >
                        <RotateCcw className="mr-1 h-3 w-3" />
                        Restore
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVersions(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore confirmation */}
      <Dialog open={!!restoreConfirm} onOpenChange={(open) => !open && setRestoreConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Version {restoreConfirm}</DialogTitle>
            <DialogDescription>
              This will restore all tasks to their state in Version {restoreConfirm}.
              Current changes will be lost. You can create a new version first to preserve
              current state.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => showVersions && handleRestore(showVersions, restoreConfirm!)}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore Version {restoreConfirm}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
