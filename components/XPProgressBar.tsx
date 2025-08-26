import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  interpolate
} from 'react-native-reanimated';
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

  const progress = GamificationRepo.calculateXPProgress(currentXP, currentLevel);
  
  const barHeight = size === 'small' ? 4 : size === 'large' ? 8 : 6;
  const textSize = size === 'small' ? 12 : size === 'large' ? 16 : 14;

  useEffect(() => {
    progressOpacity.value = withTiming(1, { duration: 300 });
    progressWidth.value = withSpring(progress.progress, { damping: 15, stiffness: 300 });
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

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      {showDetails && (
        <View style={styles.header}>
          <View style={styles.levelBadge}>
            <Text style={[styles.levelText, { fontSize: textSize }]}>
              Level {currentLevel}
            </Text>
          </View>
          <Text style={[styles.xpText, { fontSize: textSize - 2 }]}>
            {GamificationRepo.formatXP(currentXP)}
          </Text>
        </View>
      )}
      
      <View style={[styles.progressBar, { height: barHeight }]}>
        <Animated.View style={[styles.progressFill, animatedProgressStyle]} />
      </View>
      
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
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  levelText: {
    fontWeight: '700',
    color: Colors.white,
  },
  xpText: {
    fontWeight: '600',
    color: Colors.semantic.bodyText,
  },
  progressBar: {
    backgroundColor: Colors.muted,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  nextLevelText: {
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
    fontWeight: '500',
  },
});