import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, MapPin, Store } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { TaskRepo } from '@/lib/taskRepo';
import { Task } from '@/types/database';

export default function MyTasksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isGuest } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMyTasks();
  }, []);

  const loadMyTasks = async () => {
    if (isGuest || !user) {
      setIsLoading(false);
      return;
    }

    try {
      const result = await TaskRepo.listUserPostedTasks(user.id);
      if (result.data) {
        const sortedTasks = result.data.sort((a, b) => {
          const aIsActive = a.status === 'open' || a.status === 'accepted';
          const bIsActive = b.status === 'open' || b.status === 'accepted';
          if (aIsActive && !bIsActive) return -1;
          if (!aIsActive && bIsActive) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setTasks(sortedTasks);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleTaskPress = (taskId: string) => {
    router.push(`/task/${taskId}` as any);
  };

  const renderTaskCard = (task: Task) => (
    <TouchableOpacity
      key={task.id}
      style={styles.taskCard}
      onPress={() => handleTaskPress(task.id)}
      activeOpacity={0.7}
    >
      <View style={styles.taskHeader}>
        <View style={styles.taskTitleContainer}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <View style={[styles.statusBadge, getStatusStyle(task.status)]}>
            <Text style={[styles.statusText, getStatusTextStyle(task.status)]}>
              {formatStatus(task.status)}
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

        <View style={styles.detailRow}>
          <Clock size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
          <Text style={styles.detailText}>
            {TaskRepo.formatEstimatedTime(task.estimated_minutes)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'open':
        return { backgroundColor: Colors.semantic.infoAlert + '20' };
      case 'accepted':
        return { backgroundColor: Colors.semantic.acceptedBadge + '20' };
      case 'completed':
        return { backgroundColor: Colors.semantic.completedBadge + '20' };
      case 'cancelled':
        return { backgroundColor: Colors.semantic.errorAlert + '20' };
      default:
        return { backgroundColor: Colors.muted };
    }
  };

  const getStatusTextStyle = (status: string) => {
    switch (status) {
      case 'open':
        return { color: Colors.semantic.infoAlert };
      case 'accepted':
        return { color: Colors.semantic.acceptedBadge };
      case 'completed':
        return { color: Colors.semantic.completedBadge };
      case 'cancelled':
        return { color: Colors.semantic.errorAlert };
      default:
        return { color: Colors.semantic.tabInactive };
    }
  };

  const formatStatus = (status: string): string => {
    switch (status) {
      case 'open':
        return 'Open';
      case 'accepted':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color={Colors.white} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Tasks</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      >
{isLoading ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Loading your tasks...</Text>
          </View>
        ) : tasks.length > 0 ? (
          <View style={styles.tasksList}>
            {(() => {
              const activeTasks = tasks.filter(t => t.status === 'open' || t.status === 'accepted');
              const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'cancelled');

              return (
                <>
                  {activeTasks.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Active Tasks ({activeTasks.length})</Text>
                      {activeTasks.map(renderTaskCard)}
                    </View>
                  )}

                  {completedTasks.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Past Tasks</Text>
                      {completedTasks.map(renderTaskCard)}
                    </View>
                  )}
                </>
              );
            })()}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No tasks posted yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Create your first task to get help from other students
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
    paddingTop: 12,
  },
  loadingState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
  },
  tasksList: {
    paddingBottom: 100,
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
    marginBottom: 8,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    marginBottom: 12,
    paddingLeft: 4,
  },
});