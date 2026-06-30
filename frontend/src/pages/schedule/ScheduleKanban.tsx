import { useState } from 'react';
import { useScheduleStore, type TaskStatus } from '@/store/scheduleStore';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GripVertical, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const COLUMNS = [
  { status: 'NOT_STARTED', label: 'Not Started', color: 'border-gray-300', bg: 'bg-gray-50' },
  { status: 'IN_PROGRESS', label: 'In Progress', color: 'border-blue-300', bg: 'bg-blue-50' },
  { status: 'COMPLETED', label: 'Completed', color: 'border-green-300', bg: 'bg-green-50' },
  { status: 'WAITING', label: 'Waiting', color: 'border-yellow-300', bg: 'bg-yellow-50' },
  { status: 'ON_HOLD', label: 'On Hold', color: 'border-orange-300', bg: 'bg-orange-50' },
] as const;

export default function ScheduleKanban() {
  const { activeSession, updateTasksBatch } = useScheduleStore();
  const [dragging, setDragging] = useState<string | null>(null);

  if (!activeSession) return null;

  const handleDragStart = (taskId: string) => setDragging(taskId);
  const handleDragEnd = () => setDragging(null);

  const handleDrop = async (status: TaskStatus) => {
    if (!dragging) return;
    try {
      await updateTasksBatch([{ id: dragging, status }]);
      toast.success(`Task moved to ${status.replace('_', ' ')}`);
    } catch (e: any) {
      toast.error(e.message);
    }
    setDragging(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
      {COLUMNS.map((col) => {
        const tasks = activeSession.parsedTasks.filter((t) => t.status === col.status);

        return (
          <div
            key={col.status}
            className={`rounded-lg border ${col.color} ${col.bg} p-3 min-h-[200px]`}
            onDrop={() => handleDrop(col.status)}
            onDragOver={handleDragOver}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm">{col.label}</h3>
              <Badge variant="secondary" className="text-xs">
                {tasks.length}
              </Badge>
            </div>

            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => handleDragStart(task.id)}
                  onDragEnd={handleDragEnd}
                  className={`rounded border bg-white p-3 cursor-grab active:cursor-grabbing shadow-sm transition-shadow ${
                    dragging === task.id ? 'opacity-50 ring-2 ring-primary' : 'hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-muted-foreground">#{task.activityId}</p>
                      <p className="text-sm font-medium truncate">{task.name}</p>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {task.physicalPercentComplete}%
                    </span>
                    {task.isCritical && (
                      <span className="flex items-center gap-1 text-red-500">
                        <AlertTriangle className="h-3 w-3" />
                        Critical
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 h-1 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${task.physicalPercentComplete}%` }}
                    />
                  </div>
                </div>
              ))}

              {tasks.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Drop tasks here
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
