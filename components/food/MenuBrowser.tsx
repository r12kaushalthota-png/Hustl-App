import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  ScrollView, 
  Image,
  Platform,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ShoppingCart, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/theme/colors';
import { useFoodOrder } from '@/contexts/FoodOrderContext';
import { FoodOrderUtils } from '@/lib/foodOrderUtils';
import type { RestaurantMenu, MenuItem } from '@/types/food';
import ItemDetailModal from './ItemDetailModal';

const { width } = Dimensions.get('window');

// Restaurant data with menus
const restaurants: { id: string; name: string; menu: RestaurantMenu }[] = [
  { id: 'chick-fil-a', name: 'Chick-fil-A', menu: require('@/data/menus/chick-fil-a.json') },
  { id: 'chipotle', name: 'Chipotle', menu: require('@/data/menus/chipotle.json') },
  { id: 'panda-express', name: 'Panda Express', menu: require('@/data/menus/panda-express.json') },
  { id: 'bento', name: 'Bento', menu: require('@/data/menus/bento.json') },
  { id: 'publix', name: 'Publix', menu: require('@/data/menus/publix.json') },
  { id: 'krispy-kreme', name: 'Krispy Kreme', menu: require('@/data/menus/krispy-kreme.json') },
  { id: 'relish', name: 'Relish', menu: require('@/data/menus/relish.json') },
  { id: 'blaze-pizza', name: 'Blaze Pizza', menu: require('@/data/menus/blaze-pizza.json') },
  { id: 'dunkin', name: "Dunkin'", menu: require('@/data/menus/dunkin.json') },
  { id: 'starbucks', name: 'Starbucks', menu: require('@/data/menus/starbucks.json') },
  { id: 'mcdonalds', name: "McDonald's", menu: require('@/data/menus/mcdonalds.json') },
  { id: 'jimmy-johns', name: "Jimmy John's", menu: require('@/data/menus/jimmy-johns.json') },
  { id: 'subway', name: 'Subway', menu: require('@/data/menus/subway.json') },
  { id: 'pita-pit', name: 'Pita Pit', menu: require('@/data/menus/pita-pit.json') },
  { id: 'krishna-lunch', name: 'Krishna Lunch', menu: require('@/data/menus/krishna-lunch.json') },
];

interface MenuBrowserProps {
  visible: boolean;
  onClose: () => void;
}

export default function MenuBrowser({ visible, onClose }: MenuBrowserProps) {
  const insets = useSafeAreaInsets();
  const { selectedRestaurant, setSelectedRestaurant, getCartSummary } = useFoodOrder();
  
  const [selectedRestaurantData, setSelectedRestaurantData] = useState<{ id: string; name: string; menu: RestaurantMenu } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showItemDetail, setShowItemDetail] = useState(false);

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handleRestaurantSelect = (restaurant: { id: string; name: string; menu: RestaurantMenu }) => {
    triggerHaptics();
    setSelectedRestaurantData(restaurant);
    setSelectedRestaurant(restaurant.name);
    
    // Auto-select first category
    if (restaurant.menu.categories.length > 0) {
      setSelectedCategory(restaurant.menu.categories[0].id);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    triggerHaptics();
    setSelectedCategory(categoryId);
  };

  const handleItemSelect = (item: MenuItem) => {
    triggerHaptics();
    setSelectedItem(item);
    setShowItemDetail(true);
  };

  const handleBack = () => {
    if (selectedRestaurantData) {
      setSelectedRestaurantData(null);
      setSelectedCategory('');
    } else {
      onClose();
    }
  };

  const cartSummary = getCartSummary();

  const renderRestaurantGrid = () => (
    <View style={styles.restaurantGrid}>
      {restaurants.map((restaurant) => (
        <TouchableOpacity
          key={restaurant.id}
          style={styles.restaurantCard}
          onPress={() => handleRestaurantSelect(restaurant)}
          activeOpacity={0.7}
        >
          <View style={styles.restaurantContent}>
            <Text style={styles.restaurantName}>{restaurant.name}</Text>
            <Text style={styles.restaurantSubtitle}>
              {restaurant.menu.items.length} items
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderMenu = () => {
    if (!selectedRestaurantData) return null;

    const { menu } = selectedRestaurantData;
    const selectedCategoryData = menu.categories.find(cat => cat.id === selectedCategory);
    const categoryItems = menu.items.filter(item => item.categories.includes(selectedCategory));

    return (
      <View style={styles.menuContainer}>
        {/* Category Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryTabs}
        >
          {menu.categories
            .sort((a, b) => a.order - b.order)
            .map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryTab,
                  selectedCategory === category.id && styles.activeCategoryTab
                ]}
                onPress={() => handleCategorySelect(category.id)}
              >
                <Text style={[
                  styles.categoryTabText,
                  selectedCategory === category.id && styles.activeCategoryTabText
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
        </ScrollView>

        {/* Menu Items */}
        <ScrollView style={styles.menuItems} showsVerticalScrollIndicator={false}>
          <View style={styles.itemsGrid}>
            {categoryItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItemCard}
                onPress={() => handleItemSelect(item)}
                activeOpacity={0.7}
              >
                <Image source={{ uri: item.image }} style={styles.itemImage} />
                <View style={styles.itemContent}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.itemDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                  <View style={styles.itemFooter}>
                    <Text style={styles.itemPrice}>
                      {FoodOrderUtils.formatPrice(item.basePrice)}
                    </Text>
                    <View style={styles.addButton}>
                      <Plus size={16} color={Colors.primary} strokeWidth={2} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={handleBack}
      >
        <View style={[styles.container, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <ArrowLeft size={24} color={Colors.white} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {selectedRestaurantData ? selectedRestaurantData.name : 'Choose Restaurant'}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={Colors.white} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Cart Summary */}
          {cartSummary.itemCount > 0 && (
            <View style={styles.cartSummary}>
              <View style={styles.cartInfo}>
                <ShoppingCart size={16} color={Colors.primary} strokeWidth={2} />
                <Text style={styles.cartText}>
                  {cartSummary.itemCount} item{cartSummary.itemCount !== 1 ? 's' : ''} • {FoodOrderUtils.formatPrice(cartSummary.total)}
                </Text>
              </View>
            </View>
          )}

          {/* Content */}
          {selectedRestaurantData ? renderMenu() : renderRestaurantGrid()}
        </View>
      </Modal>

      {/* Item Detail Modal */}
      <ItemDetailModal
        visible={showItemDetail}
        onClose={() => {
          setShowItemDetail(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
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
    backgroundColor: Colors.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white + '33',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white + '33',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
    textAlign: 'center',
    flex: 1,
  },
  cartSummary: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.divider,
  },
  cartInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cartText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  restaurantGrid: {
    padding: 16,
    gap: 12,
  },
  restaurantCard: {
    backgroundColor: Colors.semantic.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.semantic.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  restaurantContent: {
    alignItems: 'center',
    gap: 4,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    textAlign: 'center',
  },
  restaurantSubtitle: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
  },
  menuContainer: {
    flex: 1,
  },
  categoryTabs: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryTab: {
    backgroundColor: Colors.muted,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.semantic.inputBorder,
  },
  activeCategoryTab: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.semantic.bodyText,
  },
  activeCategoryTabText: {
    color: Colors.white,
  },
  menuItems: {
    flex: 1,
  },
  itemsGrid: {
    padding: 16,
    gap: 12,
  },
  menuItemCard: {
    backgroundColor: Colors.semantic.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.semantic.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemImage: {
    width: '100%',
    height: 120,
  },
  itemContent: {
    padding: 16,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    lineHeight: 20,
    marginBottom: 12,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
});