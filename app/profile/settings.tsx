import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, Shield, Eye, Moon, Smartphone, ChevronRight } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  // Settings state
  const [pushNotifications, setPushNotifications] = useState(true);
  const [newTasks, setNewTasks] = useState(true);
  const [taskAccepted, setTaskAccepted] = useState(true);
  const [taskUpdates, setTaskUpdates] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    // Load notification settings would go here
  }, []);

  const updateNotificationPreference = async (
    key: string,
    value: boolean
  ) => {
    if (!user || isLoading) return;

    setIsLoading(true);

    try {
      // Update notification preferences would go here
      console.log('Updating notification preference:', key, value);
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenNotificationSettings = async () => {
    // Open notification settings would go here
    console.log('Opening notification settings');
  };

  const handleSendTestNotification = async () => {
    if (!user) return;

    try {
      // Send test notification would go here
      console.log('Sending test notification');
    } catch (error) {
      console.error('Failed to send test notification:', error);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    value, 
    onValueChange, 
    showChevron = false,
    onPress 
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    value?: boolean;
    onValueChange?: (value: boolean) => void;
    showChevron?: boolean;
    onPress?: () => void;
  }) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={!onPress && !onValueChange}
    >
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          {icon}
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && (
            <Text style={styles.settingSubtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
      
      <View style={styles.settingRight}>
        {onValueChange && (
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: Colors.muted, true: Colors.primary + '40' }}
            thumbColor={value ? Colors.primary : Colors.white}
            ios_backgroundColor={Colors.muted}
          />
        )}
        {showChevron && (
          <ChevronRight size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color={Colors.white} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      >
        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          {!notificationsEnabled && (
            <View style={styles.notificationWarning}>
              <Text style={styles.warningText}>
                Notifications are disabled in device settings
              </Text>
              <TouchableOpacity 
                style={styles.warningButton}
                onPress={handleOpenNotificationSettings}
              >
                <Text style={styles.warningButtonText}>Open Settings</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <SettingItem
            icon={<Bell size={20} color={Colors.primary} strokeWidth={2} />}
            title="Push Notifications"
            subtitle="Receive notifications on your device"
            value={pushNotifications}
            onValueChange={setPushNotifications}
          />
          
          <SettingItem
            icon={<Bell size={20} color={Colors.primary} strokeWidth={2} />}
            title="New Tasks"
            subtitle="Get notified about new tasks near you"
            value={newTasks}
            onValueChange={(value) => {
              setNewTasks(value);
              updateNotificationPreference('new_tasks', value);
            }}
          />
          
          <SettingItem
            icon={<Smartphone size={20} color={Colors.primary} strokeWidth={2} />}
            title="Task Accepted"
            subtitle="Get notified when someone accepts your task"
            value={taskAccepted}
            onValueChange={(value) => {
              setTaskAccepted(value);
              updateNotificationPreference('task_accepted', value);
            }}
          />
          
          <SettingItem
            icon={<Smartphone size={20} color={Colors.primary} strokeWidth={2} />}
            title="Task Updates"
            subtitle="Get notified about task status changes"
            value={taskUpdates}
            onValueChange={(value) => {
              setTaskUpdates(value);
              updateNotificationPreference('task_updates', value);
            }}
          />

          {__DEV__ && (
            <SettingItem
              icon={<Bell size={20} color={Colors.secondary} strokeWidth={2} />}
              title="Send Test Notification"
              subtitle="Test push notifications (dev only)"
              showChevron
              onPress={handleSendTestNotification}
            />
          )}
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          
          <SettingItem
            icon={<Eye size={20} color={Colors.primary} strokeWidth={2} />}
            title="Profile Visibility"
            subtitle="Make your profile visible to other users"
            value={profileVisibility}
            onValueChange={setProfileVisibility}
          />
          
          <SettingItem
            icon={<Shield size={20} color={Colors.primary} strokeWidth={2} />}
            title="Privacy Policy"
            subtitle="View our privacy policy"
            showChevron
            onPress={() => console.log('Privacy Policy pressed')}
          />
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          
          <SettingItem
            icon={<Moon size={20} color={Colors.primary} strokeWidth={2} />}
            title="Dark Mode"
            subtitle="Use dark theme (coming soon)"
            value={darkMode}
            onValueChange={setDarkMode}
          />
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <SettingItem
            icon={<Smartphone size={20} color={Colors.primary} strokeWidth={2} />}
            title="App Version"
            subtitle="1.0.0"
            showChevron={false}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.headingText,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.divider,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
  },
  settingRight: {
    marginLeft: 16,
  },
  notificationWarning: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: Colors.semantic.errorAlert,
    marginRight: 12,
  },
  warningButton: {
    backgroundColor: Colors.semantic.errorAlert,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  warningButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
});