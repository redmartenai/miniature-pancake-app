import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { contrast, mix, readableOn } from '@/lib/color';
import { useActiveSchool } from '@/state/session';

import { dark, light, type Palette } from './tokens';

type Theme = { colors: Palette; scheme: 'light' | 'dark'; schoolName?: string };

const ThemeContext = createContext<Theme>({ colors: light, scheme: 'light' });

/** Apply a school's brand colour on top of the base palette (white-label theming). */
function brandPalette(base: Palette, scheme: 'light' | 'dark', brand?: string, accent?: string): Palette {
  if (!brand) return base;
  let primary = brand;
  if (scheme === 'dark') {
    // Lighten until it reads on the dark background.
    let t = 0.35;
    primary = mix(brand, '#FFFFFF', t);
    while (contrast(primary, base.bg) < 4.5 && t < 0.8) {
      t += 0.1;
      primary = mix(brand, '#FFFFFF', t);
    }
  } else {
    let t = 0;
    while (contrast(primary, base.surface) < 4.5 && t < 0.6) {
      t += 0.1;
      primary = mix(brand, '#000000', t);
    }
  }
  const primarySoft = mix(primary, base.bg, scheme === 'dark' ? 0.8 : 0.88);
  const next: Palette = {
    ...base,
    primary,
    onPrimary: readableOn(primary),
    primarySoft,
    success: base.success,
    mapRoute: primary,
  };
  if (accent) {
    const accentColor = scheme === 'dark' ? mix(accent, '#FFFFFF', 0.3) : accent;
    next.accent = contrast(accentColor, base.surface) >= 3 ? accentColor : base.accent;
    next.accentSoft = mix(next.accent, base.bg, scheme === 'dark' ? 0.82 : 0.88);
  }
  return next;
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const scheme: 'light' | 'dark' = system === 'dark' ? 'dark' : 'light';
  const school = useActiveSchool();
  const base = scheme === 'dark' ? dark : light;
  const colors = brandPalette(base, scheme, school?.branding.primary_color, school?.branding.accent_color);
  return (
    <ThemeContext.Provider value={{ colors, scheme, schoolName: school?.short_name }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
