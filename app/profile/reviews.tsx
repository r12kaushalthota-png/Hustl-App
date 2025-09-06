import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Star, Filter } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { ReviewRepo } from '@/lib/reviewRepo';
import { TaskReview, UserRatingAggregate } from '@/types/database';
import StarRating from '../../components/StarRating';

const STAR_FILTERS = [
  { value: null, label: 'All' },
  { value: 5, label: '5★' },
  { value: 4, label: '4★' },
  { value: 3, label: '3★' },
  { value: 2, label: '2★' },
  { value: 1, label: '1★' },
];

export default function ReviewsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const userId = params.userId as string;
  
  const [aggregate, setAggregate] = useState<UserRatingAggregate | null>(null);
  const [reviews, setReviews] = useState<TaskReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [userId, selectedFilter]);

  const loadReviews = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Load aggregates
      const { data: aggregateData } = await ReviewRepo.getUserRatingAggregate(userId);
      if (aggregateData) {
        setAggregate(aggregateData);
      }

      // Load reviews
      const { data: reviewsData } = await ReviewRepo.getUserReviews(
        userId, 
        20, 
        0, 
        selectedFilter || undefined
      );
      
      if (reviewsData) {
        setReviews(reviewsData.reviews);
        setHasMore(reviewsData.has_more);
      }
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadReviews(true);
  };

  const handleBack = () => {
    router.back();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderReviewCard = (review: TaskReview) => (
    <View key={review.id} style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <StarRating rating={review.stars} size={16} showNumber={false} />
        <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
      </View>
      
      <Text style={styles.taskTitle}>"{review.task?.title}"</Text>
      
      {review.tags && review.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {review.tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
      
      {review.comment && (
        <Text style={styles.reviewComment}>"{review.comment}"</Text>
      )}
      
      <Text style={styles.reviewerName}>
        by {review.rater?.full_name || review.rater?.username || 'Anonymous'}
      </Text>
      
      {review.edited_at && (
        <Text style={styles.editedText}>
          Edited {formatDate(review.edited_at)}
        </Text>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Star size={48} color={Colors.semantic.tabInactive} strokeWidth={1} />
      <Text style={styles.emptyStateText}>No reviews yet</Text>
      <Text style={styles.emptyStateSubtext}>
        Reviews will appear here after completing tasks
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color={Colors.white} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reviews</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Rating Summary */}
      {aggregate && aggregate.ratings_count > 0 && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <StarRating rating={aggregate.average_rating} size={24} />
            <Text style={styles.reviewCount}>
              {aggregate.ratings_count} review{aggregate.ratings_count !== 1 ? 's' : ''}
            </Text>
          </View>
          
          <View style={styles.breakdownContainer}>
            {Object.entries(aggregate.ratings_breakdown).reverse().map(([star, count]) => (
              <View key={star} style={styles.breakdownRow}>
                <Text style={styles.breakdownStar}>{star}★</Text>
                <View style={styles.breakdownBar}>
                  <View 
                    style={[
                      styles.breakdownFill,
                      { 
                        width: aggregate.ratings_count > 0 
                          ? `${(count / aggregate.ratings_count) * 100}%` 
                          : '0%' 
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.breakdownCount}>{count}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabs}
        >
          {STAR_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.label}
              style={[
                styles.filterTab,
                selectedFilter === filter.value && styles.activeFilterTab
              ]}
              onPress={() => setSelectedFilter(filter.value)}
            >
              <Text style={[
                styles.filterTabText,
                selectedFilter === filter.value && styles.activeFilterTabText
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Reviews List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {isLoading && !isRefreshing ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Loading reviews...</Text>
          </View>
        ) : reviews.length > 0 ? (
          <View style={styles.reviewsList}>
            {reviews.map(renderReviewCard)}
          </View>
        ) : (
          renderEmptyState()
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
  summaryCard: {
    backgroundColor: Colors.semantic.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.semantic.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reviewCount: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    fontWeight: '500',
  },
  breakdownContainer: {
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  breakdownStar: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    width: 20,
  },
  breakdownBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.muted,
    borderRadius: 3,
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 3,
  },
  breakdownCount: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
    width: 20,
    textAlign: 'right',
  },
  filterContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  filterTabs: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    backgroundColor: Colors.muted,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.semantic.inputBorder,
  },
  activeFilterTab: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.semantic.bodyText,
  },
  activeFilterTabText: {
    color: Colors.white,
  },
  content: {
    flex: 1,
  },
  loadingState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
  },
  reviewsList: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  reviewCard: {
    backgroundColor: Colors.semantic.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.semantic.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tag: {
    backgroundColor: Colors.muted,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.semantic.bodyText,
  },
  reviewComment: {
    fontSize: 14,
    color: Colors.semantic.bodyText,
    lineHeight: 20,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  reviewerName: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
    fontWeight: '500',
  },
  editedText: {
    fontSize: 11,
    color: Colors.semantic.tabInactive,
    fontStyle: 'italic',
    marginTop: 4,
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
});