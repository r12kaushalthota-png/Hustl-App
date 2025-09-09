import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';
import { X, User, Star, MapPin, Calendar, Award } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/theme/colors';
import { supabase } from '@/lib/supabase';

const { height: screenHeight } = Dimensions.get('window');

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  major: string | null;
  university: string;
  class_year: string;
  bio: string;
  xp: number;
  level: number;
  completed_tasks_count: number;
  response_rate: number;
  created_at: string;
}

interface ProfileSheetProps {
  visible: boolean;
  onClose: () => void;
  userId: string | null;
}

export default function ProfileSheet({ visible, onClose, userId }: ProfileSheetProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && userId) {
      loadProfile();
    }
  }, [visible, userId]);

  const loadProfile = async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) {
        setError('Failed to load profile');
        return;
      }

      setProfile(data);
    } catch (error) {
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    onClose();
  };

  const getInitials = (name: string): string => {
    if (!name || !name.trim()) return 'U';
    
    return name
      .trim()
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatJoinDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star
            key={i}
            size={16}
            color={Colors.secondary}
            fill={Colors.secondary}
          />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Star
            key={i}
            size={16}
            color={Colors.secondary}
            fill="rgba(255, 193, 7, 0.5)"
          />
        );
      } else {
        stars.push(
          <Star
            key={i}
            size={16}
            color="rgba(229, 231, 235, 1)"
            fill="rgba(229, 231, 235, 1)"
          />
        );
      }
    }

    return stars;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Profile</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <X size={24} color={Colors.semantic.headingText} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : profile ? (
            <>
              {/* Profile Header */}
              <View style={styles.profileHeader}>
                <View style={styles.avatarContainer}>
                  {profile.avatar_url ? (
                    <Image 
                      source={{ uri: profile.avatar_url }} 
                      style={styles.avatar} 
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {getInitials(profile.full_name || profile.username || 'User')}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.displayName}>
                  {profile.full_name || profile.username || 'User'}
                </Text>

                {profile.major && (
                  <Text style={styles.major}>{profile.major}</Text>
                )}

                {profile.bio && (
                  <Text style={styles.bio}>{profile.bio}</Text>
                )}
              </View>

              {/* Stats */}
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Award size={20} color={Colors.primary} strokeWidth={2} />
                  <Text style={styles.statValue}>Level {profile.level}</Text>
                  <Text style={styles.statLabel}>{profile.xp} XP</Text>
                </View>

                <View style={styles.statItem}>
                  <Star size={20} color={Colors.secondary} strokeWidth={2} />
                  <Text style={styles.statValue}>{profile.completed_tasks_count}</Text>
                  <Text style={styles.statLabel}>Tasks Completed</Text>
                </View>

                <View style={styles.statItem}>
                  <User size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
                  <Text style={styles.statValue}>{profile.response_rate}%</Text>
                  <Text style={styles.statLabel}>Response Rate</Text>
                </View>
              </View>

              {/* Details */}
              <View style={styles.detailsContainer}>
                {profile.class_year && (
                  <View style={styles.detailItem}>
                    <Calendar size={18} color={Colors.semantic.tabInactive} strokeWidth={2} />
                    <Text style={styles.detailText}>{profile.class_year}</Text>
                  </View>
                )}

                {profile.university && (
                  <View style={styles.detailItem}>
                    <MapPin size={18} color={Colors.semantic.tabInactive} strokeWidth={2} />
                    <Text style={styles.detailText}>{profile.university}</Text>
                  </View>
                )}

                <View style={styles.detailItem}>
                  <User size={18} color={Colors.semantic.tabInactive} strokeWidth={2} />
                  <Text style={styles.detailText}>
                    Joined {formatJoinDate(profile.created_at)}
                  </Text>
                </View>
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.screen,
  },
  header: {
    backgroundColor: Colors.white,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(229, 231, 235, 0.8)',
    paddingTop: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.semantic.headingText,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 245, 245, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
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
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    color: Colors.semantic.errorAlert,
    textAlign: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: Colors.white,
    marginBottom: 12,
  },
  avatarContainer: {
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
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    textAlign: 'center',
    marginBottom: 4,
  },
  major: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: Colors.semantic.bodyText,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 12,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.semantic.headingText,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
  },
  detailsContainer: {
    backgroundColor: Colors.white,
    paddingVertical: 20,
    paddingHorizontal: 20,
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailText: {
    fontSize: 16,
    color: Colors.semantic.bodyText,
    flex: 1,
  },
});