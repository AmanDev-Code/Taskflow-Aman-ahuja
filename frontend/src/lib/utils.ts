import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateShort(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateRange(start?: string, end?: string): string {
  if (!start && !end) return '';
  if (start && end) {
    return `${formatDateShort(start)} → ${formatDateShort(end)}`;
  }
  if (start) return `Starts ${formatDateShort(start)}`;
  if (end) return `Due ${formatDateShort(end)}`;
  return '';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'high':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'low':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
  }
}

export function getPriorityIcon(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'text-red-500';
    case 'high':
      return 'text-orange-500';
    case 'medium':
      return 'text-yellow-500';
    case 'low':
      return 'text-blue-500';
    default:
      return 'text-gray-400';
  }
}

export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    backlog: 'bg-gray-500/10 text-gray-400',
    bugs: 'bg-red-500/10 text-red-400',
    pipeline_ready: 'bg-purple-500/10 text-purple-400',
    ux_bugs: 'bg-orange-500/10 text-orange-400',
    in_progress: 'bg-blue-500/10 text-blue-400',
    dev_done: 'bg-emerald-500/10 text-emerald-400',
    testing: 'bg-amber-500/10 text-amber-400',
    deployed: 'bg-green-500/10 text-green-400',
  };
  return statusColors[status] || 'bg-gray-100 text-gray-700';
}

export function getStatusLabel(status: string): string {
  const statusLabels: Record<string, string> = {
    backlog: 'Backlog',
    bugs: 'Bugs',
    pipeline_ready: 'Pipeline Ready',
    ux_bugs: 'UX Bugs',
    in_progress: 'In Progress',
    dev_done: 'Dev Done',
    testing: 'Testing',
    deployed: 'Deployed',
  };
  return statusLabels[status] || status;
}

export function isOverdue(dueDate: string | undefined): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export function getUserColor(id?: string): string {
  const colors = [
    '#E23744', // Red
    '#3B82F6', // Blue
    '#22C55E', // Green
    '#F59E0B', // Yellow
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#F97316', // Orange
  ];
  
  if (!id) {
    return colors[0];
  }

  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

export function formatTime(minutes?: number): string {
  if (!minutes) return '0h';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return formatDateShort(date);
}
