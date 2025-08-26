Hustl-App

## Device Preview Setup

### Quick Preview (Expo Go)

For basic app preview without native features:

1. **In Bolt**: 
   - Go to Integrations → Expo → Sign in with your Expo account
   - Click Preview → Start to boot Metro bundler
   - Enable tunnel mode for device access

2. **On your phone**:
   - Install Expo Go from App Store/Play Store
   - Tap "Device Preview" in Bolt and choose "Expo Go"
   - Scan QR code or enter URL in Expo Go app

**Note**: Maps will show a placeholder in Expo Go. For full functionality, use Dev Client below.

### Development Client (Recommended for Full Features)

For full native functionality including interactive maps:

1. **Install EAS CLI**:
   ```bash
   npm install -g @expo/cli eas-cli
   ```

2. **Login to Expo**:
   ```bash
   eas login
   ```

3. **Build development client**:
   ```bash
   # For iOS (requires Apple Developer account)
   eas build --profile development --platform ios
   
   # For Android
   eas build --profile development --platform android
   ```

4. **Run on device**:
   ```bash
   # iOS
   npx expo run:ios
   
   # Android  
   npx expo run:android
   ```

5. **Open in Dev Client**:
   - After build completes, app installs automatically
   - Or use "Open from development server" in your dev client app
   - Full map functionality will be available

### Troubleshooting Device Preview

**If Device Preview doesn't work:**

1. **Check network connection**: Ensure your computer and phone are on the same network

2. **Switch to LAN mode**: If tunnel mode fails, try LAN mode in Expo CLI:
   ```bash
   npx expo start --lan
   ```

3. **Firewall issues**: Make sure your firewall allows Metro bundler connections (port 8081)

4. **Expo Go vs Dev Client**:
   - **Expo Go**: Quick preview, limited native features, maps show placeholder
   - **Dev Client**: Full functionality, requires building, supports all native modules

**Connection troubleshooting:**
- If websockets fail, the app will show connection instructions
- Try switching between tunnel and LAN modes
- Restart Metro bundler: `npx expo start --clear`

## Features

## Push Notifications

The app includes a comprehensive push notification system that alerts users about:
- New tasks posted near them
- When their tasks are accepted
- Task status updates (picked up, delivered, completed)

### Setup for Development

1. **Expo Push Notifications**:
   - Uses Expo's push notification service
   - Requires physical device for testing (simulator won't receive push notifications)
   - Automatically registers for notifications on login

2. **Edge Functions**:
   - `sendPush` - Handles all notification logic and delivery
   - `broadcastTest` - Sends test notifications (dev only)
   - Automatically deployed to Supabase

3. **Database Tables**:
   - `push_subscriptions` - Stores device tokens
   - `notification_preferences` - User notification settings
   - Automatically created via migrations

### Testing Push Notifications

1. **Enable notifications**:
   - Sign in to the app (not guest mode)
   - Allow notification permissions when prompted
   - Check Profile → Settings → Notifications to verify setup

2. **Test notifications**:
   - In dev mode, go to Profile → Settings
   - Tap "Send Test Notification" to verify delivery
   - Create/accept/update tasks to test real notifications

3. **Troubleshooting**:
   - Ensure you're on a physical device (not simulator)
   - Check notification permissions in device settings
   - Verify Supabase Edge Functions are deployed
   - Check console logs for token registration errors

### Notification Types

- **TASK_POSTED**: "New task near you: Coffee run • Starbucks"
- **TASK_ACCEPTED**: "Your task was accepted: Coffee run"
- **TASK_UPDATED**: "Task update: Coffee run • Picked up"

Users can customize which notifications they receive in Profile → Settings → Notifications.