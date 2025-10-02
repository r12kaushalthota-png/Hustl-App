import React from 'react';
import { Tabs } from 'expo-router';
import { Chrome as Home, List, Zap, MessageCircle, Gift } from 'lucide-react-native';
import { TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StripeConnect } from '@/lib/stripeConnect';
import { useAuth } from '@/contexts/AuthContext';
import KYCRequestModal from '@/components/KYCRequestModal';

// Tab Icon Component
const TabIcon = ({
  IconComponent,
  size,
  color,
  focused,
}: {
  IconComponent: any;
  size: number;
  color: string;
  focused: boolean;
}) => {
  return (
    <View style={styles.tabIconContainer}>
      <IconComponent
        size={size}
        color={color}
        strokeWidth={focused ? 2.5 : 2}
      />
    </View>
  );
};

// Lightning Action Button Component
const LightningActionButton = ({ focused }: { focused: boolean }) => {
  const router = useRouter();
  const [showKYCModal, setShowKYCModal] = React.useState(false);
  const { user } = useAuth();

  const handlePress = async () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Haptics not available, continue silently
      }
    }
    const { error, payouts_enabled } = await StripeConnect.getIsPayoutsenabled(
      user?.id || ''
    );
    if (error || !payouts_enabled) {
      setShowKYCModal(true);
      return;
    }
    router.push('/(tabs)/post');
  };

  return (
    <>
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fabButton}
          onPress={handlePress}
          activeOpacity={0.9}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Post a task"
          accessibilityRole="button"
        >
          <Zap
            size={24}
            color={Colors.white}
            strokeWidth={2.5}
            fill={Colors.white}
          />
        </TouchableOpacity>
      </View>
      <KYCRequestModal
        visible={showKYCModal}
        onClose={() => setShowKYCModal(false)}
        feature="Create task"
      />
    </>
  );
};

// Custom tab bar button for Lightning Action
const LightningTabButton = (props: any) => {
  return (
    <LightningActionButton
      focused={props.accessibilityState?.selected || false}
    />
  );
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: Colors.white,
            borderTopColor: 'rgba(229, 231, 235, 0.2)',
            borderTopWidth: 0.5,
            height: 64 + insets.bottom,
            paddingBottom: insets.bottom + 8,
            paddingTop: 8,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            elevation: 20,
            overflow: 'visible',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -8 },
            shadowOpacity: 0.12,
            shadowRadius: 24,
          },
          tabBarActiveTintColor: '#3B82F6',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            tabBarIcon: ({ size, color, focused }) => (
              <TabIcon
                IconComponent={Home}
                size={size}
                color={color}
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            tabBarIcon: ({ size, color, focused }) => (
              <TabIcon
                IconComponent={List}
                size={size}
                color={color}
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="post"
          options={{
            tabBarButton: LightningTabButton,
          }}
        />
        <Tabs.Screen
          name="chats"
          options={{
            tabBarIcon: ({ size, color, focused }) => (
              <TabIcon
                IconComponent={MessageCircle}
                size={size}
                color={color}
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="referrals"
          options={{
            tabBarIcon: ({ size, color, focused }) => (
              <TabIcon
                IconComponent={Gift}
                size={size}
                color={color}
                focused={focused}
              />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  fabContainer: {
    position: 'absolute',
    left: '50%',
    bottom: 6,
    transform: [{ translateX: -22 }],
    zIndex: 2,
    backgroundColor: 'transparent',
    pointerEvents: 'box-none',
  },
  fabButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4DA3FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
});
