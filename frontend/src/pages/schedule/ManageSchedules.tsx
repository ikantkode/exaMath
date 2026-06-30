import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScheduleStore, type ScheduleSession, type ScheduleVersion } from '@/store/scheduleStore';
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
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';

export default function ManageSchedules() {
  const navigate = useNavigate();
  const { sessions, fetchSessions, deleteSession, restoreVersion, loading } = useScheduleStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState<string | null>(null);
  const [versions, setVersions] = useState<ScheduleVersion[]>([]);
  const [restoreConfirm, setRestoreConfirm] = useState<number | null>(null);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleView = (id: string) => {
    navigate(`/schedule?session=${id}`);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSession(id);
      toast.success('Schedule deleted');
    } catch (e: any) {
      toast.error(e.message);
    }
    setShowDeleteConfirm(null);
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
      const data = await (window as any).api.get<ScheduleVersion[]>(`/schedules/${sessionId}/versions`);
      setVersions(data);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage Schedules</h1>
          <p className="text-muted-foreground text-sm">
            View, edit, and manage all uploaded project schedules
          </p>
        </div>
        <Button onClick={() => navigate('/schedule/upload')}>
          <Calendar className="mr-2 h-4 w-4" />
          New Upload
        </Button>
      </div>

      <div className="rounded-lg border">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground text-sm">No schedules uploaded yet</p>
            <Button onClick={() => navigate('/schedule/upload')}>Import Your First Schedule</Button>
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
              {sessions.map((session) => (
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
                    {new Date(session.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(session.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openVersions(session.id)}>
                          <History className="mr-2 h-4 w-4" />
                          Version History
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setShowDeleteConfirm(session.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
