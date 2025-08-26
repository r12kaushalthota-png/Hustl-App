import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  interpolate,
  withRepeat,
  withSequence
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { GamificationRepo } from '@/lib/gamificationRepo';

interface XPProgressBarProps {
  currentXP: number;
  currentLevel: number;
  showDetails?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export default function XPProgressBar({ 
  currentXP, 
  currentLevel, 
  showDetails = true,
  size = 'medium' 
}: XPProgressBarProps) {
  const progressWidth = useSharedValue(0);
  const progressOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0.3);

  const progress = GamificationRepo.calculateXPProgress(currentXP, currentLevel);
  
  const barHeight = size === 'small' ? 6 : size === 'large' ? 10 : 8;
  const textSize = size === 'small' ? 12 : size === 'large' ? 18 : 16;

  useEffect(() => {
    progressOpacity.value = withTiming(1, { duration: 300 });
    progressWidth.value = withSpring(progress.progress, { damping: 15, stiffness: 300 });
    
    // Subtle glow animation
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 1500 }),
        withTiming(0.3, { duration: 1500 })
      ),
      -1,
      true
    );
  }, [progress.progress]);

  const animatedProgressStyle = useAnimatedStyle(() => {
    const width = interpolate(progressWidth.value, [0, 1], [0, 100]);
    return {
      width: `${width}%`,
      opacity: progressOpacity.value,
    };
  });

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: progressOpacity.value,
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));

  const getLevelColor = (level: number): string => {
    if (level >= 10) return '#FFD700'; // Gold
    if (level >= 7) return '#C0C0C0'; // Silver
    if (level >= 4) return '#CD7F32'; // Bronze
    return '#3B82F6'; // Blue
  };
  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      {showDetails && (
        <View style={styles.header}>
          <Animated.View style={[
            styles.levelBadge,
            { 
              backgroundColor: getLevelColor(currentLevel),
              shadowColor: getLevelColor(currentLevel)
            },
            animatedGlowStyle
          ]}>
            <LinearGradient
              colors={[getLevelColor(currentLevel), getLevelColor(currentLevel) + 'CC']}
              style={styles.levelBadgeGradient}
            >
              <Text style={[styles.levelText, { fontSize: textSize }]}>
                Level {currentLevel}
              </Text>
            </LinearGradient>
          </Animated.View>
          <Text style={[styles.xpText, { fontSize: textSize - 2 }]}>
            {GamificationRepo.formatXP(currentXP)}
          </Text>
        </View>
      )}
      
      <Animated.View style={[
        styles.progressBar, 
        { 
          height: barHeight,
          shadowColor: Colors.primary
        },
        animatedGlowStyle
      ]}>
        <Animated.View style={[styles.progressFill, animatedProgressStyle]}>
          <LinearGradient
            colors={['#0047FF', '#0021A5']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.progressGradient}
          />
        </Animated.View>
      </Animated.View>
      
      {showDetails && progress.xpToNext > 0 && (
        <Text style={[styles.nextLevelText, { fontSize: textSize - 2 }]}>
          {progress.xpToNext} XP to Level {currentLevel + 1}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelBadge: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },
  levelBadgeGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelText: {
    fontWeight: '700',
    color: Colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  xpText: {
    fontWeight: '600',
    color: Colors.semantic.bodyText,
  },
  progressBar: {
    backgroundColor: 'rgba(229, 231, 235, 0.6)',
    borderRadius: 6,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressGradient: {
    flex: 1,
  },
  nextLevelText: {
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
    fontWeight: '600',
  },
});