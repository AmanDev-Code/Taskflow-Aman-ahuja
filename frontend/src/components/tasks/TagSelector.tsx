import { useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Tag } from '@/types';

const TAG_COLORS = [
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#6B7280',
];

const TRIGGER_BASE =
  'flex h-9 min-h-9 w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 text-left text-sm transition-colors hover:border-gray-300 dark:border-slate-600 dark:bg-[#1E293B] dark:hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#1E293B] disabled:cursor-not-allowed disabled:opacity-50';

interface TagSelectorProps {
  selectedTags: Tag[];
  availableTags: Tag[];
  onChange: (tagIds: string[]) => void;
  onCreateTag?: (name: string, color: string) => void | Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
}

export function TagSelector({
  selectedTags = [],
  availableTags = [],
  onChange,
  onCreateTag,
  disabled,
  isLoading,
}: TagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

  const selectedTagIds = (selectedTags || []).map((t) => t?.id).filter(Boolean) as string[];

  const handleToggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim() || !onCreateTag) return;
    await onCreateTag(newTagName.trim(), newTagColor);
    setNewTagName('');
    setNewTagColor(TAG_COLORS[0]);
    setIsCreating(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateTag();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewTagName('');
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild disabled={disabled || isLoading}>
        <button type="button" className={TRIGGER_BASE}>
          <div className="flex min-h-[1.25rem] min-w-0 flex-1 items-center gap-1 overflow-hidden">
            {selectedTags.length === 0 ? (
              <span className="text-sm text-gray-500 dark:text-gray-400">Empty</span>
            ) : (
              selectedTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex max-w-[7rem] shrink-0 items-center truncate rounded-md px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: `${tag.color}26`,
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </span>
              ))
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {isCreating ? (
          <div className="space-y-3 p-2">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tag name"
              autoFocus
              className="h-8"
            />
            <div className="flex flex-wrap gap-1">
              {TAG_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewTagColor(color)}
                  className={cn(
                    'h-6 w-6 rounded-full transition-transform',
                    newTagColor === color && 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 flex-1"
                onClick={handleCreateTag}
                disabled={!newTagName.trim()}
              >
                Create
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7"
                onClick={() => {
                  setIsCreating(false);
                  setNewTagName('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {availableTags.length === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                No tags available
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto scrollbar-none">
                {availableTags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <DropdownMenuItem
                      key={tag.id}
                      onSelect={(e) => {
                        e.preventDefault();
                        handleToggleTag(tag.id);
                      }}
                      className={cn(
                        'flex cursor-pointer items-center gap-2',
                        isSelected && 'bg-gray-100 dark:bg-gray-800'
                      )}
                    >
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
                      <span className="flex-1 text-gray-700 dark:text-gray-300">{tag.name}</span>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </DropdownMenuItem>
                  );
                })}
              </div>
            )}
            {onCreateTag && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setIsCreating(true);
                  }}
                  className="flex cursor-pointer items-center gap-2 text-primary"
                >
                  <Plus className="h-4 w-4" />
                  Create new tag
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
