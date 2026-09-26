import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { CardHead } from '@/features/console/Page';
import { useTheme } from '@/theme/ThemeProvider';
import { Card, Pill, Text, TileIcon, type IconName, type PillTone, type TileTone } from '@/ui';

import type { TransportException } from './api';

const T = 'console.operations.transport.exceptions';

const LOOK: Record<TransportException['kind'], { icon: IconName; tone: TileTone & PillTone }> = {
  held: { icon: 'alert', tone: 'bad' },
  stop_change: { icon: 'pin', tone: 'info' },
  not_scanned: { icon: 'scan', tone: 'warn' },
  off_manifest: { icon: 'user', tone: 'neutral' },
};

/** Pickup & drop exceptions today: held children, stop changes, missed scans, riders off the manifest. */
export function Exceptions({ items }: { items: TransportException[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Card pad={20} style={{ gap: 4 }}>
      <CardHead
        style={{ marginBottom: 4 }}
        title={t(`${T}.title`)}
        right={
          <Text variant="xs" color="muted" weight={600}>
            {t(`${T}.today`, { count: items.length })}
          </Text>
        }
      />
      {items.length === 0 ? (
        <Text variant="sm" color="muted" style={{ paddingVertical: 12 }}>
          {t(`${T}.none`)}
        </Text>
      ) : null}
      <View accessibilityRole="list">
        {items.map((item, i) => {
          const look = LOOK[item.kind];
          const one = item.students.length === 1 ? item.students[0] : null;
          const title = one ? `${one.name} · ${one.class}` : t(`${T}.group`, { route: item.route ?? '', count: item.students.length });
          const detail =
            item.kind === 'stop_change' && item.from_stop && item.to_stop
              ? t(`${T}.stopChange`, { route: item.route ?? '', from: item.from_stop, to: item.to_stop })
              : item.note;
          const resolved = item.status === 'resolved';
          return (
            <View
              key={item.id}
              style={[
                styles.item,
                i < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line },
                resolved && { opacity: 0.6 },
              ]}>
              <TileIcon icon={look.icon} size="sm" tone={look.tone} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.head}>
                  <Text variant="sm" weight={700} style={{ flexShrink: 1 }} numberOfLines={1}>
                    {title}
                  </Text>
                  <Pill label={resolved ? t(`${T}.resolved`) : t(`${T}.kind.${item.kind}`)} tone={resolved ? 'ok' : look.tone} />
                </View>
                {detail ? (
                  <Text variant="xs" color="muted">
                    {detail}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
