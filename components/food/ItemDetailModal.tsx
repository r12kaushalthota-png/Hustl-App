import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  ScrollView, 
  TextInput,
  Image,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Plus, Minus, ShoppingCart } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { useFoodOrder } from '@/contexts/FoodOrderContext';
import { FoodOrderUtils } from '@/lib/foodOrderUtils';
import type { MenuItem, SelectedModifier, ModifierGroup } from '@/types/food';
import Toast from '@/components/Toast';

interface ItemDetailModalProps {
  visible: boolean;
  onClose: () => void;
  item: MenuItem | null;
}

export default function ItemDetailModal({ visible, onClose, item }: ItemDetailModalProps) {
  const insets = useSafeAreaInsets();
  const { addToCart } = useFoodOrder();
  
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<SelectedModifier[]>([]);
  const [notes, setNotes] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: ''
  });

  // Reset state when item changes
  useEffect(() => {
    if (item) {
      setQuantity(1);
      setSelectedOptions([]);
      setNotes('');
      setValidationErrors([]);
    }
  }, [item]);

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handleOptionSelect = (groupId: string, optionId: string, optionName: string, priceDelta: number, group: ModifierGroup) => {
    triggerHaptics();
    
    setSelectedOptions(prev => {
      if (group.type === 'single') {
        // Replace any existing selection for this group
        return [
          ...prev.filter(opt => opt.groupId !== groupId),
          { groupId, optionId, name: optionName, priceDelta }
        ];
      } else {
        // Multi-select: toggle option
        const existingIndex = prev.findIndex(opt => opt.groupId === groupId && opt.optionId === optionId);
        
        if (existingIndex >= 0) {
          // Remove existing selection
          return prev.filter((_, index) => index !== existingIndex);
        } else {
          // Add new selection (check max limit)
          const groupSelections = prev.filter(opt => opt.groupId === groupId);
          if (group.max && groupSelections.length >= group.max) {
            return prev; // Don't add if at max
          }
          return [...prev, { groupId, optionId, name: optionName, priceDelta }];
        }
      }
    });
  };

  const isOptionSelected = (groupId: string, optionId: string): boolean => {
    return selectedOptions.some(opt => opt.groupId === groupId && opt.optionId === optionId);
  };

  const getGroupSelectionCount = (groupId: string): number => {
    return selectedOptions.filter(opt => opt.groupId === groupId).length;
  };

  const handleQuantityChange = (delta: number) => {
    triggerHaptics();
    const newQuantity = Math.max(1, Math.min(10, quantity + delta));
    setQuantity(newQuantity);
  };

  const handleAddToCart = () => {
    if (!item) return;

    // Validate selections
    const validation = FoodOrderUtils.validateModifierSelections(item, selectedOptions);
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    triggerHaptics();
    
    // Create cart item
    const cartItem = FoodOrderUtils.createCartItem(item, selectedOptions, quantity, notes || undefined);
    
    // Add to cart
    addToCart(cartItem);
    
    // Show success toast
    setToast({
      visible: true,
      message: `Added ${quantity}x ${item.name} to cart`
    });
    
    // Close modal after short delay
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const calculateCurrentPrice = (): number => {
    if (!item) return 0;
    return FoodOrderUtils.calculateItemPrice(item, selectedOptions, quantity);
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  if (!item) return null;

  const currentPrice = calculateCurrentPrice();

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={[styles.container, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={Colors.semantic.bodyText} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Customize Item</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Item Header */}
            <View style={styles.itemHeader}>
              <Image source={{ uri: item.image }} style={styles.itemImage} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDescription}>{item.description}</Text>
                <Text style={styles.itemBasePrice}>
                  Base Price: {FoodOrderUtils.formatPrice(item.basePrice)}
                </Text>
              </View>
            </View>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <View style={styles.errorContainer}>
                {validationErrors.map((error, index) => (
                  <Text key={index} style={styles.errorText}>• {error}</Text>
                ))}
              </View>
            )}

            {/* Modifier Groups */}
            {item.modifierGroups.map((group) => (
              <View key={group.id} style={styles.modifierGroup}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupTitle}>
                    {group.name}
                    {group.required && <Text style={styles.requiredIndicator}> *</Text>}
                  </Text>
                  {group.type === 'multi' && (
                    <Text style={styles.groupSubtitle}>
                      {group.max ? `Select up to ${group.max}` : 'Select multiple'}
                      {getGroupSelectionCount(group.id) > 0 && ` (${getGroupSelectionCount(group.id)} selected)`}
                    </Text>
                  )}
                </View>
                
                <View style={styles.optionsContainer}>
                  {group.options.map((option) => {
                    const isSelected = isOptionSelected(group.id, option.id);
                    const canSelect = group.type === 'single' || 
                      !group.max || 
                      getGroupSelectionCount(group.id) < group.max || 
                      isSelected;
                    
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.optionItem,
                          isSelected && styles.selectedOption,
                          !canSelect && styles.disabledOption
                        ]}
                        onPress={() => handleOptionSelect(group.id, option.id, option.name, option.priceDelta, group)}
                        disabled={!canSelect}
                      >
                        <View style={styles.optionContent}>
                          <Text style={[
                            styles.optionName,
                            isSelected && styles.selectedOptionText,
                            !canSelect && styles.disabledOptionText
                          ]}>
                            {option.name}
                          </Text>
                          {option.priceDelta !== 0 && (
                            <Text style={[
                              styles.optionPrice,
                              isSelected && styles.selectedOptionText
                            ]}>
                              {option.priceDelta > 0 ? '+' : ''}{FoodOrderUtils.formatPrice(option.priceDelta)}
                            </Text>
                          )}
                        </View>
                        
                        <View style={[
                          styles.optionSelector,
                          isSelected && styles.selectedSelector
                        ]}>
                          {isSelected && (
                            <View style={styles.selectedDot} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            {/* Special Instructions */}
            <View style={styles.notesSection}>
              <Text style={styles.notesTitle}>Special Instructions</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any special requests for this item..."
                placeholderTextColor={Colors.semantic.tabInactive}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            {/* Quantity Selector */}
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                style={[styles.quantityButton, quantity <= 1 && styles.quantityButtonDisabled]}
                onPress={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
              >
                <Minus size={16} color={quantity <= 1 ? Colors.semantic.tabInactive : Colors.semantic.bodyText} strokeWidth={2} />
              </TouchableOpacity>
              
              <Text style={styles.quantityText}>{quantity}</Text>
              
              <TouchableOpacity
                style={[styles.quantityButton, quantity >= 10 && styles.quantityButtonDisabled]}
                onPress={() => handleQuantityChange(1)}
                disabled={quantity >= 10}
              >
                <Plus size={16} color={quantity >= 10 ? Colors.semantic.tabInactive : Colors.semantic.bodyText} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Add to Cart Button */}
            <TouchableOpacity
              style={styles.addToCartButton}
              onPress={handleAddToCart}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#0047FF', '#0021A5']}
                style={styles.addToCartGradient}
              >
                <ShoppingCart size={18} color={Colors.white} strokeWidth={2} />
                <Text style={styles.addToCartText}>
                  Add to Cart • {FoodOrderUtils.formatPrice(currentPrice)}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast
        visible={toast.visible}
        message={toast.message}
        onHide={hideToast}
        duration={1500}
      />
    </>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.divider,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.headingText,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  itemHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.divider,
  },
  itemImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
  },
  itemInfo: {
    gap: 8,
  },
  itemName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.semantic.headingText,
  },
  itemDescription: {
    fontSize: 16,
    color: Colors.semantic.bodyText,
    lineHeight: 24,
  },
  itemBasePrice: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.secondary,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: Colors.semantic.errorAlert,
    marginBottom: 4,
  },
  modifierGroup: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.divider,
  },
  groupHeader: {
    marginBottom: 12,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.headingText,
  },
  requiredIndicator: {
    color: Colors.semantic.errorAlert,
  },
  groupSubtitle: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    marginTop: 4,
  },
  optionsContainer: {
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.semantic.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.semantic.cardBorder,
  },
  selectedOption: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  disabledOption: {
    opacity: 0.5,
  },
  optionContent: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.semantic.bodyText,
  },
  selectedOptionText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  disabledOptionText: {
    color: Colors.semantic.tabInactive,
  },
  optionPrice: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    marginTop: 2,
  },
  optionSelector: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.semantic.inputBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedSelector: {
    borderColor: Colors.primary,
  },
  selectedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  notesSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: Colors.semantic.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.semantic.inputText,
    backgroundColor: Colors.semantic.inputBackground,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  footer: {
    backgroundColor: Colors.semantic.screen,
    borderTopWidth: 1,
    borderTopColor: Colors.semantic.divider,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 20,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.semantic.inputBorder,
  },
  quantityButtonDisabled: {
    backgroundColor: Colors.semantic.inputBackground,
  },
  quantityText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    minWidth: 40,
    textAlign: 'center',
  },
  addToCartButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addToCartGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  addToCartText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
});