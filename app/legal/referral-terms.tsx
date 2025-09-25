import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, FileText, Mail, Shield } from 'lucide-react-native';
import { Colors } from '@/theme/colors';

export default function ReferralTermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    router.back();
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color={Colors.white} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Referral Terms</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.termsContent}>
          {/* Header Section */}
          <View style={styles.titleSection}>
            <View style={styles.iconContainer}>
              <FileText size={32} color={Colors.primary} strokeWidth={2} />
            </View>
            <Text style={styles.title}>Referral Terms & Conditions</Text>
            <Text style={styles.subtitle}>Hustl Referral Program</Text>
            <Text style={styles.effectiveDate}>Effective Date: {currentDate}</Text>
          </View>

          {/* Terms Content */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Eligibility</Text>
            <Text style={styles.bodyText}>
              Must be 18+ and a verified Hustl user at an eligible university. One account per person/device. Hustl may verify eligibility.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How it works</Text>
            <Text style={styles.bodyText}>
              Share your unique link. When a new user signs up with your link and completes their first task successfully (posted, accepted, completed, and not refunded), you earn one (1) free delivery.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>New user definition</Text>
            <Text style={styles.bodyText}>
              Someone who has never created a Hustl account, never used another referral link, and signs up within 30 days of clicking your link.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reward timing</Text>
            <Text style={styles.bodyText}>
              Free delivery reward is applied within 24–72 hours after the friend's first task is successfully completed and payment clears review.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Credits</Text>
            <Text style={styles.bodyText}>
              Free delivery waives the delivery fee only on one eligible food/delivery order; does not discount items, taxes, service fees, or tips; one reward per order; auto-applies to next eligible order; consumed on successful completion; not consumed if fee already $0 or order fails/cancels; expires after 12 months unless otherwise stated.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Limits</Text>
            <Text style={styles.bodyText}>
              No self-referrals, duplicate accounts, or referrals within your own household/device/IP. Hustl may cap rewards per user or per period.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fraud & abuse</Text>
            <Text style={styles.bodyText}>
              We may withhold, reverse, or revoke free delivery rewards for suspected fraud, violation of these terms, chargebacks/refunds, or policy breaches.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Taxes</Text>
            <Text style={styles.bodyText}>
              You are responsible for any taxes resulting from free delivery rewards.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Changes</Text>
            <Text style={styles.bodyText}>
              Hustl may modify, suspend, or end the program at any time with or without notice. Changes apply prospectively.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy</Text>
            <Text style={styles.bodyText}>
              Use of the program is subject to our Privacy Policy. Minimal data is shared to attribute referrals and free delivery rewards.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Liability</Text>
            <Text style={styles.bodyText}>
              Program provided "as is." Hustl isn't liable for indirect or incidental damages; our total liability is limited to the value of free delivery rewards earned.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Governing law</Text>
            <Text style={styles.bodyText}>
              Florida, USA. Disputes will be resolved under these terms.
            </Text>
          </View>

          {/* Contact Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact</Text>
            <View style={styles.contactCard}>
              <View style={styles.contactIcon}>
                <Mail size={20} color={Colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactEmail}>support@hustl.app</Text>
                <Text style={styles.contactLabel}>Support Email</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
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
  content: {
    flex: 1,
  },
  termsContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 12,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
  },
  effectiveDate: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    marginBottom: 12,
  },
  bodyText: {
    fontSize: 16,
    color: Colors.semantic.bodyText,
    lineHeight: 24,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.semantic.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.semantic.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 2,
  },
  contactLabel: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
  },
});