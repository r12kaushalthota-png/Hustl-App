import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { CartItem, FoodOrder, RestaurantMenu } from '@/types/food';
import { FoodOrderUtils } from '@/lib/foodOrderUtils';

interface FoodOrderContextType {
  // Cart state
  cartItems: CartItem[];
  selectedRestaurant: string | null;
  
  // Order details
  fees: number;
  taxRate: number;
  tipPercent: number;
  specialInstructions: string;
  
  // Actions
  addToCart: (item: CartItem) => void;
  removeFromCart: (cartItemId: string) => void;
  updateCartItemQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  setSelectedRestaurant: (restaurant: string) => void;
  setFees: (fees: number) => void;
  setTipPercent: (percent: number) => void;
  setSpecialInstructions: (instructions: string) => void;
  
  // Computed values
  getCartSummary: () => { itemCount: number; total: number };
  getFinalOrder: () => FoodOrder | null;
}

const FoodOrderContext = createContext<FoodOrderContextType | undefined>(undefined);

export function FoodOrderProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [fees, setFees] = useState(0);
  const [taxRate] = useState(0.065); // 6.5% tax rate
  const [tipPercent, setTipPercent] = useState(15);
  const [specialInstructions, setSpecialInstructions] = useState('');

  const addToCart = (item: CartItem) => {
    setCartItems(prev => [...prev, item]);
  };

  const removeFromCart = (cartItemId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== cartItemId));
  };

  const updateCartItemQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }

    setCartItems(prev => prev.map(item => {
      if (item.id === cartItemId) {
        const newLineTotal = FoodOrderUtils.calculateItemPrice(
          { basePrice: item.basePrice } as any,
          item.selectedOptions,
          quantity
        );
        return { ...item, quantity, lineTotal: newLineTotal };
      }
      return item;
    }));
  };

  const clearCart = () => {
    setCartItems([]);
    setSelectedRestaurant(null);
    setFees(0);
    setTipPercent(15);
    setSpecialInstructions('');
  };

  const getCartSummary = () => {
    return FoodOrderUtils.getCartSummary(cartItems);
  };

  const getFinalOrder = (): FoodOrder | null => {
    if (!selectedRestaurant || cartItems.length === 0) return null;

    const totals = FoodOrderUtils.calculateCartTotals(cartItems, fees, taxRate, tipPercent);

    return {
      restaurant: selectedRestaurant,
      items: cartItems,
      subtotal: totals.subtotal,
      fees,
      tax: totals.tax,
      tip: totals.tip,
      total: totals.total,
      specialInstructions: specialInstructions || undefined,
    };
  };

  return (
    <FoodOrderContext.Provider value={{
      cartItems,
      selectedRestaurant,
      fees,
      taxRate,
      tipPercent,
      specialInstructions,
      addToCart,
      removeFromCart,
      updateCartItemQuantity,
      clearCart,
      setSelectedRestaurant,
      setFees,
      setTipPercent,
      setSpecialInstructions,
      getCartSummary,
      getFinalOrder,
    }}>
      {children}
    </FoodOrderContext.Provider>
  );
}

export function useFoodOrder() {
  const context = useContext(FoodOrderContext);
  if (context === undefined) {
    throw new Error('useFoodOrder must be used within a FoodOrderProvider');
  }
  return context;
}