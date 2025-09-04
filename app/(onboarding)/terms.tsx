import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, FileText, Mail, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { Colors } from '@/theme/colors';

export default function TermsOfServiceScreen() {
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
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.termsContent}>
          {/* Header Section */}
          <View style={styles.titleSection}>
            <View style={styles.iconContainer}>
              <FileText size={32} color={Colors.primary} strokeWidth={2} />
            </View>
            <Text style={styles.title}>Hustl Terms of Service</Text>
            <Text style={styles.effectiveDate}>Effective Date: {currentDate}</Text>
          </View>

          {/* Introduction */}
          <View style={styles.section}>
            <Text style={styles.bodyText}>
              Welcome to Hustl, a student-led marketplace at the University of Florida ("UF"). By using Hustl, you agree to the following Terms of Service. Please read carefully.
            </Text>
          </View>

          {/* Section 1 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. About Hustl</Text>
            <Text style={styles.bodyText}>
              Hustl is a peer-to-peer platform that allows students to post and complete tasks, such as rides, food delivery, errands, or other services. Hustl does not employ, supervise, or guarantee the conduct of users. Hustl is not a transportation provider, delivery company, or academic service provider.
            </Text>
          </View>

          {/* Section 2 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Eligibility</Text>
            <Text style={styles.bodyText}>
              You must be a current UF student, at least 17 years old, and legally permitted to use this service.
            </Text>
          </View>

          {/* Section 3 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. User Responsibilities</Text>
            <Text style={styles.bodyText}>By using Hustl, you agree that:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• You are solely responsible for your own actions, postings, and communications.</Text>
              <Text style={styles.bulletItem}>• You will comply with all applicable laws, UF regulations, and these Terms.</Text>
              <Text style={styles.bulletItem}>• You assume all risks associated with interacting with other users.</Text>
            </View>
          </View>

          {/* Section 4 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Prohibited Conduct</Text>
            <Text style={styles.bodyText}>
              You may not use Hustl for any harmful, illegal, or unsafe activity, including but not limited to:
            </Text>

            <Text style={styles.subsectionTitle}>Violence & Misconduct</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Assault, battery, stalking, harassment, bullying, threats, or intimidation.</Text>
              <Text style={styles.bulletItem}>• Sexual misconduct of any kind (harassment, exploitation, assault, or unwanted advances).</Text>
              <Text style={styles.bulletItem}>• Kidnapping, human trafficking, or exploitation.</Text>
            </View>

            <Text style={styles.subsectionTitle}>Illegal Goods & Services</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Sale or distribution of drugs, controlled substances, or drug paraphernalia.</Text>
              <Text style={styles.bulletItem}>• Alcohol sales to underage individuals.</Text>
              <Text style={styles.bulletItem}>• Sale or possession of weapons, explosives, or hazardous materials.</Text>
              <Text style={styles.bulletItem}>• Distribution of stolen property, counterfeit goods, or pirated digital content.</Text>
            </View>

            <Text style={styles.subsectionTitle}>Financial & Fraudulent Activities</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Scams, pyramid schemes, money laundering, or financial fraud.</Text>
              <Text style={styles.bulletItem}>• Identity theft, impersonation, or misrepresentation.</Text>
              <Text style={styles.bulletItem}>• Misuse of payment methods or chargeback fraud.</Text>
            </View>

            <Text style={styles.subsectionTitle}>Academic Misconduct</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Selling or distributing exams, essays, or assignments.</Text>
              <Text style={styles.bulletItem}>• Offering services that violate UF's Honor Code (cheating, plagiarism).</Text>
            </View>

            <Text style={styles.subsectionTitle}>Dangerous Conduct</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Reckless driving, unsafe transportation, or endangerment of passengers.</Text>
              <Text style={styles.bulletItem}>• Delivery of unsafe or spoiled food items.</Text>
              <Text style={styles.bulletItem}>• Encouraging self-harm or suicide.</Text>
            </View>

            <Text style={styles.subsectionTitle}>Other Prohibited Uses</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Dissemination of hate speech, discriminatory remarks, or extremist content.</Text>
              <Text style={styles.bulletItem}>• Spamming, hacking, or attempting to interfere with Hustl's systems.</Text>
              <Text style={styles.bulletItem}>• Any act that violates UF policy, Florida law, or federal law.</Text>
            </View>

            <View style={styles.warningBox}>
              <AlertTriangle size={20} color={Colors.semantic.errorAlert} strokeWidth={2} />
              <Text style={styles.warningText}>
                This list is not exhaustive. Any behavior Hustl deems harmful, unsafe, or unlawful is prohibited.
              </Text>
            </View>
          </View>

          {/* Section 5 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. No Liability</Text>
            <Text style={styles.bodyText}>
              Hustl does not control, supervise, or guarantee the actions of users and is not responsible or liable for:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Personal injury, death, accidents, or medical emergencies.</Text>
              <Text style={styles.bulletItem}>• Sexual harassment, assault, stalking, or any unwanted contact.</Text>
              <Text style={styles.bulletItem}>• Theft, loss, or destruction of property.</Text>
              <Text style={styles.bulletItem}>• Sale, purchase, or distribution of illegal substances, alcohol, weapons, or dangerous items.</Text>
              <Text style={styles.bulletItem}>• Fraud, scams, misrepresentation, or identity theft.</Text>
              <Text style={styles.bulletItem}>• Academic dishonesty, cheating, or disciplinary action by UF.</Text>
              <Text style={styles.bulletItem}>• Vehicle accidents, reckless driving, or transportation-related incidents.</Text>
              <Text style={styles.bulletItem}>• Food poisoning, allergic reactions, or unsafe delivery of goods.</Text>
              <Text style={styles.bulletItem}>• Kidnapping, trafficking, coercion, or unlawful detention.</Text>
              <Text style={styles.bulletItem}>• Technology misuse, hacking, data theft, or cybercrime.</Text>
              <Text style={styles.bulletItem}>• Emotional distress, bullying, discrimination, or hate speech.</Text>
              <Text style={styles.bulletItem}>• Any dispute, conflict, or disagreement between users.</Text>
            </View>
            <Text style={styles.bodyText}>
              By using Hustl, you agree that all risks are yours alone, and you release Hustl, its founders, student organizers, and affiliates from any liability, claim, damage, loss, or expense arising out of your use of the platform.
            </Text>
          </View>

          {/* Section 6 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Assumption of Risk</Text>
            <Text style={styles.bodyText}>You understand and agree that:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Using Hustl involves risks of personal injury, property damage, financial loss, or other harm.</Text>
              <Text style={styles.bulletItem}>• Hustl does not screen users beyond basic eligibility.</Text>
              <Text style={styles.bulletItem}>• You assume full responsibility for all risks and outcomes.</Text>
            </View>
          </View>

          {/* Section 7 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Food & Errand Transactions</Text>
            <Text style={styles.bodyText}>
              Hustl is designed for quick, casual exchanges between students. Food-related and errand tasks are not professional delivery services.
            </Text>

            <Text style={styles.subsectionTitle}>Payment Responsibilities</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Requesters must either prepay the cost of food or reimburse the runner upon delivery, depending on the agreed arrangement.</Text>
              <Text style={styles.bulletItem}>• Hustl may require funds to be held in escrow to prevent disputes.</Text>
            </View>

            <Text style={styles.subsectionTitle}>Cancellations</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Once food has been purchased, requesters may not cancel or refuse payment.</Text>
              <Text style={styles.bulletItem}>• If a requester cancels after purchase, they remain responsible for reimbursing the runner for all costs incurred.</Text>
            </View>

            <Text style={styles.subsectionTitle}>Runner Protection</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Runners may upload proof of purchase (receipt and photo of items). Once proof is uploaded, requesters are financially obligated.</Text>
              <Text style={styles.bulletItem}>• If a requester refuses to pay, Hustl reserves the right to suspend their account.</Text>
            </View>

            <Text style={styles.subsectionTitle}>Requester Protection</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Runners must provide proof of purchase when requested.</Text>
              <Text style={styles.bulletItem}>• If a runner steals or withholds food, Hustl is not liable but may ban the runner to protect the community.</Text>
            </View>

            <Text style={styles.subsectionTitle}>No Delivery Fees</Text>
            <Text style={styles.bodyText}>
              Hustl does not charge service or delivery fees. Payments are strictly for the cost of goods and any agreed-upon compensation between students.
            </Text>

            <View style={styles.warningBox}>
              <AlertTriangle size={20} color={Colors.semantic.errorAlert} strokeWidth={2} />
              <Text style={styles.warningText}>
                Hustl is not responsible for stolen or spoiled food, food allergies, delivery timing, or any disputes between users. All transactions are peer-to-peer and conducted at users' own risk.
              </Text>
            </View>
          </View>

          {/* Section 8 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Payment & Transactions</Text>
            <Text style={styles.bodyText}>
              Hustl is not responsible for payment disputes, scams, or failed transactions. All financial arrangements are strictly between users.
            </Text>
          </View>

          {/* Section 9 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Reporting & Enforcement</Text>
            <Text style={styles.bodyText}>
              Users are encouraged to report misconduct or violations. Hustl may suspend or remove accounts at its discretion, but Hustl is not obligated to resolve disputes.
            </Text>
          </View>

          {/* Section 10 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. No Warranties</Text>
            <Text style={styles.bodyText}>
              Hustl is provided "as is." Hustl disclaims all warranties, express or implied, including safety, reliability, or fitness for a particular purpose.
            </Text>
          </View>

          {/* Section 11 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>11. Indemnification</Text>
            <Text style={styles.bodyText}>
              You agree to indemnify and hold harmless Hustl, its founders, student organizers, and affiliates from any claims, damages, or expenses arising from your use of the platform or violation of these Terms.
            </Text>
          </View>

          {/* Section 12 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>12. Dispute Resolution</Text>
            <Text style={styles.bodyText}>
              Any disputes must first be attempted to be resolved informally with Hustl. If unresolved, disputes will be governed under the laws of the State of Florida.
            </Text>
          </View>

          {/* Section 13 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>13. Changes to Terms</Text>
            <Text style={styles.bodyText}>
              Hustl may update these Terms at any time. Continued use of the platform constitutes acceptance of updated Terms.
            </Text>
          </View>

          {/* Section 14 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>14. Contact</Text>
            <Text style={styles.bodyText}>
              For questions or concerns, contact:
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
  termsContent: {
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
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.errorAlert,
    lineHeight: 22,
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