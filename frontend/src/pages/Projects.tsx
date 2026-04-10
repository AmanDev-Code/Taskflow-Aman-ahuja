import { useState, useMemo } from 'react';
import { Plus, AlertCircle, FolderKanban, Search, LayoutGrid, List, Filter, SortAsc, SortDesc, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { ProjectList } from '@/components/projects/ProjectList';
import { ProjectModal } from '@/components/projects/ProjectModal';
import { DeleteProjectDialog } from '@/components/projects/DeleteProjectDialog';
import { Navbar } from '@/components/layout/Navbar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from '@/hooks/useProjects';
import { useAuthStore } from '@/stores/authStore';
import type { Project, CreateProjectInput } from '@/types';
import { cn } from '@/lib/utils';

type SortOption = 'name-asc' | 'name-desc' | 'date-newest' | 'date-oldest';
type FilterOption = 'all' | 'owned';

export function ProjectsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortOption, setSortOption] = useState<SortOption>('date-newest');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');

  const { data: projectsData, isLoading, error } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const currentUser = useAuthStore((state) => state.user);

  const projects = useMemo(() => {
    const allProjects = projectsData?.items || [];
    
    let filtered = allProjects.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (filterOption === 'owned' && currentUser) {
      filtered = filtered.filter(p => p.owner_id === currentUser.id);
    }
    
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'date-newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date-oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [projectsData?.items, searchQuery, sortOption, filterOption, currentUser]);

  const getSortLabel = (option: SortOption): string => {
    switch (option) {
      case 'name-asc': return 'Name (A-Z)';
      case 'name-desc': return 'Name (Z-A)';
      case 'date-newest': return 'Newest First';
      case 'date-oldest': return 'Oldest First';
    }
  };

  const getFilterLabel = (option: FilterOption): string => {
    switch (option) {
      case 'all': return 'All Projects';
      case 'owned': return 'My Projects';
    }
  };

  const handleCreateProject = () => {
    setSelectedProject(null);
    setIsModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleDeleteProject = (project: Project) => {
    setSelectedProject(project);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: CreateProjectInput) => {
    if (selectedProject) {
      await updateProject.mutateAsync({ id: selectedProject.id, data });
    } else {
      await createProject.mutateAsync(data);
    }
    setIsModalOpen(false);
    setSelectedProject(null);
  };

  const handleConfirmDelete = async () => {
    if (selectedProject) {
      await deleteProject.mutateAsync(selectedProject.id);
      setIsDeleteDialogOpen(false);
      setSelectedProject(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
        <Navbar />
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
        <Navbar />
        <div className="flex h-64 flex-col items-center justify-center">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            Failed to load projects
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {error instanceof Error ? error.message : 'An error occurred'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <Navbar />
      
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                Projects
              </h1>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                {projects.length} {projects.length === 1 ? 'project' : 'projects'} in your workspace
              </p>
            </div>
            <Button 
              onClick={handleCreateProject}
              className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white border-0 h-11 px-5 rounded-lg font-medium shadow-lg shadow-purple-500/20"
            >
              <Plus className="mr-2 h-5 w-5" />
              New Project
            </Button>
          </div>
        </div>

        {/* Search and Filters Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-purple-500 dark:focus:border-purple-500 focus:ring-purple-500/20 rounded-lg"
            />
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className={cn(
                    "h-11 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg gap-2",
                    filterOption !== 'all' && "border-purple-500 dark:border-purple-500 text-purple-600 dark:text-purple-400"
                  )}
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">{getFilterLabel(filterOption)}</span>
                  {filterOption !== 'all' && (
                    <X 
                      className="h-3 w-3 ml-1 hover:text-purple-700" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilterOption('all');
                      }}
                    />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFilterOption('all')}>
                  <span className="flex-1">All Projects</span>
                  {filterOption === 'all' && <Check className="h-4 w-4 text-purple-600" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterOption('owned')}>
                  <span className="flex-1">My Projects</span>
                  {filterOption === 'owned' && <Check className="h-4 w-4 text-purple-600" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="h-11 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg gap-2"
                >
                  {sortOption.includes('asc') || sortOption === 'date-oldest' ? (
                    <SortAsc className="h-4 w-4" />
                  ) : (
                    <SortDesc className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">{getSortLabel(sortOption)}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortOption('name-asc')}>
                  <span className="flex-1">Name (A-Z)</span>
                  {sortOption === 'name-asc' && <Check className="h-4 w-4 text-purple-600" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption('name-desc')}>
                  <span className="flex-1">Name (Z-A)</span>
                  {sortOption === 'name-desc' && <Check className="h-4 w-4 text-purple-600" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortOption('date-newest')}>
                  <span className="flex-1">Newest First</span>
                  {sortOption === 'date-newest' && <Check className="h-4 w-4 text-purple-600" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption('date-oldest')}>
                  <span className="flex-1">Oldest First</span>
                  {sortOption === 'date-oldest' && <Check className="h-4 w-4 text-purple-600" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex items-center bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-2 rounded-md transition-colors',
                  viewMode === 'grid' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-2 rounded-md transition-colors',
                  viewMode === 'list' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-purple-500 mb-6">
              <FolderKanban className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery ? 'No projects found' : 'Create your first project'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-8">
              {searchQuery 
                ? 'Try adjusting your search query or create a new project.'
                : 'Projects help you organize tasks, collaborate with your team, and track progress all in one place.'
              }
            </p>
            <Button 
              onClick={handleCreateProject}
              className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white border-0 h-11 px-6 rounded-lg font-medium"
            >
              <Plus className="mr-2 h-5 w-5" />
              Create Project
            </Button>
          </div>
        ) : (
          <ProjectList
            projects={projects}
            onEdit={handleEditProject}
            onDelete={handleDeleteProject}
            viewMode={viewMode}
          />
        )}

        <ProjectModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProject(null);
          }}
          onSubmit={handleSubmit}
          project={selectedProject}
          isLoading={createProject.isPending || updateProject.isPending}
        />

        <DeleteProjectDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setSelectedProject(null);
          }}
          onConfirm={handleConfirmDelete}
          project={selectedProject}
          isLoading={deleteProject.isPending}
        />
      </main>
    </div>
  );
}
