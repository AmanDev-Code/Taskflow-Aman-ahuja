import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import type { User } from '@/types';

export function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'members'],
    queryFn: () => api.getProjectMembers(projectId),
    enabled: !!projectId,
  });
}

export function useUserSuggestions(query: string) {
  return useQuery<User[]>({
    queryKey: ['users', 'search', query],
    queryFn: () => api.searchUsers(query, 8),
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  });
}

export function useAddProjectMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, role }: { email: string; role?: 'admin' | 'member' }) =>
      api.addProjectMember(projectId, email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'members'],
      });
      toast({
        title: 'Member added',
        description: 'The member has been added to the project.',
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

export function useRemoveProjectMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => api.removeProjectMember(projectId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'members'],
      });
      toast({
        title: 'Member removed',
        description: 'The member has been removed from the project.',
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
