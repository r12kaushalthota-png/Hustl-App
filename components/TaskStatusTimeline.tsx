import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { Check, Circle, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/theme/colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface TimelineItem {
  status: string;
  changed_by: string;
  changed_by_name: string;
  created_at: string;
}

interface TaskStatusTimelineProps {
  taskId: string;
  taskStatus: string;
  createdBy: string;
  acceptedBy: string | null;
  isTaskPoster: boolean;
}

const STATUS_CONFIG = {
  accepted: { label: 'Accepted', icon: Check },
  started: { label: 'Started', icon: Circle },
  on_the_way: { label: 'On the Way', icon: Circle },
  delivered: { label: 'Delivered', icon: Circle },
  completed: { label: 'Completed', icon: Check },
  cancelled: { label: 'Cancelled', icon: X },
};

export default function TaskStatusTimeline({
  taskId,
  taskStatus,
  createdBy,
  acceptedBy,
  isTaskPoster,
}: TaskStatusTimelineProps) {
  const { user } = useAuth();
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');

  const isDoer = user?.id === acceptedBy;
  const canUpdateStatus = isDoer && taskStatus !== 'completed' && taskStatus !== 'cancelled';
  const canCancel = isTaskPoster && taskStatus !== 'completed' && taskStatus !== 'cancelled';

  useEffect(() => {
    loadTimeline();

    // Subscribe to timeline updates
    const channel = supabase
      .channel(`task_status_${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_status_history',
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          loadTimeline();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [taskId]);

  const loadTimeline = async () => {
    try {
      const { data, error } = await supabase.rpc('get_task_status_timeline', {
        p_task_id: taskId,
      });

      if (error) throw error;
      setTimeline(data || []);
    } catch (err: any) {
      console.error('Failed to load timeline:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!canUpdateStatus && newStatus !== 'cancelled') return;

    const triggerHaptics = () => {
      if (Platform.OS !== 'web') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (error) {}
      }
    };

    setIsUpdating(true);
    setError('');

    try {
      const { data, error } = await supabase.rpc('update_task_status', {
        p_task_id: taskId,
        p_new_status: newStatus,
      });

      if (error) throw error;
      if (data && data.error) throw new Error(data.error);

      triggerHaptics();
      await loadTimeline();
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getNextStatus = () => {
    const statusFlow = ['accepted', 'started', 'on_the_way', 'delivered'];
    const currentIndex = statusFlow.indexOf(taskStatus);
    if (currentIndex >= 0 && currentIndex < statusFlow.length - 1) {
      return statusFlow[currentIndex + 1];
    }
    if (taskStatus === 'delivered' && isTaskPoster) {
      return 'completed';
    }
    return null;
  };

  const nextStatus = getNextStatus();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Task Timeline</Text>

      {/* Timeline */}
      <ScrollView
        style={styles.timelineContainer}
        showsVerticalScrollIndicator={false}
      >
        {timeline.map((item, index) => {
          const StatusIcon = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG]?.icon || Circle;
          const isLast = index === timeline.length - 1;
          const isCancelled = item.status === 'cancelled';

          return (
            <View key={index} style={styles.timelineItem}>
              <View style={styles.iconColumn}>
                <View
                  style={[
                    styles.iconContainer,
                    isCancelled ? styles.iconContainerCancelled : styles.iconContainerCompleted,
                  ]}
                >
                  <StatusIcon
                    size={16}
                    color={Colors.white}
                    strokeWidth={2}
                  />
                </View>
                {!isLast && <View style={styles.connector} />}
              </View>

              <View style={styles.itemContent}>
                <Text style={styles.statusLabel}>
                  {STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG]?.label || item.status}
                </Text>
                <Text style={styles.statusTime}>{formatTime(item.created_at)}</Text>
                <Text style={styles.statusBy}>by {item.changed_by_name}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Action Buttons */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {canUpdateStatus && nextStatus && (
        <TouchableOpacity
          style={[styles.actionButton, isUpdating && styles.actionButtonDisabled]}
          onPress={() => handleUpdateStatus(nextStatus)}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.actionButtonText}>
              Mark as {STATUS_CONFIG[nextStatus as keyof typeof STATUS_CONFIG]?.label}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {canCancel && (
        <TouchableOpacity
          style={[styles.cancelButton, isUpdating && styles.actionButtonDisabled]}
          onPress={() => handleUpdateStatus('cancelled')}
          disabled={isUpdating}
        >
          <Text style={styles.cancelButtonText}>Cancel Task</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    marginBottom: 16,
  },
  timelineContainer: {
    maxHeight: 300,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  iconColumn: {
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerCompleted: {
    backgroundColor: Colors.primary,
  },
  iconContainerCancelled: {
    backgroundColor: '#EF4444',
  },
  connector: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.semantic.border,
    marginTop: 4,
  },
  itemContent: {
    flex: 1,
    paddingTop: 4,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.headingText,
    marginBottom: 2,
  },
  statusTime: {
    fontSize: 13,
    color: Colors.semantic.tabInactive,
    marginBottom: 2,
  },
  statusBy: {
    fontSize: 12,
    color: Colors.semantic.bodyText,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  cancelButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});
