import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Icon, ICON_SIZE, pointer, Sheet, Text } from '@/ui';

type Doc = 'terms' | 'privacy' | 'help';

/** "By continuing you agree to EduFlow's Terms · Privacy · Help", each opening a sheet. */
export function LegalFooter() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [open, setOpen] = useState<Doc>();
  const link = (doc: Doc, label: string) => (
    <Pressable accessibilityRole="link" onPress={() => setOpen(doc)} style={[styles.link, pointer]}>
      <Text variant="xs" weight={700} rawColor={colors.brandInk}>
        {label}
      </Text>
    </Pressable>
  );
  const dot = (
    <Text variant="xs" color="muted" accessibilityElementsHidden importantForAccessibility="no">
      ·
    </Text>
  );
  return (
    <View style={styles.footer}>
      <View style={styles.note}>
        <Icon name="shield" size={ICON_SIZE.sm} rawColor={colors.muted} />
        <Text variant="xs" color="muted" align="center" style={{ flexShrink: 1 }}>
          {t('auth.sharedSignIn')}
        </Text>
      </View>
      <Text variant="xs" color="muted">
        {t('auth.agree')}
      </Text>
      <View style={styles.links} accessibilityRole="menu">
        {link('terms', t('auth.terms'))}
        {dot}
        {link('privacy', t('auth.privacy'))}
        {dot}
        {link('help', t('auth.help'))}
      </View>
      <Sheet
        visible={!!open}
        onClose={() => setOpen(undefined)}
        title={open === 'help' ? t('auth.help') : open === 'terms' ? t('auth.terms') : t('auth.privacy')}
        message={open === 'help' ? t('auth.helpText') : t('settings.privacyText')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14 },
  note: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 8, paddingHorizontal: 14, paddingBottom: 8 },
  links: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  link: { height: 44, justifyContent: 'center', paddingHorizontal: 10 },
});
