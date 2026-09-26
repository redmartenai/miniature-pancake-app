/**
 * EduFlow design tokens: the "Ink & Paper" system (eduflow-ui/screens/eduflow.css).
 * Values are copied verbatim from `.ef` (light) and `.ef.dark`. Keep them in sync with the design file.
 *
 * The legacy keys at the bottom of each palette (bg, text, primary, …) alias the new tokens so
 * screens that have not been redesigned yet keep working. Remove them once every screen is ported.
 */

export type Pastel = 'blue' | 'pink' | 'mint' | 'lav' | 'peach' | 'butter';

type DesignTokens = {
  canvas: string;
  subtle: string;
  sunken: string;
  selected: string;
  surface: string;
  raised: string;
  line: string;
  lineStrong: string;
  ink: string;
  ink2: string;
  muted: string;
  faint: string;
  brand: string;
  brandHover: string;
  brandInk: string;
  brandSoft: string;
  brandLine: string;
  onBrand: string;
  accent: string;
  accentSoft: string;
  hero: string;
  hero2: string;
  onHero: string;
  heroMuted: string;
  heroLine: string;
  heroWash: string;
  heroEdge: string;
  gold: string;
  dock: string;
  dockInk: string;
  dockOn: string;
  dockOnInk: string;
  pBlue: string;
  pBlueInk: string;
  pPink: string;
  pPinkInk: string;
  pMint: string;
  pMintInk: string;
  pLav: string;
  pLavInk: string;
  pPeach: string;
  pPeachInk: string;
  pButter: string;
  pButterInk: string;
  pTrack: string;
  pHr: string;
  tear: string;
  rule: string;
  marginLine: string;
  tape: string;
  ok: string;
  okSoft: string;
  warn: string;
  warnSoft: string;
  bad: string;
  badSoft: string;
  info: string;
  infoSoft: string;
  c1: string;
  c2: string;
  c3: string;
  c4: string;
  track: string;
  scrim: string;
  /** Heat-map cells (attendance registers): background / text for 97+, 94–96, 90–93. */
  hx3: string;
  hx3Ink: string;
  hx2: string;
  hx2Ink: string;
  hx1: string;
  hx1Ink: string;
  /** Highlighter pens (`.hl`). */
  hlButter: string;
  hlPink: string;
  hlMint: string;
  hlSky: string;
  hlLav: string;
};

type LegacyTokens = {
  bg: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  borderSoft: string;
  primary: string;
  onPrimary: string;
  primarySoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  overlay: string;
  mapRoute: string;
};

export type Palette = DesignTokens & LegacyTokens;

function withLegacy(t: DesignTokens): Palette {
  return {
    ...t,
    bg: t.canvas,
    surfaceAlt: t.sunken,
    text: t.ink2,
    textMuted: t.muted,
    border: t.line,
    borderSoft: t.line,
    primary: t.brand,
    onPrimary: t.onBrand,
    primarySoft: t.brandSoft,
    success: t.ok,
    successSoft: t.okSoft,
    warning: t.warn,
    warningSoft: t.warnSoft,
    danger: t.bad,
    dangerSoft: t.badSoft,
    overlay: t.scrim,
    mapRoute: t.brand,
  };
}

