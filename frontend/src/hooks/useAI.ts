import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface AiHelpRequest {
  taskTitle: string;
  taskDescription?: string;
  question: string;
}

interface AiHelpResponse {
  response: string;
}

interface GenerateDescriptionRequest {
  prompt: string;
}

interface GenerateDescriptionResponse {
  description: string;
}

interface SuggestSubtasksRequest {
  taskTitle: string;
}

interface SuggestSubtasksResponse {
  subtasks: string[];
}


export function useAiStatus() {
  return useQuery({
    queryKey: ['ai', 'status'],
    queryFn: () => api.getAiStatus(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAiHelp() {
  return useMutation<AiHelpResponse, Error, AiHelpRequest>({
    mutationFn: (data) => api.getAiHelp(data),
  });
}

export function useGenerateDescription() {
  return useMutation<GenerateDescriptionResponse, Error, GenerateDescriptionRequest>({
    mutationFn: (data) => api.generateDescription(data),
  });
}

export function useSuggestSubtasks() {
  return useMutation<SuggestSubtasksResponse, Error, SuggestSubtasksRequest>({
    mutationFn: (data) => api.suggestSubtasks(data),
  });
}
