import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CreateTagInput, UpdateTagInput } from '@/types';
import { toast } from '@/hooks/useToast';

export function useTags(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'tags'],
    queryFn: () => api.getTags(projectId),
    enabled: !!projectId,
  });
}

export function useCreateTag(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTagInput) => api.createTag(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'tags'],
      });
      toast({
        title: 'Tag created',
        description: 'The tag has been created successfully.',
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

export function useUpdateTag(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tagId, data }: { tagId: string; data: UpdateTagInput }) =>
      api.updateTag(tagId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'tags'],
      });
      toast({
        title: 'Tag updated',
        description: 'The tag has been updated successfully.',
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

export function useDeleteTag(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tagId: string) => api.deleteTag(tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'tags'],
      });
      toast({
        title: 'Tag deleted',
        description: 'The tag has been deleted successfully.',
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
