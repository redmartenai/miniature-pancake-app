import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Card, LogoMark, Text, ThemeToggle } from '@/ui';

/** A centred card on the canvas, for the password and invite screens. */
export function AuthCard({ title, body, children }: { title: string; body?: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvas }} contentContainerStyle={styles.page}>
      <View style={styles.top}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <LogoMark size={30} />
          <Text style={[styles.word, { color: colors.ink }]}>EduFlow</Text>
        </View>
        <ThemeToggle size="md" />
      </View>
      <Card pad={28} style={styles.card}>
        <Text variant="h2" accessibilityRole="header">
          {title}
        </Text>
        {body ? (
          <Text variant="sm" color="muted">
            {body}
          </Text>
        ) : null}
        {children}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, padding: 24, alignItems: 'center', gap: 32 },
  top: { width: '100%', maxWidth: 440, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 },
  word: { fontFamily: fonts.displayBold, fontSize: 21, letterSpacing: -0.63 },
  card: { width: '100%', maxWidth: 440, gap: 14 },
});
