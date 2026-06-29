import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import {
  Table,
  BarChart3,
  LayoutList,
  MessageSquare,
  Download,
  Loader2,
  Plus,
  Trash2,
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
  const { sessions, activeSession, loading, fetchSessions, exportSchedule, deleteSession, setSelectedTask, loadSession } = useScheduleStore();
  const [activeTab, setActiveTab] = useState('list');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

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
    </div>
  );
}
