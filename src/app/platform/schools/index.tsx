import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { ConsolePage } from '@/features/console/Page';
import { platformApi, usePlatformQuery } from '@/features/platform/api';
import { SchoolsTable } from '@/features/platform/SchoolsTable';
import { Button, Card, Search, SegmentedControl, Text } from '@/ui';

type Status = 'all' | 'active' | 'paused';

/** Every school on EduFlow: search, filter by status, open one. */
export default function PlatformSchools() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<Status>('all');
  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(id);
  }, [q]);
  const list = usePlatformQuery(['schools', debounced, status], () => platformApi.schools(debounced, status));
  const rows = list.data?.items ?? [];
  return (
    <ConsolePage
      title={t('platform.schools.title')}
      home={{ label: t('platform.area'), href: '/platform' as Href }}
      subtitle={list.data ? t('platform.schools.subtitle', { count: rows.length }) : undefined}
      actions={<Button title={t('platform.nav.register')} icon="plus" onPress={() => router.navigate('/platform/schools/new' as Href)} />}
      error={list.error}
      onRetry={list.refetch}>
      <Card pad={0} style={{ overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
          <Search value={q} onChangeText={setQ} placeholder={t('platform.schools.search')} style={{ flex: 1, maxWidth: 380 }} />
          <SegmentedControl
            full={false}
            value={status}
            onChange={setStatus}
            options={(['all', 'active', 'paused'] as Status[]).map((s) => ({ value: s, label: t(`platform.schools.filter.${s}`) }))}
          />
        </View>
        {rows.length ? (
          <SchoolsTable rows={rows} />
        ) : (
          <Text variant="sm" color="muted" style={{ padding: 22 }}>
            {list.isLoading ? t('common.loading') : t('platform.schools.empty')}
          </Text>
        )}
      </Card>
    </ConsolePage>
  );
}
