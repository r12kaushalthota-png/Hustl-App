export interface MenuItem {
  id: string;
  name: string;
  description: string;
  basePrice: number; // in cents
  image: string;
  categories: string[];
  modifierGroups: ModifierGroup[];
}

export interface ModifierGroup {
  id: string;
  name: string;
  type: 'single' | 'multi';
  required: boolean;
  min?: number;
  max?: number;
  options: ModifierOption[];
}

export interface ModifierOption {
  id: string;
  name: string;
  priceDelta: number; // in cents
}

export interface MenuCategory {
  id: string;
  name: string;
  order: number;
}

export interface RestaurantMenu {
  restaurant: string;
  categories: MenuCategory[];
  items: MenuItem[];
}

export interface SelectedModifier {
  groupId: string;
  optionId: string;
  name: string;
  priceDelta: number;
}

export interface CartItem {
  id: string;
  name: string;
  quantity: number;
  basePrice: number;
  selectedOptions: SelectedModifier[];
  notes?: string;
  lineTotal: number;
}

export interface FoodOrder {
  restaurant: string;
  items: CartItem[];
  items: CartItem[];
  subtotal: number;
  fees: number;
  tax: number;
  tip: number;
  total: number;
  specialInstructions?: string;
}

export interface CartSummary {
  itemCount: number;
  total: number;
}