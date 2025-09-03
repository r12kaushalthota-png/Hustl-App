import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  ScrollView, 
  TextInput,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, Search, Check, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/theme/colors';
import { ALLOWED_MAJORS } from '@/lib/validation';

interface MajorSelectorProps {
  value: string;
  onSelect: (major: string) => void;
  error?: string;
  disabled?: boolean;
}

export default function MajorSelector({ value, onSelect, error, disabled }: MajorSelectorProps) {
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handleOpen = () => {
    if (disabled) return;
    triggerHaptics();
    setIsOpen(true);
    setSearchQuery('');
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleSelect = (major: string) => {
    triggerHaptics();
    onSelect(major);
    handleClose();
  };

  const getFilteredMajors = () => {
    if (!searchQuery.trim()) return ALLOWED_MAJORS;
    
    const query = searchQuery.toLowerCase();
    return ALLOWED_MAJORS.filter(major => 
      major.toLowerCase().includes(query)
    );
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.selector,
          error && styles.selectorError,
          disabled && styles.selectorDisabled
        ]}
        onPress={handleOpen}
        disabled={disabled}
        accessibilityLabel="Select major"
        accessibilityRole="button"
      >
        <Text style={[
          styles.selectorText,
          !value && styles.placeholderText,
          disabled && styles.disabledText
        ]}>
          {value || 'Select your major'}
        </Text>
        <ChevronDown 
          size={20} 
          color={disabled ? Colors.semantic.tabInactive : Colors.semantic.bodyText} 
          strokeWidth={2} 
        />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Major</Text>
              <TouchableOpacity style={styles.modalCloseButton} onPress={handleClose}>
                <X size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Search size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search majors..."
                  placeholderTextColor={Colors.semantic.tabInactive}
                  autoFocus
                />
              </View>
            </View>

            <ScrollView style={styles.majorsList} showsVerticalScrollIndicator={false}>
              {getFilteredMajors().map((major) => (
                <TouchableOpacity
                  key={major}
                  style={[
                    styles.majorOption,
                    value === major && styles.selectedMajorOption
                  ]}
                  onPress={() => handleSelect(major)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.majorOptionText,
                    value === major && styles.selectedMajorOptionText
                  ]}>
                    {major}
                  </Text>
                  {value === major && (
                    <Check size={16} color={Colors.primary} strokeWidth={2} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.semantic.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.semantic.inputBackground,
    minHeight: 56,
  },
  selectorError: {
    borderColor: Colors.semantic.errorAlert,
  },
  selectorDisabled: {
    backgroundColor: Colors.muted,
    opacity: 0.6,
  },
  selectorText: {
    fontSize: 16,
    color: Colors.semantic.inputText,
    flex: 1,
  },
  placeholderText: {
    color: Colors.semantic.tabInactive,
  },
  disabledText: {
    color: Colors.semantic.tabInactive,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Colors.semantic.screen,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.divider,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.headingText,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.muted,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.semantic.inputText,
  },
  majorsList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  majorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.divider,
  },
  selectedMajorOption: {
    backgroundColor: Colors.primary + '10',
  },
  majorOptionText: {
    fontSize: 16,
    color: Colors.semantic.bodyText,
    flex: 1,
  },
  selectedMajorOptionText: {
    color: Colors.primary,
    fontWeight: '600',
  },
});