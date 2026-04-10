import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import { Plus } from 'lucide-react';
import type { Task, TaskStatus } from '@/types';
import { cn } from '@/lib/utils';

interface TaskColumnProps {
  id: TaskStatus;
  title: string;
  color: string;
  bgColor: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: () => void;
  onDuplicateTask?: (taskId: string) => void;
}

export function TaskColumn({
  id,
  title,
  color,
  bgColor,
  tasks = [],
  onTaskClick,
  onAddTask,
  onDuplicateTask,
}: TaskColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });
  
  const safeTasks = tasks || [];
  const emptyDropStyle = {
    borderColor: isOver ? color : undefined,
    backgroundColor: isOver ? bgColor : undefined,
  };

  return (
    <div className="flex flex-col flex-shrink-0 w-[280px]">
      {/* Column Header - ClickUp style */}
      <div 
        className="flex items-center gap-2 px-2 py-1.5 mb-2 rounded"
        style={{ backgroundColor: bgColor }}
      >
        <div 
          className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span 
          className="text-xs font-semibold tracking-wide"
          style={{ color }}
        >
          {title}
        </span>
        <span className="text-xs font-medium ml-auto" style={{ color }}>
          {safeTasks.length}
        </span>
        <button
          type="button"
          onClick={onAddTask}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:opacity-90"
          style={{ backgroundColor: color }}
          aria-label={`Add task to ${title}`}
          title={`Add task to ${title}`}
        >
          <Plus className="h-3.5 w-3.5 text-white" />
        </button>
      </div>

      {/* Tasks List - Scrollable */}
      <div
        ref={setNodeRef}
        className={cn(
          'overflow-y-auto pr-1 max-h-[calc(100vh-280px)] scrollbar-none rounded-lg border transition-colors',
          safeTasks.length === 0 ? 'min-h-0' : 'min-h-[100px] space-y-2',
          isOver ? 'border-current' : 'border-transparent'
        )}
        style={{
          backgroundColor: isOver ? bgColor : undefined,
          borderColor: isOver ? color : undefined,
        }}
        data-column-id={id}
      >
        <SortableContext
          items={safeTasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {safeTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              onDuplicate={onDuplicateTask}
            />
          ))}
        </SortableContext>

        {safeTasks.length === 0 && (
          <div 
            className={cn(
              'flex items-center justify-center py-8 rounded border-2 border-dashed transition-all',
              !isOver && 'border-gray-300 dark:border-gray-700/50'
            )}
            style={emptyDropStyle}
          >
            <p className="text-xs text-gray-500 dark:text-gray-400" style={{ color: isOver ? color : undefined }}>
              {isOver ? 'Drop here' : 'No tasks'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
