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
import { ArrowLeft, CircleCheck as CheckCircle, Clock, MapPin, MessageCircle, Package, Truck } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ChatService } from '@/lib/chat';
import Toast from '@/components/Toast';
import ReviewModal from '@/components/ReviewModal';
import { ReviewRepo } from '@/lib/reviewRepo';

type TaskStatus = 'accepted' | 'started' | 'on_the_way' | 'delivered' | 'completed' | 'cancelled';

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
  created_by_profile?: {
    full_name: string | null;
  };
  accepted_by_profile?: {
    full_name: string | null;
  };
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: any; color: string }> = {
  accepted: { label: 'Accepted', icon: CheckCircle, color: '#10B981' },
  started: { label: 'Started', icon: Clock, color: '#3B82F6' },
  on_the_way: { label: 'On the Way', icon: Truck, color: '#8B5CF6' },
  delivered: { label: 'Delivered', icon: Package, color: '#F59E0B' },
  completed: { label: 'Completed', icon: CheckCircle, color: '#10B981' },
  cancelled: { label: 'Cancelled', icon: CheckCircle, color: '#EF4444' },
};

const NEXT_STATUS: Record<string, TaskStatus | null> = {
  accepted: 'started',
  started: 'on_the_way',
  on_the_way: 'delivered',
  delivered: null,
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
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [canLeaveReview, setCanLeaveReview] = useState(false);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  useEffect(() => {
    if (!taskId || !user) {
      console.log('Waiting for taskId or user:', { taskId, user: !!user });
      return;
    }

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
  }, [taskId, user]);

  const loadTaskStatus = async () => {
    if (!taskId) return;

    setIsLoading(true);

    try {
      console.log('Loading task with ID:', taskId);

      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('id, title, current_status, status, created_by, accepted_by')
        .eq('id', taskId)
        .maybeSingle();

      console.log('Task query result:', { taskData, taskError });

      if (taskError) {
        console.error('Task query error:', taskError);
        throw taskError;
      }
      if (!taskData) {
        console.error('No task data returned for ID:', taskId);
        throw new Error('Task not found');
      }

      // Fetch profiles separately
      const profileIds = [taskData.created_by, taskData.accepted_by].filter(Boolean);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', profileIds);

      const profileMap = (profiles || []).reduce((acc: any, p: any) => {
        acc[p.id] = p;
        return acc;
      }, {});

      const enrichedTask = {
        ...taskData,
        created_by_profile: taskData.created_by ? profileMap[taskData.created_by] : null,
        accepted_by_profile: taskData.accepted_by ? profileMap[taskData.accepted_by] : null,
      };

      setTask(enrichedTask);

      const { data: historyData, error: historyError } = await supabase.rpc('get_task_status_timeline', {
        p_task_id: taskId,
      });

      if (historyError) throw historyError;

      setStatusHistory(historyData || []);

      if (user && taskData.current_status === 'completed') {
        const reviewCheck = await ReviewRepo.canUserReviewTask(taskId, user.id);
        setCanLeaveReview(reviewCheck.canReview);
      } else {
        setCanLeaveReview(false);
      }
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

      await loadTaskStatus();

      if (newStatus === 'completed' && user) {
        const reviewCheck = await ReviewRepo.canUserReviewTask(task.id, user.id);
        if (reviewCheck.canReview) {
          setTimeout(() => {
            setShowReviewModal(true);
          }, 1000);
        }
      }
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

  const handleReviewSubmit = () => {
    setShowReviewModal(false);
    setToast({
      visible: true,
      message: 'Review submitted successfully!',
      type: 'success',
    });
    setCanLeaveReview(false);
  };

  const handleOpenChat = async () => {
    if (!task) return;

    try {
      const { data: chatRoom, error } = await ChatService.ensureRoomForTask(task.id);

      if (error) {
        setToast({
          visible: true,
          message: error,
          type: 'error',
        });
        return;
      }

      if (chatRoom) {
        router.push(`/chat/${chatRoom.id}`);
      }
    } catch (error: any) {
      setToast({
        visible: true,
        message: 'Failed to open chat',
        type: 'error',
      });
    }
  };

  const getRevieweeInfo = () => {
    if (!task || !user) return null;

    if (task.created_by === user.id && task.accepted_by) {
      return {
        id: task.accepted_by,
        name: task.accepted_by_profile?.full_name || 'Task Doer',
      };
    }

    if (task.accepted_by === user.id && task.created_by) {
      return {
        id: task.created_by,
        name: task.created_by_profile?.full_name || 'Task Poster',
      };
    }

    return null;
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
  const canComplete = isTaskPoster && task?.current_status === 'delivered';

  if (isLoading || !user) {
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
          <Text style={styles.loadingText}>{!user ? 'Loading user...' : 'Loading status...'}</Text>
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
          <Text style={styles.errorSubtext}>This task may have been deleted or you may not have access to it.</Text>
          <TouchableOpacity style={styles.backToHomeButton} onPress={() => router.push('/(tabs)/home')}>
            <Text style={styles.backToHomeText}>Go to Home</Text>
          </TouchableOpacity>
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
          <TouchableOpacity style={styles.messageButton} onPress={handleOpenChat}>
            <MessageCircle size={24} color={Colors.white} strokeWidth={2} />
          </TouchableOpacity>
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

            {canComplete && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: STATUS_CONFIG.completed.color }]}
                onPress={() => handleUpdateStatus('completed')}
                disabled={isUpdating}
              >
                <Text style={styles.actionButtonText}>
                  {isUpdating ? 'Completing...' : 'Mark as Completed'}
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

            {canLeaveReview && (
              <TouchableOpacity
                style={[styles.actionButton, styles.reviewButton]}
                onPress={() => setShowReviewModal(true)}
              >
                <Text style={styles.actionButtonText}>Leave a Review</Text>
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

      {user && task && getRevieweeInfo() && (
        <ReviewModal
          visible={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          onSubmit={handleReviewSubmit}
          taskId={task.id}
          taskTitle={task.title}
          raterId={user.id}
          rateeId={getRevieweeInfo()!.id}
          rateeName={getRevieweeInfo()!.name}
        />
      )}
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
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white + '33',
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: '600',
    color: Colors.semantic.errorAlert,
    textAlign: 'center',
    marginBottom: 12,
  },
  errorSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  backToHomeButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backToHomeText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
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
  reviewButton: {
    backgroundColor: '#FFC107',
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
