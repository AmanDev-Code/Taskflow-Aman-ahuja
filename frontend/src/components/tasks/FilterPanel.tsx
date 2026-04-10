import { useState } from 'react';
import { X, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFilterStore } from '@/stores/filterStore';
import { STATUS_CONFIG } from '@/types';
import type { Tag, ProjectMember, TaskPriority } from '@/types';
import { cn } from '@/lib/utils';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  tags: Tag[];
  members: ProjectMember[];
}

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'urgent', label: 'Urgent', color: '#EF4444' },
  { value: 'high', label: 'High', color: '#F97316' },
  { value: 'medium', label: 'Medium', color: '#EAB308' },
  { value: 'low', label: 'Low', color: '#3B82F6' },
];

export function FilterPanel({ isOpen, onClose, tags, members }: FilterPanelProps) {
  const filterState = useFilterStore();
  const statusFilter = filterState.statusFilter ?? [];
  const priorityFilter = filterState.priorityFilter ?? [];
  const assigneeFilter = filterState.assigneeFilter ?? [];
  const tagFilter = filterState.tagFilter ?? [];
  const setStatusFilter = filterState.setStatusFilter;
  const setPriorityFilter = filterState.setPriorityFilter;
  const setAssigneeFilter = filterState.setAssigneeFilter;
  const setTagFilter = filterState.setTagFilter;
  const clearFilters = filterState.clearFilters;

  const [expandedSection, setExpandedSection] = useState<string | null>('status');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const toggleStatus = (status: string) => {
    if (statusFilter.includes(status)) {
      setStatusFilter(statusFilter.filter(s => s !== status));
    } else {
      setStatusFilter([...statusFilter, status]);
    }
  };

  const togglePriority = (priority: string) => {
    if (priorityFilter.includes(priority)) {
      setPriorityFilter(priorityFilter.filter(p => p !== priority));
    } else {
      setPriorityFilter([...priorityFilter, priority]);
    }
  };

  const toggleAssignee = (assigneeId: string) => {
    if (assigneeFilter.includes(assigneeId)) {
      setAssigneeFilter(assigneeFilter.filter(a => a !== assigneeId));
    } else {
      setAssigneeFilter([...assigneeFilter, assigneeId]);
    }
  };

  const toggleTag = (tagId: string) => {
    if (tagFilter.includes(tagId)) {
      setTagFilter(tagFilter.filter(t => t !== tagId));
    } else {
      setTagFilter([...tagFilter, tagId]);
    }
  };

  const activeFiltersCount = statusFilter.length + priorityFilter.length + assigneeFilter.length + tagFilter.length;

  if (!isOpen) return null;

  return (
    <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl z-50">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filters</h3>
          {activeFiltersCount > 0 && (
            <Badge className="bg-[#7C3AED] text-white text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white h-7"
            >
              Clear all
            </Button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {/* Status Filter */}
        <div className="border-b border-gray-200 dark:border-slate-800">
          <button
            onClick={() => toggleSection('status')}
            className="flex items-center justify-between w-full p-4 text-left"
          >
            <span className="text-sm font-medium text-gray-900 dark:text-white">Status</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform',
                expandedSection === 'status' && 'rotate-180'
              )}
            />
          </button>
          {expandedSection === 'status' && (
            <div className="px-4 pb-4 flex flex-wrap gap-2">
              {STATUS_CONFIG.map((status) => (
                <button
                  key={status.id}
                  onClick={() => toggleStatus(status.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                    statusFilter.includes(status.id)
                      ? 'ring-2 ring-purple-600 dark:ring-[#7C3AED]'
                      : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                  )}
                  style={{
                    backgroundColor: status.bgColor,
                    color: status.color,
                  }}
                >
                  {statusFilter.includes(status.id) && <Check className="h-3 w-3" />}
                  {status.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Priority Filter */}
        <div className="border-b border-gray-200 dark:border-slate-800">
          <button
            onClick={() => toggleSection('priority')}
            className="flex items-center justify-between w-full p-4 text-left"
          >
            <span className="text-sm font-medium text-gray-900 dark:text-white">Priority</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform',
                expandedSection === 'priority' && 'rotate-180'
              )}
            />
          </button>
          {expandedSection === 'priority' && (
            <div className="px-4 pb-4 flex flex-wrap gap-2">
              {PRIORITIES.map((priority) => (
                <button
                  key={priority.value}
                  onClick={() => togglePriority(priority.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                    priorityFilter.includes(priority.value)
                      ? 'ring-2 ring-purple-600 dark:ring-[#7C3AED]'
                      : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                  )}
                  style={{
                    backgroundColor: `${priority.color}20`,
                    color: priority.color,
                  }}
                >
                  {priorityFilter.includes(priority.value) && <Check className="h-3 w-3" />}
                  {priority.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Assignee Filter */}
        <div className="border-b border-gray-200 dark:border-slate-800">
          <button
            onClick={() => toggleSection('assignee')}
            className="flex items-center justify-between w-full p-4 text-left"
          >
            <span className="text-sm font-medium text-gray-900 dark:text-white">Assignee</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform',
                expandedSection === 'assignee' && 'rotate-180'
              )}
            />
          </button>
          {expandedSection === 'assignee' && (
            <div className="px-4 pb-4 space-y-1">
              {members.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No members in this project</p>
              ) : (
                members.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => toggleAssignee(member.user.id)}
                    className={cn(
                      'flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm transition-all',
                      assigneeFilter.includes(member.user.id)
                        ? 'bg-purple-100 text-purple-900 dark:bg-[#7C3AED]/20 dark:text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-white'
                    )}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white"
                      style={{ backgroundColor: member.user.color }}
                    >
                      {member.user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 text-left">{member.user.name}</span>
                    {assigneeFilter.includes(member.user.id) && (
                      <Check className="h-4 w-4 text-purple-600 dark:text-[#7C3AED]" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Tags Filter */}
        <div>
          <button
            onClick={() => toggleSection('tags')}
            className="flex items-center justify-between w-full p-4 text-left"
          >
            <span className="text-sm font-medium text-gray-900 dark:text-white">Tags</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform',
                expandedSection === 'tags' && 'rotate-180'
              )}
            />
          </button>
          {expandedSection === 'tags' && (
            <div className="px-4 pb-4 flex flex-wrap gap-2">
              {tags.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No tags in this project</p>
              ) : (
                tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                      tagFilter.includes(tag.id)
                        ? 'ring-2 ring-purple-600 dark:ring-[#7C3AED]'
                        : 'hover:opacity-80'
                    )}
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                    }}
                  >
                    {tagFilter.includes(tag.id) && <Check className="h-3 w-3" />}
                    {tag.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
