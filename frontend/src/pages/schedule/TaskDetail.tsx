import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useScheduleStore, type TaskStatus } from '@/store/scheduleStore';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Clock, Calendar } from 'lucide-react';

export default function TaskDetail() {
  const { activeSession, selectedTaskId, setSelectedTask, updateTask } = useScheduleStore();
  const task = activeSession?.parsedTasks.find((t) => t.id === selectedTaskId);

  const [form, setForm] = useState({
    actualStart: '',
    actualFinish: '',
    remainingDuration: '',
    physicalPercentComplete: '',
    status: '',
  });

  useEffect(() => {
    if (task) {
      setForm({
        actualStart: task.actualStart ? format(new Date(task.actualStart), 'yyyy-MM-dd') : '',
        actualFinish: task.actualFinish ? format(new Date(task.actualFinish), 'yyyy-MM-dd') : '',
        remainingDuration: String(task.remainingDuration),
        physicalPercentComplete: String(task.physicalPercentComplete),
        status: task.status,
      });
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !activeSession) return;

    const updates: Partial<any> = {};
    if (form.actualStart) updates.actualStart = form.actualStart;
    if (form.actualFinish) updates.actualFinish = form.actualFinish;
    updates.remainingDuration = parseFloat(form.remainingDuration) || 0;
    updates.physicalPercentComplete = parseFloat(form.physicalPercentComplete) || 0;
    updates.status = form.status as TaskStatus;

    // Validation: Actual Finish requires Actual Start
    if (form.actualFinish && !form.actualStart) {
      toast.error('Actual Start is required when setting Actual Finish');
      return;
    }

    // Validation: 100% complete requires Actual Finish
    if (parseFloat(form.physicalPercentComplete) >= 100 && !form.actualFinish) {
      toast.error('Actual Finish is required when marking task as 100% complete');
      return;
    }

    // Warning: Out-of-sequence detection
    if (task.finishDate && form.actualFinish) {
      const actFinish = new Date(form.actualFinish);
      const plannedFinish = new Date(task.finishDate);
      if (actFinish > plannedFinish) {
        toast.warning(
          'Actual finish date is after planned finish — this may indicate schedule delay.',
          { duration: 5000 }
        );
      }
    }

    try {
      await updateTask(task.id, updates);
      toast.success('Task updated');
      setSelectedTask(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (!task || !activeSession) return null;

  const Icon =
    task.status === 'COMPLETED'
      ? CheckCircle2
      : task.status === 'IN_PROGRESS'
      ? Clock
      : Calendar;

  return (
    <Sheet open={!!selectedTaskId} onOpenChange={(open) => !open && setSelectedTask(null)}>
      <SheetContent className="w-[480px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            <span className="font-mono text-sm text-muted-foreground">#{task.activityId}</span>
          </SheetTitle>
          <SheetDescription>{task.name}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v: string | null) => { if (v) setForm((f) => ({ ...f, status: v })) }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="WAITING">Waiting</SelectItem>
                <SelectItem value="ON_HOLD">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <Label>Completion (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={form.physicalPercentComplete}
              onChange={(e) => setForm((f) => ({ ...f, physicalPercentComplete: e.target.value }))}
            />
          </div>

          {/* Remaining Duration */}
          <div className="space-y-2">
            <Label>Remaining Duration (hours)</Label>
            <Input
              type="number"
              min={0}
              value={form.remainingDuration}
              onChange={(e) => setForm((f) => ({ ...f, remainingDuration: e.target.value }))}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Actual Start</Label>
              <Input
                type="date"
                value={form.actualStart}
                onChange={(e) => setForm((f) => ({ ...f, actualStart: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Actual Finish</Label>
              <Input
                type="date"
                value={form.actualFinish}
                onChange={(e) => setForm((f) => ({ ...f, actualFinish: e.target.value }))}
              />
            </div>
          </div>

          {/* Original dates (read-only) */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <p className="text-sm font-medium">Original Dates (Read-Only)</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>
                <span className="font-medium">Planned Start:</span>{' '}
                {task.startDate ? format(new Date(task.startDate), 'MMM d, yyyy') : '—'}
              </div>
              <div>
                <span className="font-medium">Planned Finish:</span>{' '}
                {task.finishDate ? format(new Date(task.finishDate), 'MMM d, yyyy') : '—'}
              </div>
            </div>
            {task.isCritical && (
              <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                <AlertTriangle className="h-3 w-3" />
                This task is on the critical path
              </div>
            )}
          </div>

          <Button type="submit" className="w-full">
            Save Changes
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
