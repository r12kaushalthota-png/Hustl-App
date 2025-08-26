import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Car, Coffee, Dumbbell, BookOpen, Pizza, Plus, TrendingUp, Users, Clock, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  interpolate,
  withDelay,
  withSpring,
  Easing
} from 'react-native-reanimated';
import { ActivityIndicator } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import GlobalHeader from '@components/GlobalHeader';
import { useAuth } from '@/contexts/AuthContext';
import XPProgressBar from '@/components/XPProgressBar';

const { width, height } = Dimensions.get('window');

// Responsive breakpoints
const isTablet = width >= 768;
const isLargeScreen = width >= 1024;

const categories = [
  {
    id: 'food',
    title: 'Food Delivery',
    subtitle: 'Quick pickup & delivery',
    icon: Pizza,
    color: '#FF6B35',
    image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800',
    popular: true,
  },
  {
    id: 'coffee',
    title: 'Coffee Runs',
    subtitle: 'Fresh coffee delivered',
    icon: Coffee,
    color: '#8B4513',
    image: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800',
    popular: true,
  },
  {
    id: 'grocery',
    title: 'Grocery Shopping',
    subtitle: 'Essential items pickup',
    icon: Plus,
    color: '#22C55E',
    image: 'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&w=800',
    popular: false,
  },
  {
    id: 'study',
    title: 'Study Partner',
    subtitle: 'Academic collaboration',
    icon: BookOpen,
    color: '#3B82F6',
    image: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=800',
    popular: false,
  },
  {
    id: 'workout',
    title: 'Workout Buddy',
    subtitle: 'Fitness motivation',
    icon: Dumbbell,
    color: '#EF4444',
    image: 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=800',
    popular: false,
  },
  {
    id: 'transport',
    title: 'Campus Rides',
    subtitle: 'Quick transportation',
    icon: Car,
    color: '#8B5CF6',
    image: 'https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=800',
    popular: false,
  },
];

const stats = [
  { label: 'Active Tasks', value: '247', icon: TrendingUp, color: '#22C55E' },
  { label: 'Students', value: '1.2K', icon: Users, color: '#3B82F6' },
  { label: 'Avg Time', value: '18m', icon: Clock, color: '#F59E0B' },
  { label: 'Rating', value: '4.8', icon: Star, color: '#FFD700' },
];

