import { useState, useEffect, useMemo } from 'react';
import { Trash2, Flag, Target, UserRound } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AssigneeSelector } from '@/components/tasks/AssigneeSelector';
import { TagSelector } from '@/components/tasks/TagSelector';
import { DatePickerPopover } from '@/components/ui/date-picker-popover';
import type { Task, TaskStatus, TaskPriority, CreateTaskInput, ProjectMember, Tag, TaskAssignee } from '@/types';
import { STATUS_CONFIG } from '@/types';
import { cn } from '@/lib/utils';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskInput) => void;
  onDelete?: () => void;
  task?: Task | null;
  defaultStatus?: TaskStatus;
  mode?: 'create' | 'edit';
  isLoading?: boolean;
  isDeleting?: boolean;
  projectMembers?: ProjectMember[];
  availableTags?: Tag[];
  /** Create tag in project; new tag is auto-selected on the task. */
  onCreateTag?: (name: string, color: string) => Promise<Tag>;
}

const priorityOptions: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'urgent', label: 'Urgent', color: 'text-red-500' },
  { value: 'high', label: 'High', color: 'text-orange-500' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-500' },
  { value: 'low', label: 'Low', color: 'text-blue-500' },
];

export function TaskModal({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  task,
  defaultStatus = 'backlog',
  isLoading,
  isDeleting,
  projectMembers = [],
  availableTags = [],
  onCreateTag,
}: TaskModalProps) {
  const parseDueYmd = (ymd: string) => {
    if (!ymd) return undefined;
    const [y, m, d] = ymd.split('-').map(Number);
    if (!y || !m || !d) return undefined;
    return new Date(y, m - 1, d);
  };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [proposedBy, setProposedBy] = useState<string>('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [tagsCreatedThisSession, setTagsCreatedThisSession] = useState<Tag[]>([]);
  const [sprintPoints, setSprintPoints] = useState<string>('');
  const [errors, setErrors] = useState<{ title?: string }>({});

  const isEditing = !!task;

  const mergedAvailableTags = useMemo(() => {
    const byId = new Map<string, Tag>();
    for (const t of availableTags) byId.set(t.id, t);
    for (const t of tagsCreatedThisSession) byId.set(t.id, t);
    return Array.from(byId.values());
  }, [availableTags, tagsCreatedThisSession]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(task.due_date ? task.due_date.split('T')[0] : '');
      setAssigneeIds(task.assignees?.map((a) => a.user_id) || []);
      setProposedBy(task.proposed_by || task.proposer?.id || '');
      setTagIds(task.tags?.map((t) => t.id) || []);
      setSprintPoints(task.sprint_points?.toString() || '');
    } else {
      setTitle('');
      setDescription('');
      setStatus(defaultStatus);
      setPriority('medium');
      setDueDate('');
      setAssigneeIds([]);
      setProposedBy('');
      setTagIds([]);
      setSprintPoints('');
    }
    setErrors({});
  }, [task, isOpen, defaultStatus]);

  useEffect(() => {
    if (!isOpen) setTagsCreatedThisSession([]);
  }, [isOpen]);

  const validate = (): boolean => {
    const newErrors: { title?: string } = {};

    if (!title.trim()) {
      newErrors.title = 'Task title is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      due_date: dueDate || undefined,
      assignee_ids: assigneeIds.length > 0 ? assigneeIds : undefined,
      proposed_by: proposedBy || undefined,
      tag_ids: tagIds.length > 0 ? tagIds : undefined,
      sprint_points: sprintPoints ? parseInt(sprintPoints, 10) : undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] overflow-y-auto p-4 sm:max-w-lg sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Task' : 'Create New Task'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pb-1">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                placeholder="Enter task title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={errors.title}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                placeholder="Describe the task..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="task-status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                  <SelectTrigger id="task-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_CONFIG.map((statusOption) => (
                      <SelectItem key={statusOption.id} value={statusOption.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-2 w-2 rounded-sm" 
                            style={{ backgroundColor: statusOption.color }}
                          />
                          {statusOption.title}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-priority">Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                  <SelectTrigger id="task-priority">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <Flag className={cn('h-4 w-4', priorityOptions.find(p => p.value === priority)?.color)} fill="currentColor" />
                        {priorityOptions.find(p => p.value === priority)?.label}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Flag className={cn('h-4 w-4', option.color)} fill="currentColor" />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="task-due-date">Due Date</Label>
                <DatePickerPopover
                  value={parseDueYmd(dueDate)}
                  onChange={(d) =>
                    setDueDate(
                      d
                        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                        : ''
                    )
                  }
                  placeholder="Pick due date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-sprint-points">Sprint Points</Label>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <Input
                    id="task-sprint-points"
                    type="number"
                    min="0"
                    max="100"
                    value={sprintPoints}
                    onChange={(e) => setSprintPoints(e.target.value)}
                    placeholder="e.g. 5"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Assignees</Label>
              <AssigneeSelector
                assignees={assigneeIds.map((id) => {
                  const member = projectMembers.find((m) => m.user.id === id);
                  if (!member) return null;
                  return {
                    user_id: member.user.id,
                    user_name: member.user.name,
                    user_avatar_url: member.user.avatar_url,
                    user_color: member.user.color,
                  } as TaskAssignee;
                }).filter((a): a is TaskAssignee => a !== null)}
                projectMembers={projectMembers}
                onChange={setAssigneeIds}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-proposed-by">Proposed By</Label>
              <Select value={proposedBy || 'none'} onValueChange={(v) => setProposedBy(v === 'none' ? '' : v)}>
                <SelectTrigger id="task-proposed-by">
                  <SelectValue placeholder="Select proposer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projectMembers.map((member) => (
                    <SelectItem key={member.id} value={member.user.id}>
                      <div className="flex items-center gap-2">
                        <UserRound className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <span>{member.user.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <TagSelector
                selectedTags={tagIds
                  .map((id) => mergedAvailableTags.find((t) => t.id === id))
                  .filter((t): t is Tag => t !== undefined)}
                availableTags={mergedAvailableTags}
                onChange={setTagIds}
                onCreateTag={
                  onCreateTag
                    ? async (name, color) => {
                        const tag = await onCreateTag(name, color);
                        setTagsCreatedThisSession((prev) =>
                          prev.some((p) => p.id === tag.id) ? prev : [...prev, tag]
                        );
                        setTagIds((prev) => (prev.includes(tag.id) ? prev : [...prev, tag.id]));
                      }
                    : undefined
                }
              />
            </div>
          </div>

          <DialogFooter className="mt-2 gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
            {isEditing && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                disabled={isDeleting}
                className="mr-auto"
              >
                <Trash2 className="mr-2 h-4 w-4 text-white" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
