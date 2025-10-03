import { useState } from 'react';
import { useRouter } from 'expo-router';
import { acceptTask } from '@/services/tasks';
import { ChatService } from '@/lib/chat';
import type { Task } from '@/services/tasks';

interface UseAcceptTaskOptions {
  onSuccess?: (task: Task) => void;
  onError?: (message: string) => void;
}

export function useAcceptTask(options: UseAcceptTaskOptions = {}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const run = async (taskId: string): Promise<Task | null> => {
    if (pendingId) {
      return null;
    }

    setPendingId(taskId);
    setError(null);

    try {
      const task = await acceptTask(taskId);

      // Ensure chat room exists for the task
      await ChatService.ensureRoomForTask(taskId);

      // Route to task status screen after accepting
      router.push(`/task/${taskId}/status`);

      options.onSuccess?.(task);

      return task;
    } catch (e: any) {
      const errorMessage = e?.message ?? 'Could not accept task. Please try again.';
      setError(errorMessage);

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