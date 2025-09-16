import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Clock, MapPin, Store, ChevronDown, ChevronUp, User, DollarSign } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate
} from 'react-native-reanimated';
import { Colors } from '@/theme/colors';

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

interface TaskHistoryCardProps {
  task: Task;
  currentUserId: string;
}

export default function TaskHistoryCard({ task, currentUserId }: TaskHistoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const expandAnimation = useSharedValue(0);

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handleToggleExpand = () => {
    triggerHaptics();
    setIsExpanded(!isExpanded);
    expandAnimation.value = withTiming(isExpanded ? 0 : 1, { duration: 300 });
  };

  const animatedDetailsStyle = useAnimatedStyle(() => {
    const height = interpolate(expandAnimation.value, [0, 1], [0, 120]);
    const opacity = interpolate(expandAnimation.value, [0, 1], [0, 1]);
    
    return {
      height,
      opacity,
      overflow: 'hidden' as const,
    };
  });

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (cents: number): string => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatEstimatedTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return Colors.semantic.completedBadge;
      case 'delivered':
        return Colors.semantic.successAlert;
      default:
        return Colors.semantic.tabInactive;
    }
  };

  const formatStatus = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'delivered':
        return 'Delivered';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getUserRole = (): string => {
    if (task.created_by === currentUserId) {
      return 'Requester';
    } else if (task.accepted_by === currentUserId) {
      return 'Helper';
    }
    return 'Unknown';
  };

  const getOtherUserLabel = (): string => {
    if (task.created_by === currentUserId) {
      return task.accepted_by ? `Helper: ${task.accepted_by.slice(0, 8)}...` : 'No helper';
    } else {
      return `Requester: ${task.created_by.slice(0, 8)}...`;
    }
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardContent}
        onPress={handleToggleExpand}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={2}>
              {task.title}
            </Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(task.status) + '20' }
            ]}>
              <Text style={[
                styles.statusText,
                { color: getStatusColor(task.status) }
              ]}>
                {formatStatus(task.status)}
              </Text>
            </View>
          </View>
          
          <View style={styles.expandButton}>
            {isExpanded ? (
              <ChevronUp size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
            ) : (
              <ChevronDown size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
            )}
          </View>
        </View>

        {/* Metadata Row 1 */}
        <View style={styles.metadataRow}>
          <View style={styles.metadataItem}>
            <User size={14} color={Colors.semantic.tabInactive} strokeWidth={2} />
            <Text style={styles.metadataText}>{getUserRole()}</Text>
          </View>
          
          <View style={styles.metadataItem}>
            <DollarSign size={14} color={Colors.semantic.tabInactive} strokeWidth={2} />
            <Text style={styles.metadataText}>
              {formatPrice(task.reward_cents || task.price_cents || 0)}
            </Text>
          </View>
          
          <View style={styles.metadataItem}>
            <Clock size={14} color={Colors.semantic.tabInactive} strokeWidth={2} />
            <Text style={styles.metadataText}>
              {formatEstimatedTime(task.estimated_minutes)}
            </Text>
          </View>
        </View>

        {/* Metadata Row 2 */}
        <View style={styles.metadataRow}>
          <Text style={styles.completedDate}>
            Completed {formatDate(task.completed_at || task.updated_at)}
          </Text>
          
          <Text style={styles.locationText} numberOfLines={1}>
            {task.store} → {task.dropoff_address}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Expandable Details */}
      <Animated.View style={[styles.detailsContainer, animatedDetailsStyle]}>
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Store size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
            <Text style={styles.detailText}>Store: {task.store}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <MapPin size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
            <Text style={styles.detailText}>Dropoff: {task.dropoff_address}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <User size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
            <Text style={styles.detailText}>{getOtherUserLabel()}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category:</Text>
            <Text style={styles.detailText}>{task.category}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created:</Text>
            <Text style={styles.detailText}>{formatDate(task.created_at)}</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.semantic.card,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.semantic.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    marginBottom: 8,
    lineHeight: 22,
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  expandButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 16,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataText: {
    fontSize: 12,
    color: Colors.semantic.bodyText,
    fontWeight: '500',
  },
  completedDate: {
    fontSize: 12,
    color: Colors.semantic.successAlert,
    fontWeight: '600',
  },
  locationText: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
    flex: 1,
  },
  detailsContainer: {
    backgroundColor: Colors.muted,
  },
  details: {
    padding: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    minWidth: 70,
  },
  detailText: {
    fontSize: 14,
    color: Colors.semantic.bodyText,
    flex: 1,
  },
});