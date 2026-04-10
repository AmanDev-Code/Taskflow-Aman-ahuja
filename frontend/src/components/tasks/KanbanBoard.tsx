import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { TaskColumn } from './TaskColumn';
import { TaskCard } from './TaskCard';
import type { Task, TaskStatus } from '@/types';
import { STATUS_CONFIG } from '@/types';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
  onMoveTask: (taskId: string, status: TaskStatus) => void;
  onDuplicateTask?: (taskId: string) => void;
}

export function KanbanBoard({
  tasks,
  onTaskClick,
  onAddTask,
  onMoveTask,
  onDuplicateTask,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      todo: [],
      backlog: [],
      bugs: [],
      pipeline_ready: [],
      ux_bugs: [],
      in_progress: [],
      dev_done: [],
      testing: [],
      done: [],
      deployed: [],
    };

    tasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      } else {
        grouped['todo'].push(task);
      }
    });

    Object.values(grouped).forEach((columnTasks) => {
      columnTasks.sort((a, b) => a.position - b.position);
    });

    return grouped;
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const draggedTask = tasks.find((t) => t.id === activeId);
    if (!draggedTask) return;

    const isOverColumn = STATUS_CONFIG.some((col) => col.id === overId);
    
    if (isOverColumn) {
      const newStatus = overId as TaskStatus;
      if (draggedTask.status !== newStatus) {
        onMoveTask(activeId, newStatus);
      }
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask && draggedTask.status !== overTask.status) {
        onMoveTask(activeId, overTask.status);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[calc(100vh-200px)] scrollbar-none">
        {STATUS_CONFIG.map((column) => (
          <TaskColumn
            key={column.id}
            id={column.id}
            title={column.title}
            color={column.color}
            bgColor={column.bgColor}
            tasks={tasksByStatus[column.id]}
            onTaskClick={onTaskClick}
            onAddTask={() => onAddTask(column.id)}
            onDuplicateTask={onDuplicateTask}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask && (
          <div className="rotate-1 scale-[1.02] opacity-95">
            <TaskCard task={activeTask} onClick={() => {}} isDragOverlay />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
