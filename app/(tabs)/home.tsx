import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  Car, 
  Coffee, 
  Dumbbell, 
  BookOpen, 
  Pizza, 
  Plus, 
  TrendingUp, 
  Users, 
  Clock, 
  Star,
  ChevronRight,
  ShoppingCart,
  Gamepad2,
  Briefcase,
  Heart,
  Camera,
  Wrench,
  Shirt,
  Package
} from 'lucide-react-native';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import GlobalHeader from '@components/GlobalHeader';
import { useAuth } from '@/contexts/AuthContext';
import XPProgressBar from '@/components/XPProgressBar';

const { width, height } = Dimensions.get('window');

// Responsive breakpoints
const isTablet = width >= 768;
const isLargeScreen = width >= 1024;

// Enhanced categories with more options
const categories = [
  {
    id: 'food',
    title: 'Food Delivery',
    subtitle: 'Quick pickup & delivery',
    icon: Pizza,
    color: '#FF6B35',
    image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800',
    popular: true,
    trending: false,
    actionText: 'Order',
    actionIcon: Package,
  },
  {
    id: 'coffee',
    title: 'Coffee Runs',
    subtitle: 'Fresh coffee delivered',
    icon: Coffee,
    color: '#8B4513',
    image: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800',
    popular: true,
    trending: false,
    actionText: 'Request',
    actionIcon: Coffee,
  },
  {
    id: 'grocery',
    title: 'Grocery Shopping',
    subtitle: 'Essential items pickup',
    icon: ShoppingCart,
    color: '#22C55E',
    image: 'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&w=800',
    popular: false,
    trending: true,
    actionText: 'Request',
    actionIcon: ShoppingCart,
  },
  {
    id: 'study',
    title: 'Study Partner',
    subtitle: 'Academic collaboration',
    icon: BookOpen,
    color: '#3B82F6',
    image: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=800',
    popular: false,
    trending: false,
    actionText: 'Learn',
    actionIcon: BookOpen,
  },
  {
    id: 'workout',
    title: 'Workout Buddy',
    subtitle: 'Fitness motivation',
    icon: Dumbbell,
    color: '#EF4444',
    image: 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=800',
    popular: false,
    trending: false,
    actionText: 'Connect',
    actionIcon: Heart,
  },
  {
    id: 'transport',
    title: 'Campus Rides',
    subtitle: 'Quick transportation',
    icon: Car,
    color: '#8B5CF6',
    image: 'https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=800',
    popular: false,
    trending: false,
    actionText: 'Request',
    actionIcon: Car,
  },
  {
    id: 'gaming',
    title: 'Gaming Partner',
    subtitle: 'Find gaming buddies',
    icon: Gamepad2,
    color: '#F59E0B',
    image: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=800',
    popular: false,
    trending: false,
    actionText: 'Play',
    actionIcon: Gamepad2,
  },
  {
    id: 'tutoring',
    title: 'Tutoring',
    subtitle: 'Academic assistance',
    icon: Briefcase,
    color: '#06B6D4',
    image: 'https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg?auto=compress&cs=tinysrgb&w=800',
    popular: false,
    trending: false,
    actionText: 'Join',
    actionIcon: BookOpen,
  },
  {
    id: 'events',
    title: 'Event Buddy',
    subtitle: 'Social activities',
    icon: Heart,
    color: '#EC4899',
    image: 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=800',
    popular: false,
    trending: false,
    actionText: 'RSVP',
    actionIcon: Heart,
  },
  {
    id: 'photography',
    title: 'Photography',
    subtitle: 'Photo services',
    icon: Camera,
    color: '#7C3AED',
    image: 'https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=800',
    popular: false,
    trending: false,
    actionText: 'Book',
    actionIcon: Camera,
  },
  {
    id: 'repair',
    title: 'Tech Repair',
    subtitle: 'Device assistance',
    icon: Wrench,
    color: '#059669',
    image: 'https://images.pexels.com/photos/298863/pexels-photo-298863.jpeg?auto=compress&cs=tinysrgb&w=800',
    popular: false,
    trending: false,
    actionText: 'Hire',
    actionIcon: Wrench,
  },
  {
    id: 'laundry',
    title: 'Laundry Help',
    subtitle: 'Washing & folding',
    icon: Shirt,
    color: '#0891B2',
    image: 'https://images.pexels.com/photos/963278/pexels-photo-963278.jpeg?auto=compress&cs=tinysrgb&w=800',
    popular: false,
    trending: false,
    actionText: 'Request',
    actionIcon: Shirt,
  },
];

