import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Platform, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Camera, ChevronRight, FileText, History, MessageSquare, Settings, CircleHelp as HelpCircle, LogOut, ArrowLeft, Star, Wallet } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileRepo } from '@/lib/profileRepo';
import { MediaUtils } from '@/lib/media';
import Toast from '@/components/Toast';
import { Colors } from '@/theme/colors';

// Exact brand colors from the logo
const BrandColors = {
  primary: '#0D2DEB', // Hustl Blue
  purple: '#6B2BBF', // Hustl Purple
  red: '#E53935', // Hustl Red
  orange: '#FF5A1F', // Hustl Orange
  accentYellow: '#FFC400', // Badge yellow
  surface: '#FFFFFF',
  title: '#0A0F1F',
  subtitle: '#5B6475',
  divider: '#E9EDF5',
};

// Brand gradients
const BrandGradients = {
  primary: [BrandColors.primary, BrandColors.purple, BrandColors.red, BrandColors.orange],
  button: [BrandColors.primary, '#3D6BFF'],
};

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  
  // Avatar state
  const [avatarUri, setAvatarUri] = React.useState<string | null>(user?.profile?.avatar_url || null);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const [toast, setToast] = React.useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  });

  // Update avatar when user profile changes
  React.useEffect(() => {
    setAvatarUri(user?.profile?.avatar_url || null);
  }, [user?.profile?.avatar_url]);

  // Create menu items with user context
  const getMenuItems = () => [
    { 
      icon: <User size={20} color={BrandColors.title} strokeWidth={2} />, 
      title: 'Profile Information',
      route: '/profile/edit'
    },
    { 
      icon: <Wallet size={20} color={BrandColors.title} strokeWidth={2} />, 
      title: 'Wallet',
      route: '/profile/wallet'
    },
    { 
      icon: <Star size={20} color={BrandColors.title} strokeWidth={2} />, 
      title: 'Reviews',
      route: `/profile/reviews?userId=${user?.id || ''}`
    },
    { 
      icon: <FileText size={20} color={BrandColors.title} strokeWidth={2} />, 
      title: 'My Tasks',
      route: '/profile/my-tasks'
    },
    { 
      icon: <History size={20} color={BrandColors.title} strokeWidth={2} />, 
      title: 'Task History',
      route: '/profile/task-history'
    },
    { 
      icon: <MessageSquare size={20} color={BrandColors.title} strokeWidth={2} />, 
      title: 'Messages',
      route: '/(tabs)/chats'
    },
    { 
      icon: <Settings size={20} color={BrandColors.title} strokeWidth={2} />, 
      title: 'Settings',
      route: '/profile/settings'
    },
    { 
      icon: <HelpCircle size={20} color={BrandColors.title} strokeWidth={2} />, 
      title: 'Help & Support',
      route: '/profile/help'
    },
  ];

  const handleMenuPress = (route: string) => {
    router.push(route as any);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(onboarding)/splash');
  };

  const triggerHaptics = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
  };

  const handleAvatarPress = () => {
    if (!user || isUploadingAvatar) return;
    
    triggerHaptics();
    
    MediaUtils.showAvatarActionSheet(
      !!avatarUri,
      () => handlePickAvatar('camera'),
      () => handlePickAvatar('library'),
      avatarUri ? handleRemoveAvatar : undefined
    );
  };

  const handlePickAvatar = async (source: 'camera' | 'library') => {
    if (!user || isUploadingAvatar) return;

    try {
      const result = await MediaUtils.pickAvatar(source);
      
      if (!result.success) {
        if (result.error?.includes('permission')) {
          setToast({
            visible: true,
            message: result.error,
            type: 'error'
          });
          
          // Show settings option after a delay
          setTimeout(() => {
            setToast({
              visible: true,
              message: 'Tap to open Settings',
              type: 'error'
            });
          }, 2000);
        }
        return;
      }

      if (!result.uri) return;

      // Set preview immediately
      setAvatarUri(result.uri);
      setIsUploadingAvatar(true);

      // Upload to Supabase
      const uploadResult = await MediaUtils.uploadAvatarAsync(result.uri, user.id);
      
      if (uploadResult.success && uploadResult.url) {
        setAvatarUri(uploadResult.url);
        setToast({
          visible: true,
          message: 'Profile photo updated!',
          type: 'success'
        });
      } else {
        // Revert to previous avatar on upload failure
        setAvatarUri(user.profile?.avatar_url || null);
        setToast({
          visible: true,
          message: uploadResult.error || 'Failed to upload photo',
          type: 'error'
        });
      }
    } catch (error) {
      // Revert to previous avatar on error
      setAvatarUri(user.profile?.avatar_url || null);
      setToast({
        visible: true,
        message: 'Failed to update photo. Please try again.',
        type: 'error'
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user || isUploadingAvatar) return;

    setIsUploadingAvatar(true);

    try {
      const result = await MediaUtils.removeAvatarAsync(user.id);
      
      if (result.success) {
        setAvatarUri(null);
        setToast({
          visible: true,
          message: 'Profile photo removed',
          type: 'success'
        });
      } else {
        setToast({
          visible: true,
          message: result.error || 'Failed to remove photo',
          type: 'error'
        });
      }
    } catch (error) {
      setToast({
        visible: true,
        message: 'Failed to remove photo. Please try again.',
        type: 'error'
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };
  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  const renderMenuItem = (item: any, index: number) => (
    <TouchableOpacity
      key={index}
      style={styles.menuItem}
      onPress={() => handleMenuPress(item.route)}
    >
      <View style={styles.menuItemLeft}>
        {item.icon}
        <Text style={styles.menuItemText}>{item.title}</Text>
      </View>
      <ChevronRight size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.placeholder} />
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.placeholder} />
      </View>
      
      {/* Profile Header with Gradient */}
      <View style={styles.profileHeaderContainer}>
        <LinearGradient
          colors={BrandGradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.4, 0.7, 1]}
          style={styles.profileHeader}
        >
          <View style={styles.avatarContainer}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {user ? MediaUtils.getInitials(user.displayName) : 'U'}
                </Text>
              </View>
            )}
            
            {/* Upload Progress Overlay */}
            {isUploadingAvatar && (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator size="large" color={BrandColors.surface} />
              </View>
            )}
            
            <TouchableOpacity 
              style={[
                styles.cameraButton,
                isUploadingAvatar && styles.cameraButtonDisabled
              ]}
              onPress={handleAvatarPress}
              disabled={isUploadingAvatar}
              accessibilityLabel="Change profile photo"
              accessibilityRole="button"
            >
              <Camera size={16} color={BrandColors.surface} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.displayName}>
            {user ? user.displayName : 'Guest User'}
          </Text>
          <Text style={styles.userInfo}>
            {user ? `${user.university || 'University of Florida'} • Student` : 'Browse as Guest'}
          </Text>
        </LinearGradient>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      >
        <View style={styles.menuSection}>
          {getMenuItems().slice(0, 3).map(renderMenuItem)}
        </View>

        <View style={styles.menuSection}>
          {getMenuItems().slice(3, 6).map((item, index) => renderMenuItem(item, index + 3))}
        </View>

        <View style={styles.menuSection}>
          {getMenuItems().slice(6).map((item, index) => renderMenuItem(item, index + 6))}
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <View style={styles.menuItemLeft}>
              <LogOut size={20} color={BrandColors.red} strokeWidth={2} />
              <Text style={[styles.menuItemText, { color: BrandColors.red }]}>Logout</Text>
            </View>
            <ChevronRight size={20} color={BrandColors.subtitle} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BrandColors.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: BrandColors.surface,
  },
  placeholder: {
    width: 40,
  },
  profileHeaderContainer: {
    overflow: 'hidden',
  },
  profileHeader: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: BrandColors.surface,
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BrandColors.orange,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: BrandColors.primary,
  },
  cameraButtonDisabled: {
    backgroundColor: BrandColors.subtitle,
    opacity: 0.6,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: BrandColors.surface,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  userInfo: {
    fontSize: 14,
    color: BrandColors.surface,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  menuSection: {
    marginBottom: 32,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.divider,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuItemText: {
    fontSize: 16,
    color: BrandColors.title,
    fontWeight: '500',
  },
});