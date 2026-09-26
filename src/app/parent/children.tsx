import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Trans, useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { api } from '@/api/endpoints';
import type { ChildDetail } from '@/api/types';
import { useFamily } from '@/features/family/useFamily';
import { formatDate, formatInr, formatTime, monthName } from '@/lib/format';
import { useActiveSchool, useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import {
  AppBar,
  Avatar,
  Button,
  cardShadowLg,
  Dot,
  ErrorState,
  Highlight,
  Hr,
  Icon,
  ICON_SIZE,
  Link,
  LoadingCards,
  pointer,
  Screen,
  Stamp,
  TearV,
  Text,
  Ticket,
} from '@/ui';

/** ParentChildren: every linked child as a school ID card; switch who the app is showing. */
export default function ParentChildren() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const user = useSession((s) => s.user);
  const family = useFamily();
  const children = useQuery({ queryKey: ['children-detail'], queryFn: api.childrenDetail });
  const list = children.data?.children ?? [];
  const viewing = list.find((c) => c.id === family.selected?.id) ?? list[0];
  const other = list.find((c) => c.id !== viewing?.id);
  const ordered = viewing ? [viewing, ...list.filter((c) => c.id !== viewing.id)] : list;

  const invoices = list.map((c) => c.next_invoice).filter(Boolean) as NonNullable<ChildDetail['next_invoice']>[];
  const total = invoices.reduce((sum, i) => sum + Number(i.amount), 0);
  const due = invoices.map((i) => i.due_date).sort()[0];
  const sameTerm = invoices.length > 1 && invoices.every((i) => i.title === invoices[0].title);

  return (
    <Screen
      dock
      gap={18}
      refreshing={children.isRefetching}
      onRefresh={children.refetch}
      header={<AppBar back title={t('parent.children.title')} subtitle={t('parent.children.subtitle', { name: user?.full_name ?? '', count: list.length })} />}>
      <Text variant="sm" color="ink2" style={{ paddingHorizontal: 2 }}>
        {t('parent.children.intro', { name: user?.first_name ?? '' })}
      </Text>
      {children.error ? <ErrorState error={children.error} onRetry={children.refetch} /> : null}
      {children.isLoading ? <LoadingCards count={2} /> : null}

      <View style={{ paddingTop: 8, paddingHorizontal: 8, paddingBottom: 12 }}>
        {ordered.map((child, i) => (
          <IdCard key={child.id} child={child} viewing={child.id === viewing?.id} index={i} />
        ))}
      </View>

      {list.length ? <Sentence list={ordered} /> : null}

      {other ? (
        <View style={{ gap: 8 }}>
          <Button
            title={t('parent.children.switchTo', { name: other.first_name })}
            icon="users"
            size="lg"
            fullWidth
            onPress={() => {
              family.select(other.id);
              router.navigate('/parent');
            }}
          />
          <Text variant="xs" color="muted" align="center">
            {t('parent.children.switchHint', { name: other.first_name })}
          </Text>
        </View>
      ) : null}

      {invoices.length ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/parent/fees')} style={pointer}>
          <Ticket style={{ flexDirection: 'row', alignItems: 'stretch' }}>
            <View style={{ flex: 1, minWidth: 0, padding: 16, gap: 4 }}>
              <Text variant="xs" weight={700} rawColor={colors.pButterInk}>
                {sameTerm ? t('parent.children.feesBoth') : t('parent.children.feesAll')}
              </Text>
              <Text variant="kpiSm">{formatInr(total)}</Text>
              <Text variant="xxs" color="ink2" weight={600} numberOfLines={1}>
                {list
                  .filter((c) => c.next_invoice)
                  .map((c) => `${c.first_name} ${formatInr(c.next_invoice!.amount)}`)
                  .join(' + ')}
              </Text>
            </View>
            <TearV />
            <View style={{ width: 84, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 12 }}>
              <Text variant="xxs" color="muted" weight={700} style={{ textTransform: 'uppercase', letterSpacing: 1.1 }}>
                {t('parent.children.due')}
              </Text>
              <Text variant="sm" weight={800}>
                {due ? formatDate(due) : ''}
              </Text>
              <View style={styles.row4}>
                <Text variant="xs" weight={700} rawColor={colors.pButterInk}>
                  {t('parent.children.pay')}
                </Text>
                <Icon name="chevronRight" size={ICON_SIZE.xs} rawColor={colors.pButterInk} bold />
              </View>
            </View>
          </Ticket>
        </Pressable>
      ) : null}

      <Hr />
      <View style={{ gap: 10 }}>
        <Text variant="sm" color="ink2">
          {t('parent.children.linkedNote')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 22 }}>
          <Link label={t('parent.children.contactOffice')} onPress={() => router.push('/parent/messages')} />
          <Link label={t('parent.children.documents')} onPress={() => router.push('/parent/documents')} />
        </View>
      </View>
    </Screen>
  );
}

