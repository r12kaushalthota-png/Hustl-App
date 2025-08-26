import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { Colors } from '@constants/Colors';

export default function ConfirmUniversity() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleConfirm = () => {
    router.push('/(onboarding)/auth');
  };

  const handleCancel = () => {
    router.back();
  };

  const handleSkip = () => {
    // Allow users to skip and browse as guest
    router.replace('/(tabs)/home');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
            <ArrowLeft size={24} color={Colors.semantic.bodyText} strokeWidth={2} />
          </TouchableOpacity>
          <Image
            source={require('../../src/assets/images/image.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.placeholder} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../src/assets/images/Florida_Gators_gator_logo.png')}
            style={styles.universityLogo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>Confirm Your University</Text>
        
        <Text style={styles.description}>
          You have selected University of Florida.
        </Text>
        
        <Text style={styles.address}>
          University of Florida{'\n'}
          Gainesville, FL 32611
        </Text>
      </View>

      <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>Confirm</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.screen,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
  },
  placeholder: {
    width: 40,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  universityLogo: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.semantic.bodyText,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: Colors.semantic.bodyText,
    textAlign: 'center',
    marginBottom: 20,
  },
  address: {
    fontSize: 14,
    color: Colors.semantic.tabInactive,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 12,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
  },
});