// Professional Hero Section
const HeroSection = () => {
  const { user, isGuest } = useAuth();
  const router = useRouter();
  
  const fadeIn = useSharedValue(0);
  const slideUp = useSharedValue(30);

  React.useEffect(() => {
    fadeIn.value = withTiming(1, { duration: 800 });
    slideUp.value = withSpring(0, { damping: 15, stiffness: 300 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
    transform: [{ translateY: slideUp.value }],
  }));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleGetStarted = () => {
    if (isGuest) {
      router.push('/(onboarding)/auth');
    } else {
      router.push('/(tabs)/post');
    }
  };

  return (
    <Animated.View style={[styles.heroSection, animatedStyle]}>
      <LinearGradient
        colors={['rgba(0, 33, 165, 0.05)', 'rgba(250, 70, 22, 0.02)']}
        style={styles.heroGradient}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroText}>
            <Text style={styles.greeting}>
              {getGreeting()}{user ? `, ${user.displayName.split(' ')[0]}` : ''}
            </Text>
            <Text style={styles.heroTitle}>
              What can we help you{'\n'}accomplish today?
            </Text>
            <Text style={styles.heroSubtitle}>
              Connect with fellow students for quick tasks, deliveries, and campus services.
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.ctaButton}
            onPress={handleGetStarted}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#0047FF', '#0021A5']}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>
                {isGuest ? 'Get Started' : 'Post a Task'}
              </Text>
              <ChevronRight size={18} color={Colors.white} strokeWidth={2.5} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// Live Stats Section
const LiveStatsSection = () => {
  const fadeIn = useSharedValue(0);

  React.useEffect(() => {
    fadeIn.value = withDelay(400, withTiming(1, { duration: 600 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
  }));

  return (
    <Animated.View style={[styles.statsSection, animatedStyle]}>
      <Text style={styles.statsTitle}>Live Campus Activity</Text>
      <View style={styles.statsGrid}>
        {stats.map((stat, index) => {
          const scale = useSharedValue(0.9);
          
          React.useEffect(() => {
            scale.value = withDelay(
              600 + index * 100,
              withSpring(1, { damping: 15, stiffness: 300 })
            );
          }, []);

          const animatedStatStyle = useAnimatedStyle(() => ({
            transform: [{ scale: scale.value }],
          }));

          return (
            <Animated.View key={stat.label} style={[styles.statCard, animatedStatStyle]}>
              <View style={[styles.statIcon, { backgroundColor: stat.color + '15' }]}>
                <stat.icon size={20} color={stat.color} strokeWidth={2} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Animated.View>
          );
        })}
      </View>
    </Animated.View>
  );
};

// Enhanced Category Card
const CategoryCard = ({ 
  category, 
  index, 
  onSelectTask,
  isSelecting 
}: { 
  category: any; 
  index: number; 
  onSelectTask: () => void;
  isSelecting: boolean;
}) => {
  const scaleAnimation = useSharedValue(0.95);
  const opacityAnimation = useSharedValue(0);
  const translateY = useSharedValue(20);
  const glowOpacity = useSharedValue(0);

  React.useEffect(() => {
    const delay = 800 + index * 150;
    
    opacityAnimation.value = withDelay(delay, withTiming(1, { duration: 500 }));
    scaleAnimation.value = withDelay(delay, withSpring(1, { damping: 15, stiffness: 300 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 15, stiffness: 300 }));
    
    // Subtle hover glow
    glowOpacity.value = withDelay(
      delay + 600,
      withRepeat(
        withSequence(
          withTiming(0.15, { duration: 2000 }),
          withTiming(0.05, { duration: 2000 })
        ),
        -1,
        true
      )
    );
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scaleAnimation.value },
      { translateY: translateY.value }
    ],
    opacity: opacityAnimation.value,
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    onSelectTask();
  };

  const cardWidth = isTablet ? (width - 80) / 3 - 16 : (width - 64) / 2 - 8;

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.95}>
      <Animated.View style={[
        styles.categoryCard, 
        { width: cardWidth },
        animatedStyle,
        { shadowColor: category.color },
        animatedGlowStyle
      ]}>
        {/* Popular Badge */}
        {category.popular && (
          <View style={styles.popularBadge}>
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.popularGradient}
            >
              <Star size={12} color={Colors.white} strokeWidth={2} fill={Colors.white} />
              <Text style={styles.popularText}>Popular</Text>
            </LinearGradient>
          </View>
        )}

        {/* Image with Overlay */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: category.image }}
            style={styles.categoryImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
            style={styles.imageOverlay}
          />
          
          {/* Floating Brand Icon */}
          <View style={[styles.floatingIcon, { backgroundColor: category.color }]}>
            <category.icon size={24} color={Colors.white} strokeWidth={2.5} />
          </View>
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.categoryTitle} numberOfLines={1}>
              {category.title}
            </Text>
            <Text style={styles.categorySubtitle} numberOfLines={1}>
              {category.subtitle}
            </Text>
          </View>
          
          {/* Action Button */}
          <TouchableOpacity
            style={[
              styles.selectButton,
              isSelecting && styles.selectButtonDisabled
            ]}
            onPress={onSelectTask}
            disabled={isSelecting}
            activeOpacity={0.8}
          >
            {isSelecting ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <LinearGradient
                colors={['#0047FF', '#0021A5']}
                style={styles.selectGradient}
              >
                <Text style={styles.selectText}>Select</Text>
                <ChevronRight size={14} color={Colors.white} strokeWidth={2.5} />
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

// Enhanced Referral Banner
const ReferralBanner = () => {
  const router = useRouter();
  const { user } = useAuth();
  
  const glowAnimation = useSharedValue(0);
  const shimmerAnimation = useSharedValue(-1);

  React.useEffect(() => {
    glowAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000 }),
        withTiming(0, { duration: 3000 })
      ),
      -1,
      true
    );

    shimmerAnimation.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedGlowStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(glowAnimation.value, [0, 1], [0.2, 0.4]);
    return { shadowOpacity };
  });

  const animatedShimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(shimmerAnimation.value, [0, 1], [-200, width + 200]);
    return { transform: [{ translateX }] };
  });

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    router.push('/(tabs)/referrals');
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.95}>
      <Animated.View style={[styles.referralBanner, animatedGlowStyle]}>
        <LinearGradient
          colors={['#0047FF', '#0021A5', '#FA4616']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.6, 1]}
          style={styles.referralGradient}
        >
          <Animated.View style={[styles.shimmerOverlay, animatedShimmerStyle]} />
          
          <View style={styles.referralContent}>
            <View style={styles.referralIcon}>
              <TrendingUp size={28} color={Colors.white} strokeWidth={2.5} />
            </View>
            
            <View style={styles.referralText}>
              <Text style={styles.referralTitle}>Earn $10 per referral</Text>
              <Text style={styles.referralSubtitle}>
                Invite friends • Get rewarded • Build your network
              </Text>
            </View>
            
            <View style={styles.referralArrow}>
              <ChevronRight size={20} color={Colors.white} strokeWidth={3} />
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

