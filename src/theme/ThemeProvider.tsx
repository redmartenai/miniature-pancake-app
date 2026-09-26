import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { contrast, mix, readableOn } from '@/lib/color';
import { usePreferences } from '@/state/preferences';
import { useActiveSchool } from '@/state/session';

import { dark, light, type Palette } from './tokens';

type Scheme = 'light' | 'dark';

type Theme = {
  colors: Palette;
  scheme: Scheme;
  schoolName?: string;
  /** Flip between light and dark (the moon/sun button on every screen). */
  toggleScheme: () => void;
};

const ThemeContext = createContext<Theme>({ colors: light, scheme: 'light', toggleScheme: () => undefined });

/** Lighten or darken `color` until it reaches `ratio` contrast against `against`. */
function tuneForContrast(color: string, against: string, toward: string, ratio: number, start = 0): string {
  let t = start;
  let out = mix(color, toward, t);
  while (contrast(out, against) < ratio && t < 0.8) {
    t += 0.05;
    out = mix(color, toward, t);
  }
  return out;
}

/**
 * White-label theming: rebuild the brand family (brand, ink, soft tints, hero, dock) from a
 * school's colour. Everything else stays on the Ink & Paper palette.
 */
function brandPalette(base: Palette, scheme: Scheme, brandHex?: string, accentHex?: string): Palette {
  const designBrand = (scheme === 'dark' ? dark : light).brand;
  const isDesignBrand = !brandHex || brandHex.toUpperCase() === light.brand || brandHex.toUpperCase() === designBrand;
  let next = base;

  if (!isDesignBrand && brandHex) {
    const isDark = scheme === 'dark';
    const brand = isDark
      ? tuneForContrast(brandHex, base.canvas, '#FFFFFF', 4.5, 0.35)
      : tuneForContrast(brandHex, base.surface, '#000000', 4.5);
    const brandInk = isDark ? mix(brand, '#FFFFFF', 0.15) : mix(brand, '#000000', 0.08);
    const brandSoft = mix(brand, base.canvas, isDark ? 0.8 : 0.9);
    const brandLine = mix(brand, base.canvas, isDark ? 0.65 : 0.78);
    const hero = mix(brand, base.canvas, isDark ? 0.78 : 0.88);
    const hero2 = mix(brand, base.canvas, isDark ? 0.7 : 0.82);
    const onBrand = readableOn(brand);
    next = {
      ...base,
      brand,
      brandHover: mix(brand, isDark ? '#FFFFFF' : '#000000', 0.12),
      brandInk,
      brandSoft,
      brandLine,
      onBrand,
      hero,
      hero2,
      dockOn: isDark ? brand : brandSoft,
      dockOnInk: isDark ? onBrand : brandInk,
      pBlue: brandSoft,
      pBlueInk: brandInk,
      c1: brand,
      selected: mix(brand, base.canvas, isDark ? 0.75 : 0.86),
      // legacy aliases
      primary: brand,
      onPrimary: onBrand,
      primarySoft: brandSoft,
      mapRoute: brand,
    };
  }

  if (accentHex && accentHex.toUpperCase() !== light.accent) {
    const accent = scheme === 'dark' ? mix(accentHex, '#FFFFFF', 0.3) : accentHex;
    if (contrast(accent, base.surface) >= 3) {
      next = { ...next, accent, gold: accent, accentSoft: mix(accent, base.canvas, scheme === 'dark' ? 0.82 : 0.88) };
    }
  }
  return next;
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const pref = usePreferences((s) => s.theme);
  const setTheme = usePreferences((s) => s.setTheme);
  const scheme: Scheme = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  const school = useActiveSchool();
  const primary = school?.branding.primary_color;
  const accent = school?.branding.accent_color;

  const colors = useMemo(
    () => brandPalette(scheme === 'dark' ? dark : light, scheme, primary, accent),
    [scheme, primary, accent],
  );
  const toggleScheme = useCallback(() => setTheme(scheme === 'dark' ? 'light' : 'dark'), [scheme, setTheme]);

  const value = useMemo(
    () => ({ colors, scheme, schoolName: school?.short_name, toggleScheme }),
    [colors, scheme, school?.short_name, toggleScheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
