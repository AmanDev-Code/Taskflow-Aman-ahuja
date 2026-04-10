import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CircleDot,
  Clock,
  Copy,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Flag,
  Hourglass,
  Link as LinkIcon,
  ListChecks,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Plus,
  Sparkles,
  Tag as TagIcon,
  Target,
  Timer,
  Trash2,
  Upload,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useProject } from '@/hooks/useProjects';
import { useProjectMembers } from '@/hooks/useProjectMembers';
import { useTags, useCreateTag } from '@/hooks/useTags';
import { useSubtasks, useCreateSubtask, useToggleSubtask, useDeleteSubtask } from '@/hooks/useSubtasks';
import { useAiHelp, useAiStatus, useGenerateDescription, useSuggestSubtasks } from '@/hooks/useAI';
import { getInitials, getUserColor } from '@/lib/utils';
import type { TaskStatus, TaskPriority, TaskAttachment } from '@/types';

import { StatusDropdown } from '@/components/tasks/StatusDropdown';
import { PriorityDropdown } from '@/components/tasks/PriorityDropdown';
import { AssigneeSelector } from '@/components/tasks/AssigneeSelector';
import { DateRangePicker } from '@/components/tasks/DatePicker';
import { TagSelector } from '@/components/tasks/TagSelector';
import { SubtaskList } from '@/components/tasks/SubtaskList';
import { ActivityFeed } from '@/components/tasks/ActivityFeed';
import { TrackTimeField } from '@/components/tasks/TimeTracker';
import { SprintPointsInput } from '@/components/tasks/SprintPointsInput';
import { PropertyFieldRow } from '@/components/tasks/PropertyFieldRow';
import { useTaskAttachments, useUploadAttachment, useDeleteAttachment } from '@/hooks/useAttachments';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';

