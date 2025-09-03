Hustl-App

## Expo Integration & Device Preview Setup

### Prerequisites

1. **Expo Account**: Create a free account at [expo.dev](https://expo.dev) if you don't have one
2. **Bolt Integration**: Connect your Expo account in Bolt's Integrations panel

### Setting Up Device Preview in Bolt

1. **Connect Expo Integration**:
   - In Bolt, go to **Integrations → Expo**
   - Sign in with your Expo account credentials
   - Verify the integration shows as "Connected"
nn
2. **Start Metro Bundler**:
   - Click **Preview → Start** in Bolt
   - Wait for Metro bundler to initialize (you'll see "Metro waiting on...")
   - Tunnel mode will be enabled automatically for device access

3. **Enable Device Preview**:
   - The **Device Preview** button should now be enabled (no longer greyed out)
   - If still disabled, try refreshing Bolt and repeating steps 1-2

4. **Preview on Device**:
   - Click **Device Preview** in Bolt
   - Choose your preview method:
     - **Expo Go**: Quick preview for managed features
     - **Dev Client**: Full native functionality (requires building)
   - Scan the QR code with your device

### Preview Methods

#### Expo Go (Quick Preview)
- **Best for**: Testing core app flows, UI, basic functionality
- **Limitations**: Maps show placeholder, some native features disabled
- **Setup**: Install Expo Go app, scan QR code from Bolt
- **No build required**: Instant preview

#### Dev Client (Full Features)
- **Best for**: Complete app testing with all native modules
- **Features**: Interactive maps, full location services, push notifications
- **Setup**: Requires building development client first
- **Build time**: ~5-15 minutes depending on platform

### Troubleshooting Device Preview

**If Device Preview button is greyed out:**

1. **Check Expo Integration**:
   - Verify you're signed into Expo in Bolt's Integrations
   - Try signing out and back in if connection seems stale

2. **Restart Metro**:
   - Click **Preview → Stop** then **Preview → Start**
   - Wait for "Metro waiting on..." message
   - Refresh Bolt page if needed

3. **Network Issues**:
   - Ensure your computer and phone are on the same WiFi network
   - Try switching from tunnel to LAN mode: `npx expo start --lan`
   - Check firewall settings (allow port 8081)

4. **Clear Cache**:
   ```bash
   npx expo start --clear
   ```

**If app crashes in Expo Go:**
- This is expected for native modules (maps, location)
- Use Dev Client for full functionality
- Core features (auth, tasks, notifications) work in Expo Go

**Connection troubleshooting:**
- If websockets fail, try restarting Metro bundler
- Switch between tunnel and LAN modes if one doesn't work
- Ensure no VPN is interfering with local network access

## Device Preview Setup

### Using Bolt's Device Preview (Recommended)

The easiest way to preview the app on your device:

1. **In Bolt**:
   - Go to **Integrations → Expo** and sign in with your Expo account
   - Click **Preview → Start** to boot Metro bundler and enable tunnel mode
   - The **Device Preview** button should now be enabled

2. **On your mobile device**:
   - Tap **Device Preview** in Bolt and choose your preferred method:
     - **Expo Go**: Quick preview for basic functionality
     - **Dev Client**: Full native functionality (requires building first)
   - Scan the QR code or enter the URL

3. **If Device Preview is disabled**:
   - Make sure you're signed into Expo in Bolt's Integrations
   - Ensure Metro bundler is running (Preview → Start)
   - Try refreshing the page and starting Preview again

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

**If you see "Network request failed" or tunnel issues:**
- Switch to LAN mode: In Bolt, stop Preview and restart with LAN mode
- Check firewall settings on your computer
- Ensure your phone and computer are on the same WiFi network
- Try restarting Metro: `npx expo start --clear`

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