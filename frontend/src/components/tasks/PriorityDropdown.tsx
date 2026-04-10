import { Check, ChevronDown, Flag } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { TaskPriority } from '@/types';

interface PriorityConfig {
  value: TaskPriority;
  label: string;
  color: string;
  bgColor: string;
  darkBgColor: string;
}

const PRIORITY_CONFIG: PriorityConfig[] = [
  {
    value: 'urgent',
    label: 'Urgent',
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    darkBgColor: 'rgba(239, 68, 68, 0.2)',
  },
  {
    value: 'high',
    label: 'High',
    color: '#F97316',
    bgColor: 'rgba(249, 115, 22, 0.1)',
    darkBgColor: 'rgba(249, 115, 22, 0.2)',
  },
  {
    value: 'medium',
    label: 'Medium',
    color: '#EAB308',
    bgColor: 'rgba(234, 179, 8, 0.1)',
    darkBgColor: 'rgba(234, 179, 8, 0.2)',
  },
  {
    value: 'low',
    label: 'Low',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    darkBgColor: 'rgba(59, 130, 246, 0.2)',
  },
];

const getPriorityConfig = (priority: TaskPriority): PriorityConfig => {
  return PRIORITY_CONFIG.find((p) => p.value === priority) || PRIORITY_CONFIG[2];
};

interface PriorityDropdownProps {
  value: TaskPriority;
  onChange: (priority: TaskPriority) => void;
  disabled?: boolean;
}

export function PriorityDropdown({ value, onChange, disabled }: PriorityDropdownProps) {
  const currentPriority = getPriorityConfig(value);
  const isDark = document.documentElement.classList.contains('dark');

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
          backgroundColor: isDark ? currentPriority.darkBgColor : currentPriority.bgColor,
          color: currentPriority.color,
        }}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Flag className="h-4 w-4 shrink-0" fill="currentColor" />
          <span className="truncate">{currentPriority.label}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        {PRIORITY_CONFIG.map((priority) => (
          <DropdownMenuItem
            key={priority.value}
            onClick={() => onChange(priority.value)}
            className={cn(
              'flex items-center gap-2 cursor-pointer',
              value === priority.value && 'bg-gray-100 dark:bg-gray-800'
            )}
          >
            <Flag
              className="h-4 w-4"
              style={{ color: priority.color }}
              fill={priority.color}
            />
            <span
              className="flex-1 text-gray-700 dark:text-gray-300"
            >
              {priority.label}
            </span>
            {value === priority.value && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
