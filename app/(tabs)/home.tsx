import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  Search, 
  TrendingUp, 
  ChevronRight,
  ShoppingCart,
  Coffee,
  Package,
  Star
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalProfile } from '@/contexts/GlobalProfileContext';
import { BrandingUtils } from '@/constants/Branding';
import HustlLogo from '@/components/HustlLogo';

const { width } = Dimensions.get('window');

// Top Header Component
const TopHeader = () => {
  const { user } = useAuth();
  const { showProfilePanel } = useGlobalProfile();

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handleProfilePress = () => {
    triggerHaptics();
    showProfilePanel();
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

  return (
    <View style={styles.topHeader}>
      <View style={styles.headerContent}>
        {/* Left: User Avatar */}
        <TouchableOpacity
          style={styles.avatarChip}
          onPress={handleProfilePress}
          activeOpacity={0.8}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(user?.displayName || 'User')}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Center: Hustl Logo */}
        <View style={styles.logoChip}>
          <HustlLogo size="small" />
        </View>

        {/* Right: Search */}
        <TouchableOpacity style={styles.searchButton} activeOpacity={0.8}>
          <Search size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Greeting Section
const GreetingSection = () => {
  const { user } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.displayName?.split(' ')[0] || 'Kaushal';

  return (
    <View style={styles.greetingSection}>
      <Text style={styles.greeting}>
        {getGreeting()}, {firstName}
      </Text>
    </View>
  );
};

// Referral Banner
const ReferralBanner = () => {
  const router = useRouter();

  const handleReferralPress = () => {
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
    <TouchableOpacity 
      style={styles.referralBanner}
      onPress={handleReferralPress}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={BrandingUtils.getBrandGradient('referral')}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.referralGradient}
      >
        <View style={styles.referralContent}>
          <View style={styles.referralIcon}>
            <TrendingUp size={20} color={Colors.white} strokeWidth={2.5} />
          </View>
          <View style={styles.referralText}>
            <Text style={styles.referralTitle}>Earn $10 per referral</Text>
            <Text style={styles.referralSubtitle}>
              Invite friends • Get rewarded • Build your network
            </Text>
          </View>
          <ChevronRight size={20} color={Colors.white} strokeWidth={2.5} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// Category Card Component
const CategoryCard = ({ 
  title, 
  subtitle, 
  image, 
  actionText, 
  actionIcon: ActionIcon,
  isPopular = false,
  isTrending = false,
  onPress 
}: {
  title: string;
  subtitle: string;
  image: string;
  actionText: string;
  actionIcon: any;
  isPopular?: boolean;
  isTrending?: boolean;
  onPress: () => void;
}) => {
  const cardWidth = (width - 48) / 2; // 2 columns with 16px gaps

  return (
    <TouchableOpacity 
      style={[styles.categoryCard, { width: cardWidth }]}
      onPress={onPress}
      activeOpacity={0.95}
    >
      {/* Image Container */}
      <View style={styles.categoryImageContainer}>
        <Image source={{ uri: image }} style={styles.categoryImage} />
        
        {/* Badge */}
        {isPopular && (
          <View style={styles.popularBadge}>
            <Star size={12} color={Colors.white} strokeWidth={2} fill={Colors.white} />
            <Text style={styles.badgeText}>Popular</Text>
          </View>
        )}
        
        {isTrending && (
          <View style={styles.trendingBadge}>
            <TrendingUp size={12} color={Colors.white} strokeWidth={2} />
            <Text style={styles.badgeText}>Trending</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.categoryContent}>
        <Text style={styles.categoryTitle}>{title}</Text>
        <Text style={styles.categorySubtitle}>{subtitle}</Text>
        
        {/* Action Button */}
        <TouchableOpacity style={styles.categoryButton} onPress={onPress}>
          <ActionIcon size={16} color={Colors.white} strokeWidth={2} />
          <Text style={styles.categoryButtonText}>{actionText}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handleFoodDelivery = () => {
    triggerHaptics();
    router.push({
      pathname: '/(tabs)/post',
      params: { category: 'food' }
    });
  };

  const handleCoffeeRuns = () => {
    triggerHaptics();
    router.push({
      pathname: '/(tabs)/post',
      params: { category: 'coffee' }
    });
  };

  const handleGroceryShopping = () => {
    triggerHaptics();
    router.push({
      pathname: '/(tabs)/post',
      params: { category: 'grocery' }
    });
  };

  const handleStudyPartner = () => {
    triggerHaptics();
    router.push({
      pathname: '/(tabs)/post',
      params: { category: 'study' }
    });
  };

  return (
    <View style={styles.container}>
      <TopHeader />
      
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 } // Account for tab bar
        ]}
      >
        {/* Greeting */}
        <GreetingSection />

        {/* Referral Banner */}
        <ReferralBanner />

        {/* Main Categories */}
        <View style={styles.categoriesSection}>
          <View style={styles.categoriesGrid}>
            <CategoryCard
              title="Food Delivery"
              subtitle="Quick pickup & delivery"
              image="https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400"
              actionText="Order"
              actionIcon={Package}
              isPopular={true}
              onPress={handleFoodDelivery}
            />
            
            <CategoryCard
              title="Coffee Runs"
              subtitle="Fresh coffee delivered"
              image="https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=400"
              actionText="Request"
              actionIcon={Coffee}
              isPopular={true}
              onPress={handleCoffeeRuns}
            />
          </View>
        </View>

        {/* Secondary Categories */}
        <View style={styles.categoriesSection}>
          <View style={styles.categoriesGrid}>
            <CategoryCard
              title="Grocery Shopping"
              subtitle="Essential items pickup"
              image="https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&w=400"
              actionText="Request"
              actionIcon={ShoppingCart}
              isTrending={true}
              onPress={handleGroceryShopping}
            />
            
            <CategoryCard
              title="Study Partner"
              subtitle="Academic collaboration"
              image="https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=400"
              actionText="Connect"
              actionIcon={Package}
              onPress={handleStudyPartner}
            />
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
  },
  topHeader: {
    backgroundColor: Colors.white,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(229, 231, 235, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 64,
  },
  avatarChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  logoChip: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  greetingSection: {
    paddingVertical: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  referralBanner: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  referralGradient: {
    padding: 20,
  },
  referralContent: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  referralTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },
  referralSubtitle: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
  },
  categoriesSection: {
    marginBottom: 24,
  },
  categoriesGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  categoryCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  categoryImageContainer: {
    height: 120,
    position: 'relative',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  popularBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFB800',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  trendingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
  },
  categoryContent: {
    padding: 16,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  categorySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
});