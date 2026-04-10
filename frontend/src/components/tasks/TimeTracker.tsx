import { useState, type ReactNode } from 'react';
import { MoreHorizontal, Play, Square, Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { formatTime } from '@/lib/utils';

interface TimeTrackerProps {
  taskId: string;
  entityType?: 'task' | 'subtask';
  timeEstimate?: number;
  onTimeUpdate?: () => void;
}

export function TimeTracker({ taskId, entityType = 'task', timeEstimate, onTimeUpdate }: TimeTrackerProps) {
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualMinutes, setManualMinutes] = useState('');

  const {
    isRunning,
    elapsedFormatted,
    totalTimeSpent,
    isLoading,
    isStarting,
    isStopping,
    isAddingTime,
    startTimer,
    stopTimer,
    addManualTime,
  } = useTimeTracking(taskId, entityType);

  const handleToggleTimer = () => {
    if (isRunning) {
      stopTimer();
    } else {
      startTimer();
    }
    onTimeUpdate?.();
  };

  const handleAddManualTime = () => {
    const minutes = parseInt(manualMinutes, 10);
    if (minutes > 0) {
      addManualTime(minutes);
      setManualMinutes('');
      setShowManualEntry(false);
      onTimeUpdate?.();
    }
  };

  const progress = timeEstimate && timeEstimate > 0 
    ? Math.min((totalTimeSpent / timeEstimate) * 100, 100) 
    : 0;

  const isOverEstimate = timeEstimate && totalTimeSpent > timeEstimate;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Timer Display */}
      <div className="flex items-center gap-3">
        <Button
          variant={isRunning ? 'destructive' : 'default'}
          size="sm"
          onClick={handleToggleTimer}
          disabled={isStarting || isStopping}
          className={`gap-2 min-w-[100px] ${
            isRunning 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-emerald-500 hover:bg-emerald-600 text-white'
          }`}
        >
          {isStarting || isStopping ? (
            <Spinner size="sm" />
          ) : isRunning ? (
            <>
              <Square className="h-3 w-3 fill-current" />
              Stop
            </>
          ) : (
            <>
              <Play className="h-3 w-3 fill-current" />
              Start
            </>
          )}
        </Button>

        {isRunning && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg border border-emerald-500/30">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-mono font-medium text-emerald-600 dark:text-emerald-400">
              {elapsedFormatted}
            </span>
          </div>
        )}
      </div>

      {/* Total Time Display */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Time Spent</span>
          <span className={`font-medium ${
            isOverEstimate 
              ? 'text-red-500 dark:text-red-400' 
              : 'text-gray-900 dark:text-white'
          }`}>
            {formatTime(totalTimeSpent)}
            {timeEstimate && timeEstimate > 0 && (
              <span className="text-gray-400 dark:text-gray-500">
                {' / '}{formatTime(timeEstimate)}
              </span>
            )}
          </span>
        </div>

        {/* Progress Bar */}
        {timeEstimate && timeEstimate > 0 && (
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isOverEstimate 
                  ? 'bg-red-500' 
                  : progress > 75 
                    ? 'bg-amber-500' 
                    : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Manual Entry Toggle */}
      {!showManualEntry ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowManualEntry(true)}
          className="w-full justify-start gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <Plus className="h-3 w-3" />
          Add time manually
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="number"
              min="1"
              value={manualMinutes}
              onChange={(e) => setManualMinutes(e.target.value)}
              placeholder="Minutes"
              className="pl-8 h-8 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddManualTime()}
            />
          </div>
          <Button
            size="sm"
            onClick={handleAddManualTime}
            disabled={!manualMinutes || parseInt(manualMinutes, 10) <= 0 || isAddingTime}
            className="h-8"
          >
            {isAddingTime ? <Spinner size="sm" /> : 'Add'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowManualEntry(false);
              setManualMinutes('');
            }}
            className="h-8 px-2"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

/** No border — matches card surface; controls provide their own affordance. */
const TRACK_SHELL =
  'flex h-9 min-h-9 w-full items-center gap-1 bg-transparent px-0.5 dark:bg-transparent';

/** Compact track-time control for the properties panel (single-row height). */
export function TrackTimeField({
  taskId,
  entityType = 'task',
  timeEstimate,
}: {
  taskId: string;
  entityType?: 'task' | 'subtask';
  timeEstimate?: number;
}) {
  const [manualOpen, setManualOpen] = useState(false);
  const [manualMinutes, setManualMinutes] = useState('');

  const {
    isRunning,
    elapsedFormatted,
    totalTimeSpent,
    isLoading,
    isStarting,
    isStopping,
    isAddingTime,
    startTimer,
    stopTimer,
    addManualTime,
  } = useTimeTracking(taskId, entityType);

  const handleAddManualTime = () => {
    const minutes = parseInt(manualMinutes, 10);
    if (minutes > 0) {
      addManualTime(minutes);
      setManualMinutes('');
      setManualOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`${TRACK_SHELL} justify-center`}>
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className={TRACK_SHELL}>
      <Button
        type="button"
        variant={isRunning ? 'destructive' : 'default'}
        size="sm"
        onClick={() => (isRunning ? stopTimer() : startTimer())}
        disabled={isStarting || isStopping}
        className={`h-8 shrink-0 gap-1 px-2.5 text-xs sm:text-sm ${
          isRunning
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-emerald-500 hover:bg-emerald-600 text-white'
        }`}
      >
        {isStarting || isStopping ? (
          <Spinner size="sm" />
        ) : isRunning ? (
          <>
            <Square className="h-3 w-3 fill-current" />
            Stop
          </>
        ) : (
          <>
            <Play className="h-3 w-3 fill-current" />
            Start
          </>
        )}
      </Button>
      {isRunning ? (
        <span className="hidden max-w-[3.25rem] truncate font-mono text-[10px] font-medium text-emerald-600 sm:inline dark:text-emerald-400">
          {elapsedFormatted}
        </span>
      ) : null}
      <span
        className="ml-auto min-w-0 truncate text-right text-[11px] tabular-nums text-gray-500 dark:text-gray-400"
        title={
          timeEstimate && timeEstimate > 0
            ? `${formatTime(totalTimeSpent)} / ${formatTime(timeEstimate)}`
            : formatTime(totalTimeSpent)
        }
      >
        {formatTime(totalTimeSpent)}
        {timeEstimate && timeEstimate > 0 ? (
          <span className="text-gray-400 dark:text-gray-500"> / {formatTime(timeEstimate)}</span>
        ) : null}
      </span>
      <Popover open={manualOpen} onOpenChange={setManualOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
            aria-label="Time options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-3">
          <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">Add time manually</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Clock className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <Input
                type="number"
                min="1"
                value={manualMinutes}
                onChange={(e) => setManualMinutes(e.target.value)}
                placeholder="Min"
                className="h-9 pl-7 text-xs"
                onKeyDown={(e) => e.key === 'Enter' && handleAddManualTime()}
              />
            </div>
            <Button
              type="button"
              size="sm"
              className="h-9 shrink-0 px-3"
              onClick={handleAddManualTime}
              disabled={!manualMinutes || parseInt(manualMinutes, 10) <= 0 || isAddingTime}
            >
              {isAddingTime ? <Spinner size="sm" /> : 'Add'}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Single timer hook, four columns: controls · estimate slot · time spent · sprint slot (desktop grid; stacks on small screens). */
export function TimeTrackerGridRow({
  taskId,
  entityType = 'task',
  timeEstimate,
  labelClassName,
  estimateSlot,
  sprintSlot,
}: {
  taskId: string;
  entityType?: 'task' | 'subtask';
  timeEstimate?: number;
  labelClassName: string;
  estimateSlot: ReactNode;
  sprintSlot: ReactNode;
}) {
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualMinutes, setManualMinutes] = useState('');

  const {
    isRunning,
    elapsedFormatted,
    totalTimeSpent,
    isLoading,
    isStarting,
    isStopping,
    isAddingTime,
    startTimer,
    stopTimer,
    addManualTime,
  } = useTimeTracking(taskId, entityType);

  const progress =
    timeEstimate && timeEstimate > 0 ? Math.min((totalTimeSpent / timeEstimate) * 100, 100) : 0;
  const isOverEstimate = timeEstimate && totalTimeSpent > timeEstimate;

  const handleAddManualTime = () => {
    const minutes = parseInt(manualMinutes, 10);
    if (minutes > 0) {
      addManualTime(minutes);
      setManualMinutes('');
      setShowManualEntry(false);
    }
  };

  if (isLoading) {
    return (
      <div className="col-span-full flex justify-center py-6 lg:col-span-4">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="col-span-full grid grid-cols-1 gap-4 lg:contents lg:gap-0">
      <div className="min-w-0 space-y-1.5 lg:col-span-1">
        <div className={labelClassName}>Time tracking</div>
        <div className="flex min-h-9 flex-col justify-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={isRunning ? 'destructive' : 'default'}
              size="sm"
              onClick={() => (isRunning ? stopTimer() : startTimer())}
              disabled={isStarting || isStopping}
              className={`h-9 shrink-0 gap-1.5 px-3 ${
                isRunning
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              {isStarting || isStopping ? (
                <Spinner size="sm" />
              ) : isRunning ? (
                <>
                  <Square className="h-3 w-3 fill-current" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 fill-current" />
                  Start
                </>
              )}
            </Button>
            {isRunning && (
              <div className="flex h-9 items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 dark:bg-emerald-500/20">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                <span className="font-mono text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {elapsedFormatted}
                </span>
              </div>
            )}
          </div>
          {!showManualEntry ? (
            <button
              type="button"
              onClick={() => setShowManualEntry(true)}
              className="flex w-fit items-center gap-1 text-left text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Plus className="h-3 w-3" />
              Add time manually
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="relative min-w-[5rem] flex-1">
                <Clock className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <Input
                  type="number"
                  min="1"
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(e.target.value)}
                  placeholder="Min"
                  className="h-9 pl-7 text-xs"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddManualTime()}
                />
              </div>
              <Button
                size="sm"
                className="h-9 px-2 text-xs"
                onClick={handleAddManualTime}
                disabled={!manualMinutes || parseInt(manualMinutes, 10) <= 0 || isAddingTime}
              >
                {isAddingTime ? <Spinner size="sm" /> : 'Add'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2 text-xs"
                onClick={() => {
                  setShowManualEntry(false);
                  setManualMinutes('');
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0 space-y-1.5 lg:col-span-1">
        <div className={labelClassName}>Time estimate (minutes)</div>
        {estimateSlot}
      </div>

      <div className="min-w-0 space-y-1.5 lg:col-span-1">
        <div className={labelClassName}>Time spent</div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 dark:border-gray-700 dark:bg-gray-800/50">
          <div className="flex h-9 min-h-9 w-full items-center justify-between gap-2 px-0.5 text-sm">
            <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">Total</span>
            <span
              className={`truncate text-right font-medium tabular-nums ${
                isOverEstimate ? 'text-red-500 dark:text-red-400' : 'text-gray-900 dark:text-white'
              }`}
            >
              {formatTime(totalTimeSpent)}
              {timeEstimate && timeEstimate > 0 && (
                <span className="text-gray-400 dark:text-gray-500">
                  {' / '}
                  {formatTime(timeEstimate)}
                </span>
              )}
            </span>
          </div>
          {timeEstimate && timeEstimate > 0 && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className={`h-full transition-all duration-300 ${
                  isOverEstimate ? 'bg-red-500' : progress > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0 space-y-1.5 lg:col-span-1">
        <div className={labelClassName}>Sprint points</div>
        {sprintSlot}
      </div>
    </div>
  );
}
