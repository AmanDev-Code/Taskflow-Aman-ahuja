import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getInitials, getUserColor } from '@/lib/utils';
import type { TaskAssignee, ProjectMember } from '@/types';

const TRIGGER_BASE =
  'flex h-9 min-h-9 w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 text-left text-sm transition-colors hover:border-gray-300 dark:border-slate-600 dark:bg-[#1E293B] dark:hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#1E293B] disabled:cursor-not-allowed disabled:opacity-50';

interface AssigneeSelectorProps {
  assignees: TaskAssignee[];
  projectMembers: ProjectMember[];
  onChange: (assigneeIds: string[]) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function AssigneeSelector({
  assignees = [],
  projectMembers = [],
  onChange,
  disabled,
  isLoading,
}: AssigneeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const memberIds = new Set(projectMembers.map((member) => member.user.id));

  const visibleAssignees = (assignees || []).filter((assignee) =>
    memberIds.has(assignee.user_id)
  );
  const assigneeIds = visibleAssignees.map((a) => a?.user_id).filter(Boolean) as string[];

  const handleToggleAssignee = (memberId: string) => {
    if (assigneeIds.includes(memberId)) {
      onChange(assigneeIds.filter((id) => id !== memberId));
    } else {
      onChange([...assigneeIds, memberId]);
    }
  };

  const ringClass = 'ring-2 ring-white dark:ring-[#1E293B]';

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild disabled={disabled || isLoading || projectMembers.length === 0}>
        <button type="button" className={TRIGGER_BASE}>
          <div className="flex min-w-0 flex-1 items-center">
            {visibleAssignees.length === 0 ? (
              <span className="text-sm text-gray-500 dark:text-gray-400">Empty</span>
            ) : visibleAssignees.length === 1 ? (
              <div className="flex min-w-0 items-center gap-2">
                <Avatar className={cn('h-7 w-7 shrink-0', ringClass)}>
                  <AvatarImage src={visibleAssignees[0].user_avatar_url} />
                  <AvatarFallback
                    className="text-[10px] text-white"
                    style={{
                      backgroundColor:
                        visibleAssignees[0].user_color || getUserColor(visibleAssignees[0].user_id),
                    }}
                  >
                    {getInitials(visibleAssignees[0].user_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-sm text-gray-900 dark:text-gray-100">
                  {visibleAssignees[0].user_name}
                </span>
              </div>
            ) : (
              <div className="flex items-center pl-0.5">
                {visibleAssignees.map((assignee, index) => (
                  <Avatar
                    key={assignee.user_id}
                    className={cn('h-7 w-7 shrink-0', ringClass, index > 0 && '-ml-2.5')}
                    title={assignee.user_name}
                  >
                    <AvatarImage src={assignee.user_avatar_url} />
                    <AvatarFallback
                      className="text-[10px] text-white"
                      style={{
                        backgroundColor: assignee.user_color || getUserColor(assignee.user_id),
                      }}
                    >
                      {getInitials(assignee.user_name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 max-h-64 overflow-y-auto">
        {projectMembers.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            No team members found
          </div>
        ) : (
          projectMembers.map((member) => {
            const isAssigned = assigneeIds.includes(member.user.id);
            return (
              <DropdownMenuItem
                key={member.id}
                onClick={() => handleToggleAssignee(member.user.id)}
                className={cn(
                  'flex cursor-pointer items-center gap-2',
                  isAssigned && 'bg-gray-100 dark:bg-gray-800'
                )}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={member.user.avatar_url} />
                  <AvatarFallback
                    className="text-[10px] text-white"
                    style={{ backgroundColor: member.user.color || getUserColor(member.user.id) }}
                  >
                    {getInitials(member.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                    {member.user.name}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{member.user.email}</p>
                </div>
                {isAssigned && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
