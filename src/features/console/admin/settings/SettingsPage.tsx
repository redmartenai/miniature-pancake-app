import { router, useLocalSearchParams } from 'expo-router';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useConsoleQuery } from '@/features/console/api';
import { Col, ConsolePage, Row } from '@/features/console/Page';
import { formatDate, formatTime } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Button, Card, Icon, Link, pointer, Skeleton, Text, type IconName } from '@/ui';

import { adminApi, type AuditEntry, type SettingsOverview } from '../api';
import { RolesPanel } from './RolesPanel';
import {
  AuditLogPanel,
  BillingSection,
  CalendarSection,
  IntegrationsSection,
  NotificationsSection,
  ProfileSection,
  SecuritySection,
} from './Sections';

const SECTIONS = ['profile', 'calendar', 'roles', 'notifications', 'integrations', 'security', 'billing'] as const;
type Section = (typeof SECTIONS)[number] | 'audit';

const ICONS: Record<(typeof SECTIONS)[number], IconName> = {
  profile: 'school',
  calendar: 'calendar',
  roles: 'key',
  notifications: 'bell',
  integrations: 'layers',
  security: 'shield',
  billing: 'card',
};

/** Console: school settings. The left nav picks a section (kept in `?section=`); roles & permissions is the default. */
export function SettingsPage() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ section?: string }>();
  const section: Section = params.section === 'audit' || SECTIONS.includes(params.section as never) ? (params.section as Section) : 'roles';
  const overview = useConsoleQuery(['admin', 'settings'], adminApi.settings);
  const roles = useConsoleQuery(['admin', 'roles'], adminApi.roles);
  const data = overview.data;
  const go = (s: Section) => router.setParams({ section: s });
  const current = section === 'audit' ? t('console.admin.settings.security.log') : t(`console.admin.settings.nav.${section}`);

  return (
    <ConsolePage
      title={t('console.admin.settings.title')}
      error={overview.error ?? roles.error}
      onRetry={() => {
        overview.refetch();
        roles.refetch();
      }}
      head={
        <Head
          current={current}
          subtitle={data ? t('console.admin.settings.subtitle', { school: data.profile.name, campus: data.profile.campus }) : ' '}
          onAudit={() => go('audit')}
        />
      }>
      <Row align="flex-start">
        <Col span={3} gap={20} style={styles.side}>
          <Nav section={section === 'audit' ? 'security' : section} onPick={go} data={data} rolesCount={roles.data?.roles.length ?? 0} />
          <RecentChanges items={roles.data?.recent} onFull={() => go('audit')} />
        </Col>
        <Col span={9} gap={20}>
          {data && !data.can_edit ? (
            <Card variant="well" pad={14}>
              <Text variant="sm" color="ink2">
                {t('console.admin.settings.readOnly')}
              </Text>
            </Card>
          ) : null}
          {!data || !roles.data ? (
            <Skeleton height={640} style={{ borderRadius: 18 }} />
          ) : section === 'roles' ? (
            <RolesPanel roles={roles.data.roles} canEdit={roles.data.can_edit} />
          ) : section === 'profile' ? (
            <ProfileSection data={data} />
          ) : section === 'calendar' ? (
            <CalendarSection data={data} />
          ) : section === 'notifications' ? (
            <NotificationsSection data={data} />
          ) : section === 'integrations' ? (
            <IntegrationsSection data={data} />
          ) : section === 'security' ? (
            <SecuritySection data={data} />
          ) : section === 'audit' ? (
            <AuditLogPanel />
          ) : (
            <BillingSection data={data} />
          )}
        </Col>
      </Row>
    </ConsolePage>
  );
}

