import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { StripeConnect } from '@/lib/stripeConnect';
import { useAuth } from '@/contexts/AuthContext';
import KYCRequestModal from './KYCRequestModal';

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
  primary: [
    BrandColors.primary,
    BrandColors.purple,
    BrandColors.red,
    BrandColors.orange,
  ],
  button: [BrandColors.primary, '#3D6BFF'],
  iconChip: [BrandColors.primary, BrandColors.purple],
};

interface TaskCardProps {
  title: string;
  subtitle: string;
  ctaLabel: string;
  badge?: 'Popular' | 'New' | 'Trending' | 'Free';
  icon: string; // Emoji icon
  image: string;
  onPress: () => void;
  isFree?: boolean;
  price?: number;
}

export default function TaskCard({
  title,
  subtitle,
  ctaLabel,
  badge,
  icon,
  image,
  onPress,
  isFree = false,
  price,
}: TaskCardProps) {
  const { user } = useAuth();
  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handlePress = async () => {
    const {error, payouts_enabled} = await StripeConnect.getIsPayoutsenabled(user?.id || '');
    if (error || !payouts_enabled) {
      setShowKYCModal(true);
    } else {
      triggerHaptics();
      onPress();
    }
  };

  const [showKYCModal, setShowKYCModal] = React.useState(false);

  const getBadgeColor = () => {
    switch (badge) {
      case 'Popular':
        return BrandColors.accentYellow;
      case 'New':
        return '#10B981';
      case 'Trending':
        return BrandColors.orange;
      case 'Free':
        return '#10B981';
      default:
        return BrandColors.accentYellow;
    }
  };

  const displayBadge = isFree ? 'Free' : badge;
  const formatPrice = (cents?: number) => {
    if (cents === undefined || cents === null || cents === 0) return '$0';
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <>
      <TouchableOpacity
        style={styles.card}
        onPress={handlePress}
        activeOpacity={0.95}
        accessibilityLabel={`${title}: ${subtitle}. ${ctaLabel}`}
        accessibilityRole="button"
      >
        {/* Image Container */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: image }} style={styles.image} />

          {/* Image Overlay Gradient */}
          <LinearGradient
            colors={['transparent', 'rgba(13, 45, 235, 0.08)']}
            style={styles.imageOverlay}
          />

          {/* Badge */}
          {displayBadge && (
            <View style={[styles.badge, { backgroundColor: getBadgeColor() }]}>
              <Text style={styles.badgeText}>{displayBadge}</Text>
            </View>
          )}

          {/* Icon Chip */}
          <View style={styles.iconChipContainer}>
            <LinearGradient
              colors={BrandGradients.iconChip}
              style={styles.iconChip}
            >
              <Text style={styles.iconEmoji}>{icon}</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>

          {/* CTA Button */}
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handlePress}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>{ctaLabel}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
      <KYCRequestModal
        visible={showKYCModal}
        onClose={() => setShowKYCModal(false)}
        feature='create tasks'
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.surface,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: BrandColors.divider,
  },
  imageContainer: {
    height: 120, // 4:3 aspect ratio for ~160px width
    position: 'relative',
  },
  image: {
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
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: BrandColors.title,
  },
  iconChipContainer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  iconChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.9,
  },
  iconEmoji: {
    fontSize: 14,
  },
  content: {
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.title,
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 13,
    color: BrandColors.subtitle,
    lineHeight: 18,
    marginBottom: 4,
  },
  ctaButton: {
    backgroundColor: BrandColors.primary,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  ctaButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.surface,
  },
});
