import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Dimensions, SafeAreaView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
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
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalProfile } from '@/contexts/GlobalProfileContext';
import HustlLogo from '@/components/HustlLogo';
import TaskCard from '@/components/TaskCard';

const { width } = Dimensions.get('window');

// Exact brand colors from the logo
const BrandColors = {
  primary: '#0D2DEB', // Hustl Blue
  purple: '#6B2BBF', // Hustl Purple
  red: '#E53935', // Hustl Red
  orange: '#FF5A1F', // Hustl Orange
  accentYellow: '#FFC400', // Badge yellow
  surface: '#FFFFFF',
  title: '#0A0F1F',
  subtitle: '#5B6475',
  divider: '#E9EDF5',
};

// Brand gradients
const BrandGradients = {
  primary: [BrandColors.primary, BrandColors.purple, BrandColors.red, BrandColors.orange],
  button: [BrandColors.primary, '#3D6BFF'],
  referral: [BrandColors.primary, BrandColors.purple, BrandColors.red],
};

// Task card data
const taskCards = [
  {
    id: 'food-delivery',
    title: 'Food Delivery',
    subtitle: 'Quick pickup & delivery from on-campus spots.',
    ctaLabel: 'Order',
    badge: 'Popular' as const,
    icon: '🍔',
    image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'food',
  },
  {
    id: 'coffee-runs',
    title: 'Coffee Runs',
    subtitle: 'Fresh coffee delivered from campus cafés.',
    ctaLabel: 'Request',
    badge: 'Popular' as const,
    icon: '☕',
    image: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'coffee',
  },
  {
    id: 'library-pickup',
    title: 'Library Book Pickup',
    subtitle: 'We grab and drop your holds.',
    ctaLabel: 'Request',
    icon: '📚',
    image: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'study',
  },
  {
    id: 'grocery-sprint',
    title: 'Grocery Sprint',
    subtitle: 'Essentials from Target/Publix fast.',
    ctaLabel: 'Order',
    badge: 'Trending' as const,
    icon: '🛒',
    image: 'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'grocery',
  },
  {
    id: 'study-buddy',
    title: 'Study Buddy',
    subtitle: 'Find a partner by course or topic.',
    ctaLabel: 'Find',
    icon: '🧠',
    image: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'study',
  },
  {
    id: 'print-drop',
    title: 'Print & Drop',
    subtitle: 'We print and deliver to your building.',
    ctaLabel: 'Request',
    icon: '🖨️',
    image: 'https://images.pexels.com/photos/4050315/pexels-photo-4050315.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'study',
  },
  {
    id: 'package-pickup',
    title: 'Package Pickup',
    subtitle: 'Post office or locker run for you.',
    ctaLabel: 'Request',
    icon: '📦',
    image: 'https://images.pexels.com/photos/4246120/pexels-photo-4246120.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'transport',
  },
  {
    id: 'campus-ride',
    title: 'Campus Ride',
    subtitle: 'Short lift across campus.',
    ctaLabel: 'Request',
    icon: '🚲',
    image: 'https://images.pexels.com/photos/100582/pexels-photo-100582.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'transport',
  },
  {
    id: 'dorm-essentials',
    title: 'Dorm Essentials',
    subtitle: 'Forgot it? We\'ll bring it.',
    ctaLabel: 'Order',
    icon: '🔧',
    image: 'https://images.pexels.com/photos/271816/pexels-photo-271816.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'grocery',
  },
  {
    id: 'lost-found',
    title: 'Lost & Found Return',
    subtitle: 'Coordinate a quick handoff.',
    ctaLabel: 'Post',
    icon: '🔄',
    image: 'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'events',
  },
];
// Top Header Component
const TopHeader = () => {
  const { user } = useAuth();
  const { showProfilePanel } = useGlobalProfile();
  const router = useRouter();

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

  const handleSearchPress = () => {
    triggerHaptics();
    router.push('/(modals)/search');
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
          <HustlLogo size="medium" />
        </View>

        {/* Right: Search */}
        <TouchableOpacity 
          style={styles.searchButton} 
          onPress={handleSearchPress}
          activeOpacity={0.8}
          accessibilityLabel="Search"
          accessibilityRole="button"
        >
          <Search size={20} color={BrandColors.subtitle} strokeWidth={2} />
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

  const firstName = user?.displayName?.split(' ')[0] || 'there';

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
        colors={BrandGradients.referral}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.referralGradient}
      >
        <View style={styles.referralContent}>
          <View style={styles.referralIcon}>
            <TrendingUp size={20} color={BrandColors.surface} strokeWidth={2.5} />
          </View>
          <View style={styles.referralText}>
            <Text style={styles.referralTitle}>Refer a friend, get 1 free delivery</Text>
            <Text style={styles.referralSubtitle}>
              When your friend joins with your code, your next food/delivery order's delivery fee is on us.
            </Text>
          </View>
          <ChevronRight size={20} color={BrandColors.surface} strokeWidth={2.5} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};


export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handleTaskCardPress = (category: string) => {
    triggerHaptics();
    router.push({
      pathname: '/(tabs)/post',
      params: { category }
    });
  };

  const cardWidth = (width - 48) / 2; // 2 columns with 16px gaps

  return (
    <SafeAreaView style={styles.container}>
      <TopHeader />
      
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + tabBarHeight + 16 }
        ]}
      >
        {/* Greeting */}
        <GreetingSection />

        {/* Referral Banner */}
        <ReferralBanner />

        {/* Task Cards Grid */}
        <View style={styles.taskCardsSection}>
          <Text style={styles.sectionTitle}>What can we help with?</Text>
          <View style={styles.taskCardsGrid}>
            {taskCards.map((card) => (
              <View key={card.id} style={[styles.taskCardWrapper, { width: cardWidth }]}>
                <TaskCard
                  title={card.title}
                  subtitle={card.subtitle}
                  ctaLabel={card.ctaLabel}
                  badge={card.badge}
                  icon={card.icon}
                  image={card.image}
                  onPress={() => handleTaskCardPress(card.category)}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.surface,
  },
  topHeader: {
    backgroundColor: BrandColors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: BrandColors.divider,
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
    backgroundColor: BrandColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BrandColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.surface,
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
    backgroundColor: BrandColors.divider,
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
    color: BrandColors.title,
  },
  referralBanner: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: BrandColors.primary,
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
    color: BrandColors.surface,
    marginBottom: 4,
  },
  referralSubtitle: {
    fontSize: 14,
    color: BrandColors.surface,
    opacity: 0.9,
  },
  taskCardsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: BrandColors.title,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  taskCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  taskCardWrapper: {
    marginBottom: 16,
  },
});