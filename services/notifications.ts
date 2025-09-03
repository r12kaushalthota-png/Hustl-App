import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';

export interface NotificationData {
  type: 'TASK_POSTED' | 'TASK_ACCEPTED' | 'TASK_UPDATED';
  taskId: string;
  status?: string;
}

export interface PushSubscription {
  user_id: string;
  device_id: string;
  expo_token: string;
  platform: string;
  updated_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  new_tasks: boolean;
  task_accepted: boolean;
  task_updates: boolean;
}

// Configure notification handler for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class NotificationService {
  private static notificationListener: Notifications.Subscription | null = null;
  private static responseListener: Notifications.Subscription | null = null;

  /**
   * Register for push notifications and get Expo push token
   */
  static async registerForPush(): Promise<string | null> {
    try {
      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return null;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permissions not granted');
        return null;
      }

      // Configure Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0021A5',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
        });
      }

      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.slug || undefined,
      });
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.expoConfig?.slug;
      return tokenData.data;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Save push token to Supabase
   */
  static async savePushToken(
    userId: string, 
    token: string, 
    deviceId: string, 
    platform: string
  ): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          device_id: deviceId,
          expo_token: token,
          platform,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      return { error: 'Failed to save push token' };
    }
  }

  /**
   * Get device ID for push subscription
   */
  static async getDeviceId(): Promise<string> {
    try {
      if (Platform.OS === 'android') {
        // Use Android ID if available
        return Device.androidId || `android_${Date.now()}`;
      } else {
        // Use OS build ID for iOS or fallback
        return Device.osBuildId || `ios_${Date.now()}`;
      }
    } catch (error) {
      // Fallback to timestamp-based ID
      return `device_${Platform.OS}_${Date.now()}`;
    }
  }

  /**
   * Initialize push notifications for authenticated user
   */
  static async initializePushNotifications(userId: string): Promise<void> {
    try {
      // Register for push notifications
      const token = await this.registerForPush();
      
      if (!token) {
        console.warn('Failed to get push token');
        return;
      }

      // Get device ID
      const deviceId = await this.getDeviceId();

      // Save token to Supabase
      const { error } = await this.savePushToken(userId, token, deviceId, Platform.OS);
      
      if (error) {
        console.error('Failed to save push token:', error);
      } else {
        console.log('Push notifications initialized successfully');
      }

      // Set up listeners
      this.setupNotificationListeners();
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }

  /**
   * Set up notification listeners
   */
  static setupNotificationListeners(): void {
    // Clean up existing listeners
    this.removeNotificationListeners();

    // Listen for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      
      // Show in-app toast for foreground notifications
      const { title, body } = notification.request.content;
      
      // Trigger custom toast (you can implement this in your app)
      if ((global as any).showNotificationToast) {
        (global as any).showNotificationToast(`${title}: ${body}`);
      }
    });

    // Listen for notification responses (user tapped notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      
      const data = response.notification.request.content.data as NotificationData;
      
      if (data?.taskId) {
        // Deep link to task detail screen
        if ((global as any).navigateToTask) {
          (global as any).navigateToTask(data.taskId);
        }
      }
    });
  }

  /**
   * Remove notification listeners
   */
  static removeNotificationListeners(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }

    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
  }

  /**
   * Get user's notification preferences
   */
  static async getNotificationPreferences(userId: string): Promise<{ 
    data: NotificationPreferences | null; 
    error: string | null 
  }> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .limit(1);

      if (error) {
        return { data: null, error: error.message };
      }

      const preferences = data?.[0] ?? null;
      return { data: preferences, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to load notification preferences' };
    }
  }

  /**
   * Update user's notification preferences
   */
  static async updateNotificationPreferences(
    userId: string, 
    preferences: Partial<Omit<NotificationPreferences, 'user_id'>>
  ): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
        });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      return { error: 'Failed to update notification preferences' };
    }
  }

  /**
   * Send test notification (dev only)
   */
  static async sendTestNotification(): Promise<{ error: string | null }> {
    try {
      const { data, error } = await supabase.functions.invoke('broadcastTest', {
        body: { message: 'Test notification from Hustl app!' }
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      return { error: 'Failed to send test notification' };
    }
  }

  /**
   * Check if notifications are enabled
   */
  static async areNotificationsEnabled(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      return false;
    }
  }

  /**
   * Open device notification settings
   */
  static async openNotificationSettings(): Promise<void> {
    try {
      await Notifications.openSettingsAsync();
    } catch (error) {
      console.error('Failed to open notification settings:', error);
    }
  }
}