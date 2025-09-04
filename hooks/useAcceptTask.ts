import { useState } from 'react';
import { acceptTask } from '@/services/tasks';
import type { Task } from '@/services/tasks';

interface UseAcceptTaskOptions {
  onSuccess?: (task: Task) => void;
  onError?: (message: string) => void;
}

export function useAcceptTask(options: UseAcceptTaskOptions = {}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (taskId: string): Promise<Task | null> => {
    // Prevent double-tap
    if (pendingId) {
      return null;
    }

    setPendingId(taskId);
    setError(null);

    try {
      const task = await acceptTask(taskId);
      
      // Call success callback
      options.onSuccess?.(task);
      
      return task;
    } catch (e: any) {
      const errorMessage = e?.message ?? 'Could not accept task. Please try again.';
      setError(errorMessage);
      
      // Call error callback
      options.onError?.(errorMessage);
      
      throw e;
    } finally {
      setPendingId(null);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    run,
    pendingId,
    isPending: !!pendingId,
    error,
    clearError,
    isAccepting: (taskId: string) => pendingId === taskId,
  };
}