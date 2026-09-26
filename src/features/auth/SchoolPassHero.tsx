import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { bgImage, cardShadowLg, IconButton, LogoMark, Text } from '@/ui';

/**
 * AppLogin hero: graph paper (a heavier line every fifth square) fading out at the bottom,
 * with an EduFlow school pass hanging from a lanyard.
 */
export function SchoolPassHero() {
  const { t } = useTranslation();
  const { colors, scheme, toggleScheme } = useTheme();
  const insets = useSafeAreaInsets();
  // The design is 350px tall including a 44px status bar.
  const top = insets.top > 0 ? insets.top - 44 : 0;
  const role = (label: string) => (
    <View style={styles.roleRow}>
      <View style={[styles.box, { boxShadow: `inset 0 0 0 1.5px ${colors.lineStrong}` }]} />
      <Text variant="xs" weight={600} color="ink2">
        {label}
      </Text>
    </View>
  );

  return (
    <View style={[styles.hero, { height: 350 + top, backgroundColor: colors.hero }]}>
      <View
        style={[
          StyleSheet.absoluteFill,
          bgImage(
            `linear-gradient(${colors.heroLine} 1px, transparent 1px), linear-gradient(90deg, ${colors.heroLine} 1px, transparent 1px), linear-gradient(${colors.heroLine} 1px, transparent 1px), linear-gradient(90deg, ${colors.heroLine} 1px, transparent 1px)`,
            { size: '22px 22px, 22px 22px, 110px 110px, 110px 110px', position: '7px 5px, 7px 5px, 7px 5px, 7px 5px' },
          ),
        ]}
      />
      {/* The design masks the paper to transparent from 58% down; painting the hero over it matches. */}
      <View style={[StyleSheet.absoluteFill, bgImage(`linear-gradient(to bottom, transparent 58%, ${colors.hero} 100%)`)]} />

      {/* Lanyard strap */}
      <View
        style={[
          styles.strap,
          { top: 0, height: 104 + top, backgroundColor: colors.brand, boxShadow: `inset 3px 0 0 ${colors.brandHover}, inset -3px 0 0 ${colors.brandHover}` },
        ]}>
        <View style={[styles.strapTextWrap, { width: 104 + top }]}>
          <Text rawColor={colors.onBrand} numberOfLines={1} style={styles.strapText}>
            EduFlow · EduFlow · EduFlow
          </Text>
        </View>
      </View>
      {/* Clip */}
      <Svg width={30} height={30} viewBox="0 0 30 30" style={[styles.clip, { top: 98 + top }]}>
        <Rect x={3} y={0} width={24} height={13} rx={3.5} fill={colors.muted} />
        <Rect x={9} y={4} width={12} height={4.5} rx={2.25} fill={colors.hero} />
        <Path d="M11 13v8.5a4 4 0 0 0 8 0V13" fill="none" stroke={colors.muted} strokeWidth={2.6} />
      </Svg>

      <View style={[styles.toggleRow, { paddingTop: 58 + top }]}>
        <IconButton
          icon={scheme === 'dark' ? 'sun' : 'moon'}
          label={scheme === 'dark' ? t('auth.lightMode') : t('auth.darkMode')}
          onPress={toggleScheme}
          size="lg"
          iconColor={colors.onHero}
          style={{ backgroundColor: colors.heroWash, borderColor: colors.heroEdge }}
        />
      </View>

      {/* The pass */}
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('auth.passLabel')}
        style={[
          styles.pass,
          { top: 112 + top, backgroundColor: colors.surface, borderColor: colors.line },
          cardShadowLg(scheme),
        ]}>
        <View style={[styles.slot, { backgroundColor: colors.hero, boxShadow: `inset 0 0 0 1px ${colors.lineStrong}` }]} />
        <View style={styles.passBrand}>
          <LogoMark size={26} />
          <Text rawColor={colors.ink} style={styles.passWord}>
            EduFlow
          </Text>
        </View>
        <View style={styles.passBody}>
          <View style={[styles.photo, { backgroundColor: colors.sunken }]}>
            <Svg width={46} height={46} viewBox="0 0 24 24" style={{ marginBottom: -7 }}>
              <Circle cx={12} cy={8} r={4} fill={colors.lineStrong} />
              <Path d="M4 22c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5Z" fill={colors.lineStrong} />
            </Svg>
          </View>
          <View style={styles.roles}>
            {role(t('roles.parent'))}
            {role(t('roles.student'))}
            {role(t('auth.staff'))}
          </View>
        </View>
        <View style={styles.nameRow}>
          <Text variant="xxs" color="muted" weight={700} style={{ textTransform: 'uppercase', letterSpacing: 1.1 }}>
            {t('auth.name')}
          </Text>
          <View style={[styles.dotted, { borderBottomColor: colors.lineStrong }]} />
        </View>
        <View style={[styles.passFoot, { backgroundColor: colors.brand }]}>
          <Text variant="xxs" weight={800} rawColor={colors.onBrand} style={{ letterSpacing: 1.54, textTransform: 'uppercase' }}>
            {t('auth.schoolPass')}
          </Text>
          <Text variant="xxs" weight={800} num rawColor={colors.onBrand}>
            2026–27
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  strap: { position: 'absolute', left: '50%', width: 20, marginLeft: -10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  strapTextWrap: { height: 20, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '90deg' }] },
  strapText: { fontFamily: fonts.extrabold, fontSize: 8, lineHeight: 10, letterSpacing: 2.4, textTransform: 'uppercase' },
  clip: { position: 'absolute', left: '50%', marginLeft: -15 },
  toggleRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20 },
  pass: {
    position: 'absolute',
    left: '50%',
    width: 192,
    marginLeft: -96,
    transform: [{ rotate: '-3deg' }],
    transformOrigin: '50% 0%',
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  slot: { width: 36, height: 8, marginTop: 9, alignSelf: 'center', borderRadius: 4 },
  passBrand: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, paddingHorizontal: 14 },
  passWord: { fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 18, letterSpacing: -0.5 },
  passBody: { flexDirection: 'row', gap: 12, paddingTop: 12, paddingHorizontal: 14, alignItems: 'flex-start' },
  photo: { width: 54, height: 64, borderRadius: 8, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  roles: { gap: 5, paddingTop: 3 },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  box: { width: 12, height: 12, borderRadius: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, padding: 12, paddingHorizontal: 14 },
  dotted: { flex: 1, height: 10, borderBottomWidth: 1.5, borderStyle: 'dotted' },
  passFoot: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 14 },
});
