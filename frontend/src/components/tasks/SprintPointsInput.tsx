import { useState, useRef, useEffect } from 'react';
import { Target } from 'lucide-react';
import { Input } from '@/components/ui/input';

const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13, 21];

interface SprintPointsInputProps {
  value: number | undefined;
  onChange: (points: number | undefined) => void;
  disabled?: boolean;
}

export function SprintPointsInput({ value, onChange, disabled }: SprintPointsInputProps) {
  const [inputValue, setInputValue] = useState(value?.toString() || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value?.toString() || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBlur = () => {
    const points = inputValue ? parseInt(inputValue, 10) : undefined;
    if (points !== value) {
      onChange(points);
    }
    setTimeout(() => setShowSuggestions(false), 150);
  };

  const handleSelectPoint = (point: number) => {
    setInputValue(point.toString());
    onChange(point);
    setShowSuggestions(false);
  };

  const handleClear = () => {
    setInputValue('');
    onChange(undefined);
    setShowSuggestions(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex h-9 min-h-9 w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 dark:border-slate-600 dark:bg-[#1E293B]">
        <Target className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
        <Input
          type="number"
          min="0"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={handleBlur}
          placeholder="Empty"
          disabled={disabled}
          className="h-8 min-w-0 flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
      </div>

      {showSuggestions && !disabled && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-slate-800">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 px-1">
            Fibonacci sequence
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FIBONACCI_POINTS.map((point) => (
              <button
                key={point}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectPoint(point);
                }}
                className={`
                  px-2.5 py-1 text-sm font-medium rounded-md transition-colors
                  ${value === point
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                `}
              >
                {point}
              </button>
            ))}
          </div>
          {value && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleClear();
              }}
              className="mt-2 w-full text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 py-1"
            >
              Clear points
            </button>
          )}
        </div>
      )}
    </div>
  );
}
