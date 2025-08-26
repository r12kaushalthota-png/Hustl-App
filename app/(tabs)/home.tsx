import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Car, Coffee, Dumbbell, BookOpen, Pizza, Plus } from 'lucide-react-native';
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

const { width, height } = Dimensions.get('window');

const categories = [
  {
    id: 'car',
    title: 'Car Rides',
    image: 'https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'food',
    title: 'Food Pickup',
    image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'workout',
    title: 'Workout Partner',
    image: 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'coffee',
    title: 'Coffee Runs',
    image: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'study',
    title: 'Study Partner',
    image: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 'custom',
    title: 'Custom Task',
    image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
];

// Floating Particles Component for subtle depth
const FloatingParticles = () => {
  const particles = Array.from({ length: 8 }, (_, i) => {
    const translateY = useSharedValue(height + 50);
    const translateX = useSharedValue(Math.random() * width);
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.3 + Math.random() * 0.4);

    React.useEffect(() => {
      const startAnimation = () => {
        const delay = i * 1200 + Math.random() * 3000;
        const duration = 12000 + Math.random() * 6000;
        
        translateY.value = withDelay(
          delay,
          withRepeat(
            withTiming(-100, { duration, easing: Easing.linear }),
            -1,
            false
          )
        );
        
        opacity.value = withDelay(
          delay,
          withRepeat(
            withSequence(
              withTiming(0.08 + Math.random() * 0.12, { duration: duration * 0.1 }),
              withTiming(0.08 + Math.random() * 0.12, { duration: duration * 0.8 }),
              withTiming(0, { duration: duration * 0.1 })
            ),
            -1,
            false
          )
        );
      };

      startAnimation();
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value }
      ],
      opacity: opacity.value,
    }));

    return (
      <Animated.View
        key={i}
        style={[
          styles.particle,
          {
            width: 6 + Math.random() * 12,
            height: 6 + Math.random() * 12,
          },
          animatedStyle
        ]}
      />
    );
  });

  return (
    <View style={styles.particlesContainer}>
      {particles}
    </View>
  );
};

