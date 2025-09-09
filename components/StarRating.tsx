import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { Colors } from '@/theme/colors';

interface StarRatingProps {
  rating: number;
  size?: number;
  showNumber?: boolean;
  color?: string;
  emptyColor?: string;
}

export default function StarRating({ 
  rating, 
  size = 16, 
  showNumber = true,
  color = '#FFD700',
  emptyColor = '#E5E7EB'
}: StarRatingProps) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  const emptyStars = 5 - Math.ceil(rating);

  const renderStars = () => {
    const stars = [];

    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star
          key={`full-${i}`}
          size={size}
          color={color}
          fill={color}
          strokeWidth={1}
        />
      );
    }

    // Half star
    if (hasHalfStar) {
      stars.push(
        <View key="half" style={styles.halfStarContainer}>
          <Star
            size={size}
            color={emptyColor}
            fill={emptyColor}
            strokeWidth={1}
            style={styles.halfStarBackground}
          />
          <View style={[styles.halfStarOverlay, { width: size / 2 }]}>
            <Star
              size={size}
              color={color}
              fill={color}
              strokeWidth={1}
            />
          </View>
        </View>
      );
    }

    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star
          key={`empty-${i}`}
          size={size}
          color={emptyColor}
          fill={emptyColor}
          strokeWidth={1}
        />
      );
    }

    return stars;
  };

  return (
    <View style={styles.container}>
      <View style={styles.starsContainer}>
        {renderStars()}
      </View>
      {showNumber && (
        <Text style={[styles.ratingText, { fontSize: size * 0.8 }]}>
          {rating.toFixed(1)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  halfStarContainer: {
    position: 'relative',
  },
  halfStarBackground: {
    position: 'absolute',
  },
  halfStarOverlay: {
    overflow: 'hidden',
  },
  ratingText: {
    fontWeight: '600',
    color: Colors.semantic.bodyText,
  },
});