function Nav({
  section: active,
  onPick,
  data,
  rolesCount,
}: {
  section: Section;
  onPick: (s: Section) => void;
  data?: SettingsOverview;
  rolesCount: number;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const subs: Record<(typeof SECTIONS)[number], string> = {
    profile: t('console.admin.settings.nav.profileSub'),
    calendar: data
      ? t('console.admin.settings.nav.calendarSub', {
          year: data.calendar.academic_year?.name ?? '',
          terms: t('console.admin.settings.nav.terms', { count: data.calendar.terms.length }),
        })
      : '',
    roles: t('console.admin.settings.nav.rolesSub', { count: data?.roles ?? rolesCount }),
    notifications: t('console.admin.settings.nav.notificationsSub'),
    integrations: t('console.admin.settings.nav.integrationsSub'),
    security: t('console.admin.settings.nav.securitySub'),
    billing: t('console.admin.settings.nav.billingSub'),
  };
  return (
    <Card pad={10} style={{ gap: 2 }}>
      <View accessibilityRole={'navigation' as never} accessibilityLabel={t('console.admin.settings.nav.label')} style={{ gap: 2 }}>
        {SECTIONS.map((s) => {
          const on = s === active;
          return (
            <Pressable
              key={s}
              accessibilityRole="link"
              aria-current={on ? 'page' : undefined}
              onPress={() => onPick(s)}
              style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.navItem,
                pointer,
                on ? { backgroundColor: colors.brandSoft } : hovered ? { backgroundColor: colors.subtle } : null,
              ]}>
              <Icon name={ICONS[s]} size={18} rawColor={on ? colors.brandInk : colors.muted} />
              <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                <Text variant="sm" weight={700}>
                  {t(`console.admin.settings.nav.${s}`)}
                </Text>
                <Text numberOfLines={1} style={[styles.navSub, { color: colors.muted }]}>
                  {subs[s]}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

function Head({ current, subtitle, onAudit }: { current: string; subtitle: string; onAudit: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const trail = [
    { label: t('console.shell.crumbHome'), href: '/console' as const },
    { label: t('console.admin.settings.crumb'), href: '/console/settings' as const },
  ];
  return (
    <View style={styles.head}>
      <View style={{ gap: 6, flexShrink: 1 }}>
        <View style={styles.crumbs} accessibilityLabel={t('console.shell.breadcrumb')}>
          {trail.map((c) => (
            <Fragment key={c.label}>
              <Pressable accessibilityRole="link" onPress={() => router.navigate(c.href)} style={pointer}>
                <Text style={[styles.crumb, { color: colors.muted }]}>{c.label}</Text>
              </Pressable>
              <Icon name="chevronRight" size={12} rawColor={colors.faint} />
            </Fragment>
          ))}
          <Text style={[styles.crumb, { color: colors.ink2 }]} aria-current="page">
            {current}
          </Text>
        </View>
        <Text variant="h1" accessibilityRole="header">
          {t('console.admin.settings.title')}
        </Text>
        <Text variant="sm" color="muted">
          {subtitle}
        </Text>
      </View>
      <Button title={t('console.admin.settings.auditLog')} icon="history" variant="secondary" onPress={onAudit} />
    </View>
  );
}

function RecentChanges({ items, onFull }: { items?: AuditEntry[]; onFull: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Card pad={18} style={{ gap: 6 }}>
      <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 4 }]}>
        <Text variant="h4" accessibilityRole="header">
          {t('console.admin.settings.recent.title')}
        </Text>
        <Icon name="shield" size={16} rawColor={colors.muted} />
      </View>
      {items === undefined ? (
        <Skeleton height={120} />
      ) : items.length ? (
        <View>
          {items.map((e, i) => (
            <View key={e.id} style={{ paddingVertical: 10, gap: 2, borderTopWidth: i ? 1 : 0, borderColor: colors.line }}>
              <Text variant="xs" weight={700}>
                {e.summary}
              </Text>
              <Text style={[styles.navSub, { color: colors.muted }]}>
                {t('console.admin.settings.recent.by', {
                  name: e.actor ?? t('console.admin.settings.recent.system'),
                  when: `${formatDate(e.at.slice(0, 10))}, ${formatTime(e.at)}`,
                })}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text variant="xs" color="muted">
          {t('console.admin.settings.recent.empty')}
        </Text>
      )}
      <View style={{ marginTop: 4 }}>
        <Link label={t('console.admin.settings.recent.full')} onPress={onFull} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  head: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 },
  crumbs: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  crumb: { fontFamily: fonts.semibold, fontSize: 12.5 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
  // `grid-column: span 3` of a 12-track grid with 20px gaps (the flex ratio alone would ignore the gaps).
  side: { flexGrow: 0, flexBasis: '23.65%' },
  navSub: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15 },
});
