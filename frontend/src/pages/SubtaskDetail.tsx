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
  CornerDownRight,
  Download,
  FileText,
  Flag,
  Hourglass,
  Link as LinkIcon,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSubtask, useUpdateSubtask, useDeleteSubtask } from '@/hooks/useSubtasks';
import { useTask } from '@/hooks/useTasks';
import { useProject } from '@/hooks/useProjects';
import { useProjectMembers } from '@/hooks/useProjectMembers';
import { useTags, useCreateTag } from '@/hooks/useTags';
import type { TaskStatus, TaskPriority, Subtask } from '@/types';

import { StatusDropdown } from '@/components/tasks/StatusDropdown';
import { PriorityDropdown } from '@/components/tasks/PriorityDropdown';
import { AssigneeSelector } from '@/components/tasks/AssigneeSelector';
import { DateRangePicker } from '@/components/tasks/DatePicker';
import { TagSelector } from '@/components/tasks/TagSelector';
import { TrackTimeField } from '@/components/tasks/TimeTracker';
import { SprintPointsInput } from '@/components/tasks/SprintPointsInput';
import { PropertyFieldRow } from '@/components/tasks/PropertyFieldRow';
import { ActivityFeed } from '@/components/tasks/ActivityFeed';
import {
  useSubtaskAttachments,
  useUploadSubtaskAttachment,
  useDeleteSubtaskAttachment,
} from '@/hooks/useAttachments';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import type { TaskAttachment } from '@/types';