// Quick Actions Section
const QuickActionsSection = () => {
  const router = useRouter();
  const { user, isGuest } = useAuth();
  
  const quickActions = [
    {
      title: 'Browse Tasks',
      subtitle: 'Find available tasks',
      icon: Plus,
      color: '#3B82F6',
      route: '/(tabs)/tasks',
    },
    {
      title: 'My Messages',
      subtitle: 'Chat with students',
      icon: Plus,
      color: '#8B5CF6',
      route: '/(tabs)/chats',
    },
  ];

  const handleActionPress = (route: string) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.selectionAsync();
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    router.push(route as any);
  };

  return (
    <View style={styles.quickActionsSection}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        {quickActions.map((action, index) => (
          <TouchableOpacity
            key={action.title}
            style={styles.quickActionCard}
            onPress={() => handleActionPress(action.route)}
            activeOpacity={0.9}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: action.color + '15' }]}>
              <action.icon size={24} color={action.color} strokeWidth={2} />
            </View>
            <Text style={styles.quickActionTitle}>{action.title}</Text>
            <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectingTaskId, setSelectingTaskId] = useState<string | null>(null);

  const handleSelectTask = async (categoryId: string) => {
    if (selectingTaskId) return;
    
    setSelectingTaskId(categoryId);
    
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 600));
    
    router.push({
      pathname: '/(tabs)/post',
      params: { category: categoryId }
    });
    
    setSelectingTaskId(null);
  };

  const getGridColumns = () => {
    if (isLargeScreen) return 3;
    if (isTablet) return 2;
    return 2;
  };

  return (
    <View style={styles.container}>
      <GlobalHeader />

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        bounces={true}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <HeroSection />

        {/* XP Progress for Authenticated Users */}
        {user?.profile && (
          <View style={styles.xpSection}>
            <View style={styles.xpHeader}>
              <Text style={styles.xpTitle}>Your Progress</Text>
              <Text style={styles.xpSubtitle}>Level {user.profile.level}</Text>
            </View>
            <XPProgressBar
              currentXP={user.profile.xp}
              currentLevel={user.profile.level}
              size="medium"
            />
          </View>
        )}

        {/* Live Stats */}
        <LiveStatsSection />

        {/* Referral Banner */}
        <ReferralBanner />

        {/* Quick Actions */}
        <QuickActionsSection />

        {/* Task Categories */}
        <View style={styles.categoriesSection}>
          <View style={styles.categoriesHeader}>
            <Text style={styles.categoriesTitle}>Task Categories</Text>
            <Text style={styles.categoriesSubtitle}>
              Choose what you need help with
            </Text>
          </View>
          
          <View style={[
            styles.categoriesGrid,
            { 
              flexDirection: isTablet ? 'row' : 'column',
              flexWrap: isTablet ? 'wrap' : 'nowrap',
            }
          ]}>
            {categories.map((category, index) => (
              <CategoryCard
                key={category.id}
                category={category}
                index={index}
                onSelectTask={() => handleSelectTask(category.id)}
                isSelecting={selectingTaskId === category.id}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // Hero Section
  heroSection: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  heroGradient: {
    borderRadius: 24,
  },
  heroContent: {
    padding: 32,
    gap: 24,
  },
  heroText: {
    gap: 12,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0021A5',
    opacity: 0.8,
  },
  heroTitle: {
    fontSize: isTablet ? 32 : 28,
    fontWeight: '700',
    color: '#111827',
    lineHeight: isTablet ? 40 : 36,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    opacity: 0.9,
  },
  ctaButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0021A5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    alignSelf: 'flex-start',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.3,
  },

  // XP Section
  xpSection: {
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.3)',
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  xpTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  xpSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0021A5',
  },

  // Stats Section
  statsSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.2)',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Referral Banner
  referralBanner: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#0047FF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 15,
  },
  referralGradient: {
    position: 'relative',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    width: 200,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    transform: [{ skewX: '-20deg' }],
  },
  referralContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  referralIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  referralText: {
    flex: 1,
    gap: 4,
  },
  referralTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  referralSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  referralArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Quick Actions
  quickActionsSection: {
    marginHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.2)',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Categories Section
  categoriesSection: {
    marginHorizontal: 20,
    marginBottom: 40,
  },
  categoriesHeader: {
    marginBottom: 20,
    gap: 8,
  },
  categoriesTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  categoriesSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 22,
  },
  categoriesGrid: {
    gap: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  // Enhanced Category Cards
  categoryCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  popularGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  popularText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
  },
  imageContainer: {
    height: 140,
    position: 'relative',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cardContent: {
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    gap: 4,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
  },
  categorySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#0021A5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  selectButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  selectGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  selectText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.3,
  },
});