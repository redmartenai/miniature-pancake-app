import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { num } from '@/features/console/format';
import { CardHead, Col, ConsolePage, Panel, Row } from '@/features/console/Page';
import { platformApi, usePlatformQuery } from '@/features/platform/api';
import { SchoolsTable } from '@/features/platform/SchoolsTable';
import { formatDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, Link, Pill, Text } from '@/ui';

/** Platform overview: how many schools, and who hasn't finished signing in yet. */
export default function PlatformOverview() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const q = usePlatformQuery(['overview'], platformApi.overview);
  const d = q.data;
  const kpis = d
    ? [
        {
          label: t('platform.overview.schools'),
          value: num(d.schools),
          sub: t('platform.overview.activePaused', { active: d.active, paused: d.paused }),
        },
        { label: t('platform.overview.students'), value: num(d.students) },
        { label: t('platform.overview.staff'), value: num(d.staff) },
        { label: t('platform.overview.newThisMonth'), value: num(d.new_this_month) },
      ]
    : [];
  return (
    <ConsolePage
      title={t('platform.overview.title')}
      home={{ label: t('platform.area'), href: '/platform' as Href }}
      subtitle={t('platform.overview.subtitle')}
      actions={<Button title={t('platform.nav.register')} icon="plus" onPress={() => router.navigate('/platform/schools/new' as Href)} />}
      loading={q.isLoading}
      error={q.error}
      onRetry={q.refetch}>
      {d ? (
        <>
          <Row>
            {kpis.map((k) => (
              <Col key={k.label} span={3}>
                <Card pad={22} style={{ gap: 8 }}>
                  <Text variant="kicker">{k.label}</Text>
                  <Text variant="kpi">{k.value}</Text>
                  {k.sub ? (
                    <Text variant="xs" color="muted">
                      {k.sub}
                    </Text>
                  ) : null}
                </Card>
              </Col>
            ))}
          </Row>
          <Row>
            <Col span={8}>
              <Card pad={0} style={{ overflow: 'hidden' }}>
                <View style={{ padding: 22, paddingBottom: 16 }}>
                  <CardHead
                    title={t('platform.overview.recent')}
                    right={<Link label={t('platform.overview.all')} onPress={() => router.navigate('/platform/schools' as Href)} />}
                  />
                </View>
                {d.recent.length ? (
                  <SchoolsTable rows={d.recent} compact />
                ) : (
                  <Text variant="sm" color="muted" style={{ padding: 22 }}>
                    {t('platform.overview.noSchools')}
                  </Text>
                )}
              </Card>
            </Col>
            <Col span={4}>
              <Panel>
                <CardHead title={t('platform.overview.pending')} subtitle={t('platform.overview.pendingSub')} />
                {d.pending.length === 0 ? (
                  <Text variant="sm" color="muted">
                    {t('platform.overview.nothingPending')}
                  </Text>
                ) : (
                  d.pending.map((p, i) => (
                    <View
                      key={`${p.school_id}${p.name}${i}`}
                      style={[styles.pending, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text variant="sm" weight={700} numberOfLines={1}>
                          {p.name}
                        </Text>
                        <Text variant="xs" color="muted" numberOfLines={1}>
                          {p.school}
                        </Text>
                        <Text variant="xs" color="muted">
                          {p.kind === 'invite'
                            ? t('platform.overview.invitePending', { date: p.expires_at ? formatDate(p.expires_at) : '' })
                            : t('platform.overview.tempPending')}
                        </Text>
                      </View>
                      <Pill tone={p.kind === 'invite' ? 'info' : 'warn'} label={t(`platform.slip.role.${p.role}`)} />
                    </View>
                  ))
                )}
              </Panel>
            </Col>
          </Row>
        </>
      ) : null}
    </ConsolePage>
  );
}

const styles = StyleSheet.create({
  pending: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
});