export const light: Palette = withLegacy({
  canvas: '#FBFAF7',
  subtle: '#F6F4EF',
  sunken: '#F0EDE6',
  selected: '#E8EAF8',
  surface: '#FFFFFF',
  raised: '#FFFFFF',
  line: '#ECE8DF',
  lineStrong: '#DDD7CB',
  ink: '#1C1B22',
  ink2: '#45434F',
  muted: '#6B6875',
  faint: '#A8A4AE',
  brand: '#3446C8',
  brandHover: '#2A3AAE',
  brandInk: '#2C3DB5',
  brandSoft: '#ECEEFB',
  brandLine: '#D3D8F5',
  onBrand: '#FFFFFF',
  accent: '#C9571F',
  accentSoft: '#FCEDE4',
  hero: '#E9ECFA',
  hero2: '#DCE1F7',
  onHero: '#1C1B22',
  heroMuted: '#45465E',
  heroLine: 'rgba(44,61,181,0.14)',
  heroWash: 'rgba(255,255,255,0.55)',
  heroEdge: 'rgba(28,27,34,0.22)',
  gold: '#C9571F',
  dock: '#FFFFFF',
  dockInk: '#6B6875',
  dockOn: '#ECEEFB',
  dockOnInk: '#2C3DB5',
  pBlue: '#EAEEFB',
  pBlueInk: '#2C3DB5',
  pPink: '#FBEAEE',
  pPinkInk: '#A8354F',
  pMint: '#E5F3EC',
  pMintInk: '#1F6F4E',
  pLav: '#EFEAFA',
  pLavInk: '#5A3FB0',
  pPeach: '#FDEEE3',
  pPeachInk: '#A24F1C',
  pButter: '#FBF3D9',
  pButterInk: '#7F6210',
  pTrack: 'rgba(255,255,255,0.85)',
  pHr: 'rgba(28,27,34,0.08)',
  tear: 'rgba(28,27,34,0.22)',
  rule: '#E8E3D8',
  marginLine: 'rgba(201,87,31,0.38)',
  tape: 'rgba(255,255,255,0.62)',
  ok: '#1F7A4D',
  okSoft: '#E4F4EA',
  warn: '#9A5208',
  warnSoft: '#FDF0DE',
  bad: '#BE3636',
  badSoft: '#FCE8E8',
  info: '#2F62C4',
  infoSoft: '#E7EEFC',
  c1: '#3446C8',
  c2: '#D9622B',
  c3: '#1F8A70',
  c4: '#9B4DCA',
  track: '#F0EDE6',
  scrim: 'rgba(14,17,32,0.45)',
  hx3: '#1F6F4E',
  hx3Ink: '#FFFFFF',
  hx2: '#86D3AE',
  hx2Ink: '#0F3D2A',
  hx1: '#D3F0E1',
  hx1Ink: '#1C5A40',
  hlButter: '#FBF3D9',
  hlPink: '#FBEAEE',
  hlMint: '#E5F3EC',
  hlSky: '#EAEEFB',
  hlLav: '#EFEAFA',
});

export const dark: Palette = withLegacy({
  canvas: '#121218',
  subtle: '#17171F',
  sunken: '#0D0D12',
  selected: '#262A45',
  surface: '#1B1B24',
  raised: '#23232E',
  line: '#2C2C38',
  lineStrong: '#3A3A48',
  ink: '#F2F0EC',
  ink2: '#CFCCD4',
  muted: '#9C98A6',
  faint: '#62606C',
  brand: '#8C9BFF',
  brandHover: '#A3AFFF',
  brandInk: '#A9B4FF',
  brandSoft: '#22264A',
  brandLine: '#333A6E',
  onBrand: '#121218',
  accent: '#F08A5D',
  accentSoft: '#3A2218',
  hero: '#1F2244',
  hero2: '#272B55',
  onHero: '#F2F0EC',
  heroMuted: '#BCC2E6',
  heroLine: 'rgba(242,240,236,0.12)',
  heroWash: 'rgba(242,240,236,0.05)',
  heroEdge: 'rgba(242,240,236,0.3)',
  gold: '#F08A5D',
  dock: '#1E1E28',
  dockInk: '#9C98A6',
  dockOn: '#8C9BFF',
  dockOnInk: '#121218',
  pBlue: '#1E2245',
  pBlueInk: '#AEB8FF',
  pPink: '#3A1D26',
  pPinkInk: '#F4A5B8',
  pMint: '#16302A',
  pMintInk: '#8AD8B4',
  pLav: '#282043',
  pLavInk: '#C6B4FF',
  pPeach: '#3A2519',
  pPeachInk: '#F6B98E',
  pButter: '#332C14',
  pButterInk: '#E8CF7A',
  pTrack: 'rgba(255,255,255,0.08)',
  pHr: 'rgba(255,255,255,0.08)',
  tear: 'rgba(242,240,236,0.25)',
  rule: '#2A2A35',
  marginLine: 'rgba(240,138,93,0.40)',
  tape: 'rgba(255,255,255,0.16)',
  ok: '#6FCF97',
  okSoft: '#15301F',
  warn: '#F0B45C',
  warnSoft: '#33260F',
  bad: '#FF8F8F',
  badSoft: '#3A1A1E',
  info: '#8FB4FF',
  infoSoft: '#18264A',
  c1: '#7F8FFF',
  c2: '#E97B4C',
  c3: '#3FB594',
  c4: '#B07BE0',
  track: '#2C2C38',
  scrim: 'rgba(14,17,32,0.45)',
  hx3: '#6FCF97',
  hx3Ink: '#121218',
  hx2: '#2F7A58',
  hx2Ink: '#F2F0EC',
  hx1: '#1B3A2E',
  hx1Ink: '#A6E3C4',
  hlButter: '#5A4B14',
  hlPink: '#5C2540',
  hlMint: '#1D4A3B',
  hlSky: '#283A77',
  hlLav: '#3A2F6A',
});

