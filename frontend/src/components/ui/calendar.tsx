import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  startDate?: Date;
  endDate?: Date;
  onRangeSelect?: (start: Date | undefined, end: Date | undefined) => void;
  mode?: 'single' | 'range';
  disablePastDates?: boolean;
  className?: string;
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

function isInRange(date: Date, start?: Date, end?: Date): boolean {
  if (!start || !end) return false;
  const time = date.getTime();
  return time > start.getTime() && time < end.getTime();
}

function isPastDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < today;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function Calendar({
  selected,
  onSelect,
  startDate,
  endDate,
  onRangeSelect,
  mode = 'single',
  disablePastDates = false,
  className,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(() => {
    const initialDate = selected || startDate || new Date();
    return new Date(initialDate.getFullYear(), initialDate.getMonth(), 1);
  });
  const [rangeStart, setRangeStart] = React.useState<Date | undefined>(startDate);
  const [rangeEnd, setRangeEnd] = React.useState<Date | undefined>(endDate);
  const [hoverDate, setHoverDate] = React.useState<Date | undefined>();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month);

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    if (mode === 'single' && onSelect) {
      onSelect(today);
    }
  };

  const clearSelection = () => {
    if (mode === 'single' && onSelect) {
      onSelect(undefined);
    } else if (mode === 'range' && onRangeSelect) {
      setRangeStart(undefined);
      setRangeEnd(undefined);
      onRangeSelect(undefined, undefined);
    }
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(year, month, day);
    
    if (disablePastDates && isPastDate(clickedDate)) {
      return;
    }

    if (mode === 'single' && onSelect) {
      onSelect(clickedDate);
    } else if (mode === 'range' && onRangeSelect) {
      if (!rangeStart || (rangeStart && rangeEnd)) {
        setRangeStart(clickedDate);
        setRangeEnd(undefined);
      } else {
        if (clickedDate < rangeStart) {
          setRangeEnd(rangeStart);
          setRangeStart(clickedDate);
          onRangeSelect(clickedDate, rangeStart);
        } else {
          setRangeEnd(clickedDate);
          onRangeSelect(rangeStart, clickedDate);
        }
      }
    }
  };

  const handleMouseEnter = (day: number) => {
    if (mode === 'range' && rangeStart && !rangeEnd) {
      setHoverDate(new Date(year, month, day));
    }
  };

  const handleMouseLeave = () => {
    setHoverDate(undefined);
  };

  const renderDays = () => {
    const days: React.ReactNode[] = [];
    
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-9 w-9" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isSelected = selected && isSameDay(date, selected);
      const isRangeStart = rangeStart && isSameDay(date, rangeStart);
      const isRangeEnd = rangeEnd && isSameDay(date, rangeEnd);
      const inRange = isInRange(date, rangeStart, rangeEnd);
      const inHoverRange = rangeStart && !rangeEnd && hoverDate && isInRange(
        date,
        hoverDate < rangeStart ? hoverDate : rangeStart,
        hoverDate < rangeStart ? rangeStart : hoverDate
      );
      const isTodayDate = isToday(date);
      const isDisabled = disablePastDates && isPastDate(date);

      days.push(
        <button
          key={day}
          type="button"
          disabled={isDisabled}
          onClick={() => handleDateClick(day)}
          onMouseEnter={() => handleMouseEnter(day)}
          onMouseLeave={handleMouseLeave}
          className={cn(
            'h-9 w-9 rounded-lg text-sm font-medium transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2',
            'focus:ring-offset-white dark:focus:ring-offset-[#1E293B]',
            // Default state
            'text-gray-800 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700/50',
            // Today highlight
            isTodayDate && !isSelected && !isRangeStart && !isRangeEnd && 'ring-2 ring-[#7C3AED]/50',
            // Selected state (single mode)
            isSelected && 'bg-[#7C3AED] text-white hover:bg-[#7C3AED]/90',
            // Range start/end
            (isRangeStart || isRangeEnd) && 'bg-[#7C3AED] text-white hover:bg-[#7C3AED]/90',
            // In range
            (inRange || inHoverRange) &&
              'bg-[#7C3AED]/20 text-gray-900 dark:text-white',
            // Disabled state
            isDisabled && 'opacity-30 cursor-not-allowed hover:bg-transparent'
          )}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  return (
    <div
      className={cn(
        'p-4 rounded-xl border border-gray-200 bg-white',
        'dark:border-slate-600 dark:bg-[#1E293B]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          className="rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700/50 dark:hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {MONTHS[month]} {year}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700/50 dark:hover:text-white"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS.map((day) => (
          <div
            key={day}
            className="h-9 w-9 flex items-center justify-center text-xs font-medium text-gray-500"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {renderDays()}
      </div>

      {/* Quick actions */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-slate-600">
        <button
          type="button"
          onClick={clearSelection}
          className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={goToToday}
          className="px-3 py-1.5 text-xs font-medium text-[#7C3AED] hover:text-[#8B5CF6] transition-colors"
        >
          Today
        </button>
      </div>
    </div>
  );
}

export { type CalendarProps };