function IdCard({ child, viewing, index }: { child: ChildDetail; viewing: boolean; index: number }) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const school = useActiveSchool();
  const bus = child.transport.mode === 'bus' ? child.transport : null;
  const today = child.today;
  const present = today && today.status !== 'absent' && today.status !== 'excused';
  return (
    <View
      accessibilityLabel={viewing ? t('parent.children.cardViewing', { name: child.name }) : t('parent.children.cardLabel', { name: child.name })}
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.lineStrong, zIndex: 10 - index, marginTop: index ? -4 : 0 },
        { transform: [{ rotate: index % 2 ? '1.4deg' : '-1.6deg' }] },
        cardShadowLg(scheme),
      ]}>
      <View style={[styles.band, { backgroundColor: colors.pBlue }]}>
        <View style={[styles.slot, { backgroundColor: colors.canvas, boxShadow: `inset 0 0 0 1px ${colors.lineStrong}` }]} />
        <Icon name="school" size={ICON_SIZE.md} rawColor={colors.pBlueInk} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="xs" weight={800} rawColor={colors.pBlueInk} numberOfLines={1} style={{ letterSpacing: 0.96, textTransform: 'uppercase' }}>
            {school?.name}
          </Text>
          <Text variant="xxs" weight={600} rawColor={colors.pBlueInk}>
            {t('parent.children.idCard', { year: school?.academic_year ?? '' })}
          </Text>
        </View>
      </View>
      <View style={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
          <Avatar initials={child.initials} size="xl" square tone={index ? 4 : 1} style={{ borderRadius: 12 }} />
          <View style={{ flex: 1, minWidth: 0, gap: 2, paddingTop: 2 }}>
            <Text variant="h2" style={{ fontSize: 21 }}>
              {child.name}
            </Text>
            <Text variant="sm" color="ink2" weight={600}>
              {t('parent.children.classRoll', { class: child.class.short_label, roll: String(child.roll_no).padStart(2, '0') })}
            </Text>
            {child.class_teacher ? (
              <Text variant="xs" color="muted">
                {t('parent.children.classTeacher', { name: child.class_teacher })}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={[styles.facts, { borderTopColor: colors.line }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="xxs" color="muted" weight={700} style={styles.caps}>
              {t('parent.children.admNo')}
            </Text>
            <Text variant="sm" weight={700} num>
              {child.admission_no}
            </Text>
          </View>
          <Pressable
            disabled={!bus}
            accessibilityRole={bus ? 'link' : undefined}
            onPress={() => router.push('/parent/bus')}
            style={[{ flex: 1, minWidth: 0, minHeight: 44 }, bus && pointer]}>
            <Text variant="xxs" color="muted" weight={700} style={styles.caps}>
              {t('parent.children.goesHomeBy')}
            </Text>
            <Text variant="sm" weight={700} rawColor={bus ? colors.brandInk : colors.ink}>
              {bus ? bus.bus : t('parent.children.walking')}
            </Text>
            <Text variant="xxs" color="muted" numberOfLines={1}>
              {bus ? bus.stop : t('parent.children.pickedUp')}
            </Text>
          </Pressable>
        </View>
      </View>
      <View style={[styles.foot, { borderTopColor: colors.lineStrong }]}>
        <Dot tone={present ? 'ok' : today ? 'bad' : 'neutral'} ring={present ? colors.okSoft : undefined} />
        <Text variant="sm" weight={700} style={{ flex: 1, minWidth: 0 }}>
          {!today
            ? t('parent.home.notMarked')
            : !present
              ? t('parent.home.absentToday')
              : today.at
                ? t('parent.home.inSchoolSince', { time: formatTime(today.at) })
                : t('parent.home.presentToday')}
        </Text>
        {viewing ? (
          <Stamp tone="brand" rotate={-6}>
            {t('parent.children.viewing')}
          </Stamp>
        ) : null}
      </View>
    </View>
  );
}

/** "In September Aarav was in 18 of 19 days and scored 86% in Unit Test 2. Diya hasn't missed a day, 19 of 19, and got an A+." */
function Sentence({ list }: { list: ChildDetail[] }) {
  const { i18n } = useTranslation();
  const month = monthName(new Date());
  const marks = { m: <Highlight color="mint" />, l: <Highlight color="lav" /> };
  return (
    <Text variant="sentence" style={{ fontSize: 19, lineHeight: 27, paddingHorizontal: 2 }}>
      {list.map((c, i) => {
        const values = {
          month,
          name: c.first_name,
          present: c.month.present,
          days: c.month.school_days,
          percent: c.latest_exam ? Math.round(c.latest_exam.percent) : '',
          exam: c.latest_exam?.name ?? '',
          grade: c.latest_exam?.grade ?? '',
          // English needs "a B+" / "an A+"; other languages leave it out.
          article: i18n.language === 'en' ? (/^[AEFHILMNORSX]/.test(c.latest_exam?.grade ?? '') ? 'an' : 'a') : '',
        };
        const perfect = c.month.school_days > 0 && c.month.present === c.month.school_days && !!c.latest_exam;
        const key =
          i === 0
            ? c.latest_exam
              ? 'parent.children.sentenceFirst'
              : 'parent.children.sentenceFirstNoExam'
            : perfect
              ? 'parent.children.sentencePerfect'
              : 'parent.children.sentenceOther';
        return <Trans key={c.id} i18nKey={key} values={values} components={marks} />;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  band: { paddingTop: 22, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  slot: { position: 'absolute', top: 8, left: '50%', width: 46, height: 7, marginLeft: -23, borderRadius: 999 },
  facts: { flexDirection: 'row', gap: 12, paddingTop: 12, borderTopWidth: 1 },
  caps: { letterSpacing: 0.88, textTransform: 'uppercase' },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 16, paddingRight: 14, minHeight: 52, borderTopWidth: 1, borderStyle: 'dashed' },
  row4: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
