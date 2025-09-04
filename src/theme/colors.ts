/**
 * Hustl App - iOS-first Color System
 * Single source of truth for all color tokens
 * Designed for React Native with iOS-first principles
 */

export const Colors = {
  // Primary / UF Blue
  primary: '#002B7F',
  primaryDark: '#001F5C',
  primaryLight: '#0038FF',

  // Secondary / UF Orange  
  secondary: '#FF4D23',
  secondaryLight: '#FF5A1F',
  secondaryDark: '#E63A0B',

  // Surfaces & Text
  white: '#FFFFFF',
  bg: '#FFFFFF',
  muted: '#F5F5F5',
  border: '#E5E7EB',
  text: '#0F2557',
  textHover: '#0A1B3D',

  // Status / Badges
  gold: '#FFD700',
  purple: '#8B5CF6',
  purpleDark: '#6D28D9',
  success: '#10B981',
  successDark: '#059669',
  accepted: '#3B82F6',
  acceptedDark: '#1D4ED8',
  inProgress: '#F59E0B',
  inProgressDark: '#D97706',

  // Scrollbar (mobile friendly)
  scrollbar: '#C1C1C1',
  scrollbarHover: '#A1A1A1',

  // Semantic color mappings for components
  semantic: {
    // Buttons
    primaryButton: '#002B7F',
    primaryButtonPressed: '#001F5C',
    primaryButtonFocus: '#0038FF',
    
    secondaryButton: '#FF4D23',
    secondaryButtonPressed: '#E63A0B',
    secondaryButtonAccent: '#FF5A1F',

    // Surfaces
    screen: '#FFFFFF',
    card: '#FFFFFF',
    cardBorder: '#E5E7EB',
    
    // Text
    bodyText: '#0F2557',
    headingText: '#0F2557',
    interactiveText: '#0F2557',
    interactiveTextPressed: '#0A1B3D',
    
    // Inputs
    inputBackground: '#F5F5F5',
    inputBorder: '#E5E7EB',
    inputText: '#0F2557',
    inputFocus: '#0038FF',
    
    // Status badges
    premiumBadge: '#FFD700',
    acceptedBadge: '#3B82F6',
    acceptedBadgePressed: '#1D4ED8',
    inProgressBadge: '#F59E0B',
    inProgressBadgePressed: '#D97706',
    completedBadge: '#10B981',
    completedBadgePressed: '#059669',
    specialBadge: '#8B5CF6',
    specialBadgePressed: '#6D28D9',
    
    // Alerts & Toasts
    successAlert: '#10B981',
    errorAlert: '#E63A0B',
    errorAlertText: '#FFFFFF',
    infoAlert: '#0038FF',
    
    // Navigation
    tabInactive: '#9CA3AF',
    tabActive: '#002B7F',
    fabBackground: '#FF4D23',
    fabIcon: '#FFFFFF',
    
    // Dividers
    divider: '#E5E7EB',
  }
};

// Utility functions for color manipulation
export const ColorUtils = {
  withOpacity: (color: string, opacity: number): string => {
    const hex = color.replace('#', '');
    const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
    return `#${hex}${alpha}`;
  },

  getTextColor: (backgroundColor: string): string => {
    const darkBackgrounds = [
      Colors.primary,
      Colors.primaryDark,
      Colors.secondary,
      Colors.secondaryDark,
      Colors.text,
      Colors.textHover,
      Colors.acceptedDark,
      Colors.inProgressDark,
      Colors.successDark,
      Colors.purpleDark,
    ];
    
    return darkBackgrounds.includes(backgroundColor) ? Colors.white : Colors.text;
  },

  getPressedColor: (baseColor: string): string => {
    const pressedMap: Record<string, string> = {
      [Colors.primary]: Colors.primaryDark,
      [Colors.secondary]: Colors.secondaryDark,
      [Colors.accepted]: Colors.acceptedDark,
      [Colors.inProgress]: Colors.inProgressDark,
      [Colors.success]: Colors.successDark,
      [Colors.purple]: Colors.purpleDark,
    };
    
    return pressedMap[baseColor] || baseColor;
  },
};

export default Colors;