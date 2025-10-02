import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CheckCircle2, Clock, MapPin, Package, Truck } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Toast from '@/components/Toast';

type TaskStatus = 'accepted' | 'en_route' | 'arrived' | 'picked_up' | 'delivered' | 'completed' | 'cancelled';

interface StatusHistoryItem {
  status: TaskStatus;
  changed_by: string;
  changed_by_name: string;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  current_status: string;
  status: string;
  created_by: string;
  accepted_by: string | null;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: any; color: string }> = {
  accepted: { label: 'Accepted', icon: CheckCircle2, color: '#10B981' },
  en_route: { label: 'En Route', icon: Truck, color: '#3B82F6' },
  arrived: { label: 'Arrived at Store', icon: MapPin, color: '#8B5CF6' },
  picked_up: { label: 'Picked Up', icon: Package, color: '#F59E0B' },
  delivered: { label: 'Delivered', icon: CheckCircle2, color: '#EC4899' },
  completed: { label: 'Completed', icon: CheckCircle2, color: '#10B981' },
  cancelled: { label: 'Cancelled', icon: CheckCircle2, color: '#EF4444' },
};

const NEXT_STATUS: Record<string, TaskStatus | null> = {
  accepted: 'en_route',
  en_route: 'arrived',
  arrived: 'picked_up',
  picked_up: 'delivered',
  delivered: 'completed',
  completed: null,
  cancelled: null,
};

export default function TaskStatusScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  useEffect(() => {
    loadTaskStatus();

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
          loadTaskStatus();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `id=eq.${taskId}`,
        },
        () => {
          loadTaskStatus();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [taskId]);

  const loadTaskStatus = async () => {
    if (!taskId) return;

    setIsLoading(true);

    try {
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('id, title, current_status, status, created_by, accepted_by')
        .eq('id', taskId)
        .maybeSingle();

      if (taskError) throw taskError;
      if (!taskData) throw new Error('Task not found');

      setTask(taskData);

      const { data: historyData, error: historyError } = await supabase.rpc('get_task_status_timeline', {
        p_task_id: taskId,
      });

      if (historyError) throw historyError;

      setStatusHistory(historyData || []);
    } catch (error: any) {
      setToast({
        visible: true,
        message: error.message || 'Failed to load task status',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: TaskStatus) => {
    if (!task || !user || isUpdating) return;

    setIsUpdating(true);

    try {
      const { data, error } = await supabase.rpc('update_task_status', {
        p_task_id: task.id,
        p_new_status: newStatus,
      });

      if (error) throw error;

      const result = data as any;
      if (result.error) {
        throw new Error(result.error);
      }

      setToast({
        visible: true,
        message: `Status updated to ${STATUS_CONFIG[newStatus].label}`,
        type: 'success',
      });

      loadTaskStatus();
    } catch (error: any) {
      setToast({
        visible: true,
        message: error.message || 'Failed to update status',
        type: 'error',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const isTaskDoer = user && task && task.accepted_by === user.id;
  const isTaskPoster = user && task && task.created_by === user.id;
  const canCancel = isTaskPoster && task?.current_status !== 'completed' && task?.current_status !== 'cancelled';

  const currentStatus = (task?.current_status || 'accepted') as TaskStatus;
  const nextStatus = NEXT_STATUS[currentStatus];
  const canUpdateStatus = isTaskDoer && nextStatus && task?.current_status !== 'completed' && task?.current_status !== 'cancelled';

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color={Colors.white} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Task Status</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color={Colors.white} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Task Status</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Task not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const StatusIcon = STATUS_CONFIG[currentStatus]?.icon || Clock;

  return (
    <>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color={Colors.white} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Task Status</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.taskTitle}>{task.title}</Text>

            <View style={styles.currentStatusContainer}>
              <Text style={styles.sectionTitle}>Current Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[currentStatus]?.color + '20' }]}>
                <StatusIcon size={20} color={STATUS_CONFIG[currentStatus]?.color} strokeWidth={2} />
                <Text style={[styles.statusText, { color: STATUS_CONFIG[currentStatus]?.color }]}>
                  {STATUS_CONFIG[currentStatus]?.label || currentStatus}
                </Text>
              </View>
            </View>

            {canUpdateStatus && nextStatus && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: STATUS_CONFIG[nextStatus].color }]}
                onPress={() => handleUpdateStatus(nextStatus)}
                disabled={isUpdating}
              >
                <Text style={styles.actionButtonText}>
                  {isUpdating ? 'Updating...' : `Mark as ${STATUS_CONFIG[nextStatus].label}`}
                </Text>
              </TouchableOpacity>
            )}

            {canCancel && (
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => handleUpdateStatus('cancelled')}
                disabled={isUpdating}
              >
                <Text style={styles.actionButtonText}>{isUpdating ? 'Cancelling...' : 'Cancel Task'}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Timeline</Text>

            {statusHistory.length === 0 ? (
              <Text style={styles.emptyText}>No status updates yet</Text>
            ) : (
              <View style={styles.timeline}>
                {statusHistory.map((item, index) => {
                  const ItemIcon = STATUS_CONFIG[item.status]?.icon || Clock;
                  const isLast = index === statusHistory.length - 1;

                  return (
                    <View key={`${item.status}-${item.created_at}`} style={styles.timelineItem}>
                      <View style={styles.timelineLeft}>
                        <View
                          style={[
                            styles.timelineIconContainer,
                            { backgroundColor: STATUS_CONFIG[item.status]?.color + '20' },
                          ]}
                        >
                          <ItemIcon size={16} color={STATUS_CONFIG[item.status]?.color} strokeWidth={2} />
                        </View>
                        {!isLast && <View style={styles.timelineLine} />}
                      </View>

                      <View style={styles.timelineRight}>
                        <Text style={styles.timelineStatus}>{STATUS_CONFIG[item.status]?.label || item.status}</Text>
                        <Text style={styles.timelineUser}>by {item.changed_by_name || 'User'}</Text>
                        <Text style={styles.timelineTime}>{formatTimestamp(item.created_at)}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.screen,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white + '33',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    color: Colors.semantic.errorAlert,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.semantic.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.semantic.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    marginBottom: 20,
  },
  currentStatusContainer: {
    gap: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.headingText,
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cancelButton: {
    backgroundColor: Colors.semantic.errorAlert,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  timeline: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 16,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 32,
  },
  timelineIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.semantic.cardBorder,
    marginTop: 4,
    minHeight: 40,
  },
  timelineRight: {
    flex: 1,
    paddingBottom: 24,
  },
  timelineStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.headingText,
    marginBottom: 4,
  },
  timelineUser: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    marginBottom: 2,
  },
  timelineTime: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    fontStyle: 'italic',
    paddingVertical: 16,
  },
});
