import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CreateTaskInput, UpdateTaskInput, Task, TaskStatus } from '@/types';
import { toast } from '@/hooks/useToast';

export function useTasks(projectId: string, filters?: { status?: string; assignee?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['projects', projectId, 'tasks', filters],
    queryFn: async () => {
      const result = await api.getTasks(projectId, filters);
      return result.items;
    },
    enabled: !!projectId,
  });
}

export function useTask(projectId: string, taskId: string) {
  return useQuery({
    queryKey: ['tasks', taskId],
    queryFn: () => api.getTask(taskId),
    enabled: !!projectId && !!taskId,
  });
}

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskInput) => api.createTask(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'tasks'],
      });
      queryClient.invalidateQueries({
        queryKey: ['projects', projectId],
      });
      toast({
        title: 'Task created',
        description: 'Your new task has been created successfully.',
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

export function useUpdateTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: UpdateTaskInput }) =>
      api.updateTask(taskId, data),
    onMutate: async ({ taskId, data }) => {
      await queryClient.cancelQueries({
        queryKey: ['projects', projectId, 'tasks'],
      });

      const previousTasks = queryClient.getQueryData<Task[]>([
        'projects',
        projectId,
        'tasks',
      ]);

      queryClient.setQueryData<Task[]>(
        ['projects', projectId, 'tasks'],
        (old) =>
          old?.map((task) =>
            task.id === taskId ? { ...task, ...data } : task
          ) ?? []
      );

      return { previousTasks };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(
          ['projects', projectId, 'tasks'],
          context.previousTasks
        );
      }
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: (_, __, { taskId }) => {
      queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'tasks'],
      });
      queryClient.invalidateQueries({
        queryKey: ['projects', projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ['tasks', taskId],
      });
      queryClient.invalidateQueries({
        queryKey: ['activities', 'task', taskId],
      });
    },
  });
}

export function useDeleteTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => api.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'tasks'],
      });
      queryClient.invalidateQueries({
        queryKey: ['projects', projectId],
      });
      toast({
        title: 'Task deleted',
        description: 'The task has been deleted successfully.',
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

export function useMoveTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      status,
    }: {
      taskId: string;
      status: TaskStatus;
    }) => api.updateTask(taskId, { status }),
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({
        queryKey: ['projects', projectId, 'tasks'],
      });

      const previousTasks = queryClient.getQueryData<Task[]>([
        'projects',
        projectId,
        'tasks',
      ]);

      queryClient.setQueryData<Task[]>(
        ['projects', projectId, 'tasks'],
        (old) =>
          old?.map((task) =>
            task.id === taskId ? { ...task, status } : task
          ) ?? []
      );

      return { previousTasks };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(
          ['projects', projectId, 'tasks'],
          context.previousTasks
        );
      }
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: (_, __, { taskId }) => {
      queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'tasks'],
      });
      queryClient.invalidateQueries({
        queryKey: ['projects', projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ['activities', 'task', taskId],
      });
    },
  });
}

export function useDuplicateTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => api.duplicateTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'tasks'],
      });
      queryClient.invalidateQueries({
        queryKey: ['projects', projectId],
      });
      toast({
        title: 'Task duplicated',
        description: 'A copy of the task has been created.',
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
