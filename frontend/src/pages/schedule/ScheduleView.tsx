import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useScheduleStore } from '@/store/scheduleStore';
import ScheduleUpload from './ScheduleUpload';
import ScheduleList from './ScheduleList';
import ScheduleGantt from './ScheduleGantt';
import ScheduleKanban from './ScheduleKanban';
import ScheduleChat from './ScheduleChat';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  BarChart3,
  LayoutList,
  MessageSquare,
  Download,
  Loader2,
  Plus,
  Trash2,
  History,
  RotateCcw,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatDate } from '@/utils/api';

export default function ScheduleView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { sessions, activeSession, loading, exportSchedule, deleteSession, setSelectedTask, loadSession, createVersion, restoreVersion, fetchVersions } = useScheduleStore();
  const [activeTab, setActiveTab] = useState('list');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState(false);
 const [restoreVersionNumber, setRestoreVersionNumber] = useState<number | null>(null);

  useEffect(() => {
    if (activeSession) {
      fetchVersions(activeSession.id);
    }
  }, [activeSession?.id]);

  const handleCreateVersion = async () => {
    if (!activeSession) return;
    try {
      await createVersion(activeSession.id);
      toast.success('Version saved');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRestoreVersion = async (versionNumber: number) => {
    if (!activeSession) return;
    try {
      await restoreVersion(activeSession.id, versionNumber);
      toast.success(`Restored to Version ${versionNumber}`);
      setShowVersions(false);
      setRestoreVersionNumber(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleExport = async () => {
    if (!activeSession) return;
    try {
      await exportSchedule(activeSession.id);
      toast.success('Schedule exported successfully');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSession(id);
      toast.success('Schedule deleted');
      setSelectedTask(null);
    } catch (e: any) {
      toast.error(e.message);
    }
    setShowDeleteConfirm(null);
  };

  const handleNewUpload = () => {
    setSelectedTask(null);
    navigate('/schedule/upload');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Schedule Management</h1>
          <p className="text-muted-foreground text-sm">
            Import, update, and export construction project schedules
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeSession && (
            <>
              <Button variant="outline" onClick={() => handleNewUpload()}>
                <Plus className="mr-2 h-4 w-4" />
                New Upload
              </Button>
              <Button variant="outline" onClick={handleCreateVersion}>
                <History className="mr-2 h-4 w-4" />
                Save Version
              </Button>
              {user?.role === 'OWNER' && activeSession.parsedTasks.length > 0 && (
                <Button variant="outline" onClick={() => setShowDeleteConfirm(activeSession.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
            </>
          )}
          {activeSession && (
            <Button disabled={loading} onClick={handleExport}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export {activeSession.format}
            </Button>
          )}
        </div>
      </div>

      {/* Session selector */}
      {sessions.length > 0 && !activeSession && (
        <div className="rounded-lg border p-4">
          <p className="text-sm font-medium mb-2">Select a schedule to view:</p>
          <div className="flex flex-wrap gap-2">
            {sessions.map((s) => (
              <Button
                key={s.id}
                variant={s.id === (activeSession as any)?.id ? 'default' : 'outline'}
                onClick={() => loadSession(s.id)}
              >
                {s.name}
                <span className="ml-2 text-xs text-muted-foreground">
                  ({s.parsedTasks.length} tasks · {formatDate(s.createdAt)})
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {activeSession ? (
        <>
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="list">
                <Table className="mr-2 h-4 w-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="gantt">
                <BarChart3 className="mr-2 h-4 w-4" />
                Waterfall
              </TabsTrigger>
              <TabsTrigger value="kanban">
                <LayoutList className="mr-2 h-4 w-4" />
                Kanban
              </TabsTrigger>
              <TabsTrigger value="chat">
                <MessageSquare className="mr-2 h-4 w-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="versions">
                <History className="mr-2 h-4 w-4" />
                Versions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-4">
              <ScheduleList />
            </TabsContent>
            <TabsContent value="gantt" className="mt-4">
              <ScheduleGantt />
            </TabsContent>
            <TabsContent value="kanban" className="mt-4">
              <ScheduleKanban />
            </TabsContent>
            <TabsContent value="chat" className="mt-4">
              <ScheduleChat />
            </TabsContent>
            <TabsContent value="versions" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Version History</h3>
                    <p className="text-sm text-muted-foreground">
                      All saved versions of this schedule. Versions are automatically created every 5 minutes of activity.
                    </p>
                  </div>
                </div>
                {(!activeSession?.versions || activeSession.versions.length === 0) ? (
                  <div className="rounded-lg border p-8 text-center text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm">No versions saved yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click "Save Version" to create your first version snapshot.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(activeSession?.versions ?? []).map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary text-sm font-bold">
                            {v.versionNumber}
                          </div>
                          <div>
                            <p className="font-medium">Version {v.versionNumber}</p>
                            <p className="text-xs text-muted-foreground">
                              Saved by {v.createdBy.name} on{' '}
                              {new Date(v.createdAt).toLocaleDateString()} at{' '}
                              {new Date(v.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {JSON.parse(v.taskSnapshot || '[]').length} tasks
                          </Badge>
                          {v.versionNumber !== Math.max(...(activeSession?.versions ?? []).map((ver) => ver.versionNumber)) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRestoreVersionNumber(v.versionNumber)}
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
              </div>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div className="flex justify-center py-12">
          <Button size="lg" onClick={handleNewUpload}>
            <Plus className="mr-2 h-5 w-5" />
            Import Your First Schedule
          </Button>
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Schedule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this schedule? This action cannot be undone.
              The original XML file will be permanently removed.
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

      {/* Restore version confirmation */}
      <Dialog open={!!restoreVersionNumber} onOpenChange={(open) => !open && setRestoreVersionNumber(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Version {restoreVersionNumber}</DialogTitle>
            <DialogDescription>
              This will restore all tasks to their state in Version {restoreVersionNumber}.
              Current changes will be replaced. Consider saving a version first to preserve
              your current state.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreVersionNumber(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => restoreVersionNumber !== null && handleRestoreVersion(restoreVersionNumber)}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore Version {restoreVersionNumber}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
