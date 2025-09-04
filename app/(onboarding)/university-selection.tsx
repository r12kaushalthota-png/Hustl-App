import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronRight, Lock } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withSpring } from 'react-native-reanimated';
import Colors from '@/theme/colors';

const { width } = Dimensions.get('window');

interface UniversityCard {
  id: string;
  name: string;
  shortName: string;
  enabled: boolean;
  logo: any;
}

const universities: UniversityCard[] = [
  { 
    id: 'uf', 
    name: 'University of Florida', 
    shortName: 'UF', 
    enabled: true,
    logo: require('@assets/images/Florida_Gators_gator_logo.png')
  },
  { 
    id: 'ucf', 
    name: 'University of Central Florida', 
    shortName: 'UCF', 
    enabled: false,
    logo: require('@assets/images/141-1415685_ucf-university-of-central-florida-logo.jpg')
  },
  { 
    id: 'usf', 
    name: 'University of South Florida', 
    shortName: 'USF', 
    enabled: false,
    logo: require('@assets/images/UniversityOfSouthFlorida-logo-350x350.jpg')
  },
  { 
    id: 'fsu', 
    name: 'Florida State University', 
    shortName: 'FSU', 
    enabled: false,
    logo: require('@assets/images/Florida_State_Seminoles_logo.png')
  },
];

export default function UniversitySelection() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleUniversitySelect = (university: UniversityCard) => {
    if (!university.enabled) return;
    
    if (university.id === 'uf') {
      setSelectedId(university.id);
      // Delay navigation to show animation
      setTimeout(() => {
        router.push('/(onboarding)/confirm-university');
      }, 300);
    }
  };

  const handleRequestCampus = () => {
    alert('Email us at HustlApp@outlook.com!');
  };

  const handleBack = () => {
    router.back();
  };

  const handleSkip = () => {
    // Allow users to skip and browse as guest
    router.replace('/(tabs)/home');
  };

  const UniversityCardComponent = ({ university }: { university: UniversityCard }) => {
    const scale = useSharedValue(1);
    const logoTranslateX = useSharedValue(0);
    const titleTranslateX = useSharedValue(0);
    const arrowOpacity = useSharedValue(0);
    const arrowScale = useSharedValue(0.8);

    const animatedCardStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const animatedLogoStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: logoTranslateX.value }],
    }));

    const animatedTitleStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: titleTranslateX.value }],
    }));

    const animatedArrowStyle = useAnimatedStyle(() => ({
      opacity: arrowOpacity.value,
      transform: [{ scale: arrowScale.value }],
    }));

    const handlePressIn = () => {
      if (!university.enabled) return;
      scale.value = withTiming(0.98, { duration: 100 });
    };

    const handlePressOut = () => {
      if (!university.enabled) return;
      scale.value = withTiming(1, { duration: 100 });
    };

    const handlePress = () => {
      if (!university.enabled) return;
      
      // Trigger selection animation
      logoTranslateX.value = withTiming(-8, { duration: 250 });
      titleTranslateX.value = withTiming(8, { duration: 250 });
      arrowOpacity.value = withTiming(1, { duration: 250 });
      arrowScale.value = withSpring(1, { damping: 15 });
      
      handleUniversitySelect(university);
    };

    const isSelected = selectedId === university.id;
    const cardStyle = [
      styles.universityCard,
      !university.enabled && styles.disabledCard,
      isSelected && styles.selectedCard,
    ];

    return (
      <Animated.View style={animatedCardStyle}>
        <TouchableOpacity
          style={cardStyle}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={!university.enabled}
          accessibilityLabel={
            university.enabled 
              ? `Select ${university.name}` 
              : `${university.name} - Coming Soon`
          }
          accessibilityRole="button"
          accessibilityState={{ disabled: !university.enabled }}
        >
          <Animated.View style={[styles.logoContainer, animatedLogoStyle]}>
            <Image
              source={university.logo}
              style={styles.universityLogo}
              resizeMode="contain"
            />
          </Animated.View>
          
          <View style={styles.cardContent}>
            <Animated.View style={animatedTitleStyle}>
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
            </Animated.View>
            
            {university.enabled && (
              <Animated.View style={[styles.arrowContainer, animatedArrowStyle]}>
                <View style={styles.arrowPill}>
                  <ChevronRight size={16} color={Colors.primary} strokeWidth={2.5} />
                </View>
              </Animated.View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color={Colors.semantic.bodyText} strokeWidth={2} />
          </TouchableOpacity>
          <Image
            source={require('@assets/images/image.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.placeholder} />
        </View>
        <Text style={styles.title}>Select Your University</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      >
        <View style={styles.cardsList}>
          {universities.map((university) => (
            <UniversityCardComponent key={university.id} university={university} />
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity style={styles.requestButton} onPress={handleRequestCampus}>
          <Text style={styles.requestButtonText}>Request your campus here</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.screen,
  },
  header: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.semantic.bodyText,
    textAlign: 'center',
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  cardsList: {
    gap: 12,
  },
  universityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    minHeight: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedCard: {
    backgroundColor: 'rgba(0, 56, 255, 0.06)',
    borderColor: Colors.primary,
  },
  disabledCard: {
    backgroundColor: Colors.muted,
    opacity: 0.7,
  },
  logoContainer: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  universityLogo: {
    width: 56,
    height: 56,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  universityName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.bodyText,
    lineHeight: 22,
  },
  disabledText: {
    color: Colors.semantic.tabInactive,
  },
  comingSoonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  comingSoonText: {
    fontSize: 12,
    color: Colors.semantic.tabInactive,
    fontWeight: '500',
  },
  arrowContainer: {
    marginLeft: 12,
  },
  arrowPill: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  requestButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  requestButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  placeholder: {
    width: 40,
  },
});