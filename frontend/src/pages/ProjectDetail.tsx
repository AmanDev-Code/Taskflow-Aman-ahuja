import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  AlertCircle,
  Settings,
  LayoutGrid,
  List,
  Users,
  BarChart3,
  Filter,
  X,
  Rocket,
  Briefcase,
  Target,
  Lightbulb,
  Wrench,
  BarChart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { ProgressBar } from '@/components/ui/progress-bar';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { TaskListView } from '@/components/tasks/TaskListView';
import { FilterPanel } from '@/components/tasks/FilterPanel';
import { TaskModal } from '@/components/tasks/TaskModal';
import { ProjectMembersModal } from '@/components/projects/ProjectMembersModal';
import { ProjectStatsModal } from '@/components/projects/ProjectStatsModal';
import { ProjectSettingsModal } from '@/components/projects/ProjectSettingsModal';
import { Navbar } from '@/components/layout/Navbar';
import { useProject } from '@/hooks/useProjects';
import { useProjectMembers } from '@/hooks/useProjectMembers';
import { useTags, useCreateTag } from '@/hooks/useTags';
import { useFilterStore } from '@/stores/filterStore';
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useMoveTask,
  useDuplicateTask,
} from '@/hooks/useTasks';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import type { Task, TaskStatus, CreateTaskInput } from '@/types';
import { cn } from '@/lib/utils';

