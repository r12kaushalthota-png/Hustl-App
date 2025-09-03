import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  Image, 
  ScrollView, 
  RefreshControl,
  Share,
  Alert,
  Dimensions,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  X, 
  MessageCircle, 
  Flag, 
  Share2, 
  Star, 
  Calendar,
  GraduationCap,
  MapPin,
  User as UserIcon,
  Shield,
  Award,
  ExternalLink
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileService } from '@/services/profileService';
import { ReviewRepo } from '@/lib/reviewRepo';
import { GamificationRepo } from '@/lib/gamificationRepo';
import type { UserProfile, UserRatingAggregate } from '@/types/database';
import StarRating from '@/components/StarRating';

const { height } = Dimensions.get('window');

interface ProfileSheetProps {
  visible: boolean;
  onClose: () => void;
  userId: string | null;
  currentChatRoomId?: string; // If opened from chat, don't show message button
}

// Profile skeleton component
const ProfileSkeleton = () => (
  <View style={styles.skeletonContainer}>
    <View style={styles.skeletonAvatar} />
    <View style={styles.skeletonTextLarge} />
    <View style={styles.skeletonTextSmall} />
    <View style={styles.skeletonBadge} />
  </View>
);

export default function ProfileSheet({ 
  visible, 
  onClose, 
  userId, 
  currentChatRoomId 
}: ProfileSheetProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ratingAggregate, setRatingAggregate] = useState<UserRatingAggregate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && userId) {
      loadProfile();
    }
  }, [visible, userId]);

  const loadProfile = async (refresh = false) => {
    if (!userId) return;

    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      // Load profile and rating aggregate in parallel
      const [profileResult, ratingResult] = await Promise.all([
        ProfileService.getProfile(userId, !refresh),
        ReviewRepo.getUserRatingAggregate(userId)
      ]);

      if (profileResult.error) {
        setError(profileResult.error);
        return;
      }

      if (!profileResult.data) {
        setError('Profile not found');
        return;
      }

      setProfile(profileResult.data);
      setRatingAggregate(ratingResult.data);

    } catch (error) {
      setError('Failed to load profile. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

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
    loadProfile(true);
  };

  const handleMessage = () => {
    if (!userId || !currentUser || currentChatRoomId) return;
    
    triggerHaptics();
    onClose();
    
    // Navigate to chats tab - in a real app you'd create a DM room
    router.push('/(tabs)/chats');
  };

  const handleViewFullProfile = () => {
    if (!userId) return;
    
    triggerHaptics();
    onClose();
    
    router.push(`/profile/reviews?userId=${userId}`);
  };

  const handleReport = () => {
    triggerHaptics();
    Alert.alert(
      'Report User',
      'Why are you reporting this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Inappropriate behavior', onPress: () => submitReport('inappropriate') },
        { text: 'Spam or fake profile', onPress: () => submitReport('spam') },
        { text: 'Other', onPress: () => submitReport('other') },
      ]
    );
  };

  const submitReport = (reason: string) => {
    // TODO: Implement report submission
    Alert.alert('Report Submitted', 'Thank you for helping keep Hustl safe.');
  };

  const handleShare = async () => {
    if (!profile) return;
    
    triggerHaptics();
    
    try {
      const profileUrl = `https://hustl.app/profile/${userId}`;
      const message = `Check out ${ProfileService.getDisplayName(profile)}'s profile on Hustl: ${profileUrl}`;
      
      await Share.share({
        message,
        url: profileUrl,
        title: `${ProfileService.getDisplayName(profile)} - Hustl Profile`,
      });
    } catch (error) {
      console.error('Error sharing profile:', error);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const renderContent = () => {
    if (isLoading && !isRefreshing) {
      return <ProfileSkeleton />;
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadProfile()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!profile) {
      return null;
    }

    return (
      <>
        {/* Profile Header */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {ProfileService.getInitials(profile.full_name || profile.username)}
                </Text>
              </View>
            )}
            
            {/* Level Badge */}
            {profile.level > 1 && (
              <View style={[
                styles.levelBadge,
                { backgroundColor: ProfileService.getLevelBadgeColor(profile.level) }
              ]}>
                <Text style={styles.levelBadgeText}>{profile.level}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.nameContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.displayName}>
                {ProfileService.getDisplayName(profile)}
              </Text>
              {ProfileService.isVerified(profile) && (
                <View style={styles.verifiedBadge}>
                  <Shield size={14} color={Colors.white} strokeWidth={2} />
                </View>
              )}
            </View>
            
            {profile.username && profile.full_name && (
              <Text style={styles.username}>@{profile.username}</Text>
            )}

            {profile.level > 1 && (
              <Text style={styles.levelTitle}>
                {ProfileService.getLevelTitle(profile.level)}
              </Text>
            )}
          </View>

          {/* Rating Summary */}
          {ratingAggregate && ratingAggregate.ratings_count > 0 && (
            <View style={styles.ratingContainer}>
              <StarRating rating={ratingAggregate.average_rating} size={20} />
              <Text style={styles.ratingCount}>
                ({ratingAggregate.ratings_count} review{ratingAggregate.ratings_count !== 1 ? 's' : ''})
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {!currentChatRoomId && currentUser?.id !== userId && (
              <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
                <MessageCircle size={16} color={Colors.white} strokeWidth={2} />
                <Text style={styles.messageButtonText}>Message</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={styles.viewProfileButton} onPress={handleViewFullProfile}>
              <ExternalLink size={16} color={Colors.primary} strokeWidth={2} />
              <Text style={styles.viewProfileButtonText}>View Full Profile</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Share2 size={16} color={Colors.primary} strokeWidth={2} />
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>
            
            {currentUser?.id !== userId && (
              <TouchableOpacity style={styles.reportButton} onPress={handleReport}>
                <Flag size={16} color={Colors.semantic.errorAlert} strokeWidth={2} />
                <Text style={styles.reportButtonText}>Report</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.aboutGrid}>
            {profile.major && (
              <View style={styles.aboutItem}>
                <GraduationCap size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
                <Text style={styles.aboutText}>{profile.major}</Text>
              </View>
            )}
            
            {profile.university && (
              <View style={styles.aboutItem}>
                <MapPin size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
                <Text style={styles.aboutText}>{profile.university}</Text>
              </View>
            )}
            
            <View style={styles.aboutItem}>
              <Calendar size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
              <Text style={styles.aboutText}>
                Member since {formatDate(profile.created_at)}
              </Text>
            </View>

            {profile.completed_tasks_count > 0 && (
              <View style={styles.aboutItem}>
                <Award size={16} color={Colors.semantic.tabInactive} strokeWidth={2} />
                <Text style={styles.aboutText}>
                  {profile.completed_tasks_count} task{profile.completed_tasks_count !== 1 ? 's' : ''} completed
                </Text>
              </View>
            )}
          </View>

          {profile.bio ? (
            <Text style={styles.bioText} numberOfLines={4}>
              {profile.bio}
            </Text>
          ) : (
            <Text style={styles.noBioText}>No bio available</Text>
          )}
        </View>

        {/* Stats Section */}
        {(profile.xp > 0 || profile.level > 1 || (ratingAggregate && ratingAggregate.ratings_count > 0)) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stats</Text>
            
            <View style={styles.statsGrid}>
              {profile.level > 1 && (
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>Level {profile.level}</Text>
                  <Text style={styles.statLabel}>Current Level</Text>
                </View>
              )}
              
              {profile.xp > 0 && (
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{GamificationRepo.formatXP(profile.xp)}</Text>
                  <Text style={styles.statLabel}>Experience</Text>
                </View>
              )}
              
              {ratingAggregate && ratingAggregate.ratings_count > 0 && (
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{ratingAggregate.average_rating.toFixed(1)}★</Text>
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </>
    );
  };

  if (!visible || !userId) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.header}>
            <View style={styles.dragHandle} />
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
            </TouchableOpacity>
          </View>

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
            {renderContent()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.semantic.screen,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.85,
    minHeight: height * 0.4,
  },
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 20,
    position: 'relative',
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.semantic.tabInactive + '40',
    borderRadius: 2,
    marginBottom: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  skeletonContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  skeletonAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.muted,
  },
  skeletonTextLarge: {
    width: 120,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.muted,
  },
  skeletonTextSmall: {
    width: 80,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.muted,
  },
  skeletonBadge: {
    width: 60,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.muted,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: Colors.semantic.errorAlert,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  profileSection: {
    alignItems: 'center',
    paddingBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.divider,
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  levelBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
  },
  nameContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    textAlign: 'center',
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.semantic.successAlert,
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
    marginBottom: 8,
  },
  levelTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  ratingCount: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
    minHeight: 44,
  },
  messageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
    minHeight: 44,
  },
  viewProfileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
    minHeight: 44,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.semantic.errorAlert,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
    minHeight: 44,
  },
  reportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.errorAlert,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    marginBottom: 16,
  },
  aboutGrid: {
    gap: 12,
    marginBottom: 16,
  },
  aboutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aboutText: {
    fontSize: 16,
    color: Colors.semantic.bodyText,
    flex: 1,
  },
  bioText: {
    fontSize: 16,
    color: Colors.semantic.bodyText,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  noBioText: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
    fontStyle: 'italic',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.muted,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.semantic.bodyText,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
  },
});