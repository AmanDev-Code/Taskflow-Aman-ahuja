import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CreateSubtaskInput, UpdateSubtaskInput, Subtask } from '@/types';
import { toast } from '@/hooks/useToast';

export function useSubtasks(taskId: string) {
  return useQuery({
    queryKey: ['tasks', taskId, 'subtasks'],
    queryFn: () => api.getSubtasks(taskId),
    enabled: !!taskId,
  });
}

export function useSubtask(subtaskId: string) {
  return useQuery({
    queryKey: ['subtasks', subtaskId],
    queryFn: () => api.getSubtask(subtaskId),
    enabled: !!subtaskId,
  });
}

export function useCreateSubtask(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSubtaskInput) => api.createSubtask(taskId, data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', taskId, 'subtasks'],
      });
      queryClient.invalidateQueries({
        queryKey: ['tasks', taskId],
      });
      if (created?.id) {
        queryClient.invalidateQueries({
          queryKey: ['activities', 'subtask', created.id],
        });
      }
      queryClient.invalidateQueries({
        queryKey: ['activities', 'task', taskId],
      });
      toast({
        title: 'Subtask created',
        description: 'The subtask has been created successfully.',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateSubtask(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subtaskId, data }: { subtaskId: string; data: UpdateSubtaskInput }) =>
      api.updateSubtask(taskId, subtaskId, data),
    onMutate: async ({ subtaskId, data }) => {
      await queryClient.cancelQueries({
        queryKey: ['tasks', taskId, 'subtasks'],
      });
      await queryClient.cancelQueries({
        queryKey: ['subtasks', subtaskId],
      });

      const previousSubtasks = queryClient.getQueryData<Subtask[]>([
        'tasks',
        taskId,
        'subtasks',
      ]);
      const previousSubtask = queryClient.getQueryData<Subtask>(['subtasks', subtaskId]);

      queryClient.setQueryData<Subtask[]>(
        ['tasks', taskId, 'subtasks'],
        (old) =>
          old?.map((subtask) =>
            subtask.id === subtaskId ? { ...subtask, ...data } : subtask
          ) ?? []
      );

      queryClient.setQueryData<Subtask>(['subtasks', subtaskId], (old) =>
        old ? { ...old, ...data } : old
      );

      return { previousSubtasks, previousSubtask };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousSubtasks) {
        queryClient.setQueryData(
          ['tasks', taskId, 'subtasks'],
          context.previousSubtasks
        );
      }
      if (context?.previousSubtask) {
        queryClient.setQueryData(['subtasks', context.previousSubtask.id], context.previousSubtask);
      }
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', taskId, 'subtasks'],
      });
      queryClient.invalidateQueries({
        queryKey: ['tasks', taskId],
      });
      queryClient.invalidateQueries({
        queryKey: ['subtasks'],
      });
      const sid = variables?.subtaskId;
      if (sid) {
        queryClient.invalidateQueries({
          queryKey: ['activities', 'subtask', sid],
        });
      }
      queryClient.invalidateQueries({
        queryKey: ['activities', 'task', taskId],
      });
    },
  });
}

export function useDeleteSubtask(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (subtaskId: string) => api.deleteSubtask(taskId, subtaskId),
    onSuccess: (_, subtaskId) => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', taskId, 'subtasks'],
      });
      queryClient.invalidateQueries({
        queryKey: ['tasks', taskId],
      });
      queryClient.invalidateQueries({
        queryKey: ['activities', 'subtask', subtaskId],
      });
      queryClient.invalidateQueries({
        queryKey: ['activities', 'task', taskId],
      });
      toast({
        title: 'Subtask deleted',
        description: 'The subtask has been deleted successfully.',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useToggleSubtask(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subtaskId, completed }: { subtaskId: string; completed: boolean }) =>
      api.updateSubtask(taskId, subtaskId, { completed }),
    onMutate: async ({ subtaskId, completed }) => {
      await queryClient.cancelQueries({
        queryKey: ['tasks', taskId, 'subtasks'],
      });

      const previousSubtasks = queryClient.getQueryData<Subtask[]>([
        'tasks',
        taskId,
        'subtasks',
      ]);

      queryClient.setQueryData<Subtask[]>(
        ['tasks', taskId, 'subtasks'],
        (old) =>
          old?.map((subtask) =>
            subtask.id === subtaskId ? { ...subtask, completed } : subtask
          ) ?? []
      );

      return { previousSubtasks };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousSubtasks) {
        queryClient.setQueryData(
          ['tasks', taskId, 'subtasks'],
          context.previousSubtasks
        );
      }
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: (_d, _e, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', taskId, 'subtasks'],
      });
      queryClient.invalidateQueries({
        queryKey: ['tasks', taskId],
      });
      const sid = variables?.subtaskId;
      if (sid) {
        queryClient.invalidateQueries({
          queryKey: ['activities', 'subtask', sid],
        });
      }
      queryClient.invalidateQueries({
        queryKey: ['activities', 'task', taskId],
      });
    },
  });
}
