import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/theme/colors';
import { YEAR_OPTIONS, ProfileFormData } from '@/lib/validation';

interface YearSelectorProps {
  value: ProfileFormData['year'];
  onSelect: (year: ProfileFormData['year']) => void;
  error?: string;
  disabled?: boolean;
}

export default function YearSelector({ value, onSelect, error, disabled }: YearSelectorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.segmentedControl}>
        {YEAR_OPTIONS.map((year) => (
          <TouchableOpacity
            key={year}
            style={[
              styles.segment,
              value === year && styles.activeSegment,
              disabled && styles.disabledSegment
            ]}
            onPress={() => !disabled && onSelect(year)}
            disabled={disabled}
            accessibilityLabel={`Select ${year}`}
            accessibilityRole="button"
          >
            <Text style={[
              styles.segmentText,
              value === year && styles.activeSegmentText,
              disabled && styles.disabledSegmentText
            ]}>
              {year}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.muted,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.semantic.inputBorder,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  activeSegment: {
    backgroundColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledSegment: {
    opacity: 0.5,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
  },
  activeSegmentText: {
    color: Colors.white,
  },
  disabledSegmentText: {
    color: Colors.semantic.tabInactive,
  },
});