// Enhanced Referral Banner with Gradient and Glow
const AnimatedReferralsBanner = () => {
  const router = useRouter();
  const glowAnimation = useSharedValue(0);
  const pulseAnimation = useSharedValue(1);
  const shimmerAnimation = useSharedValue(-1);

  React.useEffect(() => {
    // Glow animation
    glowAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000 }),
        withTiming(0, { duration: 3000 })
      ),
      -1,
      true
    );

    // Pulse animation for button
    pulseAnimation.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1800 }),
        withTiming(1, { duration: 1800 })
      ),
      -1,
      true
    );

    // Shimmer animation
    shimmerAnimation.value = withRepeat(
      withTiming(1, { duration: 3500, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedGlowStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(glowAnimation.value, [0, 1], [0.2, 0.4]);
    return {
      shadowOpacity,
    };
  });

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnimation.value }],
  }));

  const animatedShimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(shimmerAnimation.value, [0, 1], [-120, 320]);
    return {
      transform: [{ translateX }],
    };
  });

  const handleInvitePress = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    router.push('/(tabs)/referrals');
  };

  const handleBannerPress = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.selectionAsync();
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    router.push('/(tabs)/referrals');
  };

  return (
    <Animated.View style={[styles.referralCard, animatedGlowStyle]}>
      <TouchableOpacity onPress={handleBannerPress} activeOpacity={0.95}>
        <LinearGradient
          colors={['#0047FF', '#0021A5', '#FA4616']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.7, 1]}
          style={styles.referralGradient}
        >
          <View style={styles.referralContent}>
            <View style={styles.referralTextContainer}>
              <Text style={styles.referralTitle}>Get $10 for every referral!</Text>
              <Text style={styles.referralSubtitle}>
                Invite friends and earn credits when they complete their first task.
              </Text>
            </View>
            
            <Animated.View style={animatedPulseStyle}>
              <TouchableOpacity 
                style={styles.inviteButton} 
                onPress={handleInvitePress}
                activeOpacity={0.8}
              >
                <Animated.View style={[styles.shimmerOverlay, animatedShimmerStyle]} />
                <Text style={styles.inviteButtonText}>Invite</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Enhanced Category Card with Better Animations
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
  const scaleAnimation = useSharedValue(0.8);
  const opacityAnimation = useSharedValue(0);
  const translateY = useSharedValue(30);
  const shadowAnimation = useSharedValue(0);

  // Staggered entrance animation
  React.useEffect(() => {
    const delay = index * 100;
    
    opacityAnimation.value = withDelay(delay, withTiming(1, { duration: 600 }));
    scaleAnimation.value = withDelay(delay, withSpring(1, { damping: 15, stiffness: 300 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 15, stiffness: 300 }));
    shadowAnimation.value = withDelay(delay, withTiming(1, { duration: 600 }));
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scaleAnimation.value },
      { translateY: translateY.value }
    ],
    opacity: opacityAnimation.value,
  }));

  const animatedShadowStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(shadowAnimation.value, [0, 1], [0, 0.15]);
    return {
      shadowOpacity,
    };
  });

  return (
    <Animated.View style={[styles.categoryCard, animatedStyle, animatedShadowStyle]}>
      {/* Image Section */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: category.image }}
          style={styles.categoryImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)']}
          style={styles.categoryOverlay}
        />
        <View style={styles.categoryContent}>
          <Text style={styles.categoryTitle} numberOfLines={2}>
            {category.title}
          </Text>
        </View>
      </View>
      
      {/* Footer with Select Task Button */}
      <View style={styles.categoryFooter}>
        <TouchableOpacity
          style={[
            styles.selectTaskButton,
            isSelecting && styles.selectTaskButtonDisabled
          ]}
          onPress={onSelectTask}
          disabled={isSelecting}
          activeOpacity={0.8}
          accessibilityLabel={`Select ${category.title} task`}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={['#0047FF', '#0021A5']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.selectTaskGradient}
          >
            {isSelecting ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Text style={styles.selectTaskText}>Select Task</Text>
                <ChevronRight size={16} color={Colors.white} strokeWidth={2.5} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const [selectingTaskId, setSelectingTaskId] = useState<string | null>(null);

  const handleSelectTask = async (categoryId: string) => {
    if (selectingTaskId) return;
    
    // Log analytics
    console.log('home_select_task_clicked', { taskId: categoryId, category: categoryId });
    
    setSelectingTaskId(categoryId);
    
    // Haptics feedback
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    
    // Simulate task selection process
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Navigate to Post Task with category prefill
    router.push({
      pathname: '/(tabs)/post',
      params: { category: categoryId }
    });
    
    setSelectingTaskId(null);
  };

  return (
    <View style={styles.container}>
      {/* Subtle Floating Particles */}
      <FloatingParticles />
      
      <GlobalHeader />

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        bounces={true}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Enhanced Referral Banner */}
        <AnimatedReferralsBanner />

        {/* Task Categories Section */}
        <View style={styles.categoriesSection}>
          <Text style={styles.categoriesTitle}>Task Categories</Text>
          <Text style={styles.categoriesSubtitle}>Choose what you need help with</Text>
          
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
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 1,
  },
  particle: {
    position: 'absolute',
    backgroundColor: '#0021A5',
    borderRadius: 50,
    opacity: 0.1,
  },
  content: {
    flex: 1,
    zIndex: 2,
  },
  scrollContent: {
    paddingBottom: 120, // Extra space for tab bar
  },
  
  // Enhanced Referral Card
  referralCard: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 32,
    borderRadius: 20,
    shadowColor: '#0047FF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
    overflow: 'hidden',
  },
  referralGradient: {
    borderRadius: 20,
  },
  referralContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    gap: 20,
  },
  referralTextContainer: {
    flex: 1,
    gap: 8,
  },
  referralTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  referralSubtitle: {
    fontSize: 14,
    color: '#F1F5F9',
    lineHeight: 20,
    opacity: 0.95,
  },
  inviteButton: {
    backgroundColor: '#FA4616',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FA4616',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: -120,
    width: 120,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ skewX: '-20deg' }],
  },
  inviteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Categories Section
  categoriesSection: {
    paddingHorizontal: 20,
    zIndex: 3,
  },
  categoriesTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  categoriesSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  
  // Enhanced Category Cards
  categoryCard: {
    width: '47%',
    height: 240, // Increased height for button
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.white,
  },
  imageContainer: {
    height: 160, // Fixed height for image section
    position: 'relative',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  categoryContent: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  categoryFooter: {
    height: 60, // Fixed height for footer
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  selectTaskButton: {
    height: 36,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#0047FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  selectTaskButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  selectTaskGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  selectTaskText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
    letterSpacing: 0.2,
    flex: 1,
    textAlign: 'center',
  },
});