import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useTaskAttachments(taskId: string) {
  return useQuery({
    queryKey: ['tasks', taskId, 'attachments'],
    queryFn: () => api.getTaskAttachments(taskId),
    enabled: !!taskId,
  });
}

export function useUploadAttachment(taskId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.uploadTaskAttachment(taskId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId, 'attachments'] });
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'tasks'] });
    },
  });
}

export function useDeleteAttachment(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) => api.deleteAttachment(attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId, 'attachments'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
    },
  });
}

export function useSubtaskAttachments(subtaskId: string) {
  return useQuery({
    queryKey: ['subtasks', subtaskId, 'attachments'],
    queryFn: () => api.getSubtaskAttachments(subtaskId),
    enabled: !!subtaskId,
  });
}

export function useUploadSubtaskAttachment(subtaskId: string, taskId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.uploadSubtaskAttachment(subtaskId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', subtaskId] });
      queryClient.invalidateQueries({ queryKey: ['subtasks', subtaskId, 'attachments'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'tasks'] });
    },
  });
}

export function useDeleteSubtaskAttachment(subtaskId: string, taskId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) => api.deleteAttachment(attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', subtaskId, 'attachments'] });
      queryClient.invalidateQueries({ queryKey: ['subtasks', subtaskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'tasks'] });
    },
  });
}
