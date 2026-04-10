import { Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/types';
import { STATUS_CONFIG, getStatusConfig } from '@/types';

interface StatusDropdownProps {
  value: TaskStatus;
  onChange: (status: TaskStatus) => void;
  disabled?: boolean;
}

export function StatusDropdown({ value, onChange, disabled }: StatusDropdownProps) {
  const currentStatus = getStatusConfig(value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(
          'flex h-9 min-h-9 w-full min-w-0 items-center justify-between gap-2 rounded-lg px-3 py-0 text-sm font-medium transition-colors',
          'hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'dark:focus:ring-offset-gray-900'
        )}
        style={{
          backgroundColor: currentStatus.bgColor,
          color: currentStatus.color,
        }}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: currentStatus.dotColor }}
          />
          <span className="truncate">{currentStatus.title}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {STATUS_CONFIG.map((status) => (
          <DropdownMenuItem
            key={status.id}
            onClick={() => onChange(status.id)}
            className={cn(
              'flex items-center gap-2 cursor-pointer',
              value === status.id && 'bg-gray-100 dark:bg-gray-800'
            )}
          >
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: status.dotColor }}
            />
            <span
              className="flex-1"
              style={{ color: status.color }}
            >
              {status.title}
            </span>
            {value === status.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
