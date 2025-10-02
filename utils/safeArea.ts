import { EdgeInsets } from 'react-native-safe-area-context';
import { Tokens } from '@/constants/Tokens';

export const getSafeContentPadding = (
  insets: EdgeInsets,
  tabBarHeight: number = 0
) => {
  return {
    paddingTop: insets.top,
    paddingBottom: Math.max(insets.bottom, Tokens.spacing.sm) + tabBarHeight,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };
};

export const getScrollContentPadding = (
  insets: EdgeInsets,
  tabBarHeight: number = 0,
  extraBottom: number = Tokens.spacing.base
) => {
  return {
    paddingBottom:
      Math.max(insets.bottom, Tokens.spacing.sm) + tabBarHeight + extraBottom,
  };
};

export const getHeaderPadding = (insets: EdgeInsets) => {
  return {
    paddingTop: insets.top,
    paddingLeft: Math.max(insets.left, Tokens.spacing.base),
    paddingRight: Math.max(insets.right, Tokens.spacing.base),
  };
};

export const getMinTouchableHeight = () => Tokens.minTouchTarget;
export const getMinTouchableWidth = () => Tokens.minTouchTarget;
