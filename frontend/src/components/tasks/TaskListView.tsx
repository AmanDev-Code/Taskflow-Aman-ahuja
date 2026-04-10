import { useMemo } from 'react';
import { Calendar, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Task, TaskPriority, TaskStatus } from '@/types';
import { getStatusConfig, STATUS_CONFIG } from '@/types';
import { cn, formatDateShort, getInitials, getUserColor, isOverdue } from '@/lib/utils';

interface TaskListViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const priorityOrder: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const priorityColors: Record<TaskPriority, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
};

const priorityLabels: Record<TaskPriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export function TaskListView({ tasks, onTaskClick }: TaskListViewProps) {
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [tasks]);

  const groupedTasks = useMemo(() => {
    const buckets = new Map<TaskStatus, Task[]>();
    for (const task of sortedTasks) {
      const status = task.status as TaskStatus;
      const list = buckets.get(status) ?? [];
      list.push(task);
      buckets.set(status, list);
    }
    return STATUS_CONFIG
      .map((status) => ({
        status,
        tasks: buckets.get(status.id) ?? [],
      }))
      .filter((group) => group.tasks.length > 0);
  }, [sortedTasks]);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
        <AlertCircle className="h-12 w-12 mb-4 opacity-80" />
        <p className="text-lg font-medium text-gray-900 dark:text-gray-100">No tasks found</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">Create a task to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop table view */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm dark:shadow-none">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50/80 dark:bg-transparent">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Task
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                Priority
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-48">
                Assignees
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                Due Date
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                Tags
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
            {sortedTasks.map((task) => {
              const statusConfig = getStatusConfig(task.status);
              const taskOverdue = isOverdue(task.due_date);
              const assignees = task.assignees ?? [];
              const tags = task.tags ?? [];

              return (
                <tr
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="hover:bg-gray-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-gray-900 dark:text-white font-medium">{task.title}</span>
                      {task.description && (
                        <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">
                          {task.description}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className="text-xs font-medium whitespace-nowrap"
                      style={{
                        backgroundColor: statusConfig.bgColor,
                        color: statusConfig.color,
                      }}
                    >
                      {statusConfig.title}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-2 h-2 rounded-full', priorityColors[task.priority])} />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {priorityLabels[task.priority]}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {assignees.length > 0 ? (
                      <div className="flex items-center -space-x-2">
                        {assignees.slice(0, 3).map((assignee) => (
                          <Avatar
                            key={assignee.user_id}
                            className="h-7 w-7 border-2 border-white dark:border-slate-900"
                          >
                            <AvatarImage src={assignee.user_avatar_url} />
                            <AvatarFallback
                              className="text-[10px] text-white"
                              style={{ backgroundColor: assignee.user_color || getUserColor(assignee.user_id) }}
                            >
                              {getInitials(assignee.user_name)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {assignees.length > 3 && (
                          <div className="h-7 w-7 rounded-full bg-gray-200 dark:bg-slate-700 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                            <span className="text-[10px] text-gray-600 dark:text-gray-400">
                              +{assignees.length - 3}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {task.due_date ? (
                      <div
                        className={cn(
                          'flex items-center gap-1.5 text-sm',
                          taskOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                        )}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatDateShort(task.due_date)}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag.id}
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{
                              backgroundColor: `${tag.color}20`,
                              color: tag.color,
                            }}
                          >
                            {tag.name}
                          </span>
                        ))}
                        {tags.length > 2 && (
                          <span className="px-2 py-0.5 rounded text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-800">
                            +{tags.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile grouped list with horizontal columns and sticky task column */}
      <div className="md:hidden space-y-3">
        {groupedTasks.map(({ status, tasks: groupTasks }) => (
          <section
            key={status.id}
            className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
          >
            <header className="px-3 py-2 border-b border-gray-200 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-900/80">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold"
                  style={{ backgroundColor: status.bgColor, color: status.color }}
                >
                  {status.title}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{groupTasks.length} tasks</span>
              </div>
            </header>

            <div className="relative">
              {/* soft right edge */}
              <div className="pointer-events-none absolute right-0 top-0 z-20 h-full w-6 bg-gradient-to-l from-white to-transparent dark:from-slate-900" />
              <div className="overflow-x-auto">
                <div className="min-w-[860px]">
                  <div className="grid grid-cols-[220px_120px_120px_150px_120px_150px] text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-800">
                    <div className="sticky left-0 z-10 bg-gray-50/90 dark:bg-slate-900/95 px-3 py-2 border-r border-gray-200 dark:border-slate-800">
                      Task
                    </div>
                    <div className="px-3 py-2">Status</div>
                    <div className="px-3 py-2">Priority</div>
                    <div className="px-3 py-2">Assignees</div>
                    <div className="px-3 py-2">Due Date</div>
                    <div className="px-3 py-2">Tags</div>
                  </div>

                  {groupTasks.map((task) => {
                    const statusConfig = getStatusConfig(task.status);
                    const taskOverdue = isOverdue(task.due_date);
                    const assignees = task.assignees ?? [];
                    const tags = task.tags ?? [];
                    return (
                      <div
                        key={task.id}
                        onClick={() => onTaskClick(task)}
                        className="grid grid-cols-[220px_120px_120px_150px_120px_150px] border-b border-gray-100 dark:border-slate-800/70 last:border-b-0 cursor-pointer hover:bg-gray-50/80 dark:hover:bg-slate-800/50"
                      >
                        <div className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-3 py-2 border-r border-gray-200 dark:border-slate-800">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{task.title}</p>
                          {task.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                              {task.description}
                            </p>
                          )}
                        </div>
                        <div className="px-3 py-2">
                          <Badge
                            className="text-[11px] whitespace-nowrap"
                            style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
                          >
                            {statusConfig.title}
                          </Badge>
                        </div>
                        <div className="px-3 py-2">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                            <div className={cn('w-2 h-2 rounded-full', priorityColors[task.priority])} />
                            {priorityLabels[task.priority]}
                          </div>
                        </div>
                        <div className="px-3 py-2">
                          {assignees.length > 0 ? (
                            <div className="flex items-center -space-x-2">
                              {assignees.slice(0, 3).map((assignee) => (
                                <Avatar key={assignee.user_id} className="h-7 w-7 border-2 border-white dark:border-slate-900">
                                  <AvatarImage src={assignee.user_avatar_url} />
                                  <AvatarFallback
                                    className="text-[10px] text-white"
                                    style={{ backgroundColor: assignee.user_color || getUserColor(assignee.user_id) }}
                                  >
                                    {getInitials(assignee.user_name)}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500 dark:text-gray-400">—</span>
                          )}
                        </div>
                        <div className="px-3 py-2">
                          {task.due_date ? (
                            <div className={cn('flex items-center gap-1 text-sm', taskOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400')}>
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDateShort(task.due_date)}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500 dark:text-gray-400">—</span>
                          )}
                        </div>
                        <div className="px-3 py-2">
                          {tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag.id}
                                  className="px-2 py-0.5 rounded text-[11px] font-medium"
                                  style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500 dark:text-gray-400">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
