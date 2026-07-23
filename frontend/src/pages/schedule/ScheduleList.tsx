import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, AlertCircle, TrendingUp, BarChart3, Calendar, MessageSquare, Pencil, Check, X } from 'lucide-react';
import { useScheduleStore, type ScheduleTask } from '@/store/scheduleStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import TaskDetail from './TaskDetail';
import { toast } from 'sonner';
import { api } from '@/utils/api';

const statusColors: Record<string, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  WAITING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  ON_HOLD: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
};

const statusIcons: Record<string, typeof Calendar> = {
  NOT_STARTED: Calendar,
  IN_PROGRESS: TrendingUp,
  COMPLETED: BarChart3,
  WAITING: ChevronDown,
  ON_HOLD: ChevronUp,
};

export default function ScheduleList() {
  const { activeSession, updateTask, setSelectedTask } = useScheduleStore();
  const [search, setSearch] = useState('');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ taskId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  if (!activeSession || !activeSession.parsedTasks) return null;

  const filteredTasks = activeSession.parsedTasks.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.activityId.toLowerCase().includes(search.toLowerCase())
  );

  const completedTasks = activeSession.parsedTasks.filter((t) => t.status === 'COMPLETED').length;
  const inProgressTasks = activeSession.parsedTasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const criticalTasks = activeSession.parsedTasks.filter((t) => t.isCritical).length;

  const toggleExpand = (id: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEdit = (taskId: string, field: string, currentValue: string | number) => {
    setEditingCell({ taskId, field });
    setEditValue(String(currentValue ?? ''));
  };

  const finishEdit = async () => {
    if (!editingCell) return;
    const { taskId, field } = editingCell;
    let newValue: any = editValue;

    if (field === 'remainingDuration' || field === 'physicalPercentComplete') {
      newValue = parseFloat(editValue) || 0;
    }

    try {
      await updateTask(taskId, { [field]: newValue });
    } catch (e: any) {
      toast.error(e.message);
    }
    setEditingCell(null);
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Tasks</p>
          <p className="mt-1 text-2xl font-bold">{activeSession.parsedTasks.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{completedTasks}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">In Progress</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{inProgressTasks}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Critical Path</p>
          <p className={`mt-1 text-2xl font-bold ${criticalTasks > 0 ? 'text-red-600' : ''}`}>
            {criticalTasks}
          </p>
        </div>
      </div>

      {/* Overall progress */}
      {activeSession.parsedTasks.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">
              {Math.round(
                activeSession.parsedTasks.reduce((sum, t) => sum + t.physicalPercentComplete, 0) /
                  activeSession.parsedTasks.length
              )}
              %
            </span>
          </div>
          <Progress
            value={
              activeSession.parsedTasks.reduce((sum, t) => sum + t.physicalPercentComplete, 0) /
              activeSession.parsedTasks.length
            }
            className="h-2"
          />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search tasks by ID or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Badge variant="outline" className="ml-auto">
          Format: {activeSession.format}
        </Badge>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left font-medium w-8"></th>
              <th className="p-3 text-left font-medium">Activity ID</th>
              <th className="p-3 text-left font-medium">Task Name</th>
              <th className="p-3 text-left font-medium">Start</th>
              <th className="p-3 text-left font-medium">Finish</th>
              <th className="p-3 text-left font-medium">Actual Start</th>
              <th className="p-3 text-left font-medium">Actual Finish</th>
              <th className="p-3 text-center font-medium">Rem. Dur.</th>
              <th className="p-3 text-center font-medium">% Comp.</th>
              <th className="p-3 text-center font-medium">Status</th>
              <th className="p-3 text-center font-medium w-8"></th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((task) => {
              const [expanded] = useState(expandedTasks.has(task.id));
              const Icon = statusIcons[task.status] || Calendar;
              const isEditing = editingCell?.taskId === task.id;

              return (
                <tr
                  key={task.id}
                  onClick={() => setSelectedTask(task.id)}
                  className={`border-b transition-colors cursor-pointer ${
                    task.isCritical
                      ? 'border-l-2 border-l-red-500 bg-red-50/50 dark:bg-red-950/20'
                      : 'hover:bg-muted/30'
                  } ${isEditing ? 'bg-muted/50' : ''}`}
                >
                  <td className="p-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(task.id);
                      }}
                    >
                      {expanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </Button>
                  </td>
                  <td className="p-3 font-mono text-xs">{task.activityId}</td>
                  <td className="p-3 font-medium max-w-xs truncate">{task.name}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {task.startDate ? format(new Date(task.startDate), 'MMM d') : '—'}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {task.finishDate ? format(new Date(task.finishDate), 'MMM d') : '—'}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {task.actualStart ? format(new Date(task.actualStart), 'MMM d') : '—'}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {task.actualFinish ? format(new Date(task.actualFinish), 'MMM d') : '—'}
                  </td>
                  <td className="p-3 text-center">
                    {isEditing && editingCell?.field === 'remainingDuration' ? (
                      <Input
                        className="mx-auto h-7 w-20 text-center"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={finishEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') finishEdit();
                          if (e.key === 'Escape') setEditingCell(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(task.id, 'remainingDuration', task.remainingDuration);
                        }}
                      >
                        {task.remainingDuration}h
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {isEditing && editingCell?.field === 'physicalPercentComplete' ? (
                      <Input
                        className="mx-auto h-7 w-16 text-center"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={finishEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') finishEdit();
                          if (e.key === 'Escape') setEditingCell(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          task.physicalPercentComplete >= 100
                            ? 'bg-green-100 text-green-800'
                            : task.physicalPercentComplete > 0
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(task.id, 'physicalPercentComplete', task.physicalPercentComplete);
                        }}
                      >
                        {task.physicalPercentComplete}%
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {isEditing && editingCell?.field === 'status' ? (
                      <Select
                        value={editValue}
                        onValueChange={(v) => {
                          setEditValue(v || '');
                          finishEdit();
                        }}
                      >
                        <SelectTrigger className="mx-auto h-7 w-28">
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
                    ) : (
                      <Badge variant="outline" className={`${statusColors[task.status]}`}>
                        <Icon className="mr-1 h-3 w-3" />
                        {task.status.replace('_', ' ')}
                      </Badge>
                    )}
                  </td>
                  <td className="p-3">
                    {task.isCritical && <AlertCircle className="h-4 w-4 text-red-500" />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredTasks.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            No tasks found matching your search.
          </div>
        )}
      </div>

      <TaskDetail />
    </div>
  );
}
