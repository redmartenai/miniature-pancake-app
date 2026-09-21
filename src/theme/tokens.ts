/**
 * EduFlow design tokens (from the prototype: forest green, copper, warm ivory).
 * Dark mode is designed separately so every pair keeps readable contrast.
 */

export type Palette = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  ink: string;
  text: string;
  textMuted: string;
  border: string;
  borderSoft: string;
  primary: string;
  onPrimary: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;
  overlay: string;
  mapRoute: string;
};

export const light: Palette = {
  bg: '#F8F5EF',
  surface: '#FFFFFF',
  surfaceAlt: '#F0EBE2',
  ink: '#241F1B',
  text: '#332F29',
  textMuted: '#6B645A',
  border: '#E2DCD1',
  borderSoft: '#EDE8DF',
  primary: '#2E5D4E',
  onPrimary: '#FFFFFF',
  primarySoft: '#E4EDE9',
  accent: '#A8692E',
  accentSoft: '#F7EDE0',
  success: '#2E6B55',
  successSoft: '#E1F0E8',
  warning: '#8A5E12',
  warningSoft: '#FAEBD3',
  danger: '#A13D30',
  dangerSoft: '#F7E2DF',
  info: '#46586B',
  infoSoft: '#E6ECF2',
  overlay: 'rgba(36,31,27,0.45)',
  mapRoute: '#2E5D4E',
};

export const dark: Palette = {
  bg: '#161310',
  surface: '#221E1A',
  surfaceAlt: '#2B2621',
  ink: '#F6F1E8',
  text: '#E6DFD3',
  textMuted: '#A99E8F',
  border: '#3A342C',
  borderSoft: '#2F2A24',
  primary: '#7CC0A6',
  onPrimary: '#0E1D17',
  primarySoft: '#1E352D',
  accent: '#E0A56B',
  accentSoft: '#3A2B1D',
  success: '#7CC0A6',
  successSoft: '#1E352D',
  warning: '#E6B864',
  warningSoft: '#3A2E1A',
  danger: '#EE8E80',
  dangerSoft: '#3E2320',
  info: '#A9BCCF',
  infoSoft: '#27303A',
  overlay: 'rgba(0,0,0,0.55)',
  mapRoute: '#7CC0A6',
};

export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 20, pill: 999 } as const;

export const fonts = {
  display: 'Fraunces_600SemiBold',
  serif: 'Fraunces_500Medium',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export type Tone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export function toneColors(p: Palette, tone: Tone): { fg: string; bg: string } {
  switch (tone) {
    case 'primary':
      return { fg: p.primary, bg: p.primarySoft };
    case 'accent':
      return { fg: p.accent, bg: p.accentSoft };
    case 'success':
      return { fg: p.success, bg: p.successSoft };
    case 'warning':
      return { fg: p.warning, bg: p.warningSoft };
    case 'danger':
      return { fg: p.danger, bg: p.dangerSoft };
    case 'info':
      return { fg: p.info, bg: p.infoSoft };
    default:
      return { fg: p.textMuted, bg: p.surfaceAlt };
  }
}
