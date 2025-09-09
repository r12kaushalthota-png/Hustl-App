import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, SafeAreaView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronRight, Lock } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';
import { BrandingUtils, UniversityList } from '@/constants/Branding';
import HustlLogo from '@/components/HustlLogo';

const { width } = Dimensions.get('window');

export default function UniversitySelection() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleUniversitySelect = (university: any) => {
    if (!university.enabled) return;
    
    if (university.id === 'uf') {
      setSelectedId(university.id);
      // Delay navigation to show animation
      setTimeout(() => {
        router.push('/(onboarding)/auth');
      }, 300);
    }
  };

  const handleRequestCampus = () => {
    // Could open email or show contact info
    console.log('Request campus feature');
  };

  const handleBack = () => {
    router.back();
  };

  const UniversityCardComponent = ({ university }: { university: any }) => {
    const scale = useSharedValue(1);
    const glowOpacity = useSharedValue(0);

    const animatedCardStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const animatedGlowStyle = useAnimatedStyle(() => ({
      shadowOpacity: glowOpacity.value,
    }));

    const handlePressIn = () => {
      if (!university.enabled) return;
      scale.value = withTiming(0.98, { duration: 100 });
      glowOpacity.value = withTiming(0.3, { duration: 100 });
    };

    const handlePressOut = () => {
      if (!university.enabled) return;
      scale.value = withTiming(1, { duration: 100 });
      glowOpacity.value = withTiming(0, { duration: 200 });
    };

    const handlePress = () => {
      if (!university.enabled) return;
      handleUniversitySelect(university);
    };

    const isSelected = selectedId === university.id;

    return (
      <Animated.View style={[animatedCardStyle, { shadowColor: university.colors.primary }, animatedGlowStyle]}>
        <TouchableOpacity
          style={[
            styles.universityCard,
            !university.enabled && styles.disabledCard,
            isSelected && styles.selectedCard,
          ]}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={!university.enabled}
          accessibilityLabel={university.enabled ? `Select ${university.name}` : `${university.name} - Coming Soon`}
          accessibilityRole="button"
        >
          <View style={styles.logoContainer}>
            <View style={[styles.universityLogo, { backgroundColor: university.colors.primary }]}>
              <Text style={styles.logoText}>{university.shortName}</Text>
            </View>
          </View>
          
          <View style={styles.cardContent}>
            <View style={styles.textContent}>
              <Text style={[
                styles.universityName,
                !university.enabled && styles.disabledText
              ]}>
                {university.name}
              </Text>
              {!university.enabled && (
                <View style={styles.comingSoonContainer}>
                  <Lock size={12} color={Colors.semantic.tabInactive} strokeWidth={2} />
                  <Text style={styles.comingSoonText}>Coming Soon</Text>
                </View>
              )}
            </View>
            
            {university.enabled && (
              <ChevronRight size={20} color={Colors.semantic.tabInactive} strokeWidth={2} />
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Gradient background */}
      <LinearGradient
        colors={BrandingUtils.getBrandGradient('welcome')}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.4, 0.7, 1]}
        style={styles.backgroundGradient}
      />

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color={Colors.white} strokeWidth={2} />
          </TouchableOpacity>
          
          <View style={styles.headerLogo}>
            <HustlLogo size="small" />
          </View>
          
          <View style={styles.headerPlaceholder} />
        </View>
        
        <Text style={styles.title}>Select Your University</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      >
        <View style={styles.cardsList}>
          {UniversityList.map((university) => (
            <UniversityCardComponent key={university.id} university={university} />
          ))}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.requestButton} onPress={handleRequestCampus}>
            <Text style={styles.requestButtonText}>Request your campus here</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLogo: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerPlaceholder: {
    width: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  cardsList: {
    gap: 16,
    paddingTop: 20,
  },
  universityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    minHeight: 88,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  selectedCard: {
    backgroundColor: 'rgba(255, 255, 255, 1)',
    borderColor: 'rgba(255, 255, 255, 0.8)',
    transform: [{ scale: 1.02 }],
  },
  disabledCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    opacity: 0.7,
  },
  logoContainer: {
    marginRight: 16,
  },
  universityLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContent: {
    flex: 1,
  },
  universityName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.semantic.bodyText,
    marginBottom: 4,
  },
  disabledText: {
    color: Colors.semantic.tabInactive,
  },
  comingSoonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  comingSoonText: {
    fontSize: 13,
    color: Colors.semantic.tabInactive,
    fontWeight: '600',
  },
  footer: {
    paddingTop: 32,
    paddingBottom: 20,
  },
  requestButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  requestButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});