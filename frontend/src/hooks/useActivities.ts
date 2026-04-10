import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CreateActivityInput } from '@/types';

type ActivityEntity = 'task' | 'subtask';

export function useActivities(taskId: string, entityType: ActivityEntity = 'task') {
  return useQuery({
    queryKey: ['activities', entityType, taskId],
    queryFn: () =>
      entityType === 'subtask' ? api.getSubtaskActivities(taskId) : api.getActivities(taskId),
    enabled: !!taskId,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useCreateComment(taskId: string, entityType: ActivityEntity = 'task') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) =>
      entityType === 'subtask'
        ? api.createSubtaskComment(taskId, content)
        : api.createComment(taskId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', entityType, taskId] });
    },
  });
}

export function useCreateActivity(taskId: string, entityType: ActivityEntity = 'task') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateActivityInput) =>
      entityType === 'subtask'
        ? api.createSubtaskActivity(taskId, data)
        : api.createActivity(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', entityType, taskId] });
    },
  });
}
