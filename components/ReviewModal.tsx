import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Star } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { ReviewRepo } from '@/lib/reviewRepo';

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  taskId: string;
  taskTitle: string;
  raterId: string;
  rateeId: string;
  rateeName: string;
}

export default function ReviewModal({
  visible,
  onClose,
  onSubmit,
  taskId,
  taskTitle,
  raterId,
  rateeId,
  rateeName,
}: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStarPress = (star: number) => {
    setRating(star);
    setError(null);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: submitError } = await ReviewRepo.createReview(
        taskId,
        raterId,
        rateeId,
        rating,
        comment.trim() || undefined
      );

      if (submitError) {
        setError(submitError);
        return;
      }

      setRating(0);
      setComment('');
      onSubmit();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setRating(0);
      setComment('');
      setError(null);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Leave a Review</Text>
            <TouchableOpacity
              onPress={handleClose}
              disabled={isSubmitting}
              style={styles.closeButton}
            >
              <X size={24} color={Colors.semantic.tabInactive} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.taskTitle}>{taskTitle}</Text>
            <Text style={styles.subtitle}>Rate {rateeName}</Text>

            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleStarPress(star)}
                  disabled={isSubmitting}
                  style={styles.starButton}
                >
                  <Star
                    size={40}
                    color={star <= rating ? '#FFC107' : Colors.semantic.cardBorder}
                    fill={star <= rating ? '#FFC107' : 'transparent'}
                    strokeWidth={2}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Comment (optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Share your experience..."
              placeholderTextColor={Colors.semantic.tabInactive}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
              editable={!isSubmitting}
            />
            <Text style={styles.characterCount}>{comment.length}/500</Text>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[
                styles.submitButton,
                (isSubmitting || rating === 0) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting || rating === 0}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Submit Review</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={styles.skipButtonText}>Skip for Now</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: Colors.semantic.card,
    borderRadius: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.cardBorder,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.headingText,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.semantic.cardBorder,
  },
  content: {
    padding: 20,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.headingText,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
    paddingVertical: 8,
  },
  starButton: {
    padding: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.headingText,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Colors.semantic.screen,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.semantic.bodyText,
    borderWidth: 1,
    borderColor: Colors.semantic.cardBorder,
    minHeight: 120,
  },
  characterCount: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: Colors.semantic.errorAlert,
    marginBottom: 16,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.semantic.tabInactive,
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  skipButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.tabInactive,
  },
});