const projectHeaderIcons = [
  { Icon: Rocket, bg: 'from-violet-500 to-purple-600' },
  { Icon: Briefcase, bg: 'from-blue-500 to-cyan-500' },
  { Icon: Target, bg: 'from-orange-500 to-red-500' },
  { Icon: Lightbulb, bg: 'from-yellow-400 to-orange-500' },
  { Icon: Wrench, bg: 'from-emerald-500 to-teal-500' },
  { Icon: BarChart, bg: 'from-pink-500 to-rose-500' },
];

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  useRealtimeUpdates(projectId);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('backlog');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  
  const filterButtonRef = useRef<HTMLDivElement>(null);

  const { data: project, isLoading: projectLoading, error: projectError } = useProject(projectId!);
  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useTasks(projectId!);
  const { data: members } = useProjectMembers(projectId!);
  const { data: tags } = useTags(projectId!);
  
  const filterState = useFilterStore();
  const statusFilter = filterState.statusFilter ?? [];
  const priorityFilter = filterState.priorityFilter ?? [];
  const assigneeFilter = filterState.assigneeFilter ?? [];
  const tagFilter = filterState.tagFilter ?? [];
  const clearFilters = filterState.clearFilters;

  const createTask = useCreateTask(projectId!);
  const createTag = useCreateTag(projectId!);
  const updateTask = useUpdateTask(projectId!);
  const deleteTask = useDeleteTask(projectId!);
  const moveTask = useMoveTask(projectId!);
  const duplicateTask = useDuplicateTask(projectId!);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterButtonRef.current && !filterButtonRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncView = () => setIsMobileView(mediaQuery.matches);

    syncView();
    mediaQuery.addEventListener('change', syncView);
    return () => mediaQuery.removeEventListener('change', syncView);
  }, []);

  const taskList = useMemo(() => {
    return tasks || [];
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let filtered = [...taskList];

    if (statusFilter.length > 0) {
      filtered = filtered.filter(task => statusFilter.includes(task.status));
    }

    if (priorityFilter.length > 0) {
      filtered = filtered.filter(task => priorityFilter.includes(task.priority));
    }

    if (assigneeFilter.length > 0) {
      filtered = filtered.filter(task => 
        (task.assignees ?? []).some(a => assigneeFilter.includes(a.user_id))
      );
    }

    if (tagFilter.length > 0) {
      filtered = filtered.filter(task =>
        (task.tags ?? []).some(t => tagFilter.includes(t.id))
      );
    }

    return filtered;
  }, [taskList, statusFilter, priorityFilter, assigneeFilter, tagFilter]);

  const taskStats = useMemo(() => {
    const total = taskList.length;
    const completed = taskList.filter(t => t.status === 'done' || t.status === 'deployed').length;
    const inProgress = taskList.filter(t => t.status === 'in_progress' || t.status === 'testing' || t.status === 'dev_done').length;
    const progress = total > 0 ? (completed / total) * 100 : 0;
    return { total, completed, inProgress, progress };
  }, [taskList]);

  const activeFiltersCount = statusFilter.length + priorityFilter.length + assigneeFilter.length + tagFilter.length;
  const activeViewMode = isMobileView ? 'list' : viewMode;

  const handleAddTask = (status: TaskStatus) => {
    setSelectedTask(null);
    setDefaultStatus(status);
    setIsTaskModalOpen(true);
  };

  const handleTaskClick = (task: Task) => {
    navigate(`/projects/${projectId}/tasks/${task.id}`);
  };

  const handleMoveTask = (taskId: string, status: TaskStatus) => {
    moveTask.mutate({ taskId, status });
  };

  const handleDuplicateTask = (taskId: string) => {
    duplicateTask.mutate(taskId);
  };

  const handleSubmitTask = async (data: CreateTaskInput) => {
    if (selectedTask) {
      await updateTask.mutateAsync({ taskId: selectedTask.id, data });
    } else {
      await createTask.mutateAsync({ ...data, status: data.status || defaultStatus });
    }
    setIsTaskModalOpen(false);
    setSelectedTask(null);
  };

  const handleDeleteTask = async () => {
    if (selectedTask) {
      await deleteTask.mutateAsync(selectedTask.id);
      setIsTaskModalOpen(false);
      setSelectedTask(null);
    }
  };

  if (projectLoading || tasksLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
        <Navbar />
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (projectError || tasksError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
        <Navbar />
        <div className="flex h-64 flex-col items-center justify-center">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            Failed to load project
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {projectError instanceof Error ? projectError.message : 'An error occurred'}
          </p>
          <Link to="/projects" className="mt-4">
            <Button variant="outline" className="border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const headerIconIdx = project.id.charCodeAt(0) % projectHeaderIcons.length;
  const { Icon: HeaderIcon, bg: headerIconBg } = projectHeaderIcons[headerIconIdx];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <Navbar />
      
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <Link
          to="/projects"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Projects</span>
          <span className="text-gray-400 dark:text-gray-600">/</span>
          <span className="text-gray-900 dark:text-white font-medium">{project.name}</span>
        </Link>

        {/* Project Header */}
        <div className="mb-8 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm dark:shadow-none">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={cn(
                    'h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shrink-0',
                    headerIconBg
                  )}
                >
                  <HeaderIcon className="h-5 w-5" aria-hidden />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {project.name}
                </h1>
              </div>
              {project.description && (
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
                  {project.description}
                </p>
              )}
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{taskStats.total}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
              </div>
              <div className="h-8 w-px bg-gray-200 dark:bg-slate-700" />
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-500">{taskStats.inProgress}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">In Progress</div>
              </div>
              <div className="h-8 w-px bg-gray-200 dark:bg-slate-700" />
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">{taskStats.completed}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Completed</div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {taskStats.total > 0 && (
            <div className="mt-6">
              <ProgressBar
                value={taskStats.progress}
                showLabel
                size="md"
                variant="gradient"
              />
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="hidden md:flex items-center bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('board')}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  viewMode === 'board' 
                    ? 'bg-purple-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                )}
              >
                <LayoutGrid className="h-4 w-4" />
                Board
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  viewMode === 'list' 
                    ? 'bg-purple-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                )}
              >
                <List className="h-4 w-4" />
                List
              </button>
            </div>

            {/* Filter Button */}
            <div className="relative" ref={filterButtonRef}>
              <Button 
                variant="outline" 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={cn(
                  'h-9 border-gray-200 bg-white hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800',
                  activeFiltersCount > 0 
                    ? 'text-purple-600 border-purple-500 dark:text-purple-400 dark:border-purple-500' 
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                )}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filter
                {activeFiltersCount > 0 && (
                  <Badge className="ml-2 bg-purple-600 text-white text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
              
              <FilterPanel
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                tags={tags || []}
                members={members || []}
              />
            </div>

            {/* Active Filters Display */}
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white h-9"
              >
                <X className="mr-1 h-3 w-3" />
                Clear filters
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsMembersModalOpen(true)}
              className="h-9 w-9 border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-400 dark:hover:text-white dark:hover:bg-slate-800"
              title="Project Members"
            >
              <Users className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsStatsModalOpen(true)}
              className="h-9 w-9 border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-400 dark:hover:text-white dark:hover:bg-slate-800"
              title="Project Statistics"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsSettingsModalOpen(true)}
              className="h-9 w-9 border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-400 dark:hover:text-white dark:hover:bg-slate-800"
              title="Project Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button 
              onClick={() => handleAddTask('backlog')}
              className="bg-purple-600 hover:bg-purple-700 text-white border-0 shadow-lg shadow-purple-500/20"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </div>
        </div>

        {/* Show filtered count if filters are active */}
        {activeFiltersCount > 0 && (
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredTasks.length} of {taskList.length} tasks
          </div>
        )}

        {/* Board or List View */}
        {activeViewMode === 'board' ? (
          <KanbanBoard
            tasks={filteredTasks}
            onTaskClick={handleTaskClick}
            onAddTask={handleAddTask}
            onMoveTask={handleMoveTask}
            onDuplicateTask={handleDuplicateTask}
          />
        ) : (
          <TaskListView
            tasks={filteredTasks}
            onTaskClick={handleTaskClick}
          />
        )}

        {/* Task Modal */}
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            setSelectedTask(null);
          }}
          onSubmit={handleSubmitTask}
          onDelete={selectedTask ? handleDeleteTask : undefined}
          task={selectedTask}
          defaultStatus={defaultStatus}
          projectMembers={members ?? []}
          availableTags={tags ?? []}
          onCreateTag={(name, color) =>
            createTag.mutateAsync({ name, color })
          }
          isLoading={createTask.isPending || updateTask.isPending}
          isDeleting={deleteTask.isPending}
        />

        {/* Project Modals */}
        <ProjectMembersModal
          isOpen={isMembersModalOpen}
          onClose={() => setIsMembersModalOpen(false)}
          project={project}
        />

        <ProjectStatsModal
          isOpen={isStatsModalOpen}
          onClose={() => setIsStatsModalOpen(false)}
          project={project}
          tasks={taskList}
        />

        <ProjectSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          project={project}
        />
      </main>
    </div>
  );
}
