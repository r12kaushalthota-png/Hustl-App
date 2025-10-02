export const Tokens = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    xxxl: 40,
    jumbo: 48,
  },

  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    round: 9999,
  },

  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    jumbo: 32,
    huge: 40,
  },

  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
    black: '900' as const,
  },

  minTouchTarget: 44,

  hitSlop: {
    small: { top: 4, right: 4, bottom: 4, left: 4 },
    medium: { top: 8, right: 8, bottom: 8, left: 8 },
    large: { top: 12, right: 12, bottom: 12, left: 12 },
  },

  horizontalPadding: 16,
  screenPadding: 20,

  cardPadding: 16,
  sectionGutter: 24,

  elevation: {
    none: 0,
    sm: 2,
    md: 4,
    lg: 8,
    xl: 16,
  },

  iconSize: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 28,
    xl: 32,
  },

  headerHeight: 56,
  tabBarHeight: 64,
} as const;

export type SpacingKey = keyof typeof Tokens.spacing;
export type RadiusKey = keyof typeof Tokens.radius;
export type FontSizeKey = keyof typeof Tokens.fontSize;
