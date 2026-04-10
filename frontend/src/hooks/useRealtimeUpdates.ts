import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';
import { api } from '@/lib/api';

interface TaskEvent {
  type: 'task_created' | 'task_updated' | 'task_deleted' | 'heartbeat';
  projectId?: string;
  taskId?: string;
  data?: any;
  userId?: string;
}

export function useRealtimeUpdates(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const sseDisabledRef = useRef(false);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!projectId) return;

    if (sseDisabledRef.current) return;

    const url = api.getProjectEventsUrl(projectId);

    try {
      const eventSource = new EventSource(url, { withCredentials: true });
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE connected to project:', projectId);
        reconnectAttempts.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data: TaskEvent = JSON.parse(event.data);

          if (data.type === 'heartbeat') {
            return;
          }

          console.log('SSE event received:', data);

          switch (data.type) {
            case 'task_created':
              queryClient.invalidateQueries({
                queryKey: ['projects', projectId, 'tasks'],
              });
              queryClient.invalidateQueries({
                queryKey: ['projects', projectId],
              });
              toast({
                title: 'Task Created',
                description: `A new task "${data.data?.title}" was created`,
                variant: 'default',
              });
              break;

            case 'task_updated':
              queryClient.invalidateQueries({
                queryKey: ['projects', projectId, 'tasks'],
              });
              queryClient.invalidateQueries({
                queryKey: ['projects', projectId],
              });
              break;

            case 'task_deleted':
              queryClient.invalidateQueries({
                queryKey: ['projects', projectId, 'tasks'],
              });
              queryClient.invalidateQueries({
                queryKey: ['projects', projectId],
              });
              toast({
                title: 'Task Deleted',
                description: 'A task was deleted',
                variant: 'default',
              });
              break;
          }
        } catch (err) {
          console.error('Error parsing SSE event:', err);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        eventSource.close();
        eventSourceRef.current = null;

        // If the backend keeps rejecting the stream (e.g. 401), stop retrying quickly.
        if (reconnectAttempts.current >= 2) {
          sseDisabledRef.current = true;
          return;
        }

        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current++;
          
          console.log(`SSE reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.error('SSE max reconnect attempts reached');
        }
      };
    } catch (err) {
      console.error('Failed to create EventSource:', err);
    }
  }, [projectId, queryClient]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect]);

  return {
    isConnected: eventSourceRef.current?.readyState === EventSource.OPEN,
  };
}
