import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const Colors = {
  bg: '#F2EDE4',
  bgAlt: '#EAE3D6',
  surface: '#FAF6EF',
  surfaceAlt: '#FFFFFF',
  hero: '#141414',
  heroInk: '#F6F0E3',
  heroMuted: 'rgba(246,240,227,0.55)',
  heroBorder: 'rgba(246,240,227,0.18)',
  ink: '#141414',
  inkSub: '#3A3733',
  inkMuted: '#7A736B',
  divider: 'rgba(20,20,20,0.10)',
  positive: '#1F7A3A',
  warn: '#B86A2B',
} as const;

export const Fonts = {
  sans: 'Montserrat_400Regular',
  sansMed: 'Montserrat_500Medium',
  sansSemi: 'Montserrat_600SemiBold',
  sansBold: 'Montserrat_700Bold',
  mono: 'JetBrainsMono_500Medium',
  monoSemi: 'JetBrainsMono_600SemiBold',
} as const;

export const Type: Record<string, TextStyle> = {
  display: {
    fontFamily: Fonts.monoSemi,
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -0.5,
    color: Colors.heroInk,
  },
  h1: {
    fontFamily: Fonts.sansSemi,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
    color: Colors.ink,
  },
  h2: {
    fontFamily: Fonts.sansSemi,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.ink,
  },
  body: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.ink,
  },
  bodyMed: {
    fontFamily: Fonts.sansMed,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.ink,
  },
  bodySub: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.inkSub,
  },
  caption: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.inkMuted,
  },
  small: {
    fontFamily: Fonts.sansSemi,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: Colors.inkMuted,
  },
  mono: {
    fontFamily: Fonts.mono,
    fontSize: 15,
    color: Colors.ink,
  },
  monoLarge: {
    fontFamily: Fonts.monoSemi,
    fontSize: 20,
    letterSpacing: -0.3,
    color: Colors.ink,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radii = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 18,
  xxl: 22,
  pill: 999,
} as const;

export const Shadow: Record<string, ViewStyle> = {
  hero: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.18,
      shadowRadius: 28,
    },
    android: { elevation: 12 },
    default: {},
  })!,
  card: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 14,
    },
    android: { elevation: 2 },
    default: {},
  })!,
};

export const Theme = { Colors, Fonts, Type, Spacing, Radii, Shadow };
export default Theme;
