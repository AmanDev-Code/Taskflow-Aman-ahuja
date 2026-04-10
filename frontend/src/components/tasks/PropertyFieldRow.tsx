import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PropertyFieldRowProps {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  className?: string;
}

/** Label + control row: stacked on small screens, inline from `sm` (avoids cramped mobile rows). */
export function PropertyFieldRow({ icon: Icon, label, children, className }: PropertyFieldRowProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4', className)}>
      <div className="flex min-w-0 shrink-0 items-center gap-2 text-xs text-gray-500 dark:text-gray-400 sm:w-36 sm:max-w-[9rem]">
        <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
        <span className="truncate font-medium">{label}</span>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
