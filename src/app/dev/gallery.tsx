import { useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  AppBar,
  Avatar,
  AvatarFan,
  AvatarStack,
  Badge,
  Bar,
  Bubble,
  Button,
  Card,
  Checkbox,
  Chip,
  Delta,
  Diary,
  DiaryHead,
  DiaryRow,
  HeatCell,
  Hero,
  Highlight,
  Icon,
  IconButton,
  Kicker,
  Legend,
  Link,
  ListRow,
  LogoMark,
  Paper,
  Pill,
  Register,
  Ribbon,
  RouteLine,
  Screen,
  Search,
  SectionHead,
  SegmentedControl,
  Stamp,
  StickyNote,
  Switch,
  Tabs,
  Tear,
  TearCal,
  TearV,
  Text,
  TextField,
  Ticket,
  TileIcon,
  Well,
} from '@/ui';
import { ICONS } from '@/ui/icons/paths';

/** Dev-only: every design-system primitive, for pixel checks against eduflow-ui/screens/Main.dc.html. */
export default function Gallery() {
  const { colors } = useTheme();
  const [seg, setSeg] = useState('a');
  const [tab, setTab] = useState('ut2');
  const [on, setOn] = useState(true);
  const [checked, setChecked] = useState(true);
  const [q, setQ] = useState('');
  if (!__DEV__) return null;

  return (
    <Screen header={<AppBar title="Foundations" subtitle="Ink & Paper · dev gallery" back />}>
      <Kicker>Type</Kicker>
      <Text variant="hero">Hero 42</Text>
      <Text variant="h1">Heading 1 · 30</Text>
      <Text variant="h2">Heading 2 · 22</Text>
      <Text variant="h3">Heading 3 · 16</Text>
      <Text variant="body">Body text on the phone is 15px Plus Jakarta Sans.</Text>
      <Text variant="sm" color="muted">
        Small 13 · muted
      </Text>
      <Text variant="eyebrow">Eyebrow · 11 caps</Text>
      <Text variant="sentence">
        <Highlight color="mint">1,176 of 1,248</Highlight> students are in school, and <Highlight color="pink">12 requests</Highlight> are waiting.
      </Text>

      <Kicker>Buttons</Kicker>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button title="Primary" />
        <Button title="Secondary" variant="secondary" />
        <Button title="Soft" variant="soft" />
        <Button title="Ghost" variant="ghost" />
        <Button title="Danger" variant="danger" />
        <Button title="Approve" variant="ok" icon="check" size="sm" />
        <Button title="Ink" variant="ink" size="sm" />
      </View>
      <Button title="Send OTP" size="lg" fullWidth iconRight="arrowRight" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <IconButton icon="bell" label="Notifications" ping size="lg" />
        <IconButton icon="search" label="Search" />
        <IconButton icon="check" label="Approve" variant="ok" size="sm" />
        <IconButton icon="close" label="Decline" variant="bad" size="sm" />
        <IconButton icon="more" label="More" variant="bare" />
      </View>

      <Kicker>Pills, chips, badges</Kicker>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill label="Neutral" />
        <Pill label="On time" tone="ok" />
        <Pill label="12 min late" tone="warn" />
        <Pill label="Overdue" tone="bad" />
        <Pill label="Leave · 2 days" tone="info" />
        <Pill label="Now" tone="brand" />
        <Pill label="Aarav's stop" tone="pink" />
        <Pill label="Now" tone="ink" dot={false} />
        <Pill label="Website" tone="outline" dot={false} />
        <Badge value={12} />
        <Badge value={3} tone="bad" />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip label="All" count="1,248" selected />
        <Chip label="Absent today" count={58} />
        <Chip label="Leave" />
      </View>
      <SegmentedControl
        value={seg}
        onChange={setSeg}
        options={[
          { value: 'a', label: 'Students' },
          { value: 'b', label: 'Staff' },
        ]}
      />
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'ut1', label: 'Unit Test 1' },
          { value: 'ut2', label: 'Unit Test 2' },
          { value: 'hy', label: 'Half-yearly', disabled: true },
        ]}
      />

      <Kicker>Form</Kicker>
      <TextField label="Mobile number" prefix="+91" placeholder="98450 34521" keyboardType="phone-pad" hint="We'll send a 6-digit code." />
      <Search value={q} onChangeText={setQ} placeholder="Search students, staff…" shortcut="⌘K" />
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
        <Checkbox checked={checked} onChange={setChecked} label="Keep me signed in" />
        <Switch value={on} onChange={setOn} label="Push" />
        <Switch value={!on} onChange={(v) => setOn(!v)} label="SMS" />
      </View>

      <Kicker>Avatars</Kicker>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        {([1, 2, 3, 4, 5, 6] as const).map((t) => (
          <Avatar key={t} initials="AS" tone={t} />
        ))}
        <Avatar initials="PM" size="lg" tone={2} />
        <Avatar initials="AS" size="lg" square />
      </View>
      <View style={{ flexDirection: 'row', gap: 24, alignItems: 'center' }}>
        <AvatarFan people={[{ initials: 'AS' }, { initials: 'DS', tone: 4 }]} />
        <AvatarStack>
          {['KN', 'VS', 'SV'].map((i, n) => (
            <Avatar key={i} initials={i} size="sm" tone={((n % 6) + 1) as 1} />
          ))}
        </AvatarStack>
        <LogoMark size={40} />
      </View>

      <Kicker>Surfaces</Kicker>
      <Card pad={18}>
        <SectionHead title="Card" action={<Link label="See all" />} />
        <ListRow inset={0} icon="calendarCheck" iconTone="mint" title="Attendance" subtitle="18 of 19 days" onPress={() => undefined} />
        <ListRow inset={0} icon="wallet" iconTone="butter" title="Fees & receipts" subtitle="₹42,500 due 30 Sep" onPress={() => undefined} last />
      </Card>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {(['blue', 'pink', 'mint', 'lav', 'peach', 'butter'] as const).map((p) => (
          <Card key={p} pastel={p} pad={10} style={{ flex: 1 }}>
            <TileIcon icon="award" size="sm" />
          </Card>
        ))}
      </View>
      <Card pastel="mint" pad={16} style={{ gap: 10 }}>
        <Text variant="xs" weight={700} rawColor={colors.pMintInk}>
          September
        </Text>
        <Bar value={95} />
        <Pill label="Widget pill" />
        <Register marks={['p', 'p', 'a', 'p', 'l', 'off', 'p', 'p', 'f', 'f']} large />
      </Card>
      <Hero>
        <Text variant="eyebrow" rawColor={colors.heroMuted}>
          Afternoon briefing
        </Text>
        <Text variant="h2" rawColor={colors.onHero}>
          Hero card with engraved rings
        </Text>
        <Bar value={78} style={{ marginTop: 12 }} />
      </Hero>
      <Well>
        <Text variant="sm">A sunken well.</Text>
      </Well>
      <Card tint="brand" pad={14}>
        <Text variant="sm">tint-brand</Text>
      </Card>

      <Kicker>Data</Kicker>
      <Bar value={64} tone="ok" size="thin" />
      <Legend
        items={[
          { label: 'UT1', color: colors.c1 },
          { label: 'UT2', color: colors.c2 },
        ]}
      />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Delta value="+4" direction="up" suffix=" pts" />
        <Delta value="−6" direction="down" />
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {[98, 96, 92, 84, null].map((v, i) => (
          <HeatCell key={i} value={v} />
        ))}
      </View>
      <Ribbon
        cells={[
          { kind: 'period', state: 'done', label: 'Ma' },
          { kind: 'period', state: 'done', label: 'En' },
          { kind: 'period', state: 'done', label: 'Sc' },
          { kind: 'break' },
          { kind: 'period', state: 'done', label: 'Hi' },
          { kind: 'period', state: 'gap', label: 'SS' },
          { kind: 'break' },
          { kind: 'period', state: 'done', label: 'CS' },
          { kind: 'period', state: 'now', label: 'Art' },
        ]}
      />
      <RouteLine
        progress={0.25}
        bus={0.25}
        stops={[{ at: 0, kind: 'past' }, { at: 0.33 }, { at: 0.66 }, { at: 1, kind: 'home' }]}
      />

      <Kicker>School objects</Kicker>
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
        <TearCal month="Sep" day={22} dow="Tuesday" />
        <TearCal month="Oct" day={3} dow="Sat" size="sm" />
        <Stamp>Paid</Stamp>
        <Stamp tone="lav" round sub="Grade">
          A
        </Stamp>
      </View>
      <Ticket>
        <View style={{ padding: 16 }}>
          <Text variant="xs" weight={700}>
            Term 2 fee
          </Text>
          <Text variant="kpiSm">₹42,500</Text>
        </View>
        <Tear />
        <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center' }}>
          <Text variant="sm" style={{ flex: 1 }}>
            Due 30 Sep
          </Text>
          <Button title="Pay now" size="sm" />
        </View>
      </Ticket>
      <Ticket color="sky" style={{ flexDirection: 'row' }}>
        <View style={{ flex: 1, padding: 16 }}>
          <Text variant="h3">Bus 07 · drop run</Text>
        </View>
        <TearV />
        <View style={{ padding: 16, justifyContent: 'center' }}>
          <Icon name="bus" />
        </View>
      </Ticket>
      <StickyNote color="pink" tape="center" tilt="l">
        <Text variant="sm">“Aarav explained fractions to the class today.” — Priya Menon</Text>
      </StickyNote>
      <StickyNote color="mint" pin tilt="r">
        <Text variant="sm">Absent · Wed 9 Sep, Fever</Text>
      </StickyNote>
      <Diary>
        <DiaryHead>
          <Text variant="h4">School diary · this week</Text>
        </DiaryHead>
        <DiaryRow when="Wed">
          <Text variant="sm">Maths · Ex 7.3</Text>
        </DiaryRow>
        <DiaryRow when="Thu" last>
          <Text variant="sm">English · Diary entry</Text>
        </DiaryRow>
      </Diary>
      <Paper>
        <Text variant="h3">Report card</Text>
        <Text variant="sm" color="muted">
          Unit Test 2 · 86%
        </Text>
      </Paper>
      <Bubble>
        <Text variant="sm">Incoming bubble</Text>
      </Bubble>
      <Bubble out>
        <Text variant="sm" rawColor={colors.onBrand}>
          Outgoing bubble
        </Text>
      </Bubble>

      <Kicker>Icons ({Object.keys(ICONS).length})</Kicker>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        {Object.keys(ICONS).map((name) => (
          <Icon key={name} name={name as keyof typeof ICONS} size={22} />
        ))}
      </View>
    </Screen>
  );
}
