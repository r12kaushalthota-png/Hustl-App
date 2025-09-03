import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { Platform, Alert, ActionSheetIOS } from 'react-native';
import { supabase } from './supabase';

export type ImageSource = 'camera' | 'library';

export interface PickAvatarResult {
  success: boolean;
  uri?: string;
  error?: string;
}

export interface UploadAvatarResult {
  success: boolean;
  url?: string;
  error?: string;
}

export class MediaUtils {
  /**
   * Pick avatar from camera or library with proper permissions
   */
  static async pickAvatar(source: ImageSource): Promise<PickAvatarResult> {
    try {
      // Request appropriate permission
      let permissionResult;
      
      if (source === 'camera') {
        permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (permissionResult.status !== 'granted') {
        return {
          success: false,
          error: `${source === 'camera' ? 'Camera' : 'Photo library'} permission is required to upload photos.`
        };
      }

      // Launch appropriate picker
      let result;
      
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (result.canceled) {
        return { success: false, error: 'Selection cancelled' };
      }

      if (!result.assets || result.assets.length === 0) {
        return { success: false, error: 'No image selected' };
      }

      return {
        success: true,
        uri: result.assets[0].uri
      };

    } catch (error) {
      console.error('Error picking avatar:', error);
      return {
        success: false,
        error: 'Failed to pick image. Please try again.'
      };
    }
  }

  /**
   * Upload avatar to Supabase storage
   */
  static async uploadAvatarAsync(uri: string, userId: string): Promise<UploadAvatarResult> {
    try {
      // Convert URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Create file name
      const fileName = `${userId}/avatar.jpg`;

      // Upload to Supabase storage
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return {
          success: false,
          error: 'Failed to upload image. Please try again.'
        };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        return {
          success: false,
          error: 'Failed to get image URL. Please try again.'
        };
      }

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: urlData.publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Profile update error:', updateError);
        return {
          success: false,
          error: 'Failed to update profile. Please try again.'
        };
      }

      return {
        success: true,
        url: urlData.publicUrl
      };

    } catch (error) {
      console.error('Error uploading avatar:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.'
      };
    }
  }

  /**
   * Remove avatar from profile
   */
  static async removeAvatarAsync(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Update profile to remove avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Profile update error:', updateError);
        return {
          success: false,
          error: 'Failed to remove avatar. Please try again.'
        };
      }

      // Optionally delete from storage (commented out to avoid errors if file doesn't exist)
      // const fileName = `${userId}/avatar.jpg`;
      // await supabase.storage.from('avatars').remove([fileName]);

      return { success: true };

    } catch (error) {
      console.error('Error removing avatar:', error);
      return {
        success: false,
        error: 'Failed to remove avatar. Please try again.'
      };
    }
  }

  /**
   * Show avatar action sheet
   */
  static showAvatarActionSheet(
    hasAvatar: boolean,
    onTakePhoto: () => void,
    onChooseLibrary: () => void,
    onRemovePhoto?: () => void
  ): void {
    const options = [
      'Take Photo',
      'Choose from Library',
      ...(hasAvatar && onRemovePhoto ? ['Remove Photo'] : []),
      'Cancel'
    ];

    const destructiveButtonIndex = hasAvatar && onRemovePhoto ? 2 : undefined;
    const cancelButtonIndex = options.length - 1;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex,
          cancelButtonIndex,
          title: 'Change Profile Photo'
        },
        (buttonIndex) => {
          switch (buttonIndex) {
            case 0:
              onTakePhoto();
              break;
            case 1:
              onChooseLibrary();
              break;
            case 2:
              if (hasAvatar && onRemovePhoto) {
                onRemovePhoto();
              }
              break;
            default:
              // Cancel - do nothing
              break;
          }
        }
      );
    } else {
      // Android - use Alert with buttons
      const buttons = [
        { text: 'Take Photo', onPress: onTakePhoto },
        { text: 'Choose from Library', onPress: onChooseLibrary },
        ...(hasAvatar && onRemovePhoto ? [{ text: 'Remove Photo', onPress: onRemovePhoto, style: 'destructive' as const }] : []),
        { text: 'Cancel', style: 'cancel' as const }
      ];

      Alert.alert('Change Profile Photo', undefined, buttons);
    }
  }

  /**
   * Open device settings for permission management
   */
  static async openSettings(): Promise<void> {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error('Failed to open settings:', error);
    }
  }

  /**
   * Get user initials for avatar fallback
   */
  static getInitials(name: string): string {
    if (!name || !name.trim()) return 'U';
    
    return name
      .trim()
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}