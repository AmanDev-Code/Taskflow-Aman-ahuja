import { Link } from 'react-router-dom';
import { MoreHorizontal, Trash2, Edit, Users, CheckSquare, ArrowRight, Rocket, Briefcase, Target, Lightbulb, Wrench, BarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Project } from '@/types';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  viewMode?: 'grid' | 'list';
}

const projectIcons = [
  { Icon: Rocket, bg: 'from-violet-500 to-purple-600' },
  { Icon: Briefcase, bg: 'from-blue-500 to-cyan-500' },
  { Icon: Target, bg: 'from-orange-500 to-red-500' },
  { Icon: Lightbulb, bg: 'from-yellow-400 to-orange-500' },
  { Icon: Wrench, bg: 'from-emerald-500 to-teal-500' },
  { Icon: BarChart, bg: 'from-pink-500 to-rose-500' },
];

export function ProjectCard({ project, onEdit, onDelete, viewMode = 'grid' }: ProjectCardProps) {
  const iconIndex = project.id.charCodeAt(0) % projectIcons.length;
  const { Icon, bg } = projectIcons[iconIndex];
  
  if (viewMode === 'list') {
    return (
      <Link 
        to={`/projects/${project.id}`}
        className="group flex items-center gap-4 p-4 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 rounded-xl transition-all"
      >
        <div className={cn(
          'flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shrink-0',
          bg
        )}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
            {project.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {project.description || 'No description'}
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-6 text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="text-sm">4</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            <span className="text-sm">12</span>
          </div>
          <span className="text-xs">
            {formatDate(project.created_at)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
              <DropdownMenuItem onClick={(e) => { e.preventDefault(); onEdit(project); }} className="text-gray-700 dark:text-gray-300 focus:text-gray-900 dark:focus:text-white focus:bg-gray-100 dark:focus:bg-slate-700">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-200 dark:bg-slate-700" />
              <DropdownMenuItem
                onClick={(e) => { e.preventDefault(); onDelete(project); }}
                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-500/10"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ArrowRight className="h-4 w-4 text-gray-400 dark:text-gray-600 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
        </div>
      </Link>
    );
  }

  return (
    <div className="group relative bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 rounded-2xl transition-all overflow-hidden">
      {/* Gradient accent bar */}
      <div className={cn('h-1 w-full bg-gradient-to-r', bg)} />
      
      <Link to={`/projects/${project.id}`} className="block p-5">
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            'flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br',
            bg
          )}>
            <Icon className="h-7 w-7 text-white" />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
              <DropdownMenuItem onClick={(e) => { e.preventDefault(); onEdit(project); }} className="text-gray-700 dark:text-gray-300 focus:text-gray-900 dark:focus:text-white focus:bg-gray-100 dark:focus:bg-slate-700">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-200 dark:bg-slate-700" />
              <DropdownMenuItem
                onClick={(e) => { e.preventDefault(); onDelete(project); }}
                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-500/10"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h3 className="font-semibold text-lg text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors mb-2">
          {project.name}
        </h3>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 min-h-[40px]">
          {project.description || 'No description provided'}
        </p>

        {/* Stats row */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">4</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <CheckSquare className="h-4 w-4" />
              <span className="text-xs font-medium">12 tasks</span>
            </div>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {formatDate(project.created_at)}
          </span>
        </div>
      </Link>
    </div>
  );
}
