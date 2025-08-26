import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, Platform, Alert, SafeAreaView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, MapPin, Store, MessageCircle, Map as MapIcon, List as ListIcon, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Colors, ColorUtils } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { TaskRepo } from '@/lib/taskRepo';
import { ChatService } from '@/lib/chat';
import { openGoogleMapsNavigation } from '@/lib/navigation';
import { ReviewRepo } from '@/lib/reviewRepo';
import { Task, TaskCurrentStatus } from '@/types/database';
import GlobalHeader from '@/components/GlobalHeader';
import Toast from '@/components/Toast';
import TasksMap, { TaskPin } from '@/components/TasksMap';
import ReviewSheet from '@/components/ReviewSheet';

type TabType = 'available' | 'doing' | 'posts';
type ViewMode = 'map' | 'list';

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [activeTab, setActiveTab] = useState<TabType>('available');
  
  // Task data
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [doingTasks, setDoingTasks] = useState<Task[]>([]);
  const [postedTasks, setPostedTasks] = useState<Task[]>([]);
  
  const [userLocation, setUserLocation] = useState<any>(null);
  const [locationPermission, setLocationPermission] = useState<string | null>(null);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [acceptingTaskId, setAcceptingTaskId] = useState<string | null>(null);
  
  // Error states
  const [error, setError] = useState<string>('');
  
  // Toast state
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  });

  // Review state
  const [showReviewSheet, setShowReviewSheet] = useState(false);
  const [taskToReview, setTaskToReview] = useState<Task | null>(null);

  // Request location permission on mount (only in Dev Client)
  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    // Skip location in Expo Go to prevent crashes
    const Constants = require('expo-constants');
    const isExpoGo = Constants.default.appOwnership === 'expo';
    
    if (isExpoGo) {
      setLocationPermission('unavailable');
      return;
    }

    try {
      const Location = require('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location);
      }
    } catch (error) {
      console.warn('Location permission error:', error);
      setLocationPermission('denied');
    }
  };

  // Load tasks based on active tab
  const loadTasks = useCallback(async (showRefreshIndicator = false) => {
    if (isGuest || !user) return;

    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    setError('');

    try {
      let result;
      
      switch (activeTab) {
        case 'available':
          result = await TaskRepo.listOpenTasks(user.id);
          if (result.data) setAvailableTasks(result.data);
          break;
        case 'doing':
          result = await TaskRepo.listUserDoingTasks(user.id);
          if (result.data) setDoingTasks(result.data);
          break;
        case 'posts':
          result = await TaskRepo.listUserPostedTasks(user.id);
          if (result.data) setPostedTasks(result.data);
          break;
      }

      if (result?.error) {
        if (result.error.includes('not found') || result.error.includes('no longer available')) {
          setToast({
            visible: true,
            message: result.error,
            type: 'error'
          });
        } else {
          setError(result.error);
        }
      }
    } catch (error) {
      setError('Failed to load tasks. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab, user, isGuest]);

  // Load tasks when tab changes or component mounts
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Handle view mode change
  const handleViewModeChange = (mode: ViewMode) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.selectionAsync();
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    setViewMode(mode);
  };

  // Handle tab change
  const handleTabChange = (tab: TabType) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.selectionAsync();
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    setActiveTab(tab);
  };

  // Handle pull to refresh
  const handleRefresh = () => {
    loadTasks(true);
  };

  // Handle task acceptance
  const handleAcceptTask = async (task: Task) => {
    if (isGuest || !user) return;
    if (acceptingTaskId) return;

    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }

    setAcceptingTaskId(task.id);
    setError('');

    try {
      const result = await TaskRepo.acceptTask(task.id, user.id);

      if (result.error) {
        setToast({
          visible: true,
          message: result.error,
          type: 'error'
        });
        return;
      }

      if (result.data) {
        setAvailableTasks(prev => prev.filter(t => t.id !== task.id));
        setDoingTasks(prev => [result.data!, ...prev]);
        
        setToast({
          visible: true,
          message: 'Task accepted! Chat is now available.',
          type: 'success'
        });

        // Open Google Maps navigation if location is available
        if (userLocation && task.dropoff_address) {
          try {
            const storeLocation = { lat: 29.6436, lng: -82.3549 };
            const dropoffLocation = { lat: 29.6436 + (Math.random() - 0.5) * 0.02, lng: -82.3549 + (Math.random() - 0.5) * 0.02 };
            
            await openGoogleMapsNavigation({
              start: { lat: userLocation.coords.latitude, lng: userLocation.coords.longitude },
              dest: dropoffLocation,
              waypoint: storeLocation,
            });
          } catch (error) {
            console.warn('Failed to open navigation:', error);
          }
        }
      }
    } catch (error) {
      setToast({
        visible: true,
        message: 'Failed to accept task. Please try again.',
        type: 'error'
      });
    } finally {
      setAcceptingTaskId(null);
    }
  };

  // Handle chat button press
  const handleChatPress = async (task: Task) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }

    try {
      const { data: room, error } = await ChatService.getRoomForTask(task.id);
      
      if (error || !room) {
        const { data: newRoom, error: createError } = await ChatService.ensureRoomForTask(task.id);
        if (createError || !newRoom) {
          setToast({
            visible: true,
            message: 'Chat not available for this task',
            type: 'error'
          });
          return;
        }
        router.push(`/chat/${newRoom.id}`);
      } else {
        router.push(`/chat/${room.id}`);
      }
    } catch (error) {
      setToast({
        visible: true,
        message: 'Chat not available for this task',
        type: 'error'
      });
    }
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  const handleReviewSubmitted = () => {
    setShowReviewSheet(false);
    setTaskToReview(null);
    setToast({
      visible: true,
      message: 'Review submitted successfully!',
      type: 'success'
    });
  };

  const addNewTaskToPosts = useCallback((newTask: Task) => {
    setPostedTasks(prev => [newTask, ...prev]);
  }, []);

  React.useEffect(() => {
    (global as any).addNewTaskToTasksList = addNewTaskToPosts;
    return () => {
      delete (global as any).addNewTaskToTasksList;
    };
  }, [addNewTaskToPosts]);

  const renderTaskCard = (task: Task) => {
    const isOwnTask = user && task.created_by === user.id;
    const isAccepting = acceptingTaskId === task.id;
    const canAccept = activeTab === 'available' && !isOwnTask && !isGuest && user;
    const canChat = task.status === 'accepted' && user && 
      (task.created_by === user.id || task.accepted_by === user.id);
    const canUpdateStatus = activeTab === 'doing' && user && task.accepted_by === user.id && task.status === 'accepted';
    const showStatusUpdate = canUpdateStatus && task.current_status && task.current_status !== 'completed';
    const canReview = activeTab === 'posts' && user && task.created_by === user.id && task.status === 'completed';

    return (
      <View key={task.id} style={styles.taskCard}>
        <View style={styles.taskHeader}>
          <View style={styles.taskTitleContainer}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {TaskRepo.formatCategory(task.category)}
              </Text>
            </View>
          </View>
          <Text style={styles.taskReward}>
            {TaskRepo.formatReward(task.reward_cents)}
          </Text>
        </View>
        
        {task.description ? (
          <Text style={styles.taskDescription} numberOfLines={2}>
            {task.description}
          </Text>
        ) : null}
        
        {/* Current Status Display */}
        {task.current_status && task.current_status !== 'accepted' && (
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: TaskRepo.getCurrentStatusColor(task.current_status) + '20' }
            ]}>
              <View style={[
                styles.statusDot,
                { backgroundColor: TaskRepo.getCurrentStatusColor(task.current_status) }
              ]} />
              <Text style={[
                styles.statusText,
                { color: TaskRepo.getCurrentStatusColor(task.current_status) }
              ]}>
                {TaskRepo.formatCurrentStatus(task.current_status)}
              </Text>
            </View>
            {task.last_status_update && (
              <Text style={styles.lastUpdated}>
                Updated {new Date(task.last_status_update).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
            )}
          </View>
        )}

        <View style={styles.taskDetails}>
          <View style={styles.detailRow}>
            <Store size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
            <Text style={styles.detailText}>{task.store}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <MapPin size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
            <Text style={styles.detailText} numberOfLines={1}>
              {task.dropoff_address}
            </Text>
          </View>
        </View>
        
        <View style={styles.taskMeta}>
          <View style={styles.metaLeft}>
            <View style={styles.metaItem}>
              <Clock size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
              <Text style={styles.metaText}>
                {TaskRepo.formatEstimatedTime(task.estimated_minutes)}
              </Text>
            </View>
            
            <View style={styles.urgencyContainer}>
              <View style={[
                styles.urgencyDot, 
                { backgroundColor: TaskRepo.getUrgencyColor(task.urgency) }
              ]} />
              <Text style={styles.metaText}>
                {TaskRepo.formatUrgency(task.urgency)}
              </Text>
            </View>
          </View>
          
          <View style={styles.actionButtons}>
            {canAccept && (
              <TouchableOpacity 
                style={[
                  styles.acceptButton,
                  isAccepting && styles.acceptButtonLoading
                ]}
                onPress={() => handleAcceptTask(task)}
                disabled={isAccepting}
              >
                <Text style={styles.acceptButtonText}>
                  {isAccepting ? 'Accepting...' : 'Accept Task'}
                </Text>
              </TouchableOpacity>
            )}
            
            {showStatusUpdate && (
              <TouchableOpacity 
                style={styles.statusButton}
                onPress={() => router.push(`/task/${task.id}`)}
              >
                <Text style={styles.statusButtonText}>Update Status</Text>
                <ChevronRight size={14} color={Colors.primary} strokeWidth={2} />
              </TouchableOpacity>
            )}

            {canChat && (
              <TouchableOpacity 
                style={styles.chatButton}
                onPress={() => handleChatPress(task)}
              >
                <MessageCircle size={16} color={Colors.primary} strokeWidth={2} />
                <Text style={styles.chatButtonText}>Chat</Text>
              </TouchableOpacity>
            )}

            {canReview && (
              <TouchableOpacity 
                style={styles.reviewButton}
                onPress={() => {
                  setTaskToReview(task);
                  setShowReviewSheet(true);
                }}
              >
                <Text style={styles.reviewButtonText}>Review</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {isOwnTask && activeTab === 'available' && (
            <View style={styles.ownTaskIndicator}>
              <Text style={styles.ownTaskText}>Your task</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderMapView = () => {
    const currentTasks = getCurrentTasks();
    
    // Convert tasks to map pins with demo coordinates around UF campus
    const pins: TaskPin[] = currentTasks.map((task) => {
      // For demo, place tasks around UF campus with slight offsets
      const latitude = 29.6436 + (Math.random() - 0.5) * 0.02;
      const longitude = -82.3549 + (Math.random() - 0.5) * 0.02;
      
      return {
        id: task.id,
        title: task.title,
        reward: TaskRepo.formatReward(task.reward_cents),
        store: task.store,
        urgency: task.urgency,
        latitude,
        longitude,
      };
    });
    
    return (
      <TasksMap
        pins={pins}
        onPressPin={(taskId) => console.log('Task details:', taskId)}
       showsUserLocation={locationPermission === 'granted'}
       locationPermission={locationPermission}
       onRequestLocation={requestLocationPermission}
      />
    );
  };

  const renderListView = () => {
    const currentTasks = getCurrentTasks();

    return (
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Tab Selector for List View */}
        <View style={[styles.segmentedControl, { marginTop: 12, marginBottom: 24 }]}>
          <TouchableOpacity
            style={[styles.segment, activeTab === 'available' && styles.activeSegment]}
            onPress={() => handleTabChange('available')}
          >
            <Text style={[styles.segmentText, activeTab === 'available' && styles.activeSegmentText]}>
              Available
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.segment, activeTab === 'doing' && styles.activeSegment]}
            onPress={() => handleTabChange('doing')}
          >
            <Text style={[styles.segmentText, activeTab === 'doing' && styles.activeSegmentText]}>
              You're Doing
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.segment, activeTab === 'posts' && styles.activeSegment]}
            onPress={() => handleTabChange('posts')}
          >
            <Text style={[styles.segmentText, activeTab === 'posts' && styles.activeSegmentText]}>
              Your Posts
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading && !isRefreshing ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Loading tasks...</Text>
          </View>
        ) : currentTasks.length > 0 ? (
          <View style={styles.tasksList}>
            {currentTasks.map(renderTaskCard)}
          </View>
        ) : (
          renderEmptyState()
        )}
      </ScrollView>
    );
  };

  const renderEmptyState = () => {
    let title = 'No tasks available';
    let subtitle = 'Check back later for new opportunities';

    if (activeTab === 'doing') {
      title = 'No tasks in progress';
      subtitle = 'Accept a task from Available to get started';
    } else if (activeTab === 'posts') {
      title = 'No posted tasks';
      subtitle = 'Create your first task to get help from other students';
    }

    return (
      <View style={styles.emptyState}>
        <Image
          source={require('@/assets/images/image.png')}
          style={styles.emptyStateLogo}
          resizeMode="contain"
        />
        <Text style={styles.emptyStateText}>{title}</Text>
        <Text style={styles.emptyStateSubtext}>{subtitle}</Text>
      </View>
    );
  };

  const getCurrentTasks = () => {
    switch (activeTab) {
      case 'available':
        return availableTasks;
      case 'doing':
        return doingTasks;
      case 'posts':
        return postedTasks;
      default:
        return [];
    }
  };

  return (
    <>
      <SafeAreaView style={styles.container}>
        <GlobalHeader title="Tasks" showSearch={false} />

        {/* View Mode Toggle */}
        <View style={[styles.viewModeToggle, { marginTop: 8 }]}>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'map' && styles.activeViewMode]}
            onPress={() => handleViewModeChange('map')}
          >
            <MapIcon size={20} color={viewMode === 'map' ? Colors.white : Colors.semantic.tabInactive} strokeWidth={2} />
            <Text style={[styles.viewModeText, viewMode === 'map' && styles.activeViewModeText]}>
              Map
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'list' && styles.activeViewMode]}
            onPress={() => handleViewModeChange('list')}
          >
            <ListIcon size={20} color={viewMode === 'list' ? Colors.white : Colors.semantic.tabInactive} strokeWidth={2} />
            <Text style={[styles.viewModeText, viewMode === 'list' && styles.activeViewModeText]}>
              List
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Banner */}
        {error ? (
          <View style={[styles.errorBanner, { marginHorizontal: 16 }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Content based on view mode */}
        {viewMode === 'map' ? renderMapView() : renderListView()}
      </SafeAreaView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />

      {/* Review Sheet */}
      <ReviewSheet
        visible={showReviewSheet}
        onClose={() => {
          setShowReviewSheet(false);
          setTaskToReview(null);
        }}
        task={taskToReview}
        onReviewSubmitted={handleReviewSubmitted}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.screen,
  },
  viewModeToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: Colors.muted,
    borderRadius: 12,
    padding: 4,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  activeViewMode: {
    backgroundColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.tabInactive,
  },
  activeViewModeText: {
    color: Colors.white,
  },
  mapContainer: {
    flex: 1,
  },
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: Colors.muted,
    borderRadius: 12,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeSegment: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.tabInactive,
  },
  activeSegmentText: {
    color: Colors.semantic.tabActive,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: Colors.semantic.errorAlert,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  loadingState: {
    paddingHorizontal: 16,
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
  },
  tasksList: {
    paddingHorizontal: 16,
    paddingBottom: 80 + 24,
  },
  taskCard: {
    backgroundColor: Colors.semantic.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  statusContainer: {
    marginBottom: 16,
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  lastUpdated: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
    fontStyle: 'italic',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: Colors.muted,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.semantic.tabInactive,
  },
  taskReward: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary,
  },
  taskDescription: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    lineHeight: 20,
    marginBottom: 16,
  },
  taskDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    color: Colors.semantic.bodyText,
  },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  urgencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  urgencyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    gap: 4,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  acceptButton: {
    backgroundColor: Colors.semantic.primaryButton,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  acceptButtonLoading: {
    backgroundColor: Colors.muted,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    gap: 6,
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  reviewButton: {
    backgroundColor: Colors.semantic.successAlert,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  reviewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  ownTaskIndicator: {
    backgroundColor: Colors.muted,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ownTaskText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.semantic.tabInactive,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
    paddingBottom: 80 + 24,
    minHeight: 300,
    gap: 16,
  },
  emptyStateLogo: {
    width: 64,
    height: 64,
    opacity: 0.3,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.headingText,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});