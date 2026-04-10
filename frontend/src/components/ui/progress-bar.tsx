import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  showLabel?: boolean;
  showCount?: { completed: number; total: number };
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'gradient';
  className?: string;
}

const sizeStyles = {
  sm: 'h-2',
  md: 'h-2.5',
  lg: 'h-3',
};

const variantStyles = {
  default: 'bg-emerald-500',
  success: 'bg-[#22C55E]',
  gradient: 'bg-gradient-to-r from-emerald-500 to-green-600',
};

export function ProgressBar({
  value,
  showLabel = false,
  showCount,
  size = 'md',
  variant = 'gradient',
  className,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const roundedValue = Math.round(clampedValue);

  return (
    <div className={cn('w-full', className)}>
      {(showLabel || showCount) && (
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="text-gray-500 dark:text-gray-400">
            {showCount ? 'Progress' : ''}
          </span>
          <span className="font-medium text-gray-900 dark:text-white">
            {showCount
              ? `${showCount.completed} of ${showCount.total}`
              : `${roundedValue}%`}
          </span>
        </div>
      )}
      <div
        className={cn(
          'w-full rounded-full bg-gray-200 dark:bg-slate-600/80 overflow-hidden ring-1 ring-inset ring-gray-300/80 dark:ring-slate-500/50',
          sizeStyles[size]
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-out',
            variantStyles[variant]
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
