import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Badge, Button, Icon, ICON_SIZE, pointer, Text, type IconName } from '@/ui';

import { useConsoleQuery } from '../../api';
import { Col, ConsolePage, Row } from '../../Page';
import { communicationApi } from '../api';
import { Composer, type ComposerHandle } from './Composer';
import { CircularsPanel, DeliveryReports, MeetingsPanel, MessagesPanel } from './Panels';
import { CircularsCard, MeetingsCard, RecentCard } from './SideCards';

type Tab = 'announcements' | 'circulars' | 'messages' | 'meetings';
const TABS: { key: Tab; icon: IconName }[] = [
  { key: 'announcements', icon: 'speaker' },
  { key: 'circulars', icon: 'document' },
  { key: 'messages', icon: 'chat' },
  { key: 'meetings', icon: 'calendar' },
];

/** PCommunication: announcements (compose + recent + circulars + meeting requests), circulars, messages, meetings. */
export function CommunicationPage() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ tab?: string; compose?: string }>();
  const q = useConsoleQuery(['communication'], communicationApi.page, { refetchInterval: 60_000 });
  const [tab, setTab] = useState<Tab>(() => (TABS.some((x) => x.key === params.tab) ? (params.tab as Tab) : 'announcements'));
  const [reports, setReports] = useState(false);
  const composer = useRef<ComposerHandle>(null);

  // The top bar's "New announcement" and messages buttons land here with ?compose=1 / ?tab=messages.
  useEffect(() => {
    if (params.tab && TABS.some((x) => x.key === params.tab)) setTab(params.tab as Tab);
  }, [params.tab]);
  useEffect(() => {
    if (params.compose) {
      setTab('announcements');
      composer.current?.reset();
    }
  }, [params.compose]);

  const go = (next: Tab) => {
    setTab(next);
    router.setParams({ tab: next === 'announcements' ? undefined : next, compose: undefined });
  };
  const data = q.data;
  const counts = { messages: data?.counts.messages ?? 0, meetings: data?.counts.meetings ?? 0 };
  // Opening the page resumes the latest draft, unless it came from "New announcement".
  const initialDraft = params.compose ? null : (data?.drafts[0] ?? null);

  return (
    <ConsolePage
      title={t('console.engage.comm.title_page')}
      crumbs={[{ label: t('console.shell.group.engage') }]}
      subtitle={t('console.engage.comm.subtitle')}
      actions={
        <Button title={t('console.engage.comm.deliveryReports')} icon="history" variant="secondary" onPress={() => setReports(true)} />
      }
      loading={q.isLoading}
      error={q.error}
      onRetry={() => void q.refetch()}>
      <IconTabs
        value={tab}
        onChange={go}
        options={TABS.map((x) => ({
          value: x.key,
          icon: x.icon,
          label: t(`console.engage.comm.tab_${x.key}`),
          badge: x.key === 'messages' ? counts.messages : x.key === 'meetings' ? counts.meetings : 0,
        }))}
      />
      {data ? (
        <>
          <View style={{ display: tab === 'announcements' ? 'flex' : 'none' }}>
            <Row>
              <Col span={7}>
                <Composer ref={composer} data={data} initialDraft={initialDraft} key={initialDraft?.id ?? 'new'} />
              </Col>
              <Col span={5} gap={20}>
                <RecentCard items={data.recent} onAll={() => setReports(true)} />
                <CircularsCard items={data.circulars} onAll={() => go('circulars')} />
                <MeetingsCard items={data.meetings} />
              </Col>
            </Row>
          </View>
          {tab === 'circulars' ? (
            <CircularsPanel
              onNew={() => {
                setTab('announcements');
                composer.current?.reset(true);
              }}
            />
          ) : null}
          {tab === 'messages' ? <MessagesPanel /> : null}
          {tab === 'meetings' ? <MeetingsPanel /> : null}
        </>
      ) : null}
      <DeliveryReports visible={reports} onClose={() => setReports(false)} />
    </ConsolePage>
  );
}

/** `.tabs` with an icon and a count badge per tab. */
function IconTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon: IconName; badge?: number }[];
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tabs, { borderBottomColor: colors.line }]} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.badge ? `${o.label}, ${o.badge}` : o.label}
            onPress={() => onChange(o.value)}
            style={[styles.tab, pointer, { borderBottomColor: on ? colors.brand : 'transparent' }]}>
            <Icon name={o.icon} size={ICON_SIZE.sm} rawColor={on ? colors.ink : colors.muted} />
            <Text rawColor={on ? colors.ink : colors.muted} style={styles.tabLabel}>
              {o.label}
            </Text>
            {o.badge ? <Badge value={o.badge} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 26, borderBottomWidth: 1, marginTop: -4 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderBottomWidth: 2, marginBottom: -1 },
  tabLabel: { fontFamily: fonts.semibold, fontSize: 14.5, lineHeight: 18 },
});