export function TaskDetailPage() {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();
  const navigate = useNavigate();
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeEstimate, setTimeEstimate] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState({
    subtasks: true,
    attachments: false,
  });

  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [mobileActivityOpen, setMobileActivityOpen] = useState(false);
  const [attachmentUrls, setAttachmentUrls] = useState<
    Record<string, { url: string; previewUrl?: string; downloadUrl?: string; filename: string }>
  >({});
  const [previewAttachment, setPreviewAttachment] = useState<{ url: string; filename: string } | null>(null);
  const [pendingDateRange, setPendingDateRange] = useState<{
    startDate?: string;
    dueDate?: string;
  } | null>(null);

  const { data: task, isLoading: taskLoading, error: taskError } = useTask(projectId!, taskId!);
  const { data: project } = useProject(projectId!);
  const { data: projectMembers = [] } = useProjectMembers(projectId!);
  const { data: availableTags = [] } = useTags(projectId!);
  const { data: subtasks = [] } = useSubtasks(taskId!);
  const { data: attachments = [], isLoading: attachmentsLoading } = useTaskAttachments(taskId!);
  const uploadAttachment = useUploadAttachment(taskId!, projectId!);
  const deleteAttachment = useDeleteAttachment(taskId!);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateTask = useUpdateTask(projectId!);
  const deleteTask = useDeleteTask(projectId!);
  const createTag = useCreateTag(projectId!);
  const createSubtask = useCreateSubtask(taskId!);
  const toggleSubtask = useToggleSubtask(taskId!);
  const deleteSubtask = useDeleteSubtask(taskId!);

  const {
    data: aiStatus,
    isLoading: aiStatusLoading,
    error: aiStatusError,
  } = useAiStatus();
  const aiHelp = useAiHelp();
  const generateDescription = useGenerateDescription();
  const suggestSubtasks = useSuggestSubtasks();

  useEffect(() => {
    if (task) {
      setDescription(task.description || '');
      setTimeEstimate(task.time_estimate?.toString() || '');
      setPendingDateRange(null);
    }
  }, [task]);

  useEffect(() => {
    const fetchAttachmentUrls = async () => {
      const missingAttachments = attachments.filter((attachment) => !attachmentUrls[attachment.id]);
      if (!missingAttachments.length) return;
      const urls: Record<string, { url: string; previewUrl?: string; downloadUrl?: string; filename: string }> = {};
      await Promise.all(
        missingAttachments.map(async (attachment) => {
          try {
            const response = await api.getAttachmentPresignedUrl(attachment.id);
            urls[attachment.id] = {
              url: response.url,
              previewUrl: response.previewUrl,
              downloadUrl: response.downloadUrl,
              filename: response.filename,
            };
          } catch {
            // Ignore failed URL fetches for individual attachments
          }
        })
      );
      if (Object.keys(urls).length > 0) {
        setAttachmentUrls((prev) => ({ ...prev, ...urls }));
      }
    };
    if (attachments.length > 0) {
      fetchAttachmentUrls();
    }
  }, [attachments, attachmentUrls]);

  const handleUpdateStatus = (status: TaskStatus) => {
    if (task) {
      updateTask.mutate({ taskId: task.id, data: { status } });
    }
  };

  const handleUpdatePriority = (priority: TaskPriority) => {
    if (task) {
      updateTask.mutate({ taskId: task.id, data: { priority } });
    }
  };

  const handleUpdateAssignees = (assigneeIds: string[]) => {
    if (task) {
      updateTask.mutate({ taskId: task.id, data: { assignee_ids: assigneeIds } });
    }
  };

  const handleUpdateTags = (tagIds: string[]) => {
    if (task) {
      updateTask.mutate({ taskId: task.id, data: { tag_ids: tagIds } });
    }
  };

  const handleCreateTag = (name: string, color: string) => {
    createTag.mutate({ name, color });
  };

  const handleUpdateDates = (startDate: string | undefined, dueDate: string | undefined) => {
    if (task) {
      setPendingDateRange({ startDate, dueDate });
      updateTask.mutate({
        taskId: task.id,
        data: { start_date: startDate, due_date: dueDate },
      }, {
        onSettled: () => setPendingDateRange(null),
      });
    }
  };

  const handleSaveTitle = () => {
    if (task && title.trim() && title !== task.title) {
      updateTask.mutate({ taskId: task.id, data: { title: title.trim() } });
    }
    setIsEditingTitle(false);
  };

  const handleSaveDescription = () => {
    if (task && description !== task.description) {
      updateTask.mutate({ taskId: task.id, data: { description } });
    }
  };

  const handleUpdateTimeEstimate = () => {
    if (task) {
      const minutes = timeEstimate ? parseInt(timeEstimate, 10) : undefined;
      if (minutes !== task.time_estimate) {
        updateTask.mutate({ taskId: task.id, data: { time_estimate: minutes } });
      }
    }
  };

  const handleUpdateSprintPoints = (points: number | undefined) => {
    if (task && points !== task.sprint_points) {
      updateTask.mutate({ taskId: task.id, data: { sprint_points: points } });
    }
  };

  const handleDelete = async () => {
    if (task && confirm('Are you sure you want to delete this task?')) {
      await deleteTask.mutateAsync(task.id);
      navigate(`/projects/${projectId}`);
    }
  };

  const handleCopyTaskLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link copied',
        description: 'Task link copied to clipboard.',
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Could not copy link. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicateTask = async () => {
    if (!task) return;
    try {
      await api.duplicateTask(task.id);
      toast({
        title: 'Task duplicated',
        description: 'A duplicate task was created successfully.',
      });
    } catch {
      toast({
        title: 'Duplicate failed',
        description: 'Could not duplicate this task.',
        variant: 'destructive',
      });
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleAttachmentFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      Array.from(files).forEach((file) => {
        if (file.size > 10 * 1024 * 1024) return;
        uploadAttachment.mutate(file);
      });
    },
    [uploadAttachment],
  );

  const onAttachmentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleAttachmentFiles(e.target.files);
    e.target.value = '';
  };

  const openAttachment = async (attachment: TaskAttachment) => {
    try {
      const presigned = attachmentUrls[attachment.id] ?? (await api.getAttachmentPresignedUrl(attachment.id));
      if (!attachmentUrls[attachment.id]) {
        setAttachmentUrls((prev) => ({
          ...prev,
          [attachment.id]: {
            url: presigned.url,
            previewUrl: presigned.previewUrl,
            downloadUrl: presigned.downloadUrl,
            filename: presigned.filename,
          },
        }));
      }

      const previewUrl = presigned.previewUrl || presigned.url;
      const downloadUrl = presigned.downloadUrl || presigned.url;

      if (attachment.mime_type.startsWith('image/')) {
        setPreviewAttachment({ url: previewUrl, filename: presigned.filename });
      } else {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = presigned.filename;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch {
      // ignore
    }
  };

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
    return fallback;
  };

  const handleAskAi = async () => {
    if (!task || !aiQuestion.trim()) return;

    setAiResponse(null);
    setCopiedToClipboard(false);

    try {
      const result = await aiHelp.mutateAsync({
        taskTitle: task.title,
        taskDescription: task.description || undefined,
        question: aiQuestion.trim(),
      });
      setAiResponse(result.response);
    } catch (error) {
      setAiResponse(getErrorMessage(error, 'Failed to get AI response. Please try again.'));
    }
  };

  const handleCopyAiResponse = async () => {
    if (!aiResponse) return;
    try {
      await navigator.clipboard.writeText(aiResponse);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch {
      // Clipboard API not available
    }
  };

  const handleInsertToDescription = () => {
    if (!aiResponse || !task) return;
    const newDescription = description
      ? `${description}\n\n${aiResponse}`
      : aiResponse;
    setDescription(newDescription);
    updateTask.mutate({ taskId: task.id, data: { description: newDescription } });
    setAiResponse(null);
    setAiQuestion('');
  };

  const handleDismissAiResponse = () => {
    setAiResponse(null);
    setCopiedToClipboard(false);
  };

  const handleGenerateDescription = async () => {
    if (!task) return;
    setAiResponse(null);
    setCopiedToClipboard(false);

    try {
      const result = await generateDescription.mutateAsync({
        prompt: task.title,
      });
      setAiResponse(result.description);
    } catch (error) {
      setAiResponse(getErrorMessage(error, 'Failed to generate description. Please try again.'));
    }
  };

  const handleSuggestSubtasks = async () => {
    if (!task) return;
    setAiResponse(null);
    setCopiedToClipboard(false);

    try {
      const result = await suggestSubtasks.mutateAsync({
        taskTitle: task.title,
      });
      const formattedSubtasks = result.subtasks.map((s, i) => `${i + 1}. ${s}`).join('\n');
      setAiResponse(`Suggested subtasks:\n${formattedSubtasks}`);
    } catch (error) {
      setAiResponse(getErrorMessage(error, 'Failed to suggest subtasks. Please try again.'));
    }
  };

  const handleAddSuggestedSubtasks = async () => {
    if (!aiResponse || !task) return;
    const lines = aiResponse.split('\n').filter(line => /^\d+\.\s/.test(line));
    for (const line of lines) {
      const title = line.replace(/^\d+\.\s*/, '').trim();
      if (title) {
        await createSubtask.mutateAsync({ title });
      }
    }
    setAiResponse(null);
    setAiQuestion('');
  };

  if (taskLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-[#0F172A]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (taskError || !task) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50 dark:bg-[#0F172A]">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Task not found
        </h3>
        <Link to={`/projects/${projectId}`} className="mt-4">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Project
          </Button>
        </Link>
      </div>
    );
  }

  const allSubtasks = task.subtasks || subtasks || [];
  const subtaskProgress =
    allSubtasks.length > 0
      ? (allSubtasks.filter((s) => s?.completed).length / allSubtasks.length) * 100
    : 0;

  const displayStartDate = pendingDateRange?.startDate ?? task.start_date;
  const displayDueDate = pendingDateRange?.dueDate ?? task.due_date;

  const isAiConfigured = aiStatus?.configured === true;
  const isAiUnavailable = !aiStatusLoading && !isAiConfigured;
  const isAiBusy =
    aiHelp.isPending || generateDescription.isPending || suggestSubtasks.isPending;
  const proposer =
    (task.proposer
      ? {
          id: (task.proposer as any).id ?? (task.proposer as any).user_id,
          name: (task.proposer as any).name ?? (task.proposer as any).user_name,
          email: (task.proposer as any).email ?? (task.proposer as any).user_email,
          avatar_url:
            (task.proposer as any).avatar_url ?? (task.proposer as any).user_avatar_url,
          color: (task.proposer as any).color ?? (task.proposer as any).user_color,
        }
      : null) ||
    projectMembers.find((member) => member.user.id === task.proposed_by)?.user ||
    null;

  const proposedByBlock = proposer ? (
    <div className="flex h-9 min-h-9 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 dark:border-slate-600 dark:bg-[#1E293B]">
      <Avatar className="h-6 w-6 shrink-0">
        <AvatarImage src={proposer.avatar_url} />
        <AvatarFallback
          className="text-[10px] text-white"
          style={{ backgroundColor: proposer.color || getUserColor(proposer.id) }}
        >
          {getInitials(proposer.name)}
        </AvatarFallback>
      </Avatar>
      <span className="truncate text-sm text-gray-700 dark:text-gray-200">{proposer.name}</span>
    </div>
  ) : (
    <div className="flex h-9 min-h-9 items-center gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-2.5 text-sm text-gray-500 dark:border-slate-600 dark:bg-[#1E293B] dark:text-gray-400">
      <UserRound className="h-4 w-4 shrink-0" />
      <span>Not set</span>
    </div>
  );

  const propertiesTwoCol = 'grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-x-10 lg:gap-y-4';

  const taskPropertiesPanel = (
    <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
      <div className="space-y-4 p-3 sm:p-4">
        <div className={propertiesTwoCol}>
          <PropertyFieldRow icon={CircleDot} label="Status">
            <StatusDropdown value={task.status} onChange={handleUpdateStatus} disabled={updateTask.isPending} />
          </PropertyFieldRow>
          <PropertyFieldRow icon={Users} label="Assignees">
            <AssigneeSelector
              assignees={task.assignees || []}
              projectMembers={projectMembers}
              onChange={handleUpdateAssignees}
              disabled={updateTask.isPending}
            />
          </PropertyFieldRow>
        </div>

        <div className={propertiesTwoCol}>
          <PropertyFieldRow icon={Calendar} label="Dates">
            <DateRangePicker
              showLabel={false}
              startDate={displayStartDate}
              dueDate={displayDueDate}
              onRangeChange={handleUpdateDates}
              onStartDateChange={(date) => handleUpdateDates(date, task.due_date)}
              onDueDateChange={(date) => handleUpdateDates(task.start_date, date)}
              disabled={updateTask.isPending}
            />
          </PropertyFieldRow>
          <PropertyFieldRow icon={Flag} label="Priority">
            <PriorityDropdown value={task.priority} onChange={handleUpdatePriority} disabled={updateTask.isPending} />
          </PropertyFieldRow>
        </div>

        <div className={propertiesTwoCol}>
          <PropertyFieldRow icon={Hourglass} label="Time estimate">
            <div className="flex h-9 min-h-9 w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 dark:border-slate-600 dark:bg-[#1E293B]">
              <Clock className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
              <Input
                type="number"
                value={timeEstimate}
                onChange={(e) => setTimeEstimate(e.target.value)}
                onBlur={handleUpdateTimeEstimate}
                placeholder="Empty"
                className="h-8 min-w-0 flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
              />
            </div>
          </PropertyFieldRow>
          <PropertyFieldRow icon={Target} label="Sprint points">
            <SprintPointsInput
              value={task.sprint_points}
              onChange={handleUpdateSprintPoints}
              disabled={updateTask.isPending}
            />
          </PropertyFieldRow>
        </div>

        <div className={propertiesTwoCol}>
          <PropertyFieldRow icon={Timer} label="Track time">
            <TrackTimeField taskId={taskId!} timeEstimate={task.time_estimate} />
          </PropertyFieldRow>
          <PropertyFieldRow icon={TagIcon} label="Tags">
            <TagSelector
              selectedTags={task.tags || []}
              availableTags={availableTags}
              onChange={handleUpdateTags}
              onCreateTag={handleCreateTag}
              disabled={updateTask.isPending}
            />
          </PropertyFieldRow>
        </div>

        <div className={propertiesTwoCol}>
          <PropertyFieldRow icon={UserRound} label="Proposed by">
            {proposedByBlock}
          </PropertyFieldRow>
          <div className="hidden min-h-[2.25rem] lg:block" aria-hidden />
        </div>

        {allSubtasks.length > 0 ? (
          <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
            <ProgressBar
              value={subtaskProgress}
              showCount={{
                completed: allSubtasks.filter((s) => s?.completed).length,
                total: allSubtasks.length,
              }}
              size="md"
              variant="success"
            />
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0F172A]">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1E293B]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                to={`/projects/${projectId}`}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{project?.name || 'Back'}</span>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="lg:hidden h-8 gap-1.5 px-2 text-xs text-gray-500 dark:text-gray-400"
                onClick={() => setMobileActivityOpen(true)}
              >
                <MessageSquare className="h-4 w-4" />
                Discussions
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
                  <DropdownMenuItem
                    onClick={handleDuplicateTask}
                    className="text-gray-700 dark:text-gray-300 focus:text-gray-900 dark:focus:text-white focus:bg-gray-100 dark:focus:bg-slate-700"
                  >
                    Duplicate task
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleCopyTaskLink}
                    className="text-gray-700 dark:text-gray-300 focus:text-gray-900 dark:focus:text-white focus:bg-gray-100 dark:focus:bg-slate-700"
                  >
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Copy link
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-200 dark:bg-slate-700" />
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-500/10"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Main Content — full width on mobile */}
          <div className="min-w-0 w-full flex-1 space-y-6">
            {/* Task Type & Title */}
            <div className="min-w-0 overflow-hidden bg-white dark:bg-[#1E293B] rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">
                  <CheckSquare className="h-4 w-4 text-[#E23744]" />
                  Task
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>

              {isEditingTitle ? (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  autoFocus
                  className="w-full text-2xl font-bold bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
                />
              ) : (
                <h1 
                  className="min-w-0 max-w-full truncate text-2xl font-bold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 -mx-2 px-2 py-1 rounded-lg"
                  title={task.title}
                  onClick={() => {
                    setTitle(task.title);
                    setIsEditingTitle(true);
                  }}
                >
                  {task.title}
                </h1>
              )}

              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-300">
                  <Sparkles className="h-4 w-4" />
                  Ask AI
                </div>

                {aiStatusLoading && (
                  <div className="rounded-lg border border-purple-200 bg-purple-50/60 px-3 py-2 text-xs text-purple-700 dark:border-purple-800/60 dark:bg-purple-900/20 dark:text-purple-300">
                    Checking AI availability...
                  </div>
                )}

                {aiStatusError && !aiStatusLoading && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800/70 dark:bg-amber-900/20 dark:text-amber-300">
                    Unable to verify AI status right now. You can still try AI actions.
                  </div>
                )}

                {isAiUnavailable && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-300">
                    AI is not configured yet. Ask the project owner/admin to set the backend `OPENAI_API_KEY`, then refresh this page. Task editing still works without AI.
                  </div>
                )}

                {/* AI Quick Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateDescription}
                    disabled={isAiBusy || isAiUnavailable}
                    className="text-xs gap-1.5 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                  >
                    {generateDescription.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    Generate Description
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSuggestSubtasks}
                    disabled={isAiBusy || isAiUnavailable}
                    className="text-xs gap-1.5 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                  >
                    {suggestSubtasks.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <ListChecks className="h-3 w-3" />
                    )}
                    Suggest Subtasks
                  </Button>
                </div>

                {/* AI Question Input */}
                <div className="flex items-center gap-3 rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 p-3 dark:border-purple-800/50 dark:from-purple-900/20 dark:to-blue-900/20">
                  <Sparkles className="h-5 w-5 flex-shrink-0 text-purple-500" />
                  <input
                    type="text"
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !aiHelp.isPending && handleAskAi()}
                    placeholder="Ask AI to help with this task..."
                    disabled={isAiBusy || isAiUnavailable}
                    className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-500 outline-none disabled:opacity-50 dark:text-gray-300"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleAskAi}
                    disabled={!aiQuestion.trim() || isAiBusy || isAiUnavailable}
                    className="text-purple-600 disabled:opacity-50 dark:text-purple-400"
                  >
                    {aiHelp.isPending ? (
                      <>
                        <Spinner size="sm" className="mr-1" />
                        Thinking...
                      </>
                    ) : (
                      'Ask AI'
                    )}
                  </Button>
                </div>

                {/* AI Response */}
                {aiResponse && (
                  <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-800/50 dark:bg-purple-900/20">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-300">
                        <Sparkles className="h-4 w-4" />
                        AI Response
                      </div>
                      <button
                        onClick={handleDismissAiResponse}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mb-3 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                      {aiResponse}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleInsertToDescription}
                        className="text-xs border-purple-300 bg-white text-purple-800 hover:bg-purple-50 dark:border-purple-500/70 dark:bg-purple-950/50 dark:text-purple-100 dark:hover:bg-purple-900/40"
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Add to description
                      </Button>
                      {aiResponse.includes('Suggested subtasks:') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleAddSuggestedSubtasks}
                          disabled={createSubtask.isPending}
                          className="text-xs border-purple-300 bg-white text-purple-800 hover:bg-purple-50 dark:border-purple-500/70 dark:bg-purple-950/50 dark:text-purple-100 dark:hover:bg-purple-900/40"
                        >
                          {createSubtask.isPending ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <ListChecks className="mr-1 h-3 w-3" />
                          )}
                          Add as subtasks
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCopyAiResponse}
                        className="text-xs text-gray-700 hover:bg-gray-100 dark:text-purple-100 dark:hover:bg-purple-900/40"
                      >
                        {copiedToClipboard ? (
                          <>
                            <Check className="mr-1 h-3 w-3" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1 h-3 w-3" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">{taskPropertiesPanel}</div>

            {/* Description */}
            <div className="bg-white dark:bg-[#1E293B] rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Description
              </h3>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleSaveDescription}
                placeholder="Add a description..."
                className="min-h-[120px] border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Subtasks */}
            <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
              <button
                onClick={() => toggleSection('subtasks')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span className="font-medium text-gray-900 dark:text-white">Subtasks</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {allSubtasks.filter((s) => s.completed).length}/{allSubtasks.length}
                  </span>
                </div>
                {expandedSections.subtasks ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </button>
              {expandedSections.subtasks && (
                <div className="px-4 pb-4">
                  <SubtaskList
                    subtasks={allSubtasks}
                    projectId={projectId!}
                    taskId={taskId!}
                    onToggle={(subtaskId, completed) =>
                      toggleSubtask.mutate({ subtaskId, completed })
                    }
                    onCreate={(title) => createSubtask.mutate({ title })}
                    onDelete={(subtaskId) => deleteSubtask.mutate(subtaskId)}
                    isLoading={toggleSubtask.isPending || createSubtask.isPending}
                  />
                </div>
              )}
            </div>

            {/* Attachments */}
            <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
              <button
                onClick={() => toggleSection('attachments')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span className="font-medium text-gray-900 dark:text-white">Attachments</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {task.attachment_count ?? 0}
                  </span>
                </div>
                {expandedSections.attachments ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </button>
              {expandedSections.attachments && (
                <div className="px-4 pb-4 space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    accept="*/*"
                    onChange={onAttachmentInputChange}
                  />
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAttachmentFiles(e.dataTransfer.files);
                    }}
                    className="border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer border-gray-300 bg-gray-50 hover:border-violet-500 hover:bg-violet-50 dark:border-gray-600 dark:bg-gray-800/40 dark:hover:border-violet-500 dark:hover:bg-violet-950/20"
                  >
                    {uploadAttachment.isPending ? (
                      <Loader2 className="h-8 w-8 mx-auto text-violet-500 animate-spin mb-2" />
                    ) : (
                    <Upload className="h-8 w-8 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
                    )}
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Drop files here or{' '}
                      <span className="text-violet-600 dark:text-violet-400 font-medium">browse</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Maximum file size: 10MB (server limit)
                    </p>
                  </div>

                  {attachmentsLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : attachments.length > 0 ? (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {attachments.map((a) => {
                        const isImage = a.mime_type.startsWith('image/');
                        const fileUrls = attachmentUrls[a.id];
                        const thumbnailUrl = fileUrls?.previewUrl || fileUrls?.url;
                        return (
                          <li
                            key={a.id}
                            className="group relative flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 hover:border-violet-300 dark:hover:border-violet-600 transition-colors cursor-pointer"
                            onClick={() => openAttachment(a)}
                            onKeyDown={(e) => e.key === 'Enter' && openAttachment(a)}
                            tabIndex={0}
                            role="button"
                          >
                            {isImage && thumbnailUrl ? (
                              <div className="h-12 w-12 flex-shrink-0 rounded-md overflow-hidden bg-gray-200 dark:bg-gray-700">
                                <img
                                  src={thumbnailUrl}
                                  alt={a.original_filename}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="h-12 w-12 flex-shrink-0 rounded-md bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                                <FileText className="h-5 w-5 text-violet-500" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {a.original_filename}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {a.uploader_name ? `${a.uploader_name} · ` : ''}
                                {Math.round(a.size / 1024)} KB
                              </p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-500 hover:text-violet-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAttachment(a);
                                }}
                                title={isImage ? 'Preview' : 'Download'}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-500 hover:text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteAttachment.mutate(a.id);
                                }}
                                disabled={deleteAttachment.isPending}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              )}
            </div>

          </div>

          {/* Right Sidebar — desktop only */}
          <div className="hidden lg:block lg:w-[360px] lg:shrink-0 lg:self-start">
            <div className="flex h-[calc(100dvh-6rem)] max-h-[calc(100dvh-6rem)] flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl ring-1 ring-black/5 dark:border-slate-700/60 dark:bg-[#1E293B] dark:ring-white/10 lg:sticky lg:top-14">
              <div className="shrink-0 border-b border-gray-100 bg-white px-3 py-2 dark:border-gray-800 dark:bg-[#1E293B]">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-gray-400" />
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Discussions</h3>
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col px-3 pb-2 pt-2">
                <ActivityFeed taskId={taskId!} fillHeight anchorBottom />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={mobileActivityOpen} onOpenChange={setMobileActivityOpen}>
        <DialogContent className="bottom-0 top-auto flex max-h-[min(92dvh,760px)] w-full max-w-none translate-x-[-50%] translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl rounded-b-none border-x-0 border-b-0 p-0 sm:max-w-none">
          <DialogHeader className="shrink-0 border-b border-gray-100 px-4 pb-2 pt-4 dark:border-gray-800">
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-gray-500" />
              Discussions
            </DialogTitle>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-2">
            <ActivityFeed taskId={taskId!} fillHeight anchorBottom />
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewAttachment(null)}
          onKeyDown={(e) => e.key === 'Escape' && setPreviewAttachment(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={() => setPreviewAttachment(null)}
            aria-label="Close preview"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="max-w-[90vw] max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewAttachment.url}
              alt={previewAttachment.filename}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            <p className="mt-3 text-center text-sm text-white/80">{previewAttachment.filename}</p>
          </div>
        </div>
      )}
    </div>
  );
}
