import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Star, Gift, X } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  withSequence,
  withDelay,
  interpolate
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { GamificationRepo } from '@/lib/gamificationRepo';

const { width } = Dimensions.get('window');

interface LevelUpModalProps {
  visible: boolean;
  onClose: () => void;
  oldLevel: number;
  newLevel: number;
  creditsAwarded: number;
}

// Confetti particle component
const ConfettiParticle = ({ delay, color }: { delay: number; color: string }) => {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  useEffect(() => {
    const startAnimation = () => {
      const randomX = (Math.random() - 0.5) * 200;
      const randomRotation = Math.random() * 720;
      
      opacity.value = withTiming(1, { duration: 100 });
      translateY.value = withTiming(400, { duration: 2000 });
      translateX.value = withTiming(randomX, { duration: 2000 });
      rotate.value = withTiming(randomRotation, { duration: 2000 });
      
      setTimeout(() => {
        opacity.value = withTiming(0, { duration: 300 });
      }, 1700);
    };

    const timer = setTimeout(startAnimation, delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.confettiParticle, { backgroundColor: color }, animatedStyle]} />
  );
};

export default function LevelUpModal({ 
  visible, 
  onClose, 
  oldLevel, 
  newLevel, 
  creditsAwarded 
}: LevelUpModalProps) {
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const starScale = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  const confettiColors = [Colors.primary, Colors.secondary, '#FFD700', '#FF69B4', '#00CED1'];

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const animatedStarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: starScale.value }],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  useEffect(() => {
    if (visible) {
      // Entrance animation
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      
      // Star animation with delay
      setTimeout(() => {
        starScale.value = withSequence(
          withSpring(1.3, { damping: 10 }),
          withSpring(1, { damping: 15 })
        );
      }, 200);

      // Text animation
      textOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    } else {
      // Exit animation
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.8, { duration: 200 });
      starScale.value = 0;
      textOpacity.value = 0;
    }
  }, [visible]);

  const levelTitle = GamificationRepo.getLevelTitle(newLevel);
  const levelColor = GamificationRepo.getLevelBadgeColor(newLevel);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Confetti */}
        <View style={styles.confettiContainer}>
          {Array.from({ length: 25 }).map((_, index) => (
            <ConfettiParticle
              key={index}
              delay={index * 80}
              color={confettiColors[index % confettiColors.length]}
            />
          ))}
        </View>

        <Animated.View style={[styles.modal, animatedContainerStyle, { paddingBottom: insets.bottom + 32 }]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
          </TouchableOpacity>
          
          <View style={styles.content}>
            <Animated.View style={[styles.starContainer, animatedStarStyle]}>
              <LinearGradient
                colors={[levelColor, levelColor + 'CC']}
                style={styles.starGradient}
              >
                <Star size={40} color={Colors.white} strokeWidth={2} fill={Colors.white} />
              </LinearGradient>
            </Animated.View>
            
            <Animated.View style={[styles.textContainer, animatedTextStyle]}>
              <Text style={styles.levelUpText}>Level Up!</Text>
              <Text style={styles.newLevelText}>
                Level {newLevel}
              </Text>
              <Text style={styles.levelTitleText}>
                {levelTitle}
              </Text>
              
              {creditsAwarded > 0 && (
                <View style={styles.rewardContainer}>
                  <Gift size={20} color={Colors.secondary} strokeWidth={2} />
                  <Text style={styles.rewardText}>
                    +{creditsAwarded} credits earned!
                  </Text>
                </View>
              )}
            </Animated.View>

            <TouchableOpacity style={styles.continueButton} onPress={onClose}>
              <LinearGradient
                colors={[Colors.primary, Colors.secondary]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.continueGradient}
              >
                <Text style={styles.continueButtonText}>Continue Hustling!</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  confettiParticle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    top: '30%',
    left: '50%',
  },
  modal: {
    backgroundColor: Colors.semantic.screen,
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  content: {
    padding: 40,
    alignItems: 'center',
    gap: 24,
  },
  starContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  starGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    gap: 8,
  },
  levelUpText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    textAlign: 'center',
  },
  newLevelText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
  },
  levelTitleText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary + '20',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    marginTop: 8,
  },
  rewardText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary,
  },
  continueButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    width: '100%',
  },
  continueGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
});