const stats = [
  { label: 'Active Tasks', value: '247', icon: TrendingUp, color: '#22C55E' },
  { label: 'Students', value: '1.2K', icon: Users, color: '#3B82F6' },
  { label: 'Avg Time', value: '18m', icon: Clock, color: '#F59E0B' },
  { label: 'Rating', value: '4.8', icon: Star, color: '#FFD700' },
];

// Animated Background Component
const AnimatedBackground = () => {
  const floatingAnimation1 = useSharedValue(0);
  const floatingAnimation2 = useSharedValue(0);
  const floatingAnimation3 = useSharedValue(0);
  const haloAnimation = useSharedValue(0);
  const haloRotation = useSharedValue(0);

  React.useEffect(() => {
    floatingAnimation1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 8000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    floatingAnimation2.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 12000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 12000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    floatingAnimation3.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 15000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 15000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    // Purple-orange halo animation
    haloAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    haloRotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedStyle1 = useAnimatedStyle(() => {
    const translateY = interpolate(floatingAnimation1.value, [0, 1], [0, -30]);
    const opacity = interpolate(floatingAnimation1.value, [0, 0.5, 1], [0.3, 0.6, 0.3]);
    return {
      transform: [{ translateY }],
      opacity,
    };
  });

  const animatedStyle2 = useAnimatedStyle(() => {
    const translateY = interpolate(floatingAnimation2.value, [0, 1], [0, 40]);
    const opacity = interpolate(floatingAnimation2.value, [0, 0.5, 1], [0.2, 0.5, 0.2]);
    return {
      transform: [{ translateY }],
      opacity,
    };
  });

  const animatedStyle3 = useAnimatedStyle(() => {
    const translateY = interpolate(floatingAnimation3.value, [0, 1], [0, -20]);
    const opacity = interpolate(floatingAnimation3.value, [0, 0.5, 1], [0.4, 0.7, 0.4]);
    return {
      transform: [{ translateY }],
      opacity,
    };
  });

  const animatedHaloStyle = useAnimatedStyle(() => {
    const opacity = interpolate(haloAnimation.value, [0, 0.5, 1], [0.1, 0.3, 0.1]);
    const scale = interpolate(haloAnimation.value, [0, 1], [0.8, 1.2]);
    return {
      opacity,
      transform: [
        { scale },
        { rotate: `${haloRotation.value}deg` }
      ],
    };
  });

  return (
    <View style={styles.backgroundContainer}>
      {/* Purple-Orange Halo */}
      <Animated.View style={[styles.haloBackground, animatedHaloStyle]} />
      
      <Animated.View style={[styles.floatingElement1, animatedStyle1]} />
      <Animated.View style={[styles.floatingElement2, animatedStyle2]} />
      <Animated.View style={[styles.floatingElement3, animatedStyle3]} />
    </View>
  );
};

// Professional Hero Section
const HeroSection = () => {
  const { user, isGuest } = useAuth();
  const router = useRouter();
  
  const fadeIn = useSharedValue(0);
  const slideUp = useSharedValue(30);
  const glowAnimation = useSharedValue(0);

  React.useEffect(() => {
    fadeIn.value = withTiming(1, { duration: 800 });
    slideUp.value = withSpring(0, { damping: 15, stiffness: 300 });
    
    glowAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000 }),
        withTiming(0, { duration: 3000 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
    transform: [{ translateY: slideUp.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(glowAnimation.value, [0, 1], [0.1, 0.25]);
    return { shadowOpacity };
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleGetStarted = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    
    if (isGuest) {
      router.push('/(onboarding)/auth');
    } else {
      router.push('/(tabs)/post');
    }
  };

  return (
    <Animated.View style={[styles.heroSection, animatedStyle, animatedGlowStyle]}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
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
          
          {/* Choose Task Button */}
          <TouchableOpacity 
            style={styles.chooseTaskButton}
            onPress={() => router.push('/(tabs)/tasks')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#FA4616', '#FF6B35']}
              style={styles.chooseTaskGradient}
            >
              <Text style={styles.chooseTaskText}>Choose a Task</Text>
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
          const glowOpacity = useSharedValue(0);
          
          React.useEffect(() => {
            scale.value = withDelay(
              600 + index * 100,
              withSpring(1, { damping: 15, stiffness: 300 })
            );
            
            glowOpacity.value = withDelay(
              1000 + index * 200,
              withRepeat(
                withSequence(
                  withTiming(0.15, { duration: 2000 }),
                  withTiming(0.05, { duration: 2000 })
                ),
                -1,
                true
              )
            );
          }, []);

          const animatedStatStyle = useAnimatedStyle(() => ({
            transform: [{ scale: scale.value }],
          }));

          const animatedGlowStyle = useAnimatedStyle(() => ({
            shadowOpacity: glowOpacity.value,
          }));

          return (
            <Animated.View key={stat.label} style={[styles.statCard, animatedStatStyle, animatedGlowStyle, { shadowColor: stat.color }]}>
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

// Enhanced Category Card with Professional Design
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
  const haloOpacity = useSharedValue(0);
  const borderAnimation = useSharedValue(0);

  React.useEffect(() => {
    const delay = 400 + index * 100;
    
    opacityAnimation.value = withDelay(delay, withTiming(1, { duration: 500 }));
    scaleAnimation.value = withDelay(delay, withSpring(1, { damping: 15, stiffness: 300 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 15, stiffness: 300 }));
    
    // Subtle hover glow
    glowOpacity.value = withDelay(
      delay + 600,
      withRepeat(
        withSequence(
          withTiming(0.15, { duration: 3000 }),
          withTiming(0.05, { duration: 3000 })
        ),
        -1,
        true
      )
    );

    // Halo effect for popular/trending items
    if (category.popular || category.trending) {
      haloOpacity.value = withDelay(
        delay + 800,
        withRepeat(
          withSequence(
            withTiming(0.3, { duration: 2000 }),
            withTiming(0.1, { duration: 2000 })
          ),
          -1,
          true
        )
      );
    }

    // Animated border for interactive feedback
    borderAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4000 }),
        withTiming(0, { duration: 4000 })
      ),
      -1,
      true
    );
  }, [index, category.popular, category.trending]);

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

  const animatedHaloStyle = useAnimatedStyle(() => ({
    shadowOpacity: haloOpacity.value,
  }));

  const animatedBorderStyle = useAnimatedStyle(() => {
    const borderOpacity = interpolate(borderAnimation.value, [0, 1], [0.1, 0.3]);
    return {
      borderColor: `${category.color}${Math.floor(borderOpacity * 255).toString(16).padStart(2, '0')}`,
    };
  });

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
        {/* Halo Effect for Special Items */}
        {(category.popular || category.trending) && (
          <Animated.View style={[
            styles.haloEffect,
            { backgroundColor: category.color },
            animatedHaloStyle
          ]} />
        )}

        {/* Animated Border */}
        <Animated.View style={[styles.animatedBorder, animatedBorderStyle]} />

        {/* Popular/Trending Badge */}
        {category.popular && (
          <View style={styles.popularBadge}>
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.badgeGradient}
            >
              <Star size={12} color={Colors.white} strokeWidth={2} fill={Colors.white} />
              <Text style={styles.badgeText}>Popular</Text>
            </LinearGradient>
          </View>
        )}

        {category.trending && (
          <View style={styles.trendingBadge}>
            <LinearGradient
              colors={['#FF6B35', '#FF4500']}
              style={styles.badgeGradient}
            >
              <TrendingUp size={12} color={Colors.white} strokeWidth={2} />
              <Text style={styles.badgeText}>Trending</Text>
            </LinearGradient>
          </View>
        )}

        {/* Image with Enhanced Overlay */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: category.image }}
            style={styles.categoryImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)']}
            locations={[0, 0.6, 1]}
            style={styles.imageOverlay}
          />
          
          {/* Enhanced Floating Brand Icon */}
          <View style={[styles.floatingIconContainer, { shadowColor: category.color }]}>
            <LinearGradient
              colors={[category.color, category.color + 'CC']}
              style={styles.floatingIconGradient}
            >
              <category.icon size={24} color={Colors.white} strokeWidth={2.5} />
            </LinearGradient>
          </View>
        </View>

        {/* Enhanced Content */}
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.categoryTitle} numberOfLines={1}>
              {category.title}
            </Text>
            <Text style={styles.categorySubtitle} numberOfLines={1}>
              {category.subtitle}
            </Text>
          </View>
          
          {/* Enhanced Action Button */}
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
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors.white} />
              </View>
            ) : (
              <LinearGradient
                colors={['#0047FF', '#0021A5']}
                style={styles.selectGradient}
              >
                <category.actionIcon size={14} color={Colors.white} strokeWidth={2.5} />
                <Text style={styles.selectText}>{category.actionText}</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

// Simplified Referral Banner
const SimpleReferralBanner = () => {
  const router = useRouter();
  const { user } = useAuth();
  
  const glowAnimation = useSharedValue(0);

  React.useEffect(() => {
    glowAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000 }),
        withTiming(0, { duration: 3000 })
      ),
      -1,
      true
    );
  }, []);

  const animatedGlowStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(glowAnimation.value, [0, 1], [0.2, 0.4]);
    return { shadowOpacity };
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

