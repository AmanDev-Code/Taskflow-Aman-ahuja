import { DatePickerPopover, DateRangePickerPopover } from '@/components/ui/date-picker-popover';

interface DatePickerProps {
  label: string;
  value?: string;
  onChange: (date: string | undefined) => void;
  disabled?: boolean;
  minDate?: string;
  disablePastDates?: boolean;
}

function parseDate(dateString?: string): Date | undefined {
  if (!dateString) return undefined;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? undefined : date;
}

function formatDateToString(date?: Date): string | undefined {
  if (!date) return undefined;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DatePicker({
  label,
  value,
  onChange,
  disabled,
  disablePastDates = false,
}: DatePickerProps) {
  const handleSelect = (date: Date | undefined) => {
    onChange(formatDateToString(date));
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label}
      </label>
      <DatePickerPopover
        value={parseDate(value)}
        onChange={handleSelect}
        disabled={disabled}
        disablePastDates={disablePastDates}
        placeholder="Select date"
      />
    </div>
  );
}

interface DateRangePickerProps {
  startDate?: string;
  dueDate?: string;
  onStartDateChange: (date: string | undefined) => void;
  onDueDateChange: (date: string | undefined) => void;
  onRangeChange?: (startDate: string | undefined, dueDate: string | undefined) => void;
  disabled?: boolean;
  disablePastDates?: boolean;
  /** When false, only the popover trigger is rendered (label comes from parent row). */
  showLabel?: boolean;
}

export function DateRangePicker({
  startDate,
  dueDate,
  onStartDateChange,
  onDueDateChange,
  onRangeChange,
  disabled,
  disablePastDates = false,
  showLabel = true,
}: DateRangePickerProps) {
  const handleRangeChange = (start: Date | undefined, end: Date | undefined) => {
    const nextStartDate = formatDateToString(start);
    const nextDueDate = formatDateToString(end);
    if (onRangeChange) {
      onRangeChange(nextStartDate, nextDueDate);
      return;
    }
    onStartDateChange(nextStartDate);
    onDueDateChange(nextDueDate);
  };

  return (
    <div className={showLabel ? 'space-y-1.5' : undefined}>
      {showLabel ? (
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Date range
        </label>
      ) : null}
      <DateRangePickerPopover
        startDate={parseDate(startDate)}
        endDate={parseDate(dueDate)}
        onRangeChange={handleRangeChange}
        disabled={disabled}
        disablePastDates={disablePastDates}
        placeholder="Select date range"
      />
    </div>
  );
}

interface IndividualDatePickersProps {
  startDate?: string;
  dueDate?: string;
  onStartDateChange: (date: string | undefined) => void;
  onDueDateChange: (date: string | undefined) => void;
  disabled?: boolean;
}

export function IndividualDatePickers({
  startDate,
  dueDate,
  onStartDateChange,
  onDueDateChange,
  disabled,
}: IndividualDatePickersProps) {
  return (
    <div className="space-y-3">
      <DatePicker
        label="Start Date"
        value={startDate}
        onChange={onStartDateChange}
        disabled={disabled}
      />
      <DatePicker
        label="Due Date"
        value={dueDate}
        onChange={onDueDateChange}
        disabled={disabled}
        disablePastDates={false}
      />
    </div>
  );
}