export function SubtaskDetailPage() {
  const { projectId, taskId, subtaskId } = useParams<{
    projectId: string;
    taskId: string;
    subtaskId: string;
  }>();
  const navigate = useNavigate();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeEstimate, setTimeEstimate] = useState<string>('');
  const [optimisticSubtask, setOptimisticSubtask] = useState<Subtask | null>(null);
  const [mobileActivityOpen, setMobileActivityOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<{ url: string; filename: string } | null>(null);
  const [attachmentUrls, setAttachmentUrls] = useState<
    Record<string, { url: string; previewUrl?: string; downloadUrl?: string; filename: string }>
  >({});
  const [expandedSections, setExpandedSections] = useState({
    attachments: false,
  });

  const { data: subtask, isLoading: subtaskLoading, error: subtaskError } = useSubtask(subtaskId!);
  const { data: parentTask } = useTask(projectId!, taskId!);
  useProject(projectId!); // Load project for context
  const { data: projectMembers = [] } = useProjectMembers(projectId!);
  const { data: availableTags = [] } = useTags(projectId!);

  const updateSubtask = useUpdateSubtask(taskId!);
  const deleteSubtask = useDeleteSubtask(taskId!);
  const createTag = useCreateTag(projectId!);
  const { data: attachments = [], isLoading: attachmentsLoading } = useSubtaskAttachments(subtaskId!);
  const uploadAttachment = useUploadSubtaskAttachment(subtaskId!, taskId!, projectId!);
  const deleteAttachment = useDeleteSubtaskAttachment(subtaskId!, taskId!, projectId!);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (subtask) {
      setOptimisticSubtask(subtask);
      setDescription(subtask.description || '');
      setTimeEstimate(subtask.time_estimate?.toString() || '');
    }
  }, [subtask]);

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
        }),
      );

      if (Object.keys(urls).length > 0) {
        setAttachmentUrls((prev) => ({ ...prev, ...urls }));
      }
    };

    if (attachments.length > 0) {
      fetchAttachmentUrls();
    }
  }, [attachments, attachmentUrls]);

  const currentSubtask = optimisticSubtask ?? subtask;

  const updateSubtaskWithOptimistic = (
    data: Parameters<typeof updateSubtask.mutate>[0]['data'],
    patch?: Partial<Subtask>
  ) => {
    if (!currentSubtask) return;
    setOptimisticSubtask((prev) => {
      const base = prev ?? currentSubtask;
      return {
        ...base,
        ...data,
        ...(patch ?? {}),
      };
    });
    updateSubtask.mutate({ subtaskId: currentSubtask.id, data });
  };

  const handleUpdateStatus = (status: TaskStatus) => {
    if (currentSubtask) {
      updateSubtaskWithOptimistic({ status });
    }
  };

  const handleUpdatePriority = (priority: TaskPriority) => {
    if (currentSubtask) {
      updateSubtaskWithOptimistic({ priority });
    }
  };

  const handleUpdateAssignees = (assigneeIds: string[]) => {
    if (currentSubtask) {
      const assignees = projectMembers
        .filter((member) => assigneeIds.includes(member.user.id))
        .map((member) => ({
          user_id: member.user.id,
          user_name: member.user.name,
          user_avatar_url: member.user.avatar_url,
          user_color: member.user.color,
        }));
      updateSubtaskWithOptimistic({ assignee_ids: assigneeIds }, { assignees });
    }
  };

  const handleUpdateTags = (tagIds: string[]) => {
    if (currentSubtask) {
      const tags = availableTags.filter((tag) => tagIds.includes(tag.id));
      updateSubtaskWithOptimistic({ tag_ids: tagIds }, { tags });
    }
  };

  const handleCreateTag = (name: string, color: string) => {
    createTag.mutate({ name, color });
  };

  const handleUpdateDates = (startDate: string | undefined, dueDate: string | undefined) => {
    if (currentSubtask) {
      updateSubtaskWithOptimistic({ start_date: startDate, due_date: dueDate });
    }
  };

  const handleSaveTitle = () => {
    if (currentSubtask && title.trim() && title !== currentSubtask.title) {
      updateSubtaskWithOptimistic({ title: title.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleSaveDescription = () => {
    if (currentSubtask && description !== currentSubtask.description) {
      updateSubtaskWithOptimistic({ description });
    }
  };

  const handleUpdateTimeEstimate = () => {
    if (currentSubtask) {
      const minutes = timeEstimate ? parseInt(timeEstimate, 10) : undefined;
      if (minutes !== currentSubtask.time_estimate) {
        updateSubtaskWithOptimistic({ time_estimate: minutes });
      }
    }
  };

  const handleUpdateSprintPointsValue = (points: number | undefined) => {
    if (currentSubtask) {
      if (points !== currentSubtask.sprint_points) {
        updateSubtaskWithOptimistic({ sprint_points: points });
      }
    }
  };

  const handleToggleCompleted = () => {
    if (currentSubtask) {
      updateSubtaskWithOptimistic({ completed: !currentSubtask.completed });
    }
  };

  const handleDelete = async () => {
    if (currentSubtask && confirm('Are you sure you want to delete this subtask?')) {
      await deleteSubtask.mutateAsync(currentSubtask.id);
      navigate(`/projects/${projectId}/tasks/${taskId}`);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Link copied', description: 'Subtask link copied to clipboard.' });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Could not copy link. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicateSubtask = async () => {
    if (!currentSubtask) return;
    try {
      await api.createSubtask(taskId!, {
        title: currentSubtask.title.startsWith('Copy of ') ? currentSubtask.title : `Copy of ${currentSubtask.title}`,
        description: currentSubtask.description || undefined,
        priority: currentSubtask.priority,
      });
      toast({ title: 'Subtask duplicated', description: 'A duplicate subtask was created.' });
    } catch {
      toast({
        title: 'Duplicate failed',
        description: 'Could not duplicate this subtask.',
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

  if (subtaskLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-[#0F172A]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (subtaskError || !currentSubtask) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50 dark:bg-[#0F172A]">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Subtask not found
        </h3>
        <Link to={`/projects/${projectId}/tasks/${taskId}`} className="mt-4">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Task
          </Button>
        </Link>
      </div>
    );
  }

  const propertiesTwoCol = 'grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-x-10 lg:gap-y-4';

  const subtaskPropertiesPanel = (
    <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
      <div className="space-y-4 p-3 sm:p-4">
        <div className={propertiesTwoCol}>
          <PropertyFieldRow icon={CircleDot} label="Status">
            <StatusDropdown value={currentSubtask.status} onChange={handleUpdateStatus} disabled={updateSubtask.isPending} />
          </PropertyFieldRow>
          <PropertyFieldRow icon={Users} label="Assignees">
            <AssigneeSelector
              assignees={currentSubtask.assignees || []}
              projectMembers={projectMembers}
              onChange={handleUpdateAssignees}
              disabled={updateSubtask.isPending}
            />
          </PropertyFieldRow>
        </div>

        <div className={propertiesTwoCol}>
          <PropertyFieldRow icon={Calendar} label="Dates">
            <DateRangePicker
              showLabel={false}
              startDate={currentSubtask.start_date}
              dueDate={currentSubtask.due_date}
              onRangeChange={handleUpdateDates}
              onStartDateChange={(date) => handleUpdateDates(date, currentSubtask.due_date)}
              onDueDateChange={(date) => handleUpdateDates(currentSubtask.start_date, date)}
              disabled={updateSubtask.isPending}
            />
          </PropertyFieldRow>
          <PropertyFieldRow icon={Flag} label="Priority">
            <PriorityDropdown value={currentSubtask.priority} onChange={handleUpdatePriority} disabled={updateSubtask.isPending} />
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
              value={currentSubtask.sprint_points}
              onChange={handleUpdateSprintPointsValue}
              disabled={updateSubtask.isPending}
            />
          </PropertyFieldRow>
        </div>

        <div className={propertiesTwoCol}>
          <PropertyFieldRow icon={Timer} label="Track time">
            <TrackTimeField
              taskId={currentSubtask.id}
              entityType="subtask"
              timeEstimate={currentSubtask.time_estimate}
            />
          </PropertyFieldRow>
          <PropertyFieldRow icon={TagIcon} label="Tags">
            <TagSelector
              selectedTags={currentSubtask.tags || []}
              availableTags={availableTags}
              onChange={handleUpdateTags}
              onCreateTag={handleCreateTag}
              disabled={updateSubtask.isPending}
            />
          </PropertyFieldRow>
        </div>

        <div className={propertiesTwoCol}>
          <PropertyFieldRow icon={UserRound} label="Proposed by">
            <div className="flex h-9 min-h-9 items-center gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-2.5 text-sm text-gray-500 dark:border-slate-600 dark:bg-[#1E293B] dark:text-gray-400">
              <UserRound className="h-4 w-4 shrink-0" />
              <span>Not set</span>
            </div>
          </PropertyFieldRow>
          <div className="hidden min-h-[2.25rem] lg:block" aria-hidden />
        </div>
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
                to={`/projects/${projectId}/tasks/${taskId}`}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to {parentTask?.title || 'Task'}</span>
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
                    onClick={handleDuplicateSubtask}
                    className="text-gray-700 dark:text-gray-300 focus:text-gray-900 dark:focus:text-white focus:bg-gray-100 dark:focus:bg-slate-700"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate subtask
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleCopyLink}
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
                    Delete subtask
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-start">
          {/* Main Content — stretch full width on mobile (items-start on column would shrink-wrap) */}
          <div className="min-w-0 w-full flex-1 space-y-6">
            {/* Parent Task Reference */}
            <Link
              to={`/projects/${projectId}/tasks/${taskId}`}
              className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <CornerDownRight className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-0.5">
                  Parent Task
                </div>
                <div className="text-sm font-medium text-blue-700 dark:text-blue-300 truncate">
                  {parentTask?.title || 'Loading...'}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-blue-400" />
            </Link>

            {/* Subtask Type & Title */}
            <div className="min-w-0 overflow-hidden bg-white dark:bg-[#1E293B] rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-sm font-medium text-purple-700 dark:text-purple-300">
                  <CheckSquare className="h-4 w-4 text-purple-500" />
                  Subtask
                </button>
                <button
                  onClick={handleToggleCompleted}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    currentSubtask.completed
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {currentSubtask.completed ? (
                    <>
                      <Check className="h-4 w-4" />
                      Completed
                    </>
                  ) : (
                    'Mark Complete'
                  )}
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
                  className={`min-w-0 max-w-full truncate text-2xl font-bold cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 -mx-2 px-2 py-1 rounded-lg ${
                    currentSubtask.completed
                      ? 'line-through text-gray-400 dark:text-gray-500'
                      : 'text-gray-900 dark:text-white'
                  }`}
                  title={currentSubtask.title}
                  onClick={() => {
                    setTitle(currentSubtask.title);
                    setIsEditingTitle(true);
                  }}
                >
                  {currentSubtask.title}
                </h1>
              )}
            </div>

            <div className="space-y-3">{subtaskPropertiesPanel}</div>

            {/* Description */}
            <div className="bg-white dark:bg-[#1E293B] rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-800">
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

            {/* Attachments */}
            <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
              <button
                onClick={() => toggleSection('attachments')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span className="font-medium text-gray-900 dark:text-white">Attachments</span>
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

          {/* Right Sidebar — desktop only; omit from mobile layout entirely */}
          <div className="hidden lg:block lg:w-[360px] lg:shrink-0 lg:self-start">
            <div className="flex h-[calc(100dvh-6rem)] max-h-[calc(100dvh-6rem)] flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl ring-1 ring-black/5 dark:border-slate-700/60 dark:bg-[#1E293B] dark:ring-white/10 lg:sticky lg:top-14">
              <div className="shrink-0 border-b border-gray-100 bg-white px-3 py-2 dark:border-gray-800 dark:bg-[#1E293B]">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-gray-400" />
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Discussions</h3>
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col px-3 pb-2 pt-2">
                <ActivityFeed taskId={currentSubtask.id} entityType="subtask" fillHeight anchorBottom />
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
            <ActivityFeed taskId={currentSubtask.id} entityType="subtask" fillHeight anchorBottom />
          </div>
        </DialogContent>
      </Dialog>

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
