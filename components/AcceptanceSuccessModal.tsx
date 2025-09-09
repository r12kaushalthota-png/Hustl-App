import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  Dimensions
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { X, Copy, MessageCircle, Eye, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import Toast from '@/components/Toast';

const { width } = Dimensions.get('window');

interface AcceptanceSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  acceptanceCode: string;
  taskCategory: string;
  onMessagePoster: () => void;
  onViewTask: () => void;
}

export default function AcceptanceSuccessModal({
  visible,
  onClose,
  acceptanceCode,
  taskCategory,
  onMessagePoster,
  onViewTask
}: AcceptanceSuccessModalProps) {
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: ''
  });

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handleCopyCode = async () => {
    triggerHaptics();
    
    try {
      await Clipboard.setStringAsync(acceptanceCode);
      setToast({
        visible: true,
        message: 'Acceptance code copied!'
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const handleMessagePoster = () => {
    triggerHaptics();
    onClose();
    onMessagePoster();
  };

  const handleViewTask = () => {
    triggerHaptics();
    onClose();
    onViewTask();
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  const formatCategory = (category: string): string => {
    switch (category) {
      case 'food_delivery':
        return 'Food Delivery';
      case 'coffee_run':
        return 'Coffee Run';
      case 'grocery_shopping':
        return 'Grocery Shopping';
      case 'library_pickup':
        return 'Library Pickup';
      case 'study_session':
        return 'Study Session';
      case 'campus_ride':
        return 'Campus Ride';
      case 'general_task':
        return 'General Task';
      default:
        return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
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
                <X size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Success Content */}
            <View style={styles.content}>
              {/* Success Icon */}
              <View style={styles.successIcon}>
                <Text style={styles.successEmoji}>🎉</Text>
              </View>

              {/* Title */}
              <Text style={styles.title}>
                Congratulations!
              </Text>
              <Text style={styles.subtitle}>
                You just accepted a task
              </Text>

              {/* Task Category */}
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>
                  {formatCategory(taskCategory)}
                </Text>
              </View>

              {/* Acceptance Code */}
              <View style={styles.codeSection}>
                <Text style={styles.codeLabel}>Your acceptance code</Text>
                <TouchableOpacity 
                  style={styles.codeContainer}
                  onPress={handleCopyCode}
                  activeOpacity={0.8}
                >
                  <Text style={styles.codeText}>{acceptanceCode}</Text>
                  <Copy size={16} color={Colors.primary} strokeWidth={2} />
                </TouchableOpacity>
                <Text style={styles.codeHint}>
                  Tap to copy • Show this to the task poster
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleMessagePoster}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={['#0047FF', '#0021A5']}
                    style={styles.primaryButtonGradient}
                  >
                    <MessageCircle size={18} color={Colors.white} strokeWidth={2} />
                    <Text style={styles.primaryButtonText}>Message the Poster</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleViewTask}
                  activeOpacity={0.8}
                >
                  <Eye size={16} color={Colors.primary} strokeWidth={2} />
                  <Text style={styles.secondaryButtonText}>View Task</Text>
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