/** Background and ink for a pastel widget (`.w-*`). */
export function pastel(p: Palette, name: Pastel): { bg: string; ink: string } {
  switch (name) {
    case 'pink':
      return { bg: p.pPink, ink: p.pPinkInk };
    case 'mint':
      return { bg: p.pMint, ink: p.pMintInk };
    case 'lav':
      return { bg: p.pLav, ink: p.pLavInk };
    case 'peach':
      return { bg: p.pPeach, ink: p.pPeachInk };
    case 'butter':
      return { bg: p.pButter, ink: p.pButterInk };
    default:
      return { bg: p.pBlue, ink: p.pBlueInk };
  }
}

export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32 } as const;

/** Corner radii from eduflow.css. */
export const radius = {
  sm: 10,
  md: 12,
  well: 14,
  cardFlat: 16,
  lg: 18,
  card: 18,
  hero: 20,
  dock: 26,
  sheet: 28,
  pill: 999,
} as const;

export const fonts = {
  display: 'BricolageGrotesque_600SemiBold',
  displayMedium: 'BricolageGrotesque_500Medium',
  displayBold: 'BricolageGrotesque_700Bold',
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
  italic: 'PlusJakartaSans_400Regular_Italic',
  /** Legacy alias for screens not yet redesigned. */
  serif: 'BricolageGrotesque_500Medium',
} as const;

/** Map a CSS font-weight to the Plus Jakarta Sans face we load. */
export function uiFont(weight: 400 | 500 | 600 | 650 | 700 | 800 = 500): string {
  if (weight >= 800) return fonts.extrabold;
  if (weight >= 700) return fonts.bold;
  if (weight >= 600) return fonts.semibold;
  if (weight >= 500) return fonts.medium;
  return fonts.regular;
}

export type Tone = 'neutral' | 'primary' | 'brand' | 'accent' | 'success' | 'ok' | 'warning' | 'warn' | 'danger' | 'bad' | 'info' | 'ink' | 'pink';

export function toneColors(p: Palette, tone: Tone): { fg: string; bg: string } {
  switch (tone) {
    case 'primary':
    case 'brand':
      return { fg: p.brandInk, bg: p.brandSoft };
    case 'accent':
      return { fg: p.accent, bg: p.accentSoft };
    case 'success':
    case 'ok':
      return { fg: p.ok, bg: p.okSoft };
    case 'warning':
    case 'warn':
      return { fg: p.warn, bg: p.warnSoft };
    case 'danger':
    case 'bad':
      return { fg: p.bad, bg: p.badSoft };
    case 'info':
      return { fg: p.info, bg: p.infoSoft };
    case 'ink':
      return { fg: p.canvas, bg: p.ink };
    case 'pink':
      return { fg: p.pPinkInk, bg: p.pPink };
    default:
      return { fg: p.ink2, bg: p.sunken };
  }
}
