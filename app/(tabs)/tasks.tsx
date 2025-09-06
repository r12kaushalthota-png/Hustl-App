import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  RefreshControl,
  Platform,
  ActivityIndicator,
  Dimensions,
  Pressable
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { 
  List, 
  Map as MapIcon, 
  Clock, 
  MapPin, 
  Store, 
  Zap,
  User,
  Filter,
  Search
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  interpolate
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { TaskRepo } from '@/lib/taskRepo';
import { supabase } from '@/lib/supabase';
import { Task } from '@/types/database';
import Toast from '@/components/Toast';

const { width } = Dimensions.get('window');

type ViewMode = 'list' | 'map';

// Enhanced Task Card Component
const TaskCard = ({ 
  task, 
  onAccept, 
  isAccepting 
}: { 
  task: Task; 
  onAccept: () => void;
  isAccepting: boolean;
}) => {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.98, { duration: 100 });
    glowOpacity.value = withTiming(0.15, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
    glowOpacity.value = withTiming(0, { duration: 200 });
  };

  const getUrgencyColor = (urgency: string): string => {
    switch (urgency) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'open': return '#3B82F6';
      case 'accepted': return '#F59E0B';
      case 'completed': return '#10B981';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <Animated.View style={[
      styles.taskCard,
      animatedStyle,
      { shadowColor: getUrgencyColor(task.urgency) },
      animatedGlowStyle
    ]}>
      <Pressable
        style={styles.taskCardContent}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={`Task: ${task.title}`}
        accessibilityRole="article"
      >
        {/* Header */}
        <View style={styles.taskHeader}>
          <View style={styles.taskTitleContainer}>
            <Text style={styles.taskTitle} numberOfLines={2}>
              {task.title}
            </Text>
            <View style={styles.badgesContainer}>
              <View style={[
                styles.urgencyBadge,
                { backgroundColor: getUrgencyColor(task.urgency) + '20' }
              ]}>
                <Text style={[
                  styles.urgencyText,
                  { color: getUrgencyColor(task.urgency) }
                ]}>
                  {String(task.urgency).charAt(0).toUpperCase() + String(task.urgency).slice(1)}
                </Text>
              </View>
              
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(task.status) + '20' }
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: getStatusColor(task.status) }
                ]}>
                  {String(task.status).charAt(0).toUpperCase() + String(task.status).slice(1)}
                </Text>
              </View>
            </View>
          </View>
          
          <Text style={styles.taskReward}>
            {TaskRepo.formatReward(task.reward_cents)}
          </Text>
        </View>

        {/* Description */}
        {task.description && (
          <Text style={styles.taskDescription} numberOfLines={2}>
            {task.description}
          </Text>
        )}

        {/* Details */}
        <View style={styles.taskDetails}>
          <View style={styles.detailRow}>
            <Store size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
            <Text style={styles.detailText} numberOfLines={1}>
              {task.store}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <MapPin size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
            <Text style={styles.detailText} numberOfLines={1}>
              {task.dropoff_address}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Clock size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
            <Text style={styles.detailText}>
              {TaskRepo.formatEstimatedTime(task.estimated_minutes)}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.taskActions}>
          <Pressable
            style={[
              styles.acceptButton,
              isAccepting && styles.acceptButtonDisabled
            ]}
            onPress={onAccept}
            disabled={isAccepting}
            accessibilityLabel="Accept task"
            accessibilityRole="button"
          >
            {isAccepting ? (
              <View style={styles.acceptButtonContent}>
                <ActivityIndicator size="small" color={Colors.white} />
                <Text style={styles.acceptButtonText}>Accepting...</Text>
              </View>
            ) : (
              <LinearGradient
                colors={['#0047FF', '#0021A5']}
                style={styles.acceptButtonGradient}
              >
                <Zap size={16} color={Colors.white} strokeWidth={2} fill={Colors.white} />
                <Text style={styles.acceptButtonText}>Accept Task</Text>
              </LinearGradient>
            )}
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
};

