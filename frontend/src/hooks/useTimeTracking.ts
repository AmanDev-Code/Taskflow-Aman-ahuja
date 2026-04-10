import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface TimerStatus {
  isRunning: boolean;
  startedAt: string | null;
  elapsedMinutes: number;
  totalTimeSpent: number;
}

type TimerEntityType = 'task' | 'subtask';

export function useTimeTracking(entityId: string, entityType: TimerEntityType = 'task') {
  const queryClient = useQueryClient();
  const [localElapsed, setLocalElapsed] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const timerScope = entityType === 'subtask' ? 'subtasks' : 'tasks';

  const { data: timerStatus, isLoading } = useQuery({
    queryKey: ['timer-status', timerScope, entityId],
    queryFn: () =>
      entityType === 'subtask'
        ? api.getSubtaskTimerStatus(entityId)
        : api.getTimerStatus(entityId),
    refetchInterval: 30000,
    enabled: !!entityId,
  });

  useEffect(() => {
    if (timerStatus?.isRunning && timerStatus.startedAt) {
      const startTime = new Date(timerStatus.startedAt).getTime();
      
      const updateElapsed = () => {
        const now = Date.now();
        const elapsedMs = now - startTime;
        setLocalElapsed(Math.floor(elapsedMs / 1000));
      };

      updateElapsed();
      intervalRef.current = window.setInterval(updateElapsed, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      setLocalElapsed(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [timerStatus?.isRunning, timerStatus?.startedAt]);

  const startTimerMutation = useMutation({
    mutationFn: () =>
      entityType === 'subtask'
        ? api.startSubtaskTimer(entityId)
        : api.startTimer(entityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timer-status', timerScope, entityId] });
      queryClient.invalidateQueries({
        queryKey: ['activities', entityType, entityId],
      });
    },
  });

  const stopTimerMutation = useMutation({
    mutationFn: () =>
      entityType === 'subtask'
        ? api.stopSubtaskTimer(entityId)
        : api.stopTimer(entityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timer-status', timerScope, entityId] });
      queryClient.invalidateQueries({ queryKey: [timerScope, entityId] });
      queryClient.invalidateQueries({
        queryKey: ['activities', entityType, entityId],
      });
    },
  });

  const addTimeMutation = useMutation({
    mutationFn: (minutes: number) =>
      entityType === 'subtask'
        ? api.addSubtaskManualTime(entityId, minutes)
        : api.addManualTime(entityId, minutes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timer-status', timerScope, entityId] });
      queryClient.invalidateQueries({ queryKey: [timerScope, entityId] });
      queryClient.invalidateQueries({
        queryKey: ['activities', entityType, entityId],
      });
    },
  });

  const startTimer = useCallback(() => {
    startTimerMutation.mutate();
  }, [startTimerMutation]);

  const stopTimer = useCallback(() => {
    stopTimerMutation.mutate();
  }, [stopTimerMutation]);

  const addManualTime = useCallback((minutes: number) => {
    addTimeMutation.mutate(minutes);
  }, [addTimeMutation]);

  const formatElapsedTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  }, []);

  return {
    isRunning: timerStatus?.isRunning ?? false,
    startedAt: timerStatus?.startedAt ?? null,
    elapsedSeconds: localElapsed,
    elapsedFormatted: formatElapsedTime(localElapsed),
    totalTimeSpent: timerStatus?.totalTimeSpent ?? 0,
    isLoading,
    isStarting: startTimerMutation.isPending,
    isStopping: stopTimerMutation.isPending,
    isAddingTime: addTimeMutation.isPending,
    startTimer,
    stopTimer,
    addManualTime,
  };
}
