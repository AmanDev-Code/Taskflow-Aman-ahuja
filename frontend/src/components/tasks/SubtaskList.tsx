import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Plus, Trash2, GripVertical, ChevronRight, Calendar, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import { cn } from '@/lib/utils';
import type { Subtask, TaskPriority } from '@/types';
import { getStatusConfig } from '@/types';

interface SubtaskListProps {
  subtasks: Subtask[];
  projectId: string;
  taskId: string;
  onToggle: (subtaskId: string, completed: boolean) => void;
  onCreate: (title: string) => void;
  onDelete: (subtaskId: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

const PRIORITY_CONFIG: Record<TaskPriority, { color: string; bgColor: string; label: string }> = {
  low: { color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.1)', label: 'Low' },
  medium: { color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.1)', label: 'Medium' },
  high: { color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.1)', label: 'High' },
  urgent: { color: '#DC2626', bgColor: 'rgba(220, 38, 38, 0.15)', label: 'Urgent' },
};

export function SubtaskList({
  subtasks = [],
  projectId,
  taskId,
  onToggle,
  onCreate,
  onDelete,
  disabled,
  isLoading,
}: SubtaskListProps) {
  const navigate = useNavigate();
  const [newSubtask, setNewSubtask] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const safeSubtasks = subtasks || [];
  const completedCount = safeSubtasks.filter((s) => s?.completed).length;
  const progress = safeSubtasks.length > 0 ? (completedCount / safeSubtasks.length) * 100 : 0;

  const handleCreate = () => {
    if (newSubtask.trim()) {
      onCreate(newSubtask.trim());
      setNewSubtask('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreate();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewSubtask('');
    }
  };

  const handleSubtaskClick = (subtaskId: string) => {
    navigate(`/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}`);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-3">
      {safeSubtasks.length > 0 && (
        <ProgressBar
          value={progress}
          showCount={{ completed: completedCount, total: safeSubtasks.length }}
          size="sm"
          variant="success"
        />
      )}

      <div className="space-y-2">
        {safeSubtasks.map((subtask) => {
          const statusConfig = getStatusConfig(subtask.status || 'todo');
          const priorityConfig = PRIORITY_CONFIG[subtask.priority || 'medium'];

          return (
            <div
              key={subtask.id}
              onClick={() => handleSubtaskClick(subtask.id)}
              className={cn(
                'group flex min-w-0 items-center gap-3 p-3 rounded-lg cursor-pointer',
                'bg-gray-50 dark:bg-gray-800/30',
                'hover:bg-gray-100 dark:hover:bg-gray-800/60',
                'border border-transparent hover:border-gray-200 dark:hover:border-gray-700',
                'transition-all duration-200'
              )}
            >
              <GripVertical 
                className="h-4 w-4 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 cursor-grab flex-shrink-0" 
                onClick={(e) => e.stopPropagation()}
              />
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(subtask.id, !subtask.completed);
                }}
                disabled={disabled || isLoading}
                className={cn(
                  'flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center',
                  'transition-all duration-200',
                  subtask.completed
                    ? 'bg-[#22C55E] border-[#22C55E] text-white'
                    : 'border-gray-300 dark:border-gray-600 hover:border-[#22C55E]',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {subtask.completed && <Check className="h-3 w-3" />}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      'min-w-0 flex-1 text-sm font-medium transition-colors truncate',
                      subtask.completed
                        ? 'line-through text-gray-400 dark:text-gray-500'
                        : 'text-gray-800 dark:text-gray-200'
                    )}
                  >
                    {subtask.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge
                    variant="outline"
                    className="text-xs px-1.5 py-0"
                    style={{ 
                      borderColor: statusConfig.color,
                      color: statusConfig.color,
                      backgroundColor: statusConfig.bgColor 
                    }}
                  >
                    <span 
                      className="w-1.5 h-1.5 rounded-full mr-1"
                      style={{ backgroundColor: statusConfig.dotColor }}
                    />
                    {statusConfig.title}
                  </Badge>

                  {subtask.priority && subtask.priority !== 'medium' && (
                    <Badge
                      variant="outline"
                      className="text-xs px-1.5 py-0"
                      style={{ 
                        borderColor: priorityConfig.color,
                        color: priorityConfig.color,
                        backgroundColor: priorityConfig.bgColor 
                      }}
                    >
                      <Flag className="h-3 w-3 mr-1" />
                      {priorityConfig.label}
                    </Badge>
                  )}

                  {subtask.due_date && (
                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Calendar className="h-3 w-3" />
                      {formatDate(subtask.due_date)}
                    </span>
                  )}

                  {subtask.assignees && subtask.assignees.length > 0 && (
                    <div className="flex -space-x-1">
                      {subtask.assignees.slice(0, 3).map((assignee) => (
                        <div
                          key={assignee.user_id}
                          className="h-5 w-5 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-[10px] font-medium text-white"
                          style={{ backgroundColor: assignee.user_color || '#6366F1' }}
                          title={assignee.user_name}
                        >
                          {assignee.user_name?.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {subtask.assignees.length > 3 && (
                        <div className="h-5 w-5 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-medium text-gray-600 dark:text-gray-300">
                          +{subtask.assignees.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {!disabled && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(subtask.id);
                    }}
                    className={cn(
                      'flex-shrink-0 p-1.5 rounded',
                      'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20',
                      'opacity-0 group-hover:opacity-100 transition-opacity'
                    )}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          );
        })}
      </div>

      {isAdding ? (
        <div className="flex items-center gap-2">
          <Input
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter subtask title..."
            autoFocus
            className="flex-1 h-9"
          />
          <Button size="sm" onClick={handleCreate} disabled={!newSubtask.trim()}>
            Add
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsAdding(false);
              setNewSubtask('');
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAdding(true)}
          disabled={disabled}
          className="text-gray-500 dark:text-gray-400 hover:text-primary"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add subtask
        </Button>
      )}
    </div>
  );
}
