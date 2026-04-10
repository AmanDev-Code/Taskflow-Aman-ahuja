import { useMemo } from 'react';
import { BarChart3, CheckCircle2, Clock, Users, TrendingUp, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProjectStats } from '@/hooks/useProjects';
import { STATUS_CONFIG } from '@/types';
import type { Project, Task } from '@/types';
import { getInitials, getUserColor } from '@/lib/utils';

interface ProjectStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  tasks: Task[];
}

export function ProjectStatsModal({ isOpen, onClose, project, tasks }: ProjectStatsModalProps) {
  const { data: stats, isLoading } = useProjectStats(project.id);

  const localStats = useMemo(() => {
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const total = safeTasks.length;
    const completed = safeTasks.filter(t => t.status === 'deployed' || t.status === 'done').length;
    const inProgress = safeTasks.filter(t => t.status === 'in_progress' || t.status === 'testing' || t.status === 'dev_done').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const byStatus: Record<string, number> = {};
    safeTasks.forEach(task => {
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;
    });

    const byAssignee: Map<string, { name: string; avatar?: string; color?: string; count: number }> = new Map();
    let unassignedCount = 0;
    
    safeTasks.forEach(task => {
      const assignees = task.assignees ?? [];
      if (assignees.length === 0) {
        unassignedCount++;
      } else {
        assignees.forEach(assignee => {
          const existing = byAssignee.get(assignee.user_id);
          if (existing) {
            existing.count++;
          } else {
            byAssignee.set(assignee.user_id, {
              name: assignee.user_name,
              avatar: assignee.user_avatar_url,
              color: assignee.user_color,
              count: 1,
            });
          }
        });
      }
    });

    return {
      total,
      completed,
      inProgress,
      completionRate,
      byStatus,
      byAssignee: Array.from(byAssignee.entries()).map(([id, data]) => ({
        id,
        ...data,
      })).sort((a, b) => b.count - a.count),
      unassigned: unassignedCount,
    };
  }, [tasks]);

  // Using localStats directly since stats API might not always be needed
  void stats; // Mark as used to avoid lint warnings

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600 dark:text-[#7C3AED]" />
            Project Statistics
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 dark:bg-slate-950/80 rounded-xl p-4 border border-gray-200 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-blue-500/20 rounded-lg">
                    <Clock className="h-4 w-4 text-blue-400" />
                  </div>
                  <span className="text-xs text-gray-500">Total</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{localStats.total}</p>
              </div>

              <div className="bg-gray-50 dark:bg-slate-950/80 rounded-xl p-4 border border-gray-200 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-amber-500/20 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-amber-400" />
                  </div>
                  <span className="text-xs text-gray-500">In Progress</span>
                </div>
                <p className="text-2xl font-bold text-amber-400">{localStats.inProgress}</p>
              </div>

              <div className="bg-gray-50 dark:bg-slate-950/80 rounded-xl p-4 border border-gray-200 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                  <span className="text-xs text-gray-500">Completed</span>
                </div>
                <p className="text-2xl font-bold text-emerald-400">{localStats.completed}</p>
              </div>
            </div>

            {/* Completion Rate */}
            <div className="bg-gray-50 dark:bg-slate-950/80 rounded-xl p-4 border border-gray-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Completion Rate</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">{localStats.completionRate}%</span>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#7C3AED] to-[#A855F7] rounded-full transition-all duration-500"
                  style={{ width: `${localStats.completionRate}%` }}
                />
              </div>
            </div>

            {/* Tasks by Status */}
            <div className="bg-gray-50 dark:bg-slate-950/80 rounded-xl p-4 border border-gray-200 dark:border-slate-800">
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">Tasks by Status</h4>
              <div className="space-y-3">
                {STATUS_CONFIG.filter(status => localStats.byStatus[status.id]).map((status) => {
                  const count = localStats.byStatus[status.id] || 0;
                  const percentage = localStats.total > 0 ? (count / localStats.total) * 100 : 0;

                  return (
                    <div key={status.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: status.color }}
                          />
                          <span className="text-gray-600 dark:text-gray-400">{status.title}</span>
                        </div>
                        <span className="text-gray-900 dark:text-white font-medium">{count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: status.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tasks by Assignee */}
            <div className="bg-gray-50 dark:bg-slate-950/80 rounded-xl p-4 border border-gray-200 dark:border-slate-800">
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Tasks by Assignee
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {localStats.byAssignee.length === 0 && localStats.unassigned === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No tasks assigned yet</p>
                ) : (
                  <>
                    {localStats.byAssignee.map((assignee) => (
                      <div
                        key={assignee.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800/60"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={assignee.avatar} />
                            <AvatarFallback
                              className="text-[10px] text-white"
                              style={{ backgroundColor: assignee.color || getUserColor(assignee.id) }}
                            >
                              {getInitials(assignee.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-gray-900 dark:text-white">{assignee.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#7C3AED] rounded-full"
                              style={{
                                width: `${(assignee.count / localStats.total) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400 w-8 text-right">
                            {assignee.count}
                          </span>
                        </div>
                      </div>
                    ))}
                    {localStats.unassigned > 0 && (
                      <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800/60">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-gray-200 dark:bg-slate-800 flex items-center justify-center">
                            <Users className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Unassigned</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gray-500 rounded-full"
                              style={{
                                width: `${(localStats.unassigned / localStats.total) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400 w-8 text-right">
                            {localStats.unassigned}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
