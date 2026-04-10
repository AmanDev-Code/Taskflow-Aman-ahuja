import * as React from 'react';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface DatePickerPopoverProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  disablePastDates?: boolean;
  className?: string;
}

export function DatePickerPopover({
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
  disablePastDates = false,
  className,
}: DatePickerPopoverProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (date: Date | undefined) => {
    onChange?.(date);
    if (date) {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            'flex h-9 min-h-9 w-full items-center justify-between gap-2 rounded-lg px-3 py-0 text-left text-sm',
            'border border-gray-300 bg-white text-gray-900',
            'hover:bg-gray-50 hover:border-gray-400 transition-colors',
            'dark:border-slate-600 dark:bg-[#1E293B] dark:text-gray-100',
            'dark:hover:border-slate-500',
            'focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2',
            'focus:ring-offset-white dark:focus:ring-offset-[#1E293B]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            value ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400',
            className
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <CalendarIcon className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span className="truncate">{value ? formatDate(value) : placeholder}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0 w-auto">
        <Calendar
          selected={value}
          onSelect={handleSelect}
          disablePastDates={disablePastDates}
        />
      </PopoverContent>
    </Popover>
  );
}

interface DateRangePickerPopoverProps {
  startDate?: Date;
  endDate?: Date;
  onRangeChange?: (start: Date | undefined, end: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  disablePastDates?: boolean;
  className?: string;
}

export function DateRangePickerPopover({
  startDate,
  endDate,
  onRangeChange,
  placeholder = 'Select date range',
  disabled = false,
  disablePastDates = false,
  className,
}: DateRangePickerPopoverProps) {
  const [open, setOpen] = React.useState(false);

  const handleRangeSelect = (start: Date | undefined, end: Date | undefined) => {
    onRangeChange?.(start, end);
    if (start && end) {
      setOpen(false);
    }
  };

  const formatRangeDisplay = () => {
    if (startDate && endDate) {
      const sameYear = startDate.getFullYear() === endDate.getFullYear();
      const startText = startDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        ...(sameYear ? {} : { year: 'numeric' }),
      });
      const endText = endDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return `${startText} - ${endText}`;
    }
    if (startDate) {
      return `${formatDate(startDate)} - ...`;
    }
    return placeholder;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            'flex h-9 min-h-9 w-full items-center justify-between gap-2 rounded-lg px-3 py-0 text-left text-sm',
            'border border-gray-300 bg-white text-gray-900',
            'hover:bg-gray-50 hover:border-gray-400 transition-colors',
            'dark:border-slate-600 dark:bg-[#1E293B] dark:text-gray-100',
            'dark:hover:border-slate-500',
            'focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2',
            'focus:ring-offset-white dark:focus:ring-offset-[#1E293B]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            startDate ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400',
            className
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <CalendarIcon className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <span className="truncate whitespace-nowrap text-xs sm:text-sm">{formatRangeDisplay()}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0 w-auto">
        <Calendar
          mode="range"
          startDate={startDate}
          endDate={endDate}
          onRangeSelect={handleRangeSelect}
          disablePastDates={disablePastDates}
        />
      </PopoverContent>
    </Popover>
  );
}
