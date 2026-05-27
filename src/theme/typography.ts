import { TextStyle } from 'react-native';

export const typography = {
  h1: { fontSize: 28, fontWeight: '700', lineHeight: 34, letterSpacing: -0.5 } as TextStyle,
  h2: { fontSize: 22, fontWeight: '700', lineHeight: 28, letterSpacing: -0.3 } as TextStyle,
  h3: { fontSize: 18, fontWeight: '600', lineHeight: 24 } as TextStyle,
  subtitle: { fontSize: 16, fontWeight: '600', lineHeight: 22 } as TextStyle,
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 } as TextStyle,
  bodySmall: { fontSize: 13, fontWeight: '400', lineHeight: 18 } as TextStyle,
  caption: { fontSize: 11, fontWeight: '500', lineHeight: 16, letterSpacing: 0.3 } as TextStyle,
  button: { fontSize: 16, fontWeight: '600', lineHeight: 22 } as TextStyle,
  buttonSmall: { fontSize: 14, fontWeight: '600', lineHeight: 20 } as TextStyle,
  mono: { fontSize: 13, fontWeight: '400', lineHeight: 18, fontFamily: 'monospace' } as TextStyle,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
} as const;
