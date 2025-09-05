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
import { X, ShoppingCart, Plus, ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/theme/colors';
import { useFoodOrder } from '@/contexts/FoodOrderContext';
import { FoodOrderUtils } from '@/lib/foodOrderUtils';
import type { RestaurantMenu, MenuItem } from '@/types/food';
import ItemDetailModal from './ItemDetailModal';

const { width } = Dimensions.get('window');

// Restaurant data with menus and logos
const restaurants: { id: string; name: string; menu: RestaurantMenu; logo: string }[] = [
  { 
    id: 'chick-fil-a', 
    name: 'Chick-fil-A', 
    menu: require('@/data/menus/chick-fil-a.json'),
    logo: 'https://images.pexels.com/photos/2983101/pexels-photo-2983101.jpeg?auto=compress&cs=tinysrgb&w=100'
  },
  { 
    id: 'chipotle', 
    name: 'Chipotle', 
    menu: require('@/data/menus/chipotle.json'),
    logo: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=100'
  },
  { 
    id: 'panda-express', 
    name: 'Panda Express', 
    menu: require('@/data/menus/panda-express.json'),
    logo: 'https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg?auto=compress&cs=tinysrgb&w=100'
  },
  { 
    id: 'starbucks', 
    name: 'Starbucks', 
    menu: require('@/data/menus/starbucks.json'),
    logo: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=100'
  },
  { 
    id: 'mcdonalds', 
    name: "McDonald's", 
    menu: require('@/data/menus/mcdonalds.json'),
    logo: 'https://images.pexels.com/photos/2983101/pexels-photo-2983101.jpeg?auto=compress&cs=tinysrgb&w=100'
  },
  { 
    id: 'subway', 
    name: 'Subway', 
    menu: require('@/data/menus/subway.json'),
    logo: 'https://images.pexels.com/photos/7595072/pexels-photo-7595072.jpeg?auto=compress&cs=tinysrgb&w=100'
  },
  { 
    id: 'dunkin', 
    name: "Dunkin'", 
    menu: require('@/data/menus/dunkin.json'),
    logo: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=100'
  },
  { 
    id: 'taco-bell', 
    name: 'Taco Bell', 
    menu: require('@/data/menus/taco-bell.json'),
    logo: 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=100'
  },
];

interface MenuBrowserProps {
  visible: boolean;
  onClose: () => void;
}

export default function MenuBrowser({ visible, onClose }: MenuBrowserProps) {
  const insets = useSafeAreaInsets();
  const { selectedRestaurant, setSelectedRestaurant, getCartSummary } = useFoodOrder();
  
  const [selectedRestaurantData, setSelectedRestaurantData] = useState<{ id: string; name: string; menu: RestaurantMenu; logo: string } | null>(null);
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

  const handleRestaurantSelect = (restaurant: { id: string; name: string; menu: RestaurantMenu; logo: string }) => {
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
    <ScrollView style={styles.restaurantContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.restaurantGrid}>
        {restaurants.map((restaurant) => (
          <TouchableOpacity
            key={restaurant.id}
            style={styles.restaurantCard}
            onPress={() => handleRestaurantSelect(restaurant)}
            activeOpacity={0.7}
          >
            <View style={styles.restaurantHeader}>
              <Image source={{ uri: restaurant.logo }} style={styles.restaurantLogo} />
              <View style={styles.restaurantInfo}>
                <Text style={styles.restaurantName}>{restaurant.name}</Text>
                <Text style={styles.restaurantSubtitle}>
                  {restaurant.menu.items.length} items available
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderMenu = () => {
    if (!selectedRestaurantData) return null;

    const { menu } = selectedRestaurantData;
    const categoryItems = menu.items.filter(item => item.categories.includes(selectedCategory));

    return (
      <View style={styles.menuContainer}>
        {/* Fixed Category Tabs */}
        <View style={styles.categoryTabsContainer}>
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
                  activeOpacity={0.8}
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
        </View>

        {/* Menu Items */}
        <ScrollView 
          style={styles.menuItems} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.menuItemsContent}
        >
          {categoryItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItemCard}
              onPress={() => handleItemSelect(item)}
              activeOpacity={0.8}
            >
              <View style={styles.itemContent}>
                <View style={styles.itemImageContainer}>
                  <Image source={{ uri: item.image }} style={styles.itemImage} />
                </View>
                
                <View style={styles.itemDetails}>
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
                    <TouchableOpacity 
                      style={styles.addButton}
                      onPress={() => handleItemSelect(item)}
                    >
                      <Plus size={18} color={Colors.white} strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
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
          {/* Blue Header with Restaurant Name and Logo */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <ArrowLeft size={24} color={Colors.white} strokeWidth={2} />
            </TouchableOpacity>
            
            <View style={styles.headerCenter}>
              {selectedRestaurantData && (
                <View style={styles.headerRestaurantInfo}>
                  <Image source={{ uri: selectedRestaurantData.logo }} style={styles.headerLogo} />
                  <Text style={styles.headerTitle}>
                    {selectedRestaurantData.name}
                  </Text>
                </View>
              )}
              {!selectedRestaurantData && (
                <Text style={styles.headerTitle}>Choose Restaurant</Text>
              )}
            </View>
            
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={Colors.white} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Cart Summary Bar */}
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
  
  // Blue Header with Restaurant Name and Logo
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRestaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
  },
  
  // Cart Summary
  cartSummary: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229, 231, 235, 0.3)',
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
  
  // Restaurant Selection Grid
  restaurantContainer: {
    flex: 1,
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
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  restaurantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  restaurantLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    marginBottom: 4,
  },
  restaurantSubtitle: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
  },
  
  // Menu Layout
  menuContainer: {
    flex: 1,
  },
  
  // Fixed Category Tabs
  categoryTabsContainer: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229, 231, 235, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryTabs: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  categoryTab: {
    backgroundColor: 'rgba(245, 245, 245, 0.8)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.6)',
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeCategoryTab: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
  },
  activeCategoryTabText: {
    color: Colors.white,
  },
  
  // Menu Items
  menuItems: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  menuItemsContent: {
    padding: 12,
    gap: 8,
  },
  menuItemCard: {
    backgroundColor: Colors.semantic.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 4,
  },
  itemContent: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  itemImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.muted,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 13,
    color: Colors.semantic.tabInactive,
    lineHeight: 18,
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B35', // Orange color for price
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});