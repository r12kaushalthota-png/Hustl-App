import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { User, Filter } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing
} from 'react-native-reanimated';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import TaskHistoryCard from '@/components/TaskHistoryCard';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';

const { width } = Dimensions.get('window');

interface Task {
  id: string;
  title: string;
  status: string;
  completed_at: string | null;
  updated_at: string;
  created_at: string;
  reward_cents: number;
  price_cents: number;
  dropoff_address: string;
  store: string;
  created_by: string;
  accepted_by: string | null;
  estimated_minutes: number;
  category: string;
  urgency: string;
}

type FilterType = 'all' | 'requester' | 'helper';

const ITEMS_PER_PAGE = 20;

const filterOptions: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'requester', label: 'As Requester' },
  { value: 'helper', label: 'As Helper' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user, isGuest } = useAuth();
  
  // Animation
  const translateX = useSharedValue(-width);
  
  // Data state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  
  // Pagination
  const offsetRef = useRef(0);
  const isLoadingRef = useRef(false);

  // Slide in animation on focus
  useFocusEffect(
    useCallback(() => {
      translateX.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
      });
      
      return () => {
        translateX.value = -width;
      };
    }, [])
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Load tasks
  const loadTasks = useCallback(async (refresh = false, loadMore = false) => {
    if (isGuest || !user) {
      setIsLoading(false);
      return;
    }

    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      if (refresh) {
        setIsRefreshing(true);
        offsetRef.current = 0;
        setHasMore(true);
        setError(null);
      } else if (loadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        offsetRef.current = 0;
        setHasMore(true);
        setError(null);
      }

      // Build query based on filter
      let query = supabase
        .from('tasks')
        .select('*')
        .in('status', ['completed'])
        .order('updated_at', { ascending: false })
        .range(offsetRef.current, offsetRef.current + ITEMS_PER_PAGE - 1);

      // Apply filter
      if (filter === 'requester') {
        query = query.eq('created_by', user.id);
      } else if (filter === 'helper') {
        query = query.eq('accepted_by', user.id);
      } else {
        // All: tasks where user was either requester or helper
        query = query.or(`created_by.eq.${user.id},accepted_by.eq.${user.id}`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      const newTasks = data || [];
      
      if (refresh || !loadMore) {
        setTasks(newTasks);
      } else {
        setTasks(prev => [...prev, ...newTasks]);
      }

      // Update pagination
      offsetRef.current += newTasks.length;
      setHasMore(newTasks.length === ITEMS_PER_PAGE);

    } catch (error) {
      setError('Failed to load task history. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [user, isGuest, filter]);

  // Load tasks on mount and filter change
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handleRefresh = () => {
    loadTasks(true);
  };

  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore && !isLoadingRef.current) {
      loadTasks(false, true);
    }
  };

  const handleFilterChange = (newFilter: FilterType) => {
    if (newFilter === filter) return;
    
    triggerHaptics();
    setFilter(newFilter);
  };

  const renderTaskItem = ({ item }: { item: Task }) => (
    <TaskHistoryCard
      task={item}
      currentUserId={user?.id || ''}
    />
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.loadingFooterText}>Loading more...</Text>
      </View>
    );
  };

  const keyExtractor = (item: Task) => item.id;

  if (isGuest) {
    return (
      <Animated.View style={[styles.container, animatedStyle]}>
        <View style={[styles.content, { paddingTop: insets.top }]}>
          <View style={styles.guestContainer}>
            <View style={styles.guestIconContainer}>
              <User size={48} color={Colors.semantic.tabInactive} strokeWidth={1.5} />
            </View>
            <Text style={styles.guestText}>Sign in to view your profile</Text>
            <Text style={styles.guestSubtext}>
              Track your task history and manage your account
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={[styles.content, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Task History</Text>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterContainer}>
          <View style={styles.filterPills}>
            {filterOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterPill,
                  filter === option.value && styles.activeFilterPill
                ]}
                onPress={() => handleFilterChange(option.value)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.filterPillText,
                  filter === option.value && styles.activeFilterPillText
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Content */}
        <View style={styles.listContainer}>
          {isLoading && !isRefreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading task history...</Text>
            </View>
          ) : error ? (
            <ErrorState
              message={error}
              onRetry={() => loadTasks()}
            />
          ) : tasks.length === 0 ? (
            <EmptyState
              title="No completed tasks yet"
              subtitle="Your completed tasks will appear here"
              icon="📋"
            />
          ) : (
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
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.3}
              ListFooterComponent={renderFooter}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: tabBarHeight + insets.bottom + 16 }
              ]}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={10}
              getItemLayout={(_, index) => ({
                length: 120, // Approximate item height
                offset: 120 * index,
                index,
              })}
            />
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.screen,
  },
  content: {
    flex: 1,
    width: '100%',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.divider,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
  },
  filterContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.divider,
  },
  filterPills: {
    flexDirection: 'row',
    gap: 12,
  },
  filterPill: {
    backgroundColor: Colors.muted,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.semantic.inputBorder,
  },
  activeFilterPill: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.semantic.bodyText,
  },
  activeFilterPillText: {
    color: Colors.white,
    fontWeight: '600',
  },
  listContainer: {
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
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingFooterText: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 20,
  },
  guestIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.semantic.headingText,
    textAlign: 'center',
  },
  guestSubtext: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
    lineHeight: 24,
  },
});