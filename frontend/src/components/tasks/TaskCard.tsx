import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  MessageSquare, 
  Paperclip, 
  Flag,
  CheckSquare,
  MoreHorizontal,
  Copy,
  Link2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Task } from '@/types';
import { cn, getInitials, getUserColor } from '@/lib/utils';
import { toast } from '@/hooks/useToast';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isDragOverlay?: boolean;
  onDuplicate?: (taskId: string) => void;
}

const priorityConfig = {
  urgent: { 
    borderColor: '#EF4444',
    flagColor: 'text-red-500',
  },
  high: { 
    borderColor: '#F97316',
    flagColor: 'text-orange-500',
  },
  medium: { 
    borderColor: '#F59E0B',
    flagColor: 'text-yellow-500',
  },
  low: { 
    borderColor: '#3B82F6',
    flagColor: 'text-blue-500',
  },
};

export function TaskCard({ task, onClick, isDragOverlay, onDuplicate }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/tasks/${task.id}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Link copied!',
      description: 'Task link has been copied to clipboard.',
      variant: 'success',
    });
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate?.(task.id);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = priorityConfig[task.priority] || priorityConfig.low;
  
  const subtaskTotal = task.subtask_count ?? 0;
  const subtaskCompleted = task.completed_subtask_count ?? 0;
  const hasSubtasks = subtaskTotal > 0;
  const subtaskProgress = hasSubtasks ? (subtaskCompleted / subtaskTotal) * 100 : 0;
  
  const hasMetaInfo = (task.attachment_count ?? 0) > 0 || (task.comment_count ?? 0) > 0 || hasSubtasks || (task.assignees && task.assignees.length > 0);

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderLeftColor: priority.borderColor,
      }}
      {...attributes}
      {...listeners}
      className={cn(
        'group cursor-grab active:cursor-grabbing',
        'bg-white hover:bg-gray-50 dark:bg-[#1E1E20] dark:hover:bg-[#252528] rounded-md',
        'border border-gray-200 dark:border-[#2A2A2D] border-l-[3px]',
        'transition-all duration-150 shadow-sm dark:shadow-none',
        isDragging && 'opacity-50 shadow-lg',
        isDragOverlay && 'shadow-xl ring-1 ring-blue-500/30'
      )}
      onClick={onClick}
    >
      <div className="px-3 py-2.5 space-y-2">
        {/* Header with Tags and Menu */}
        <div className="flex items-start justify-between gap-1">
          {/* Tags Row */}
          {task.tags && task.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1 flex-1">
              {task.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="px-1.5 py-0.5 text-[10px] font-medium rounded"
                  style={{ 
                    backgroundColor: `${tag.color}25`,
                    color: tag.color 
                  }}
                >
                  {tag.name}
                </span>
              ))}
              {task.tags.length > 3 && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-200 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400">
                  +{task.tags.length - 3}
                </span>
              )}
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {/* Dropdown Menu */}
          {!isDragOverlay && (
            <DropdownMenu>
              <DropdownMenuTrigger
                asChild
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="opacity-0 group-hover:opacity-100 p-0.5 -mr-1 -mt-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-opacity"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Link2 className="h-4 w-4 mr-2" />
                  Copy link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Task Title */}
        <p className="text-sm text-gray-900 dark:text-gray-200 font-medium leading-snug line-clamp-2">
          {task.title}
        </p>

        {/* Description Preview */}
        {task.description && (
          <p className="text-xs text-gray-500 dark:text-gray-500 line-clamp-1">
            {task.description}
          </p>
        )}

        {/* Footer: Priority, Meta, Assignees */}
        {hasMetaInfo && (
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              {/* Priority Flag */}
              <Flag className={cn('h-3 w-3', priority.flagColor)} />
              
              {/* Subtask Progress */}
              {hasSubtasks && (
                <div className="flex items-center gap-1.5">
                  <CheckSquare className={cn(
                    'h-3 w-3',
                    subtaskCompleted === subtaskTotal ? 'text-emerald-500' : 'text-gray-400 dark:text-gray-500'
                  )} />
                  <span className={cn(
                    'text-[10px] font-medium',
                    subtaskCompleted === subtaskTotal ? 'text-emerald-500' : 'text-gray-500 dark:text-gray-500'
                  )}>
                    {subtaskCompleted}/{subtaskTotal}
                  </span>
                  <div className="w-8 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        subtaskCompleted === subtaskTotal
                          ? 'bg-emerald-500'
                          : 'bg-gradient-to-r from-emerald-500 to-green-600'
                      )}
                      style={{ width: `${subtaskProgress}%` }}
                    />
                  </div>
                </div>
              )}
              
              {/* Attachments */}
              {(task.attachment_count ?? 0) > 0 && (
                <div className="flex items-center gap-0.5 text-gray-500 dark:text-gray-500">
                  <Paperclip className="h-3 w-3" />
                  <span className="text-[10px]">{task.attachment_count}</span>
                </div>
              )}

              {/* Comments */}
              {(task.comment_count ?? 0) > 0 && (
                <div className="flex items-center gap-0.5 text-gray-500 dark:text-gray-500">
                  <MessageSquare className="h-3 w-3" />
                  <span className="text-[10px]">{task.comment_count}</span>
                </div>
              )}
            </div>

            {/* Assignee Avatars */}
            {task.assignees && task.assignees.length > 0 && (
              <div className="flex -space-x-1">
                {task.assignees.slice(0, 3).map((assignee, index) => (
                  <Avatar 
                    key={assignee.user_id} 
                    className="h-5 w-5 border border-white dark:border-[#1E1E20] ring-0"
                    style={{ zIndex: 3 - index }}
                  >
                    <AvatarImage src={assignee.user_avatar_url} alt={assignee.user_name} />
                    <AvatarFallback 
                      className="text-[8px] font-semibold text-white"
                      style={{ backgroundColor: assignee.user_color || getUserColor(assignee.user_id) }}
                    >
                      {getInitials(assignee.user_name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {task.assignees.length > 3 && (
                  <div className="h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700 border border-white dark:border-[#1E1E20] flex items-center justify-center">
                    <span className="text-[8px] font-medium text-gray-600 dark:text-gray-300">
                      +{task.assignees.length - 3}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
