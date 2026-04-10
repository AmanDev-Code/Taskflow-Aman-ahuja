import { ProjectCard } from './ProjectCard';
import type { Project } from '@/types';
import { cn } from '@/lib/utils';

interface ProjectListProps {
  projects: Project[];
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  viewMode?: 'grid' | 'list';
}

export function ProjectList({ projects, onEdit, onDelete, viewMode = 'grid' }: ProjectListProps) {
  return (
    <div className={cn(
      viewMode === 'grid' 
        ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' 
        : 'flex flex-col gap-3'
    )}>
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onEdit={onEdit}
          onDelete={onDelete}
          viewMode={viewMode}
        />
      ))}
    </div>
  );
}
