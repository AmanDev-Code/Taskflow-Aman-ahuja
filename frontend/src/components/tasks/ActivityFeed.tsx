import { useState, useRef, useLayoutEffect } from 'react';
import { Send, MessageSquare, ArrowRightLeft, User, Calendar, Flag, FileText, Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { cn, getInitials, getUserColor, formatRelativeTime } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useActivities, useCreateComment } from '@/hooks/useActivities';
import type { Activity, ActivityType } from '@/types';
import { getStatusConfig } from '@/types';

interface ActivityFeedProps {
  taskId: string;
  entityType?: 'task' | 'subtask';
  fillHeight?: boolean;
  /** When true, messages sit at the bottom of the scroll area (chat-style) and the list scrolls upward. */
  anchorBottom?: boolean;
}

const activityIcons: Record<ActivityType, React.ReactNode> = {
  comment: <MessageSquare className="h-3.5 w-3.5" />,
  status_change: <ArrowRightLeft className="h-3.5 w-3.5" />,
  assignee_change: <User className="h-3.5 w-3.5" />,
  priority_change: <Flag className="h-3.5 w-3.5" />,
  due_date_change: <Calendar className="h-3.5 w-3.5" />,
  title_change: <FileText className="h-3.5 w-3.5" />,
  description_change: <FileText className="h-3.5 w-3.5" />,
  created: <Plus className="h-3.5 w-3.5" />,
  updated: <FileText className="h-3.5 w-3.5" />,
};

function formatStatusLabel(status: string): string {
  const config = getStatusConfig(status as any);
  return config?.title || status.replace(/_/g, ' ').toUpperCase();
}