export default function TasksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user, isGuest } = useAuth();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [acceptingTaskId, setAcceptingTaskId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  });

  // Load tasks
  const loadTasks = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      if (isGuest) {
        // For guest users, show mock data or empty state
        setTasks([]);
      } else if (user) {
        const { data, error } = await TaskRepo.listOpenTasks(user.id);
        
        if (error) {
          setToast({
            visible: true,
            message: error,
            type: 'error'
          });
          return;
        }
        
        setTasks(data || []);
      }
    } catch (error) {
      setToast({
        visible: true,
        message: 'Failed to load tasks. Please try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user, isGuest]);

  // Load tasks on mount
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Real-time subscription for task updates
  useEffect(() => {
    if (isGuest || !user) return;

    const channel = supabase
      .channel('tasks_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `status=eq.open`,
        },
        () => {
          loadTasks();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, isGuest, loadTasks]);

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handleRefresh = () => {
    loadTasks(true);
  };

  const handleViewModeToggle = () => {
    triggerHaptics();
    setViewMode(prev => prev === 'list' ? 'map' : 'list');
  };

  const handleAcceptTask = async (taskId: string) => {
    if (isGuest || !user) {
      setToast({
        visible: true,
        message: 'Please sign in to accept tasks',
        type: 'error'
      });
      return;
    }

    if (acceptingTaskId) return;

    triggerHaptics();
    setAcceptingTaskId(taskId);

    try {
      const { data, error } = await TaskRepo.acceptTask(taskId, user.id);

      if (error) {
        setToast({
          visible: true,
          message: error,
          type: 'error'
        });
        return;
      }

      if (data) {
        setToast({
          visible: true,
          message: 'Task accepted successfully!',
          type: 'success'
        });

        // Remove accepted task from list
        setTasks(prev => prev.filter(task => task.id !== taskId));

        // Navigate to task detail
        router.push(`/task/${taskId}`);
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


  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  const renderTaskCard = (task: Task) => (
    <TaskCard
      key={task.id}
      task={task}
      onAccept={() => handleAcceptTask(task.id)}
      isAccepting={acceptingTaskId === task.id}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <List size={48} color={Colors.semantic.tabInactive} strokeWidth={1.5} />
      </View>
      <Text style={styles.emptyStateText}>No tasks available</Text>
      <Text style={styles.emptyStateSubtext}>
        {isGuest 
          ? 'Sign in to view and accept tasks from other students'
          : 'Check back later for new tasks or post your own!'
        }
      </Text>
    </View>
  );

  const renderTaskItem = ({ item }: { item: Task }) => renderTaskCard(item);

  const keyExtractor = (item: Task) => item.id;

  // Convert tasks to map pins
  const taskPins = tasks.map(task => ({
    id: task.id,
    title: task.title,
    reward: TaskRepo.formatReward(task.reward_cents),
    store: task.store,
    urgency: task.urgency,
    latitude: 29.6436 + (Math.random() - 0.5) * 0.02, // Mock coordinates around UF
    longitude: -82.3549 + (Math.random() - 0.5) * 0.02,
  }));

  return (
    <>
      <View style={styles.container}>
        <View style={styles.simpleHeader}>
          <Text style={styles.headerTitle}>Available Tasks</Text>
        </View>

        {/* View Mode Toggle */}
        <View style={styles.viewModeContainer}>
          <View style={styles.viewModeToggle}>
            <TouchableOpacity
              style={[
                styles.viewModeButton,
                viewMode === 'list' && styles.activeViewModeButton
              ]}
              onPress={() => setViewMode('list')}
              accessibilityLabel="List view"
              accessibilityRole="button"
            >
              <List 
                size={18} 
                color={viewMode === 'list' ? Colors.white : Colors.semantic.tabInactive} 
                strokeWidth={2} 
              />
              <Text style={[
                styles.viewModeButtonText,
                viewMode === 'list' && styles.activeViewModeButtonText
              ]}>
                List
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.viewModeButton,
                viewMode === 'map' && styles.activeViewModeButton
              ]}
              onPress={() => setViewMode('map')}
              accessibilityLabel="Map view"
              accessibilityRole="button"
            >
              <MapIcon 
                size={18} 
                color={viewMode === 'map' ? Colors.white : Colors.semantic.tabInactive} 
                strokeWidth={2} 
              />
              <Text style={[
                styles.viewModeButtonText,
                viewMode === 'map' && styles.activeViewModeButtonText
              ]}>
                Map
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {viewMode === 'list' ? (
            isLoading && !isRefreshing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading tasks...</Text>
              </View>
            ) : tasks.length > 0 ? (
              <FlatList
                data={tasks}
                renderItem={renderTaskItem}
                keyExtractor={keyExtractor}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    tintColor={Colors.primary}
                    colors={[Colors.primary]}
                  />
                }
                contentContainerStyle={[
                  styles.tasksList,
                  { paddingBottom: tabBarHeight + insets.bottom + 16 }
                ]}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={10}
              />
            ) : (
              renderEmptyState()
            )
          ) : (
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>Map view coming soon</Text>
            </View>
          )}
        </View>
      </View>


      {/* Toast */}
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
  simpleHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 18,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(229, 231, 235, 0.3)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.semantic.headingText,
  },
  viewModeContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.divider,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.muted,
    borderRadius: 12,
    padding: 4,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  activeViewModeButton: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  viewModeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.tabInactive,
  },
  activeViewModeButtonText: {
    color: Colors.white,
  },
  content: {
    flex: 1,
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
  tasksList: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  taskCard: {
    backgroundColor: Colors.semantic.card,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.semantic.cardBorder,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  taskCardContent: {
    padding: 20,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskTitleContainer: {
    flex: 1,
    marginRight: 16,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    marginBottom: 8,
    lineHeight: 24,
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  urgencyBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  taskReward: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.secondary,
  },
  taskDescription: {
    fontSize: 16,
    color: Colors.semantic.bodyText,
    lineHeight: 22,
    marginBottom: 16,
  },
  taskDetails: {
    gap: 8,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    color: Colors.semantic.bodyText,
  },
  taskActions: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  acceptButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  acceptButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: Colors.semantic.tabInactive,
    gap: 8,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
    gap: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
    lineHeight: 24,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.muted,
  },
  mapPlaceholderText: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
  },
});