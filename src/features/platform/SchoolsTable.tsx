import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { DataTable, type Column } from '@/features/console/Table';
import { formatDate, relativeTime } from '@/lib/format';
import { Pill, Text } from '@/ui';

import type { SchoolRow } from './api';

/** Schools as a table; a row opens the school. `compact` drops the counts for the overview card. */
export function SchoolsTable({ rows, compact }: { rows: SchoolRow[]; compact?: boolean }) {
  const { t } = useTranslation();
  const columns: Column<SchoolRow>[] = [
    {
      key: 'school',
      title: t('platform.schools.col.school'),
      flex: 2.4,
      render: (s) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: s.primary_color }} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="sm" weight={700} numberOfLines={1}>
              {s.name}
            </Text>
            <Text variant="xs" color="muted">
              {s.code} · {formatDate(s.created_at, { year: true })}
            </Text>
          </View>
        </View>
      ),
    },
    { key: 'city', title: t('platform.schools.col.city'), flex: 1.1, render: (s) => [s.city, s.state].filter(Boolean).join(', ') || '—' },
    {
      key: 'principal',
      title: t('platform.schools.col.principal'),
      flex: 1.6,
      render: (s) =>
        s.principal ? (
          <View>
            <Text variant="sm" weight={600} numberOfLines={1}>
              {s.principal.name}
            </Text>
            <Text variant="xs" color="muted" num>
              {s.principal.phone}
            </Text>
          </View>
        ) : (
          <Text variant="sm" color="muted">
            {t('platform.schools.noPrincipal')}
          </Text>
        ),
    },
    ...(compact
      ? []
      : [
          {
            key: 'students',
            title: t('platform.schools.col.students'),
            width: 100,
            align: 'right' as const,
            render: (s: SchoolRow) => s.students.toLocaleString('en-IN'),
          },
          {
            key: 'staff',
            title: t('platform.schools.col.staff'),
            width: 80,
            align: 'right' as const,
            render: (s: SchoolRow) => s.staff.toLocaleString('en-IN'),
          },
          {
            key: 'last',
            title: t('platform.schools.col.lastSignIn'),
            width: 130,
            render: (s: SchoolRow) => (s.last_sign_in ? relativeTime(s.last_sign_in) : t('platform.schools.never')),
          },
        ]),
    {
      key: 'status',
      title: t('platform.schools.col.status'),
      width: 110,
      render: (s) => (
        <Pill tone={s.is_active ? 'ok' : 'neutral'} label={s.is_active ? t('platform.schools.active') : t('platform.schools.paused')} />
      ),
    },
  ];
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(s) => s.id}
      onRowPress={(s) => router.navigate(`/platform/schools/${s.id}` as Href)}
    />
  );
}
