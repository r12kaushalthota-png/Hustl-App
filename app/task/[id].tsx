import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, MapPin, Store, User, MessageCircle, Baseline as Timeline, Star } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { TaskRepo } from '@/lib/taskRepo';
import { Task } from '@/types/database';
import Toast from '@/components/Toast';
import { StripeConnect } from '@/lib/stripeConnect';
import { ChatService } from '@/lib/chat';
import TaskStatusTimeline from '@/components/TaskStatusTimeline';
import ReviewModal from '@/components/ReviewModal';
import { supabase } from '@/lib/supabase';

export default function TaskDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { user, isGuest } = useAuth();
  
  const taskId = params.id as string;
  
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [canLeaveReview, setCanLeaveReview] = useState(false);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  });

  useEffect(() => {
    loadTaskDetails();
  }, [taskId]);

  useEffect(() => {
    checkCanLeaveReview();
  }, [task, user]);

  const loadTaskDetails = async () => {
    if (!taskId) return;
    
    setIsLoading(true);
    
    try {
      const { data: taskData, error: taskError } = await TaskRepo.getTaskByIdSafe(taskId);
      
      if (taskError) {
        setToast({
          visible: true,
          message: taskError,
          type: 'error'
        });
        return;
      }
      
      if (!taskData) {
        setToast({
          visible: true,
          message: 'Task not found',
          type: 'error'
        });
        return;
      }
      
      setTask(taskData);
    } catch (error) {
      setToast({
        visible: true,
        message: 'Failed to load task details',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: 'completed' | 'cancelled') => {
    if (!task || !user || isUpdating) return;
    
    setIsUpdating(true);
    
    try {


      const payout= await StripeConnect.postCompleteTransfer(task.id);
      console.log('postCompleteTransfer response:', payout);
      const { success, error, task:data } = payout;

      console.log('data task', data);
      // const { data, error } = await TaskRepo.updateTaskStatus(task.id, newStatus, user.id);
      
      if (error) {
        setToast({
          visible: true,
          message: error,
          type: 'error'
        });
        return;
      }
      if (!success) return;
      setTask(data);
      setToast({
        visible: true,
        message: `Task marked as ${newStatus}`,
        type: 'success'
      });
      
    } catch (error) {
      setToast({
        visible: true,
        message: 'Failed to update status. Please try again.',
        type: 'error'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  const handleMessageUser = async () => {
    if (!task || !user) return;

    const { data: chatRoom, error: chatError } = await ChatService.ensureRoomForTask(task.id);

    if (chatError) {
      setToast({
        visible: true,
        message: chatError,
        type: 'error'
      });
      return;
    }

    if (chatRoom) {
      router.push(`/chat/${chatRoom.id}`);
    }
  };

  const handleViewStatus = () => {
    if (!task) return;
    router.push(`/task/${task.id}/status`);
  };

  const checkCanLeaveReview = async () => {
    if (!task || !user) {
      setCanLeaveReview(false);
      return;
    }

    // Only check if task is completed and user is involved
    if (task.status === 'completed' && (task.created_by === user.id || task.accepted_by === user.id)) {
      try {
        const { data: canReview } = await supabase.rpc('can_leave_review', {
          p_task_id: task.id
        });
        setCanLeaveReview(canReview || false);
      } catch (err) {
        setCanLeaveReview(false);
      }
    } else {
      setCanLeaveReview(false);
    }
  };

  const handleLeaveReview = () => {
    setShowReviewModal(true);
  };

  const handleReviewSubmit = () => {
    setShowReviewModal(false);
    setCanLeaveReview(false);
    setToast({
      visible: true,
      message: 'Review submitted successfully!',
      type: 'success'
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color={Colors.white} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Task Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading task details...</Text>
        </View>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color={Colors.white} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Task Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Task not found</Text>
        </View>
      </View>
    );
  }

  const canUpdateStatus = user && task.accepted_by === user.id && task.status === 'accepted';
  const isTaskPoster = user && task.created_by === user.id;
  const isTaskAccepted = task.status === 'accepted' && task.accepted_by;
  const canMessage = user && isTaskAccepted && (isTaskPoster || task.accepted_by === user.id);
  const isTaskCompleted = task.status === 'completed' || task.current_status === 'completed';
  const isTaskInvolved = user && (task.created_by === user.id || task.accepted_by === user.id);

  return (
    <>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color={Colors.white} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Task Details</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        >
          <View style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={styles.taskReward}>
                {TaskRepo.formatReward(task.reward_cents)}
              </Text>
            </View>
            
            {task.description && (
              <Text style={styles.taskDescription}>{task.description}</Text>
            )}
            
            {/* Status */}
            <View style={styles.statusContainer}>
              <Text style={styles.sectionTitle}>Status</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: TaskRepo.getStatusColor(task.status) + '20' }
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: TaskRepo.getStatusColor(task.status) }
                ]}>
                  {TaskRepo.formatStatus(task.status)}
                </Text>
              </View>
            </View>

            {/* Accept Code (if accepted) */}
            {task.user_accept_code && (
              <View style={styles.acceptCodeContainer}>
                <Text style={styles.sectionTitle}>Accept Code</Text>
                <View style={styles.acceptCodeBadge}>
                  <Text style={styles.acceptCodeText}>{task.user_accept_code}</Text>
                </View>
              </View>
            )}
            
            {/* Task Details */}
            <View style={styles.taskDetails}>
              <View style={styles.detailRow}>
                <Store size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
                <Text style={styles.detailText}>{task.store}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <MapPin size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
                <Text style={styles.detailText}>{task.dropoff_address}</Text>
              </View>
              
              {task.dropoff_instructions && (
                <View style={styles.detailRow}>
                  <Text style={styles.instructionsLabel}>Instructions:</Text>
                  <Text style={styles.instructionsText}>{task.dropoff_instructions}</Text>
                </View>
              )}
              
              <View style={styles.detailRow}>
                <Clock size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
                <Text style={styles.detailText}>
                  {TaskRepo.formatEstimatedTime(task.estimated_minutes)}
                </Text>
              </View>
            </View>

            {/* Message and Status Buttons */}
            {canMessage && (
              <View style={styles.messageStatusButtons}>
                <TouchableOpacity
                  style={[styles.messageButton]}
                  onPress={handleMessageUser}
                >
                  <MessageCircle size={20} color={Colors.white} strokeWidth={2} />
                  <Text style={styles.messageButtonText}>
                    {isTaskPoster ? 'Message the helper' : 'Message the poster'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusButton]}
                  onPress={handleViewStatus}
                >
                  <Timeline size={20} color={Colors.primary} strokeWidth={2} />
                  <Text style={styles.statusButtonText}>View Status</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Timeline Button for Completed Tasks */}
            {isTaskCompleted && isTaskInvolved && !canMessage && (
              <TouchableOpacity
                style={[styles.actionButton, styles.timelineButton]}
                onPress={handleViewStatus}
              >
                <Timeline size={20} color={Colors.white} strokeWidth={2} />
                <Text style={styles.actionButtonText}>View Timeline</Text>
              </TouchableOpacity>
            )}

            {/* Action Buttons */}
            {isTaskPoster && task.status === 'accepted' && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.completeButton]}
                  onPress={() => handleStatusUpdate('completed')}
                  disabled={isUpdating}
                >
                  <Text style={styles.actionButtonText}>
                    {isUpdating ? 'Updating...' : 'Mark Complete'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => handleStatusUpdate('cancelled')}
                  disabled={isUpdating}
                >
                  <Text style={styles.actionButtonText}>
                    {isUpdating ? 'Updating...' : 'Cancel Task'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Task Status Timeline */}
          {isTaskInvolved && task.accepted_by && (
            <TaskStatusTimeline
              taskId={task.id}
              taskStatus={task.current_status || task.status}
              createdBy={task.created_by}
              acceptedBy={task.accepted_by}
              isTaskPoster={!!isTaskPoster}
            />
          )}

          {/* Leave Review Button */}
          {canLeaveReview && (
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={handleLeaveReview}
            >
              <Star size={20} color={Colors.white} strokeWidth={2} fill={Colors.white} />
              <Text style={styles.reviewButtonText}>Leave a Review</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Review Modal */}
      {task && user && showReviewModal && (
        <ReviewModal
          visible={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          onSubmit={handleReviewSubmit}
          taskId={task.id}
          taskTitle={task.title}
          raterId={user.id}
          rateeId={task.created_by === user.id ? task.accepted_by! : task.created_by}
          rateeName={task.created_by === user.id ? 'Helper' : 'Poster'}
        />
      )}

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
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
  taskCard: {
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
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  taskTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    marginRight: 16,
  },
  taskReward: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.secondary,
  },
  taskDescription: {
    fontSize: 16,
    color: Colors.semantic.bodyText,
    lineHeight: 24,
    marginBottom: 20,
  },
  statusContainer: {
    marginBottom: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.headingText,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  acceptCodeContainer: {
    marginBottom: 24,
    gap: 12,
  },
  acceptCodeBadge: {
    backgroundColor: Colors.primary + '15',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  acceptCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    fontFamily: 'monospace',
  },
  taskDetails: {
    gap: 16,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailText: {
    flex: 1,
    fontSize: 16,
    color: Colors.semantic.bodyText,
  },
  instructionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    minWidth: 80,
  },
  instructionsText: {
    flex: 1,
    fontSize: 14,
    color: Colors.semantic.bodyText,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButton: {
    backgroundColor: Colors.semantic.successAlert,
  },
  cancelButton: {
    backgroundColor: Colors.semantic.errorAlert,
  },
  timelineButton: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.primary,
    marginBottom: 16,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  messageStatusButtons: {
    gap: 12,
    marginBottom: 16,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  statusButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFA500',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  reviewButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
});