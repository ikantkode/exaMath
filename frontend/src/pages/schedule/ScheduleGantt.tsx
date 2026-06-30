import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { useScheduleStore } from '@/store/scheduleStore';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: '#94a3b8',
  IN_PROGRESS: '#3b82f6',
  COMPLETED: '#22c55e',
  WAITING: '#eab308',
  ON_HOLD: '#f97316',
};

export default function ScheduleGantt() {
  const { activeSession } = useScheduleStore();
  const [viewStart, setViewStart] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!activeSession || !activeSession.parsedTasks) return null;

  const tasks = activeSession.parsedTasks.filter((t) => t.startDate || t.finishDate);
  if (tasks.length === 0) return null;

  // Determine date range
  const allDates = tasks.flatMap((t) => {
    const d: (string | null)[] = [t.startDate, t.finishDate];
    return d.filter(Boolean) as string[];
  });
  const minDate = allDates.length
    ? new Date(Math.min(...allDates.map((d) => new Date(d).getTime())))
    : new Date();
  const maxDate = allDates.length
    ? new Date(Math.max(...allDates.map((d) => new Date(d).getTime())))
    : new Date();

  // Add padding
  const startDate = addDays(startOfMonth(minDate), -5);
  const endDate = addDays(endOfMonth(maxDate), 5);

  const days = eachDayOfInterval({ start: startDate, end: endDate });
const monthHeaders = useMemo(() => {
    const months: { label: string; startIdx: number; span: number }[] = [];
    let currentMonth = '';
    let startIdx = 0;
    let span = 0;

    days.forEach((day: Date, idx: number) => {
      const m = format(day, 'MMMM yyyy');
      if (m !== currentMonth) {
        if (currentMonth) {
          months.push({ label: currentMonth, startIdx, span });
        }
        currentMonth = m;
        startIdx = idx;
        span = 1;
      } else {
        span++;
      }
    });
    if (currentMonth) months.push({ label: currentMonth, startIdx, span });
    return months;
  }, [days]);

  const dayWidth = 36;
  const rowHeight = 32;

  const getTaskPosition = useCallback(
    (task: (typeof tasks)[0]) => {
      const taskStart: Date = task.startDate ? new Date(task.startDate) : startDate;
      const taskEnd: Date = task.finishDate ? new Date(task.finishDate) : addDays(taskStart, 7);

      const startDiff = Math.max(0, (taskStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const endDiff = (taskEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

      return {
        left: startDiff * dayWidth,
        width: Math.max(dayWidth, endDiff * dayWidth - startDiff * dayWidth),
      };
    },
    [startDate]
  );

  const navigateMonth = (dir: -1 | 1) => {
    setViewStart((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + dir);
      return next;
    });
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium">
            {format(startDate, 'MMMM yyyy')} — {format(endDate, 'MMMM yyyy')}
          </span>
          <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <Badge key={status} variant="outline" className="gap-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              {status.replace('_', ' ')}
            </Badge>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        <div style={{ minWidth: `${days.length * dayWidth}px` }}>
          {/* Month headers */}
          <div className="flex border-b" style={{ height: '40px' }}>
            <div className="sticky left-0 z-10 w-48 border-r bg-card flex-shrink-0" />
            <div className="flex">
              {monthHeaders.map((m) => (
                <div
                  key={m.label}
                  className="border-r px-2 text-center text-xs font-medium text-muted-foreground flex items-center"
                  style={{ width: m.span * dayWidth }}
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {/* Day labels */}
          <div className="flex border-b" style={{ height: '24px' }}>
            <div className="sticky left-0 z-10 w-48 border-r bg-card flex-shrink-0" />
            <div className="flex">
              {days.map((day: Date, idx: number) => (
                <div
                  key={idx}
                  className="text-center text-[10px] text-muted-foreground border-r border-muted/30 flex items-center justify-center"
                  style={{ width: dayWidth }}
                >
                  {format(day, 'd')}
                </div>
              ))}
            </div>
          </div>

          {/* Task rows */}
          <div className="relative">
            {tasks.map((task) => {
              const pos = getTaskPosition(task);
              const color = STATUS_COLORS[task.status] || '#94a3b8';

              return (
                <div
                  key={task.id}
                  className="flex border-b border-muted/20 hover:bg-muted/20"
                  style={{ height: rowHeight }}
                >
                  {/* Task label */}
                  <div className="sticky left-0 z-10 w-48 border-r bg-card flex-shrink-0 flex items-center px-2 overflow-hidden">
                    <span className="text-xs truncate">
                      <span className="font-mono text-muted-foreground mr-1">{task.activityId}</span>
                      {task.name}
                    </span>
                  </div>

                  {/* Gantt bar */}
                  <div className="relative" style={{ width: `${days.length * dayWidth}px` }}>
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex">
                      {days.map((_day: Date, idx: number) => (
                        <div
                          key={idx}
                          className="border-r border-muted/10"
                          style={{ width: dayWidth }}
                        />
                      ))}
                    </div>

                    {/* Task bar */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 rounded h-5 shadow-sm"
                      style={{
                        left: pos.left,
                        width: pos.width,
                        backgroundColor: color,
                        opacity: task.status === 'COMPLETED' ? 0.7 : 0.9,
                      }}
                    >
                      <div className="h-full rounded flex items-center px-1.5">
                        <span className="text-[10px] font-medium text-white truncate">
                          {task.physicalPercentComplete}%
                        </span>
                      </div>
                    </div>

                    {/* Critical marker */}
                    {task.isCritical && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-1 h-6 bg-red-500 rounded"
                        style={{ left: pos.left - 4 }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
