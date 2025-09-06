import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Platform, SafeAreaView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Copy, Share2, Gift, Users, DollarSign, Award, ExternalLink } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import GlobalHeader from '@/components/GlobalHeader';
import Toast from '@components/Toast';

const howItWorksSteps = [
  {
    icon: <Share2 size={24} color={Colors.primary} strokeWidth={2} />,
    title: 'Share your link',
    description: 'Send your unique referral link to friends via text, social media, or in person.',
  },
  {
    icon: <Users size={24} color={Colors.primary} strokeWidth={2} />,
    title: 'Friend signs up',
    description: 'Your friend creates an account using your referral link and gets verified.',
  },
  {
    icon: <DollarSign size={24} color={Colors.primary} strokeWidth={2} />,
    title: 'Earn credits',
    description: 'Get $10 in credits when your friend completes their first task successfully.',
  },
];

export default function ReferralsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user, isGuest } = useAuth();
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: ''
  });

  // Mock data - replace with real data later
  const referralStats = {
    balance: 0,
    referred: 0,
    discounts: 0,
    credits: user?.profile?.credits || 0,
  };

  const referralLink = user ? `https://hustl.app/ref/${user.id}` : 'https://hustl.app/ref/demo';

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handleCopyLink = async () => {
    triggerHaptics();
    
    try {
      await Clipboard.setStringAsync(referralLink);
      setToast({
        visible: true,
        message: 'Referral link copied!'
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const handleInviteFriends = async () => {
    triggerHaptics();

    try {
      await Clipboard.setStringAsync(referralLink);
      setToast({
        visible: true,
        message: 'Referral link copied!'
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      setToast({
        visible: true,
        message: 'Failed to copy link'
      });
    }
  };

  const handleTermsPress = () => {
    router.push('/legal/referral-terms');
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  const formatCurrency = (cents: number): string => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <>
      <View style={styles.container}>
        <GlobalHeader showSearch={true} showNotifications={false} />
        
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{
            paddingBottom: insets.bottom + tabBarHeight + 16
          }}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Referrals</Text>
            <Text style={styles.headerSubtitle}>
              Earn credits by inviting friends to Hustl
            </Text>
          </View>

          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <Gift size={32} color={Colors.primary} strokeWidth={2} />
              <Text style={styles.balanceTitle}>Your Credits</Text>
            </View>
            <Text style={styles.balanceAmount}>
              {formatCurrency(referralStats.balance * 100)}
            </Text>
            <Text style={styles.balanceLabel}>Available Balance</Text>
          </View>

          {/* Stats Row */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Users size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
              <Text style={styles.statValue}>{referralStats.referred}</Text>
              <Text style={styles.statLabel}>Referred</Text>
            </View>
            
            <View style={styles.statCard}>
              <Award size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
              <Text style={styles.statValue}>{formatCurrency(referralStats.discounts * 100)}</Text>
              <Text style={styles.statLabel}>Discounts</Text>
            </View>
            
            <View style={styles.statCard}>
              <DollarSign size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
              <Text style={styles.statValue}>
                {user?.profile ? `${user.profile.credits || 0} credits` : '0 credits'}
              </Text>
              <Text style={styles.statLabel}>Credits</Text>
            </View>
          </View>

          {/* Referral Link */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Referral Link</Text>
            <View style={styles.linkContainer}>
              <Text style={styles.linkText} numberOfLines={1}>
                {referralLink}
              </Text>
              <TouchableOpacity 
                style={styles.copyButton} 
                onPress={handleCopyLink}
                accessibilityLabel="Copy referral link"
                accessibilityRole="button"
              >
                <Copy size={16} color={Colors.primary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Invite Button */}
          <View style={styles.inviteButtonContainer}>
            <TouchableOpacity 
              style={styles.inviteButton} 
              onPress={handleInviteFriends}
              accessibilityLabel="Copy referral link"
              accessibilityRole="button"
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#0047FF', '#0021A5', '#FA4616']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                locations={[0, 0.7, 1]}
                style={styles.inviteButtonGradient}
              >
                <Copy size={20} color={Colors.white} strokeWidth={2} />
                <Text style={styles.inviteButtonText}>Copy Invite Link</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* How It Works */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How It Works</Text>
            <View style={styles.stepsContainer}>
              {howItWorksSteps.map((step, index) => (
                <View key={index} style={styles.stepCard}>
                  <View style={styles.stepIconContainer}>
                    {step.icon}
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepDescription}>{step.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Terms */}
          <TouchableOpacity 
            style={styles.termsButton} 
            onPress={handleTermsPress}
            accessibilityLabel="View terms and conditions"
            accessibilityRole="link"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.termsText}>Terms & Conditions</Text>
            <ExternalLink size={14} color={Colors.semantic.tabInactive} strokeWidth={2} />
          </TouchableOpacity>
        </ScrollView>
      </View>

      <Toast
        visible={toast.visible}
        message={toast.message}
        onHide={hideToast}
        duration={2000}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.screen,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.semantic.headingText,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
  },
  balanceCard: {
    backgroundColor: Colors.semantic.card,
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 24,
    marginBottom: 24,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.5)',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  balanceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.primary,
  },
  balanceLabel: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 32,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.semantic.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
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
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    marginBottom: 16,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.muted,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    color: Colors.semantic.bodyText,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inviteButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#0047FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  inviteButtonContainer: {
    marginHorizontal: 24,
    marginBottom: 32,
  },
  inviteButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
    minHeight: 56,
  },
  inviteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  stepsContainer: {
    gap: 16,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  stepIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepContent: {
    flex: 1,
    gap: 4,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
  },
  stepDescription: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    lineHeight: 20,
  },
  termsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 24,
    gap: 6,
  },
  termsText: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    textDecorationLine: 'underline',
  },
});