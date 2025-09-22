import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  Dimensions,
  ActivityIndicator,
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { X, Copy, MessageCircle, Eye, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import Toast from '@/components/Toast';
import { StripeConnect } from '@/lib/stripeConnect';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');

interface KYCRequestModalProps {
  visible: boolean;
  onClose: () => void;
  feature?: string;
}

export default function KYCRequestModal({
  visible,
  onClose,
  feature = 'use this feature',
}: KYCRequestModalProps) {
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });
  const {user} = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handleCompleteKYC = async () => {
    setIsLoading(true);
    try {
      const { accountId, error } = await StripeConnect.postEnsureAccount();
      console.log('Ensure Account Response:', { accountId, error });
      if (error || !accountId) {
        setToast({
          visible: true,
          message: 'Error initiating KYC. Please try again.',
        });
        return;
      }

      const {error: accountLinkError, url} = await StripeConnect.postAccountLink(user?.id || '');
      if (accountLinkError || !url) {
        setToast({
          visible: true,
          message: 'Error creating account link. Please try again.',
        });
        return;
      }

      // Open the URL in a web browser
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          setToast({
            visible: true,
            message: 'Cannot open the KYC link. Please try again.',
          });
        }
      }
      // triggerHaptics();
      // onClose();
    } catch (error) {
      console.error('Error in handleCompleteKYC:', error);
      setToast({
        visible: true,
        message: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsLoading(false);
      triggerHaptics();
      onClose();
    }
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X
                  size={20}
                  color={Colors.semantic.tabInactive}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            </View>

            {/* Success Content */}
            <View style={styles.content}>
              {/* Success Icon */}
              <View style={styles.successIcon}>
                <Text style={styles.successEmoji}>📄</Text>
              </View>

              {/* Title */}
              <Text style={styles.title}>KYC Required</Text>
              <Text style={styles.subtitle}>You need to complete KYC to</Text>

              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{feature}</Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleCompleteKYC}
                  activeOpacity={0.9}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={['#0047FF', '#0021A5']}
                    style={styles.primaryButtonGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <>
                        <MessageCircle
                          size={18}
                          color={Colors.white}
                          strokeWidth={2}
                        />
                        <Text style={styles.primaryButtonText}>
                          Complete KYC
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
    marginBottom: 20,
  },
  categoryBadge: {
    backgroundColor: Colors.primary + '15',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 24,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  codeSection: {
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  codeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    marginBottom: 12,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.muted,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderWidth: 2,
    borderColor: Colors.primary + '30',
    marginBottom: 8,
  },
  codeText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 2,
  },
  codeHint: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
});
