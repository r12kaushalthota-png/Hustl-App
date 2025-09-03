import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  TextInput,
  Platform
} from 'react-native';
import { ShoppingCart, CreditCard as Edit3, Trash2, Plus, Minus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/theme/colors';
import { useFoodOrder } from '@/contexts/FoodOrderContext';
import { FoodOrderUtils } from '@/lib/foodOrderUtils';

interface CartSummaryProps {
  onEditItems: () => void;
}

const tipPresets = [0, 10, 15, 20];

export default function CartSummary({ onEditItems }: CartSummaryProps) {
  const { 
    cartItems, 
    fees, 
    setFees, 
    tipPercent, 
    setTipPercent, 
    specialInstructions, 
    setSpecialInstructions,
    updateCartItemQuantity,
    removeFromCart,
    getFinalOrder
  } = useFoodOrder();

  const [customTip, setCustomTip] = useState('');
  const [showCustomTip, setShowCustomTip] = useState(false);

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handleQuantityChange = (cartItemId: string, delta: number) => {
    triggerHaptics();
    const item = cartItems.find(item => item.id === cartItemId);
    if (item) {
      const newQuantity = Math.max(0, item.quantity + delta);
      updateCartItemQuantity(cartItemId, newQuantity);
    }
  };

  const handleRemoveItem = (cartItemId: string) => {
    triggerHaptics();
    removeFromCart(cartItemId);
  };

  const handleTipPresetSelect = (percent: number) => {
    triggerHaptics();
    setTipPercent(percent);
    setShowCustomTip(false);
    setCustomTip('');
  };

  const handleCustomTipSubmit = () => {
    const customPercent = parseFloat(customTip);
    if (!isNaN(customPercent) && customPercent >= 0 && customPercent <= 100) {
      setTipPercent(customPercent);
      setShowCustomTip(false);
      setCustomTip('');
    }
  };

  if (cartItems.length === 0) {
    return (
      <View style={styles.emptyCart}>
        <ShoppingCart size={48} color={Colors.semantic.tabInactive} strokeWidth={1} />
        <Text style={styles.emptyCartText}>No items in cart</Text>
        <TouchableOpacity style={styles.addItemsButton} onPress={onEditItems}>
          <Text style={styles.addItemsButtonText}>Add Items</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const order = getFinalOrder();
  if (!order) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Order Summary</Text>
        <TouchableOpacity style={styles.editButton} onPress={onEditItems}>
          <Edit3 size={16} color={Colors.primary} strokeWidth={2} />
          <Text style={styles.editButtonText}>Edit Items</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cart Items */}
        <View style={styles.itemsList}>
          {cartItems.map((item) => (
            <View key={item.id} style={styles.cartItem}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
                
                {item.selectedOptions.length > 0 && (
                  <Text style={styles.itemModifiers} numberOfLines={2}>
                    {item.selectedOptions.map(opt => opt.name).join(', ')}
                  </Text>
                )}
                
                {item.notes && (
                  <Text style={styles.itemNotes} numberOfLines={1}>
                    Note: {item.notes}
                  </Text>
                )}
                
                <Text style={styles.itemPrice}>
                  {FoodOrderUtils.formatPrice(item.lineTotal)}
                </Text>
              </View>
              
              <View style={styles.itemActions}>
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => handleQuantityChange(item.id, -1)}
                  >
                    <Minus size={14} color={Colors.semantic.bodyText} strokeWidth={2} />
                  </TouchableOpacity>
                  
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => handleQuantityChange(item.id, 1)}
                  >
                    <Plus size={14} color={Colors.semantic.bodyText} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveItem(item.id)}
                >
                  <Trash2 size={14} color={Colors.semantic.errorAlert} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Fees Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Fees</Text>
          <View style={styles.feesInput}>
            <Text style={styles.feesLabel}>Delivery/Service Fees</Text>
            <TextInput
              style={styles.feesTextInput}
              value={fees > 0 ? FoodOrderUtils.formatPrice(fees) : ''}
              onChangeText={(text) => {
                const amount = parseFloat(text.replace('$', ''));
                setFees(isNaN(amount) ? 0 : Math.round(amount * 100));
              }}
              placeholder="$0.00"
              placeholderTextColor={Colors.semantic.tabInactive}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Tip Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tip</Text>
          <View style={styles.tipPresets}>
            {tipPresets.map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.tipPreset,
                  tipPercent === preset && styles.activeTipPreset
                ]}
                onPress={() => handleTipPresetSelect(preset)}
              >
                <Text style={[
                  styles.tipPresetText,
                  tipPercent === preset && styles.activeTipPresetText
                ]}>
                  {preset}%
                </Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={[
                styles.tipPreset,
                showCustomTip && styles.activeTipPreset
              ]}
              onPress={() => setShowCustomTip(true)}
            >
              <Text style={[
                styles.tipPresetText,
                showCustomTip && styles.activeTipPresetText
              ]}>
                Custom
              </Text>
            </TouchableOpacity>
          </View>
          
          {showCustomTip && (
            <View style={styles.customTipContainer}>
              <TextInput
                style={styles.customTipInput}
                value={customTip}
                onChangeText={setCustomTip}
                onSubmitEditing={handleCustomTipSubmit}
                placeholder="Enter tip %"
                placeholderTextColor={Colors.semantic.tabInactive}
                keyboardType="decimal-pad"
                autoFocus
              />
              <TouchableOpacity style={styles.customTipSubmit} onPress={handleCustomTipSubmit}>
                <Text style={styles.customTipSubmitText}>Set</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Special Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Special Instructions</Text>
          <TextInput
            style={styles.instructionsInput}
            value={specialInstructions}
            onChangeText={setSpecialInstructions}
            placeholder="Any special requests for the entire order..."
            placeholderTextColor={Colors.semantic.tabInactive}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Order Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{FoodOrderUtils.formatPrice(order.subtotal)}</Text>
          </View>
          
          {order.fees > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Fees</Text>
              <Text style={styles.totalValue}>{FoodOrderUtils.formatPrice(order.fees)}</Text>
            </View>
          )}
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax (6.5%)</Text>
            <Text style={styles.totalValue}>{FoodOrderUtils.formatPrice(order.tax)}</Text>
          </View>
          
          {order.tip > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tip ({tipPercent}%)</Text>
              <Text style={styles.totalValue}>{FoodOrderUtils.formatPrice(order.tip)}</Text>
            </View>
          )}
          
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{FoodOrderUtils.formatPrice(order.total)}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.divider,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.headingText,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  content: {
    flex: 1,
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyCartText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.headingText,
  },
  addItemsButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  addItemsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  itemsList: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: Colors.semantic.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.semantic.cardBorder,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    marginBottom: 4,
  },
  itemModifiers: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    marginBottom: 4,
  },
  itemNotes: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary,
  },
  itemActions: {
    alignItems: 'center',
    gap: 8,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.muted,
    borderRadius: 16,
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    minWidth: 20,
    textAlign: 'center',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.divider,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.headingText,
    marginBottom: 12,
  },
  feesInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feesLabel: {
    fontSize: 14,
    color: Colors.semantic.bodyText,
  },
  feesTextInput: {
    borderWidth: 1,
    borderColor: Colors.semantic.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.semantic.inputText,
    backgroundColor: Colors.semantic.inputBackground,
    minWidth: 80,
    textAlign: 'right',
  },
  tipPresets: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tipPreset: {
    flex: 1,
    backgroundColor: Colors.muted,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.semantic.inputBorder,
  },
  activeTipPreset: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tipPresetText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
  },
  activeTipPresetText: {
    color: Colors.white,
  },
  customTipContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  customTipInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.semantic.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.semantic.inputText,
    backgroundColor: Colors.semantic.inputBackground,
  },
  customTipSubmit: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  customTipSubmitText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  instructionsInput: {
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
  totalsSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.muted,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: Colors.semantic.bodyText,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.semantic.divider,
    paddingTop: 12,
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.semantic.headingText,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
});