function formatPriorityLabel(priority: string): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function formatDateValue(value: string | null | undefined): string {
  if (!value) return 'none';
  try {
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

function renderActivityContent(activity: Activity) {
  switch (activity.type) {
    case 'comment':
      return (
        <div className="mt-2 rounded-2xl bg-gradient-to-br from-white to-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700 shadow-sm dark:from-slate-800 dark:to-slate-800/70 dark:text-slate-100">
          <p className="whitespace-pre-wrap">
            {activity.content}
          </p>
        </div>
      );
    case 'status_change':
      return (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          changed status from{' '}
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            {formatStatusLabel(activity.metadata?.old_value || '')}
          </span>{' '}
          to{' '}
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
            {formatStatusLabel(activity.metadata?.new_value || '')}
          </span>
        </p>
      );
    case 'assignee_change':
      return (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {activity.metadata?.new_value
            ? <>assigned to <span className="font-medium text-gray-700 dark:text-gray-300">{activity.metadata.new_value}</span></>
            : activity.metadata?.old_value
              ? <>removed <span className="font-medium text-gray-700 dark:text-gray-300">{activity.metadata.old_value}</span> from assignees</>
              : 'updated assignees'}
        </p>
      );
    case 'priority_change':
      return (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          changed priority from{' '}
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {formatPriorityLabel(activity.metadata?.old_value || '')}
          </span>{' '}
          to{' '}
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {formatPriorityLabel(activity.metadata?.new_value || '')}
          </span>
        </p>
      );
    case 'due_date_change':
      return (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {activity.metadata?.new_value
            ? <>changed due date to <span className="font-medium text-gray-700 dark:text-gray-300">{formatDateValue(activity.metadata.new_value)}</span></>
            : 'removed due date'}
          {activity.metadata?.old_value && activity.metadata?.new_value && (
            <> (was {formatDateValue(activity.metadata.old_value)})</>
          )}
        </p>
      );
    case 'created':
      return (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          created this task
        </p>
      );
    case 'updated':
      return (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          updated{' '}
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {activity.metadata?.field || 'this task'}
          </span>
        </p>
      );
    default:
      return null;
  }
}

export function ActivityFeed({
  taskId,
  entityType = 'task',
  fillHeight = false,
  anchorBottom = true,
}: ActivityFeedProps) {
  const [comment, setComment] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const { data: activities = [], isLoading } = useActivities(taskId, entityType);
  const createComment = useCreateComment(taskId, entityType);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim() && !createComment.isPending) {
      createComment.mutate(comment.trim(), {
        onSuccess: () => setComment(''),
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  useLayoutEffect(() => {
    if (!anchorBottom || !scrollRef.current) return;
    const el = scrollRef.current;
    el.scrollTop = el.scrollHeight;
  }, [activities, isLoading, anchorBottom]);

  const isComment = (type: ActivityType) => type === 'comment';

  const messageList = isLoading ? (
    <div className="flex items-center justify-center py-6">
      <Spinner size="sm" />
    </div>
  ) : activities.length === 0 ? (
    <div className="text-center py-6 px-2">
      <MessageSquare className="h-7 w-7 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
      <p className="text-sm text-gray-500 dark:text-gray-400">No messages yet</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Start the discussion below</p>
    </div>
  ) : (
    activities.map((activity) => (
      <div
        key={activity.id}
        className={cn(
          'flex gap-2.5',
          isComment(activity.type)
            ? 'items-start'
            : 'items-center rounded-xl bg-gray-50 px-2.5 py-1.5 dark:bg-slate-800/50'
        )}
      >
        {isComment(activity.type) ? (
          <Avatar className="h-7 w-7 flex-shrink-0">
            <AvatarImage src={activity.user_avatar_url || undefined} />
            <AvatarFallback
              className="text-[10px] text-white"
              style={{
                backgroundColor: activity.user_color || getUserColor(activity.user_id),
              }}
            >
              {getInitials(activity.user_name)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-7 w-7 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            {activityIcons[activity.type]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
              {activity.user_name}
            </span>
            <span className="text-xs text-gray-400 dark:text-slate-400">
              {formatRelativeTime(activity.created_at)}
            </span>
          </div>
          {renderActivityContent(activity)}
        </div>
      </div>
    ))
  );

  return (
    <div
      className={cn(
        'relative z-0 flex min-h-0 flex-col gap-0',
        fillHeight && 'h-full min-h-0'
      )}
    >
      <div
        ref={scrollRef}
        className={cn(
          'scrollbar-none overflow-y-auto overflow-x-hidden pr-1',
          fillHeight ? 'min-h-0 flex-1' : 'max-h-[380px]'
        )}
      >
        <div
          className={cn(
            'flex flex-col gap-3',
            anchorBottom && 'min-h-full justify-end'
          )}
        >
          {messageList}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 space-y-2 border-t border-gray-100 pt-2 dark:border-gray-800"
      >
        <div className="flex gap-2">
          <Avatar className="h-7 w-7 flex-shrink-0">
            <AvatarImage src={user?.avatar_url} />
            <AvatarFallback
              className="text-[10px] text-white"
              style={{
                backgroundColor: user?.color || '#E23744',
              }}
            >
              {user ? getInitials(user.name) : 'ME'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a comment… (⌘↵ to send)"
              disabled={createComment.isPending}
              className={cn(
                fillHeight ? 'min-h-[44px]' : 'min-h-[56px]',
                'resize-none text-sm',
                'bg-gray-50 dark:bg-gray-800/50',
                'border-gray-200 dark:border-gray-700',
                'focus:bg-white dark:focus:bg-gray-800'
              )}
            />
          </div>
        </div>
        <div className="flex justify-end pb-0.5">
          <Button
            type="submit"
            size="sm"
            disabled={!comment.trim() || createComment.isPending}
            className="gap-2"
          >
            {createComment.isPending ? (
              <Spinner size="sm" className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}

export function ActivityFeedPlaceholder({ taskCreatedAt, creatorName }: { taskCreatedAt: string; creatorName?: string }) {
  const { user } = useAuthStore();
  const [comment, setComment] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
          <Plus className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1">
          <p className="text-sm">
            <span className="font-medium text-gray-900 dark:text-white">
              {creatorName || 'Unknown'}
            </span>
            <span className="text-gray-500 dark:text-gray-400"> created this task</span>
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {formatRelativeTime(taskCreatedAt)}
          </p>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.avatar_url} />
            <AvatarFallback
              className="text-xs text-white"
              style={{ backgroundColor: user?.color || '#E23744' }}
            >
              {user ? getInitials(user.name) : 'ME'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write a comment..."
              className="min-h-[80px] resize-none"
            />
            <div className="flex justify-end mt-2">
              <Button size="sm" disabled={!comment.trim()}>
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