// Simple Greeting Section
const GreetingSection = () => {
  const { user, isGuest } = useAuth();
  
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

  return (
    <Animated.View style={[styles.greetingSection, animatedStyle]}>
      <Text style={styles.greeting}>
        {getGreeting()}{user ? `, ${user.displayName.split(' ')[0]}` : ''}
      </Text>
    </Animated.View>
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
    if (isTablet) return 3;
    return 2;
  };

  const getCardWidth = () => {
    const columns = getGridColumns();
    const padding = 40; // Total horizontal padding
    const gaps = (columns - 1) * 16; // Gaps between cards
    return (width - padding - gaps) / columns;
  };

  return (
    <View style={styles.container}>
      <AnimatedBackground />
      <GlobalHeader showSearch={true} showNotifications={true} />

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        bounces={true}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Greeting */}
        <GreetingSection />

        {/* Referral Banner */}
        <SimpleReferralBanner />

        {/* Task Categories Grid */}
        <View style={styles.categoriesSection}>
          <View style={styles.categoriesGrid}>
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
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  floatingElement1: {
    position: 'absolute',
    top: '10%',
    right: '15%',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 33, 165, 0.08)',
  },
  floatingElement2: {
    position: 'absolute',
    top: '60%',
    left: '10%',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(250, 70, 22, 0.06)',
  },
  floatingElement3: {
    position: 'absolute',
    top: '30%',
    left: '70%',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  haloBackground: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    right: '10%',
    bottom: '30%',
    borderRadius: 200,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    zIndex: -1,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // Greeting Section
  greetingSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.3,
  },


  // Referral Banner
  referralBanner: {
    marginHorizontal: 20,
    marginBottom: 32,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#0047FF',
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 32,
    elevation: 20,
  },
  referralGradient: {
    position: 'relative',
  },
  referralContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  referralIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  referralText: {
    flex: 1,
    gap: 4,
  },
  referralTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  referralSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  referralArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Categories Section
  categoriesSection: {
    marginHorizontal: 20,
    marginBottom: 40,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },

  // Enhanced Category Cards
  categoryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    position: 'relative',
    backdropFilter: 'blur(20px)',
  },
  haloEffect: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 30,
    zIndex: -1,
  },
  animatedBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 2,
    zIndex: 1,
  },
  popularBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  trendingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  imageContainer: {
    height: 120,
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
  floatingIconContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: 16,
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
  loadingContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9CA3AF',
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
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});