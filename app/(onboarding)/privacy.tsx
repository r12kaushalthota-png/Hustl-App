import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Shield, Mail } from 'lucide-react-native';
import { Colors } from '@/theme/colors';

export default function PrivacyPolicyScreen() {
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.policyContent}>
          {/* Header Section */}
          <View style={styles.titleSection}>
            <View style={styles.iconContainer}>
              <Shield size={32} color={Colors.primary} strokeWidth={2} />
            </View>
            <Text style={styles.title}>Hustl Privacy Policy</Text>
            <Text style={styles.effectiveDate}>Effective Date: {currentDate}</Text>
          </View>

          {/* Introduction */}
          <View style={styles.section}>
            <Text style={styles.bodyText}>
              At Hustl ("we," "our," or "us"), your privacy matters. As a student-led marketplace at the University of Florida ("UF"), we are committed to protecting the personal information of students using our platform. This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data. By using Hustl, you agree to these practices.
            </Text>
          </View>

          {/* Section 1 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Information We Collect</Text>
            
            <Text style={styles.subsectionTitle}>Account Information</Text>
            <Text style={styles.bodyText}>When creating your account, we may collect:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Name, UF email, student ID, and phone number</Text>
              <Text style={styles.bulletItem}>• Profile picture and optional profile details</Text>
            </View>

            <Text style={styles.subsectionTitle}>Task & Transaction Data</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Task postings, requests, or completions</Text>
              <Text style={styles.bulletItem}>• Payment amounts, reimbursements, and proof of purchase</Text>
              <Text style={styles.bulletItem}>• Messages and communication with other users</Text>
            </View>

            <Text style={styles.subsectionTitle}>Device & Usage Data</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• IP address, device type, browser information</Text>
              <Text style={styles.bulletItem}>• Platform activity (tasks viewed, clicks, session duration)</Text>
            </View>
          </View>

          {/* Section 2 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
            <Text style={styles.bodyText}>We use your information to:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Provide, operate, and improve Hustl services</Text>
              <Text style={styles.bulletItem}>• Facilitate peer-to-peer transactions (payments, reimbursements)</Text>
              <Text style={styles.bulletItem}>• Verify student eligibility and prevent fraud or abuse</Text>
              <Text style={styles.bulletItem}>• Communicate platform updates, security alerts, and notifications</Text>
              <Text style={styles.bulletItem}>• Analyze trends to improve user experience</Text>
              <Text style={styles.bulletItem}>• Enforce our Terms of Service and maintain a safe community</Text>
            </View>
          </View>

          {/* Section 3 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Sharing Your Information</Text>
            
            <Text style={styles.subsectionTitle}>With Other Users</Text>
            <Text style={styles.bodyText}>
              Task-related information (name, profile, task details) is shared with other students to complete transactions.
            </Text>

            <Text style={styles.subsectionTitle}>With Service Providers</Text>
            <Text style={styles.bodyText}>
              We may share information with trusted third-party services, such as payment processors, cloud storage, or analytics providers.
            </Text>

            <Text style={styles.subsectionTitle}>Legal Compliance</Text>
            <Text style={styles.bodyText}>
              We may disclose your information if required by law, to prevent fraud, or to enforce our Terms of Service.
            </Text>

            <View style={styles.highlightBox}>
              <Text style={styles.highlightText}>
                ❌ We do NOT sell your personal information to advertisers or third parties.
              </Text>
            </View>
          </View>

          {/* Section 4 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Data Security</Text>
            <Text style={styles.bodyText}>
              We implement reasonable safeguards to protect your information. However, no method of transmission over the internet is completely secure. By using Hustl, you accept the inherent risks and agree to notify us of any suspected breaches.
            </Text>
          </View>

          {/* Section 5 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Data Retention</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• We retain your information while your account is active or as needed to provide services.</Text>
              <Text style={styles.bulletItem}>• Some data may be retained for legal or compliance reasons even after account deletion.</Text>
            </View>
          </View>

          {/* Section 6 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Your Rights & Choices</Text>
            
            <Text style={styles.subsectionTitle}>Access & Correction</Text>
            <Text style={styles.bodyText}>Review and update your account information anytime.</Text>

            <Text style={styles.subsectionTitle}>Communication Preferences</Text>
            <Text style={styles.bodyText}>Opt out of non-essential notifications or emails.</Text>

            <Text style={styles.subsectionTitle}>Account Deletion</Text>
            <Text style={styles.bodyText}>
              Request deletion of your account. Certain transactional data may remain for dispute resolution or legal obligations.
            </Text>
          </View>

          {/* Section 7 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Cookies & Tracking</Text>
            <Text style={styles.bodyText}>Hustl may use cookies and similar technologies to:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Enhance your experience</Text>
              <Text style={styles.bulletItem}>• Remember your preferences</Text>
              <Text style={styles.bulletItem}>• Analyze platform usage</Text>
            </View>
            <Text style={styles.bodyText}>
              You can manage cookies through your browser settings.
            </Text>
          </View>

          {/* Section 8 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
            <Text style={styles.bodyText}>
              Hustl is intended for students at UF (17+ years old). We do not knowingly collect information from anyone under 17.
            </Text>
          </View>

          {/* Section 9 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Changes to This Policy</Text>
            <Text style={styles.bodyText}>
              We may update this Privacy Policy from time to time. Changes will be posted with a revised "Effective Date." Continued use of Hustl constitutes acceptance of the updated policy.
            </Text>
          </View>

          {/* Section 10 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. Contact Us</Text>
            <Text style={styles.bodyText}>
              Questions or concerns? Reach out to us at:
            </Text>
            
            <View style={styles.contactCard}>
              <View style={styles.contactIcon}>
                <Mail size={20} color={Colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactEmail}>HustlApp@outlook.com</Text>
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
  policyContent: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: 40,
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
  effectiveDate: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
    fontStyle: 'italic',
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
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    marginBottom: 8,
    marginTop: 16,
  },
  bodyText: {
    fontSize: 16,
    color: Colors.semantic.bodyText,
    lineHeight: 24,
    marginBottom: 12,
  },
  bulletList: {
    marginLeft: 16,
    marginBottom: 16,
  },
  bulletItem: {
    fontSize: 16,
    color: Colors.semantic.bodyText,
    lineHeight: 24,
    marginBottom: 8,
  },
  highlightBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  highlightText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.errorAlert,
    textAlign: 'center',
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.semantic.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
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