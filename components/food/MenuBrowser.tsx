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
  Dimensions,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Search, ShoppingCart } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/theme/colors';
import { useFoodOrder } from '@/contexts/FoodOrderContext';
import { FoodOrderUtils } from '@/lib/foodOrderUtils';
import type { RestaurantMenu, MenuItem } from '@/types/food';
import ItemDetailModal from './ItemDetailModal';

const { width } = Dimensions.get('window');

interface MenuBrowserProps {
  visible: boolean;
  onClose: () => void;
}

const restaurants = [
  { id: 'chick-fil-a', name: 'Chick-fil-A', color: '#E51636' },
  { id: 'chipotle', name: 'Chipotle', color: '#A81612' },
  { id: 'taco-bell', name: 'Taco Bell', color: '#702F8A' },
];

export default function MenuBrowser({ visible, onClose }: MenuBrowserProps) {
  const insets = useSafeAreaInsets();
  const { selectedRestaurant, setSelectedRestaurant, getCartSummary } = useFoodOrder();
  
  const [currentMenu, setCurrentMenu] = useState<RestaurantMenu | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showItemDetail, setShowItemDetail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load menu when restaurant changes
  useEffect(() => {
    if (selectedRestaurant) {
      loadMenu(selectedRestaurant);
    }
  }, [selectedRestaurant]);

  // Set default restaurant if none selected
  useEffect(() => {
    if (visible && !selectedRestaurant) {
      setSelectedRestaurant('chick-fil-a');
    }
  }, [visible, selectedRestaurant, setSelectedRestaurant]);

  const loadMenu = async (restaurantId: string) => {
    setIsLoading(true);
    try {
      // Load menu data from local JSON files
      let menuData: RestaurantMenu;
      
      switch (restaurantId) {
        case 'chick-fil-a':
          menuData = require('@/data/menus/chick-fil-a.json');
          break;
        case 'chipotle':
          menuData = require('@/data/menus/chipotle.json');
          break;
        case 'taco-bell':
          menuData = require('@/data/menus/taco-bell.json');
          break;
        default:
          menuData = require('@/data/menus/chick-fil-a.json');
      }
      
      setCurrentMenu(menuData);
      
      // Set first category as default
      if (menuData.categories.length > 0) {
        setSelectedCategory(menuData.categories[0].id);
      }
    } catch (error) {
      console.error('Failed to load menu:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handleRestaurantChange = (restaurantId: string) => {
    triggerHaptics();
    setSelectedRestaurant(restaurantId);
    setSearchQuery('');
  };

  const handleItemPress = (item: MenuItem) => {
    triggerHaptics();
    setSelectedItem(item);
    setShowItemDetail(true);
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  const getFilteredItems = (): MenuItem[] => {
    if (!currentMenu) return [];
    
    let items = currentMenu.items;
    
    // Filter by category
    if (selectedCategory) {
      items = items.filter(item => item.categories.includes(selectedCategory));
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    }
    
    return items;
  };

  const cartSummary = getCartSummary();

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={handleClose}
      >
        <View style={[styles.container, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <X size={24} color={Colors.semantic.bodyText} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Items</Text>
            <View style={styles.cartIndicator}>
              {cartSummary.itemCount > 0 && (
                <View style={styles.cartBadge}>
                  <ShoppingCart size={16} color={Colors.white} strokeWidth={2} />
                  <Text style={styles.cartBadgeText}>{cartSummary.itemCount}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Restaurant Tabs */}
          <View style={styles.restaurantTabs}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsContainer}
            >
              {restaurants.map((restaurant) => (
                <TouchableOpacity
                  key={restaurant.id}
                  style={[
                    styles.restaurantTab,
                    selectedRestaurant === restaurant.id && styles.activeRestaurantTab,
                    selectedRestaurant === restaurant.id && { borderColor: restaurant.color }
                  ]}
                  onPress={() => handleRestaurantChange(restaurant.id)}
                >
                  <Text style={[
                    styles.restaurantTabText,
                    selectedRestaurant === restaurant.id && styles.activeRestaurantTabText,
                    selectedRestaurant === restaurant.id && { color: restaurant.color }
                  ]}>
                    {restaurant.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Search size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search menu items..."
                placeholderTextColor={Colors.semantic.tabInactive}
              />
            </View>
          </View>

          {/* Category Chips */}
          {currentMenu && (
            <View style={styles.categoryContainer}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryChips}
              >
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    !selectedCategory && styles.activeCategoryChip
                  ]}
                  onPress={() => setSelectedCategory('')}
                >
                  <Text style={[
                    styles.categoryChipText,
                    !selectedCategory && styles.activeCategoryChipText
                  ]}>
                    All
                  </Text>
                </TouchableOpacity>
                
                {currentMenu.categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryChip,
                      selectedCategory === category.id && styles.activeCategoryChip
                    ]}
                    onPress={() => setSelectedCategory(category.id)}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      selectedCategory === category.id && styles.activeCategoryChipText
                    ]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Menu Items */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <View style={styles.loadingState}>
                <Text style={styles.loadingText}>Loading menu...</Text>
              </View>
            ) : (
              <View style={styles.menuItems}>
                {getFilteredItems().map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.menuItem}
                    onPress={() => handleItemPress(item)}
                    activeOpacity={0.7}
                  >
                    <Image source={{ uri: item.image }} style={styles.itemImage} />
                    <View style={styles.itemContent}>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text style={styles.itemDescription} numberOfLines={2}>
                        {item.description}
                      </Text>
                      <Text style={styles.itemPrice}>
                        {FoodOrderUtils.formatPrice(item.basePrice)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
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
  cartIndicator: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  cartBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  restaurantTabs: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.divider,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  restaurantTab: {
    backgroundColor: Colors.muted,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeRestaurantTab: {
    backgroundColor: Colors.white,
  },
  restaurantTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.tabInactive,
  },
  activeRestaurantTabText: {
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  categoryContainer: {
    paddingBottom: 12,
  },
  categoryChips: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: Colors.muted,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.semantic.inputBorder,
  },
  activeCategoryChip: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.semantic.bodyText,
  },
  activeCategoryChipText: {
    color: Colors.white,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  loadingState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.semantic.tabInactive,
  },
  menuItems: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    backgroundColor: Colors.semantic.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.semantic.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  itemContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    lineHeight: 18,
    marginBottom: 8,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary,
  },
});