import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { CardHead } from '@/features/console/Page';
import { useTheme } from '@/theme/ThemeProvider';
import { Card, Pill, pointer, SegmentedControl, Text, TileIcon } from '@/ui';

import type { FleetRow } from './api';
import { statusPill, statusTile } from './status';

const T = 'console.operations.transport';

/** Fleet: every bus, late first, with how many of its riders are on board. Picking one selects it on the map. */
export function FleetList({
  fleet,
  selectedId,
  onSelect,
}: {
  fleet: FleetRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [filter, setFilter] = useState<'all' | 'late'>('all');
  const late = fleet.filter((r) => r.status === 'late');
  const rows = filter === 'late' ? late : fleet;

  return (
    <Card pad={0} style={{ ...styles.card }}>
      <CardHead
        style={{ paddingHorizontal: 10 }}
        title={t(`${T}.fleet.title`)}
        subtitle={t(`${T}.fleet.sub`)}
        right={
          <SegmentedControl
            full={false}
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: t(`${T}.fleet.all`, { count: fleet.length }) },
              { value: 'late', label: t(`${T}.fleet.late`, { count: late.length }) },
            ]}
          />
        }
      />
      <View style={{ gap: 2 }} accessibilityRole="list">
        {rows.length === 0 ? (
          <Text variant="sm" color="muted" style={{ paddingHorizontal: 10, paddingVertical: 12 }}>
            {t(`${T}.fleet.noneLate`)}
          </Text>
        ) : null}
        {rows.map((row) => {
          const on = row.id === selectedId;
          const pill = statusPill(t, row);
          const counted = row.status !== 'arrived' && row.status !== 'depot' && row.riders > 0;
          return (
            <Pressable
              key={row.id}
              onPress={() => onSelect(row.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${row.label}, ${pill.label}${counted ? `, ${t(`${T}.fleet.onBoard`, { on: row.on_board, total: row.riders })}` : ''}`}
              style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.row,
                pointer,
                {
                  borderColor: on ? colors.brandLine : 'transparent',
                  backgroundColor: on ? colors.brandSoft : hovered ? colors.subtle : 'transparent',
                },
              ]}>
              <TileIcon icon="bus" size="sm" tone={statusTile(row.status)} />
              <Text variant="sm" weight={700} style={{ flex: 1 }} numberOfLines={1}>
                {row.label}
              </Text>
              <Pill label={pill.label} tone={pill.tone} />
              <Text variant="xs" weight={700} color="ink2" num style={styles.count}>
                {counted ? `${row.on_board}/${row.riders}` : '—'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingTop: 20, paddingHorizontal: 12, paddingBottom: 12, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1 },
  count: { width: 52, textAlign: 'right' },
});
