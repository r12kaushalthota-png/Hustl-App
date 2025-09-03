import type { MenuItem, CartItem, SelectedModifier, FoodOrder } from '@/types/food';

export class FoodOrderUtils {
  /**
   * Calculate item price with modifiers
   */
  static calculateItemPrice(item: MenuItem, selectedOptions: SelectedModifier[], quantity: number = 1): number {
    const modifierTotal = selectedOptions.reduce((sum, option) => sum + option.priceDelta, 0);
    return (item.basePrice + modifierTotal) * quantity;
  }

  /**
   * Calculate cart totals
   */
  static calculateCartTotals(items: CartItem[], fees: number = 0, taxRate: number = 0.065, tipPercent: number = 0): {
    subtotal: number;
    tax: number;
    tip: number;
    total: number;
  } {
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const tax = Math.round((subtotal + fees) * taxRate);
    const tip = Math.round((subtotal + fees) * (tipPercent / 100));
    const total = subtotal + fees + tax + tip;

    return { subtotal, tax, tip, total };
  }

  /**
   * Format price in cents to dollar string
   */
  static formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  /**
   * Create cart item from menu item and selections
   */
  static createCartItem(
    item: MenuItem, 
    selectedOptions: SelectedModifier[], 
    quantity: number = 1,
    notes?: string
  ): CartItem {
    const lineTotal = this.calculateItemPrice(item, selectedOptions, quantity);
    
    return {
      id: `${item.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Unique cart item ID
      name: item.name,
      quantity,
      basePrice: item.basePrice,
      selectedOptions,
      notes,
      lineTotal,
    };
  }

  /**
   * Validate required modifier groups are selected
   */
  static validateModifierSelections(item: MenuItem, selectedOptions: SelectedModifier[]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    for (const group of item.modifierGroups) {
      if (group.required) {
        const groupSelections = selectedOptions.filter(opt => opt.groupId === group.id);
        
        if (groupSelections.length === 0) {
          errors.push(`Please select ${group.name}`);
        } else if (group.type === 'single' && groupSelections.length > 1) {
          errors.push(`Please select only one ${group.name}`);
        } else if (group.type === 'multi') {
          if (group.min && groupSelections.length < group.min) {
            errors.push(`Please select at least ${group.min} ${group.name}`);
          }
          if (group.max && groupSelections.length > group.max) {
            errors.push(`Please select at most ${group.max} ${group.name}`);
          }
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get cart summary for display
   */
  static getCartSummary(items: CartItem[]): { itemCount: number; total: number } {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
    
    return { itemCount, total };
  }

  /**
   * Generate order summary text
   */
  static generateOrderSummary(order: FoodOrder): string {
    const itemsList = order.items.map(item => {
      let summary = `${item.quantity}x ${item.name}`;
      
      if (item.selectedOptions.length > 0) {
        const modifiers = item.selectedOptions.map(opt => opt.name).join(', ');
        summary += ` (${modifiers})`;
      }
      
      if (item.notes) {
        summary += ` - ${item.notes}`;
      }
      
      return summary;
    }).join('\n');

    let orderSummary = `${order.restaurant} Order:\n\n${itemsList}\n\n`;
    orderSummary += `Subtotal: ${this.formatPrice(order.subtotal)}\n`;
    
    if (order.fees > 0) {
      orderSummary += `Fees: ${this.formatPrice(order.fees)}\n`;
    }
    
    if (order.tax > 0) {
      orderSummary += `Tax: ${this.formatPrice(order.tax)}\n`;
    }
    
    if (order.tip > 0) {
      orderSummary += `Tip: ${this.formatPrice(order.tip)}\n`;
    }
    
    orderSummary += `Total: ${this.formatPrice(order.total)}`;
    
    if (order.specialInstructions) {
      orderSummary += `\n\nSpecial Instructions: ${order.specialInstructions}`;
    }

    return orderSummary;
  }
}