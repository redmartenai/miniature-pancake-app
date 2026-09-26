import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Icon, Text } from '@/ui';

import type { DocAccess, DocRow } from '../api';

/** The square type badge: PDF (pink for circulars), DOC, XLS, IMG. */
export function TypeBadge({ doc, size = 32 }: { doc: Pick<DocRow, 'type' | 'title'>; size?: number }) {
  const { colors } = useTheme();
  const circular = doc.type === 'pdf' && /^circular/i.test(doc.title);
  const tone = {
    pdf: circular ? { bg: colors.pPink, fg: colors.pPinkInk } : { bg: colors.pBlue, fg: colors.pBlueInk },
    doc: { bg: colors.brandSoft, fg: colors.brandInk },
    xls: { bg: colors.sunken, fg: colors.ink2 },
    img: { bg: colors.pMint, fg: colors.pMintInk },
    file: { bg: colors.sunken, fg: colors.ink2 },
  }[doc.type];
  return (
    <View style={[styles.badge, { width: size, height: size, backgroundColor: tone.bg }]} accessibilityLabel={doc.type.toUpperCase()}>
      <Text style={[styles.badgeText, { color: tone.fg }]}>{doc.type === 'file' ? 'FILE' : doc.type.toUpperCase()}</Text>
    </View>
  );
}

/** Who can open it, as a pill: outlined for school-wide, filled for a scoped audience, brand + lock when restricted. */
export function AccessPill({ access }: { access: DocAccess }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const label = accessLabel(t, access);
  const outline = access.kind === 'school' || access.kind === 'staff';
  const locked = access.kind === 'private';
  return (
    <View
      accessibilityLabel={label}
      style={[
        styles.pill,
        outline
          ? { borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface }
          : locked
            ? { backgroundColor: colors.brandSoft }
            : { backgroundColor: colors.sunken },
      ]}>
      {locked ? <Icon name="lock" size={12} rawColor={colors.brandInk} /> : null}
      <Text numberOfLines={1} style={[styles.pillText, { color: locked ? colors.brandInk : colors.ink2 }]}>
        {label}
      </Text>
    </View>
  );
}

export function accessLabel(t: (k: string, o?: Record<string, unknown>) => string, a: DocAccess): string {
  switch (a.kind) {
    case 'school':
      return t('console.engage.docs.acc_school');
    case 'staff':
      return t('console.engage.docs.acc_staff');
    case 'parents':
      return t('console.engage.docs.acc_parents', { scope: a.label });
    case 'students':
      return t('console.engage.docs.acc_students', { scope: a.label });
    case 'route':
      return t('console.engage.docs.acc_route', { route: a.label });
    case 'family':
      return t('console.engage.docs.acc_family', { name: a.label });
    case 'teachers':
    case 'class_teacher':
      return t('console.engage.docs.acc_teachers', { scope: a.label });
    case 'accountant':
      return t('console.engage.docs.acc_accountant');
    default:
      return a.owner_is_management ? t('console.engage.docs.acc_principalOwner') : t('console.engage.docs.acc_owner');
  }
}

/** "1.2 MB", "312 KB". */
export function size(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const styles = StyleSheet.create({
  badge: { borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.3 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 24,
    paddingHorizontal: 9,
    borderRadius: 999,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  pillText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 15, flexShrink: 1 },
});
