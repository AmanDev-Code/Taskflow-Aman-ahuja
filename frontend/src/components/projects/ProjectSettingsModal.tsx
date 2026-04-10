import { useState } from 'react';
import { Settings, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateProject, useDeleteProject } from '@/hooks/useProjects';
import { useNavigate } from 'react-router-dom';
import type { Project } from '@/types';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

export function ProjectSettingsModal({ isOpen, onClose, project }: ProjectSettingsModalProps) {
  const navigate = useNavigate();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const handleSave = async () => {
    if (!name.trim()) return;

    try {
      await updateProject.mutateAsync({
        id: project.id,
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
        },
      });
      onClose();
    } catch {
      // Error handled in hook
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== project.name) return;

    try {
      await deleteProject.mutateAsync(project.id);
      onClose();
      navigate('/projects');
    } catch {
      // Error handled in hook
    }
  };

  const hasChanges = name !== project.name || description !== (project.description || '');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-purple-600 dark:text-[#7C3AED]" />
            Project Settings
          </DialogTitle>
          <DialogDescription>
            Update your project settings or delete the project
          </DialogDescription>
        </DialogHeader>

        {!showDeleteConfirm ? (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700 dark:text-gray-300">
                  Project Name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter project name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-700 dark:text-gray-300">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[100px] resize-none"
                  placeholder="Enter project description (optional)"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || !name.trim() || updateProject.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {updateProject.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>

            {/* Danger Zone */}
            <div className="border-t border-gray-200 dark:border-slate-800 pt-6">
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-500/20 rounded-lg shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-red-400 mb-1">Danger Zone</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                      Deleting this project will permanently remove all tasks, members, and data.
                      This action cannot be undone.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="border-red-500/50 bg-transparent text-red-400 hover:bg-red-500/20 hover:text-red-300 hover:border-red-400"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Project
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <AlertTriangle className="h-5 w-5" />
                <h4 className="font-semibold">Confirm Delete</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                This will permanently delete <span className="text-gray-900 dark:text-white font-medium">{project.name}</span> and
                all associated data including tasks, comments, and attachments.
              </p>
              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-gray-700 dark:text-gray-300 text-sm">
                  Type <span className="text-gray-900 dark:text-white font-mono">{project.name}</span> to confirm
                </Label>
                <Input
                  id="confirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={project.name}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                }}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleteConfirmText !== project.name || deleteProject.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteProject.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Project
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
