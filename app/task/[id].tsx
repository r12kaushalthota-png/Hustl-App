import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, MapPin, Store, User, Camera, Check, ChevronDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { ReviewRepo } from '@/lib/reviewRepo';
import { TaskReview } from '@/types/database';
import ReviewSheet from '@/components/ReviewSheet';
import StarRating from '@/components/StarRating';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { TaskRepo } from '@/lib/taskRepo';
import { GamificationRepo } from '@/lib/gamificationRepo';
import { Task, TaskCurrentStatus, TaskStatusHistory } from '@/types/database';
import Toast from '@/components/Toast';
import LevelUpModal from '@/components/LevelUpModal';

const STATUS_FLOW: { value: TaskCurrentStatus; label: string; description: string }[] = [
  { value: 'accepted', label: 'Accepted', description: 'Task has been accepted' },
  { value: 'picked_up', label: 'Picked Up', description: 'Items have been collected' },
  { value: 'on_the_way', label: 'On the Way', description: 'Heading to delivery location' },
  { value: 'delivered', label: 'Delivered', description: 'Items have been delivered' },
  { value: 'completed', label: 'Completed', description: 'Task is complete' },
];

export default function TaskDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { user, isGuest } = useAuth();
  
  const taskId = params.id as string;
  
  // State
  const [task, setTask] = useState<Task | null>(null);
  const [statusHistory, setStatusHistory] = useState<TaskStatusHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [taskReview, setTaskReview] = useState<TaskReview | null>(null);
  const [showReviewSheet, setShowReviewSheet] = useState(false);
  const [canReview, setCanReview] = useState(false);
  
  // Toast state
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  });

  // Level up state
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{ oldLevel: number; newLevel: number; creditsAwarded: number } | null>(null);

  useEffect(() => {
    loadTaskDetails();
    checkReviewEligibility();
  }, [taskId]);

  const loadTaskDetails = async () => {
    if (!taskId) return;
    
    setIsLoading(true);
    
    try {
      // Load task details
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
      
      // Load status history
      const { data: historyData, error: historyError } = await TaskRepo.getTaskStatusHistory(taskId);
      
      if (historyData) {
        setStatusHistory(historyData);
      }
      
      if (historyError) {
        console.warn('Failed to load status history:', historyError);
      }
      
      // Load existing review if any
      if (taskData.status === 'completed') {
        const { data: reviewData } = await ReviewRepo.getTaskReview(taskId);
        if (reviewData) {
          setTaskReview(reviewData);
        }
      }
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

  const checkReviewEligibility = async () => {
    if (!taskId || !user) return;
    
    try {
      const { canReview: eligible } = await ReviewRepo.canReviewTask(taskId);
      setCanReview(eligible);
    } catch (error) {
      console.warn('Failed to check review eligibility:', error);
    }
  };

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handleStatusUpdate = async (newStatus: TaskCurrentStatus, note?: string, photoUrl?: string) => {
    if (!task || !user || isUpdatingStatus) return;
    
    triggerHaptics();
    setIsUpdatingStatus(true);
    
    try {
      const { data, error } = await TaskRepo.updateTaskStatus({
        taskId: task.id,
        newStatus,
        note: note || '',
        photoUrl: photoUrl || ''
      });
      
      if (error) {
        setToast({
          visible: true,
          message: error,
          type: 'error'
        });
        return;
      }
      
      // Update local task state optimistically
      setTask(prev => prev ? {
        ...prev,
        task_current_status: newStatus,
        last_status_update: new Date().toISOString(),
        status: newStatus === 'completed' ? 'completed' : prev.status
      } : null);
      
      // Add to status history
      const newHistoryItem: TaskStatusHistory = {
        id: Date.now().toString(), // Temporary ID
        task_id: task.id,
        status: newStatus,
        changed_by: {
          id: user.id,
          full_name: user.displayName,
          username: null
        },
        note: note || '',
        photo_url: photoUrl || '',
        created_at: new Date().toISOString()
      };
      
      setStatusHistory(prev => [...prev, newHistoryItem]);
      
      setToast({
        visible: true,
        message: `Status updated to ${TaskRepo.formatCurrentStatus(newStatus)}`,
        type: 'success'
      });
      
      // Close forms
      setShowStatusDropdown(false);
      setShowDeliveryForm(false);
      setDeliveryNote('');
      setDeliveryPhoto(null);
      
      // Reload to get fresh data
      setTimeout(() => {
        loadTaskDetails();
        checkReviewEligibility();
        
        // Check for level up and reload user profile
        if (user && (newStatus === 'completed' || task.current_status === 'delivered')) {
          checkForLevelUp();
        }
      }, 1000);
      
    } catch (error) {
      setToast({
        visible: true,
        message: 'Failed to update status. Please try again.',
        type: 'error'
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const checkForLevelUp = async () => {
    if (!user) return;
    
    try {
      // Reload user profile to get updated XP and level
      const { data: updatedProfile } = await ProfileRepo.getProfile(user.id);
      
      if (updatedProfile && user.profile) {
        const oldLevel = user.profile.level;
        const newLevel = updatedProfile.level;
        
        if (newLevel > oldLevel) {
          const creditsAwarded = (newLevel - oldLevel) * 500;
          setLevelUpData({ oldLevel, newLevel, creditsAwarded });
          setShowLevelUpModal(true);
          
          // Update auth context with new profile data
          // This would need to be implemented in AuthContext
        }
      }
    } catch (error) {
      console.warn('Failed to check for level up:', error);
    }
  };

  const handleQuickStatusUpdate = (newStatus: TaskCurrentStatus) => {
    if (newStatus === 'delivered') {
      setShowDeliveryForm(true);
      setShowStatusDropdown(false);
    } else {
      handleStatusUpdate(newStatus, '', '');
    }
  };

  const handleDeliverySubmit = () => {
    handleStatusUpdate('delivered', deliveryNote, deliveryPhoto || '');
  };

  const handleReviewSubmitted = () => {
    setToast({
      visible: true,
      message: 'Review submitted successfully!',
      type: 'success'
    });
    
    // Reload task details to get the new review
    loadTaskDetails();
    checkReviewEligibility();
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setDeliveryPhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleBack = () => {
    router.back();
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
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
  const nextStatus = task.task_current_status ? TaskRepo.getNextStatus(task.task_current_status) : null;
  const showStatusUpdate = canUpdateStatus && nextStatus;
  const isTaskPoster = user && task.created_by === user.id;
  const showReviewButton = canReview && isTaskPoster && task.status === 'completed' && !taskReview;

  return (
    <>
      <SafeAreaView style={styles.container}>
        {/* Header */}
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
          {/* Task Info */}
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
            
            {/* Current Status */}
            {task.task_current_status && (
              <View style={styles.currentStatusContainer}>
                <Text style={styles.sectionTitle}>Current Status</Text>
                <View style={[
                  styles.currentStatusBadge,
                  { backgroundColor: TaskRepo.getCurrentStatusColor(task.task_current_status) + '20' }
                ]}>
                  <View style={[
                    styles.currentStatusDot,
                    { backgroundColor: TaskRepo.getCurrentStatusColor(task.task_current_status) }
                  ]} />
                  <Text style={[
                    styles.currentStatusText,
                    { color: TaskRepo.getCurrentStatusColor(task.task_current_status) }
                  ]}>
                    {TaskRepo.formatCurrentStatus(task.task_current_status)}
                  </Text>
                </View>
                {task.last_status_update && (
                  <Text style={styles.lastUpdatedDetail}>
                    Last updated {formatTimestamp(task.last_status_update)}
                  </Text>
                )}
              </View>
            )}
            
            {/* Status Update Controls */}
            {showStatusUpdate && (
              <View style={styles.statusUpdateSection}>
                <Text style={styles.sectionTitle}>Update Status</Text>
                
                <TouchableOpacity
                  style={[
                    styles.statusUpdateButton,
                    isUpdatingStatus && styles.statusUpdateButtonDisabled
                  ]}
                  onPress={() => setShowStatusDropdown(!showStatusDropdown)}
                  disabled={isUpdatingStatus}
                >
                  <Text style={styles.statusUpdateButtonText}>
                    {isUpdatingStatus ? 'Updating...' : `Mark as ${TaskRepo.formatCurrentStatus(nextStatus!)}`}
                  </Text>
                  {!isUpdatingStatus && (
                    <ChevronDown size={16} color={Colors.white} strokeWidth={2} />
                  )}
                  {isUpdatingStatus && (
                    <ActivityIndicator size="small" color={Colors.white} />
                  )}
                </TouchableOpacity>
                
                {showStatusDropdown && !isUpdatingStatus && (
                  <View style={styles.statusDropdown}>
                    {STATUS_FLOW
                      .filter(status => {
                        const currentIndex = STATUS_FLOW.findIndex(s => s.value === task.task_current_status);
                        const statusIndex = STATUS_FLOW.findIndex(s => s.value === status.value);
                        return statusIndex === currentIndex + 1; // Only show next status
                      })
                      .map((status) => (
                        <TouchableOpacity
                          key={status.value}
                          style={styles.statusOption}
                          onPress={() => handleQuickStatusUpdate(status.value)}
                        >
                          <View style={[
                            styles.statusOptionDot,
                            { backgroundColor: TaskRepo.getCurrentStatusColor(status.value) }
                          ]} />
                          <View style={styles.statusOptionText}>
                            <Text style={styles.statusOptionLabel}>{status.label}</Text>
                            <Text style={styles.statusOptionDescription}>{status.description}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                  </View>
                )}
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
                  <View style={{ flex: 1 }}>
                    <Text style={styles.instructionsText}>{task.dropoff_instructions}</Text>
                  </View>
                </View>
              )}
              
              <View style={styles.detailRow}>
                <Clock size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
                <Text style={styles.detailText}>
                  {TaskRepo.formatEstimatedTime(task.estimated_minutes)}
                </Text>
              </View>
            </View>
          </View>
          
          {/* Review Section */}
          {task.status === 'completed' && (
            <View style={styles.reviewCard}>
              <Text style={styles.sectionTitle}>Review</Text>
              
              {taskReview ? (
                <View style={styles.reviewDisplay}>
                  <View style={styles.reviewHeader}>
                    <StarRating rating={taskReview.stars} size={18} />
                    <Text style={styles.reviewDate}>
                      {new Date(taskReview.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  
                  {taskReview.tags && taskReview.tags.length > 0 && (
                    <View style={styles.reviewTags}>
                      {taskReview.tags.map((tag, index) => (
                        <View key={index} style={styles.reviewTag}>
                          <Text style={styles.reviewTagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  
                  {taskReview.comment && (
                    <Text style={styles.reviewComment}>"{taskReview.comment}"</Text>
                  )}
                  
                  {taskReview.edited_at && (
                    <Text style={styles.reviewEdited}>
                      Edited {new Date(taskReview.edited_at).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              ) : showReviewButton ? (
                <TouchableOpacity
                  style={styles.reviewButton}
                  onPress={() => setShowReviewSheet(true)}
                >
                  <Text style={styles.reviewButtonText}>Leave a Review</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.noReviewText}>
                  {isTaskPoster ? 'Review period has ended' : 'No review yet'}
                </Text>
              )}
            </View>
          )}
          
          {/* Status History */}
          {statusHistory.length > 0 && (
            <View style={styles.historyCard}>
              <Text style={styles.sectionTitle}>Status History</Text>
              <View style={styles.historyList}>
                {statusHistory.map((item, index) => (
                  <View key={item.id} style={styles.historyItem}>
                    <View style={[
                      styles.historyDot,
                      { backgroundColor: TaskRepo.getCurrentStatusColor(item.status) }
                    ]} />
                    <View style={styles.historyContent}>
                      <View style={styles.historyHeader}>
                        <Text style={styles.historyStatus}>
                          {TaskRepo.formatCurrentStatus(item.status)}
                        </Text>
                        <Text style={styles.historyTime}>
                          {formatTimestamp(item.created_at)}
                        </Text>
                      </View>
                      <Text style={styles.historyUser}>
                        by {item.changed_by.full_name || item.changed_by.username || 'User'}
                      </Text>
                      {item.note && (
                        <Text style={styles.historyNote}>{item.note}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Delivery Form Modal */}
      {showDeliveryForm && (
        <View style={styles.modalOverlay}>
          <View style={[styles.deliveryModal, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mark as Delivered</Text>
              <TouchableOpacity onPress={() => setShowDeliveryForm(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Delivery Note (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={deliveryNote}
                  onChangeText={setDeliveryNote}
                  placeholder="Add any delivery notes..."
                  placeholderTextColor={Colors.semantic.tabInactive}
                  multiline
                  numberOfLines={3}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Photo Proof (Optional)</Text>
                <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
                  <Camera size={20} color={Colors.primary} strokeWidth={2} />
                  <Text style={styles.photoButtonText}>
                    {deliveryPhoto ? 'Photo Added' : 'Take Photo'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                style={[
                  styles.deliverySubmitButton,
                  isUpdatingStatus && styles.deliverySubmitButtonDisabled
                ]}
                onPress={handleDeliverySubmit}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <Check size={16} color={Colors.white} strokeWidth={2} />
                    <Text style={styles.deliverySubmitText}>Mark as Delivered</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Review Sheet */}
      <ReviewSheet
        visible={showReviewSheet}
        onClose={() => setShowReviewSheet(false)}
        task={task}
        onReviewSubmitted={handleReviewSubmitted}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />

      {/* Level Up Modal */}
      {levelUpData && (
        <LevelUpModal
          visible={showLevelUpModal}
          onClose={() => {
            setShowLevelUpModal(false);
            setLevelUpData(null);
          }}
          oldLevel={levelUpData.oldLevel}
          newLevel={levelUpData.newLevel}
          creditsAwarded={levelUpData.creditsAwarded}
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
  currentStatusContainer: {
    marginBottom: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.headingText,
  },
  currentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  currentStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  currentStatusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  lastUpdatedDetail: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    fontStyle: 'italic',
  },
  statusUpdateSection: {
    marginBottom: 24,
    gap: 12,
  },
  statusUpdateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  statusUpdateButtonDisabled: {
    backgroundColor: Colors.semantic.tabInactive,
  },
  statusUpdateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  statusDropdown: {
    backgroundColor: Colors.semantic.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.semantic.cardBorder,
    overflow: 'hidden',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.divider,
    gap: 12,
  },
  statusOptionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusOptionText: {
    flex: 1,
  },
  statusOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    marginBottom: 2,
  },
  statusOptionDescription: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
  },
  taskDetails: {
    gap: 16,
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
  historyCard: {
    backgroundColor: Colors.semantic.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.semantic.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  historyList: {
    marginTop: 16,
    gap: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  historyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  historyContent: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
  },
  historyTime: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
  },
  historyUser: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    marginBottom: 4,
  },
  historyNote: {
    fontSize: 14,
    color: Colors.semantic.bodyText,
    fontStyle: 'italic',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  deliveryModal: {
    backgroundColor: Colors.semantic.screen,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.headingText,
  },
  modalCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.tabInactive,
  },
  modalContent: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.semantic.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.semantic.inputText,
    backgroundColor: Colors.semantic.inputBackground,
    textAlignVertical: 'top',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  photoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  deliverySubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.semantic.successAlert,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  deliverySubmitButtonDisabled: {
    backgroundColor: Colors.semantic.tabInactive,
  },
  deliverySubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  reviewCard: {
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
  reviewDisplay: {
    gap: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewDate: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
  },
  reviewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  reviewTag: {
    backgroundColor: Colors.muted,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reviewTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.semantic.bodyText,
  },
  reviewComment: {
    fontSize: 14,
    color: Colors.semantic.bodyText,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  reviewEdited: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
    fontStyle: 'italic',
  },
  reviewButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  reviewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  noReviewText: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});