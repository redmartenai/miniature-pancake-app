import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { Col, ConsolePage, Panel, Row } from '@/features/console/Page';
import { platformApi, type Channel, type Method, type RegisterBody, type Slip } from '@/features/platform/api';
import { CredentialSlip } from '@/features/platform/CredentialSlip';
import { HandoverFields } from '@/features/platform/Handover';
import { formatDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Button, Chip, DateField, Icon, ICON_SIZE, IconButton, pointer, SegmentedControl, Text, TextField, useToast } from '@/ui';

const STEPS = ['school', 'year', 'grades', 'people', 'review'] as const;
type Step = (typeof STEPS)[number];
type GradeRow = { grade: string; sections: string[] };
type Person = { name: string; phone: string; email: string };

const LETTERS = 'ABCDEFGHIJKLMNOP'.split('');
const PRESETS: Record<'k12' | 'p10' | 'p12' | 'none', string[]> = {
  k12: ['Nursery', 'LKG', 'UKG', ...Array.from({ length: 12 }, (_, i) => String(i + 1))],
  p10: Array.from({ length: 10 }, (_, i) => String(i + 1)),
  p12: Array.from({ length: 12 }, (_, i) => String(i + 1)),
  none: [],
};

/** Indian schools run April → March: the year that contains today. */
function defaultYear() {
  const now = new Date();
  const start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    name: `${start}–${String(start + 1).slice(-2)}`,
    starts_on: `${start}-04-01`,
    ends_on: `${start + 1}-03-31`,
    terms: [
      { name: 'Term 1', starts_on: `${start}-04-01`, ends_on: `${start}-09-30` },
      { name: 'Term 2', starts_on: `${start}-10-01`, ends_on: `${start + 1}-03-31` },
    ],
  };
}

const phoneOk = (v: string) => v.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '').length === 10;
const colourOk = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);

/** Register a school: details → year & terms → grades & sections → people → review, then the credential slips. */
export default function RegisterSchool() {
  const { t } = useTranslation();
  const toast = useToast();
  const client = useQueryClient();
  const [step, setStep] = useState<Step>('school');
  const [school, setSchool] = useState({
    name: '',
    code: '',
    kind: 'school',
    city: '',
    state: '',
    campus: '',
    address: '',
    office_phone: '',
    primary_color: '#3446C8',
    accent_color: '#C9571F',
    languages: ['en', 'hi'],
  });
  const [codeTouched, setCodeTouched] = useState(false);
  const [year, setYear] = useState(defaultYear);
  const [grades, setGrades] = useState<GradeRow[]>(PRESETS.k12.map((g) => ({ grade: g, sections: ['A', 'B'] })));
  const [principal, setPrincipal] = useState<Person>({ name: '', phone: '', email: '' });
  const [admin, setAdmin] = useState<Person>({ name: '', phone: '', email: '' });
  const [method, setMethod] = useState<Method>('password');
  const [send, setSend] = useState<Channel[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slips, setSlips] = useState<Slip[]>();
  const [slipIndex, setSlipIndex] = useState(0);
  const [createdId, setCreatedId] = useState<string>();

  // Live code check (and a suggestion from the name until someone types a code themselves).
  const [codeState, setCodeState] = useState<{ code: string; valid: boolean; available: boolean; suggestion: string | null }>();
  useEffect(() => {
    const id = setTimeout(() => {
      if (!school.name.trim() && !school.code.trim()) return setCodeState(undefined);
      platformApi
        .checkCode(school.code, school.name)
        .then((res) => {
          setCodeState(res);
          if (!codeTouched && res.suggestion && res.suggestion !== school.code) setSchool((s) => ({ ...s, code: res.suggestion! }));
        })
        .catch(() => undefined);
    }, 300);
    return () => clearTimeout(id);
  }, [school.name, school.code, codeTouched]);

  const sectionCount = grades.reduce((a, g) => a + g.sections.length, 0);
  const index = STEPS.indexOf(step);

  const validate = (s: Step): Record<string, string> => {
    const e: Record<string, string> = {};
    const req = t('platform.wizard.required');
    if (s === 'school') {
      if (!school.name.trim()) e.name = req;
      if (!/^[A-Z0-9]{3,12}$/.test(school.code)) e.code = t('platform.wizard.codeInvalid');
      else if (codeState?.code === school.code && !codeState.available) e.code = t('platform.wizard.codeTaken', { code: school.code });
      if (!school.city.trim()) e.city = req;
      if (!colourOk(school.primary_color)) e.primary_color = t('platform.wizard.colourInvalid');
      if (!colourOk(school.accent_color)) e.accent_color = t('platform.wizard.colourInvalid');
    }
    if (s === 'year') {
      if (!year.name.trim()) e.yearName = req;
      if (year.ends_on <= year.starts_on) e.dates = t('platform.wizard.datesInvalid');
    }
    if (s === 'grades' && sectionCount === 0) e.grades = t('platform.wizard.noSections');
    if (s === 'people') {
      if (!principal.name.trim()) e['principal.name'] = req;
      if (!phoneOk(principal.phone)) e['principal.phone'] = t('platform.wizard.phoneInvalid');
      if (admin.name.trim() || admin.phone.trim()) {
        if (!admin.name.trim()) e['admin.name'] = req;
        if (!phoneOk(admin.phone)) e['admin.phone'] = t('platform.wizard.phoneInvalid');
      }
    }
    return e;
  };

  const goNext = () => {
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length === 0) setStep(STEPS[index + 1]);
  };

  const body = (): RegisterBody => ({
    school: { ...school, code: school.code.toUpperCase() },
    year,
    grades: grades.filter((g) => g.grade.trim() && g.sections.length),
    principal,
    admin: admin.name.trim() ? admin : undefined,
    method,
    send,
  });

  const create = useMutation({
    mutationFn: () => platformApi.register(body()),
    onSuccess: (res) => {
      setSlips(res.slips);
      setSlipIndex(0);
      setCreatedId(res.school.id);
      void client.invalidateQueries({ queryKey: ['platform'] });
    },
    onError: (e) => {
      if (e instanceof ApiError && e.fields) {
        const fields = Object.fromEntries(
          Object.entries(e.fields).map(([k, v]) => [k.replace(/^school\./, ''), Array.isArray(v) ? String(v[0]) : String(v)]),
        );
        setErrors(fields);
        // Jump back to the step that owns the first error.
        const key = Object.keys(fields)[0] ?? '';
        setStep(
          key.startsWith('principal') || key.startsWith('admin')
            ? 'people'
            : key.startsWith('grades')
              ? 'grades'
              : key.startsWith('year') || key.startsWith('terms')
                ? 'year'
                : 'school',
        );
      }
      toast(e instanceof ApiError ? (e.fieldMessage() ?? e.message) : t('common.somethingWrong'), 'danger');
    },
  });

  if (slips && slips[slipIndex]) {
    const last = slipIndex === slips.length - 1;
    return (
      <ConsolePage
        title={t('platform.slip.title')}
        home={{ label: t('platform.area'), href: '/platform' as Href }}
        crumbs={[{ label: t('platform.nav.schools'), href: '/platform/schools' as Href }]}
        subtitle={`${slips[slipIndex].school.name} · ${slipIndex + 1}/${slips.length}`}>
        <CredentialSlip
          slip={slips[slipIndex]}
          doneLabel={last ? t('platform.slip.done') : t('platform.slip.next')}
          onDone={() => (last ? router.replace(`/platform/schools/${createdId}` as Href) : setSlipIndex(slipIndex + 1))}
        />
      </ConsolePage>
    );
  }

  return (
    <ConsolePage
      title={t('platform.wizard.title')}
      home={{ label: t('platform.area'), href: '/platform' as Href }}
      crumbs={[{ label: t('platform.nav.schools'), href: '/platform/schools' as Href }]}
      subtitle={t('platform.wizard.subtitle')}>
      <Stepper step={step} onJump={(s) => STEPS.indexOf(s) < index && setStep(s)} />
      <Row>
        <Col span={8}>
          <Panel gap={18}>
            {step === 'school' ? (
              <SchoolStep
                school={school}
                setSchool={(patch) => setSchool((s) => ({ ...s, ...patch }))}
                errors={errors}
                codeState={codeState}
                onCodeTyped={() => setCodeTouched(true)}
              />
            ) : null}
            {step === 'year' ? <YearStep year={year} setYear={setYear} errors={errors} /> : null}
            {step === 'grades' ? <GradesStep grades={grades} setGrades={setGrades} error={errors.grades} /> : null}
            {step === 'people' ? (
              <PeopleStep
                principal={principal}
                setPrincipal={setPrincipal}
                admin={admin}
                setAdmin={setAdmin}
                method={method}
                setMethod={setMethod}
                send={send}
                setSend={setSend}
                errors={errors}
              />
            ) : null}
            {step === 'review' ? <Review data={body()} sections={sectionCount} onEdit={(s) => setStep(s)} /> : null}
            <View style={styles.footer}>
              {index > 0 ? (
                <Button title={t('platform.wizard.back')} icon="arrowLeft" variant="ghost" onPress={() => setStep(STEPS[index - 1])} />
              ) : (
                <View />
              )}
              <Text variant="xs" color="muted">
                {t('platform.wizard.stepOf', { n: index + 1, total: STEPS.length })}
              </Text>
              {step === 'review' ? (
                <Button
                  title={create.isPending ? t('platform.wizard.creating') : t('platform.wizard.create')}
                  icon="check"
                  loading={create.isPending}
                  onPress={() => create.mutate()}
                />
              ) : (
                <Button title={t('platform.wizard.next')} iconRight="arrowRight" onPress={goNext} />
              )}
            </View>
          </Panel>
        </Col>
        <Col span={4}>
          <Preview school={school} sections={sectionCount} grades={grades.filter((g) => g.sections.length).length} year={year.name} />
        </Col>
      </Row>
    </ConsolePage>
  );
}

function Stepper({ step, onJump }: { step: Step; onJump: (s: Step) => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const index = STEPS.indexOf(step);
  return (
    <View style={styles.stepper} accessibilityRole={'list' as never}>
      {STEPS.map((s, i) => {
        const done = i < index;
        const on = i === index;
        return (
          <Pressable
            key={s}
            onPress={() => onJump(s)}
            disabled={!done}
            accessibilityRole="button"
            accessibilityState={{ selected: on, disabled: !done }}
            style={[styles.step, done && pointer]}>
            <View
              style={[
                styles.stepDot,
                {
                  backgroundColor: done ? colors.ok : on ? colors.brand : colors.surface,
                  borderColor: done ? colors.ok : on ? colors.brand : colors.lineStrong,
                },
              ]}>
              {done ? (
                <Icon name="check" size={12} rawColor={colors.onBrand} bold />
              ) : (
                <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: on ? colors.onBrand : colors.muted }}>{i + 1}</Text>
              )}
            </View>
            <Text variant="sm" weight={on ? 700 : 600} color={on ? 'ink' : 'muted'}>
              {t(`platform.wizard.steps.${s}`)}
            </Text>
            {i < STEPS.length - 1 ? <View style={[styles.stepLine, { backgroundColor: done ? colors.ok : colors.line }]} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

type SchoolState = {
  name: string;
  code: string;
  kind: string;
  city: string;
  state: string;
  campus: string;
  address: string;
  office_phone: string;
  primary_color: string;
  accent_color: string;
  languages: string[];
};

function SchoolStep({
  school,
  setSchool,
  errors,
  codeState,
  onCodeTyped,
}: {
  school: SchoolState;
  setSchool: (patch: Partial<SchoolState>) => void;
  errors: Record<string, string>;
  codeState?: { code: string; valid: boolean; available: boolean; suggestion: string | null };
  onCodeTyped: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const checked = codeState && codeState.code === school.code && school.code;
  const codeHint = errors.code
    ? undefined
    : checked
      ? codeState.valid
        ? codeState.available
          ? t('platform.wizard.codeFree', { code: school.code })
          : t('platform.wizard.codeTaken', { code: school.code })
        : t('platform.wizard.codeInvalid')
      : t('platform.wizard.codeHint');
  const codeBad = checked && (!codeState.valid || !codeState.available);
  return (
    <View style={{ gap: 16 }}>
      <TextField
        label={t('platform.wizard.name')}
        placeholder={t('platform.wizard.namePh')}
        value={school.name}
        onChangeText={(name) => setSchool({ name })}
        error={errors.name}
      />
      <Row gap={16}>
        <Col span={6}>
          <TextField
            label={t('platform.wizard.code')}
            value={school.code}
            autoCapitalize="characters"
            maxLength={12}
            onChangeText={(v) => {
              onCodeTyped();
              setSchool({ code: v.toUpperCase().replace(/[^A-Z0-9]/g, '') });
            }}
            error={errors.code ?? (codeBad ? codeHint : undefined)}
            hint={codeBad ? undefined : codeHint}
            trailing={
              checked && codeState.valid ? (
                <Icon
                  name={codeState.available ? 'checkCircle' : 'alert'}
                  size={ICON_SIZE.md}
                  rawColor={codeState.available ? colors.ok : colors.bad}
                />
              ) : null
            }
          />
          {codeBad && codeState.suggestion && codeState.suggestion !== school.code ? (
            <View style={{ alignSelf: 'flex-start', marginTop: 6 }}>
              <Button
                title={t('platform.wizard.useSuggestion', { code: codeState.suggestion })}
                size="sm"
                variant="soft"
                onPress={() => setSchool({ code: codeState.suggestion! })}
              />
            </View>
          ) : null}
        </Col>
        <Col span={6} gap={8}>
          <Text variant="sm" weight={600} color="ink2">
            {t('platform.wizard.kind')}
          </Text>
          <SegmentedControl
            full={false}
            value={school.kind}
            onChange={(kind) => setSchool({ kind })}
            options={(['school', 'junior_college', 'college'] as const).map((k) => ({ value: k, label: t(`platform.wizard.kinds.${k}`) }))}
          />
        </Col>
      </Row>
      <Row gap={16}>
        <Col span={4}>
          <TextField
            label={t('platform.wizard.city')}
            value={school.city}
            onChangeText={(city) => setSchool({ city })}
            error={errors.city}
          />
        </Col>
        <Col span={4}>
          <TextField label={t('platform.wizard.state')} value={school.state} onChangeText={(state) => setSchool({ state })} />
        </Col>
        <Col span={4}>
          <TextField
            label={t('platform.wizard.campus')}
            placeholder={t('platform.wizard.campusPh')}
            value={school.campus}
            onChangeText={(campus) => setSchool({ campus })}
          />
        </Col>
      </Row>
      <Row gap={16}>
        <Col span={8}>
          <TextField label={t('platform.wizard.address')} value={school.address} onChangeText={(address) => setSchool({ address })} />
        </Col>
        <Col span={4}>
          <TextField
            label={t('platform.wizard.officePhone')}
            keyboardType="phone-pad"
            value={school.office_phone}
            onChangeText={(office_phone) => setSchool({ office_phone })}
          />
        </Col>
      </Row>
      <Row gap={16}>
        <Col span={4}>
          <TextField
            label={t('platform.wizard.primary')}
            value={school.primary_color}
            maxLength={7}
            onChangeText={(primary_color) => setSchool({ primary_color })}
            error={errors.primary_color}
            hint={t('platform.wizard.colourHint')}
            trailing={<Swatch color={school.primary_color} />}
          />
        </Col>
        <Col span={4}>
          <TextField
            label={t('platform.wizard.accent')}
            value={school.accent_color}
            maxLength={7}
            onChangeText={(accent_color) => setSchool({ accent_color })}
            error={errors.accent_color}
            trailing={<Swatch color={school.accent_color} />}
          />
        </Col>
        <Col span={4} gap={8}>
          <Text variant="sm" weight={600} color="ink2">
            {t('platform.wizard.languages')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['en', 'hi'] as const).map((lang) => {
              const on = school.languages.includes(lang);
              return (
                <Chip
                  key={lang}
                  label={t(`platform.wizard.lang.${lang}`)}
                  selected={on}
                  icon={on ? 'check' : undefined}
                  onPress={() =>
                    setSchool({
                      languages: on
                        ? school.languages.length > 1
                          ? school.languages.filter((l) => l !== lang)
                          : school.languages
                        : [...school.languages, lang],
                    })
                  }
                />
              );
            })}
          </View>
        </Col>
      </Row>
    </View>
  );
}

function Swatch({ color }: { color: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 6,
        backgroundColor: colourOk(color) ? color : colors.sunken,
        borderWidth: 1,
        borderColor: colors.line,
      }}
    />
  );
}

function YearStep({
  year,
  setYear,
  errors,
}: {
  year: ReturnType<typeof defaultYear>;
  setYear: (y: ReturnType<typeof defaultYear>) => void;
  errors: Record<string, string>;
}) {
  const { t } = useTranslation();
  const setTerm = (i: number, patch: Partial<(typeof year.terms)[number]>) =>
    setYear({ ...year, terms: year.terms.map((term, j) => (j === i ? { ...term, ...patch } : term)) });
  return (
    <View style={{ gap: 16 }}>
      <Row gap={16}>
        <Col span={4}>
          <TextField
            label={t('platform.wizard.yearName')}
            value={year.name}
            onChangeText={(name) => setYear({ ...year, name })}
            error={errors.yearName}
          />
        </Col>
        <Col span={4}>
          <DateField
            label={t('platform.wizard.starts')}
            value={year.starts_on}
            onChange={(starts_on) => setYear({ ...year, starts_on })}
            sundays
            withYear
          />
        </Col>
        <Col span={4}>
          <DateField
            label={t('platform.wizard.ends')}
            value={year.ends_on}
            onChange={(ends_on) => setYear({ ...year, ends_on })}
            sundays
            withYear
          />
        </Col>
      </Row>
      {errors.dates ? (
        <Text variant="xs" color="bad">
          {errors.dates}
        </Text>
      ) : null}
      <Text variant="h4">{t('platform.wizard.terms')}</Text>
      {year.terms.map((term, i) => (
        <Row key={i} gap={16} align="flex-end">
          <Col span={4}>
            <TextField label={t('platform.wizard.termName')} value={term.name} onChangeText={(name) => setTerm(i, { name })} />
          </Col>
          <Col span={3}>
            <DateField
              label={t('platform.wizard.starts')}
              value={term.starts_on}
              onChange={(starts_on) => setTerm(i, { starts_on })}
              sundays
              withYear
            />
          </Col>
          <Col span={3}>
            <DateField
              label={t('platform.wizard.ends')}
              value={term.ends_on}
              onChange={(ends_on) => setTerm(i, { ends_on })}
              sundays
              withYear
            />
          </Col>
          <Col span={2} style={{ alignItems: 'flex-end' }}>
            <IconButton
              icon="close"
              label={t('platform.wizard.removeTerm')}
              onPress={() => setYear({ ...year, terms: year.terms.filter((_x, j) => j !== i) })}
            />
          </Col>
        </Row>
      ))}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button
          title={t('platform.wizard.addTerm')}
          icon="plus"
          variant="secondary"
          size="sm"
          onPress={() =>
            setYear({
              ...year,
              terms: [...year.terms, { name: `Term ${year.terms.length + 1}`, starts_on: year.starts_on, ends_on: year.ends_on }],
            })
          }
        />
        <Button
          title={t('platform.wizard.splitTerms')}
          variant="ghost"
          size="sm"
          onPress={() =>
            setYear({
              ...defaultYear(),
              name: year.name,
              starts_on: year.starts_on,
              ends_on: year.ends_on,
              terms: splitTerms(year.starts_on, year.ends_on),
            })
          }
        />
      </View>
    </View>
  );
}

function splitTerms(start: string, end: string) {
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);
  const mid = new Date(a.getTime() + (b.getTime() - a.getTime()) / 2);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const next = new Date(mid.getTime() + 86_400_000);
  return [
    { name: 'Term 1', starts_on: start, ends_on: iso(mid) },
    { name: 'Term 2', starts_on: iso(next), ends_on: end },
  ];
}

function GradesStep({ grades, setGrades, error }: { grades: GradeRow[]; setGrades: (g: GradeRow[]) => void; error?: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const total = grades.reduce((a, g) => a + g.sections.length, 0);
  const update = (i: number, row: GradeRow) => setGrades(grades.map((g, j) => (j === i ? row : g)));
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Text variant="sm" weight={600} color="ink2">
          {t('platform.wizard.presets')}
        </Text>
        {(['k12', 'p10', 'p12', 'none'] as const).map((p) => (
          <Chip
            key={p}
            label={t(`platform.wizard.preset.${p}`)}
            onPress={() => setGrades(PRESETS[p].map((g) => ({ grade: g, sections: ['A', 'B'] })))}
          />
        ))}
        <View style={{ flex: 1 }} />
        <Text variant="xs" color="muted">
          {t('platform.wizard.sectionTotal', { count: total, grades: grades.filter((g) => g.sections.length).length })}
        </Text>
      </View>
      <View style={[styles.gradesHead, { borderBottomColor: colors.line }]}>
        <Text variant="kicker" style={{ width: 150 }}>
          {t('platform.wizard.grade')}
        </Text>
        <Text variant="kicker">{t('platform.wizard.sections')}</Text>
      </View>
      {grades.map((row, i) => (
        <View key={i} style={styles.gradeRow}>
          <TextField
            value={row.grade}
            placeholder={t('platform.wizard.gradeNamePh')}
            onChangeText={(grade) => update(i, { ...row, grade })}
            containerStyle={{ width: 150 }}
            accessibilityLabel={t('platform.wizard.grade')}
          />
          <View style={{ flexDirection: 'row', gap: 6, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            {row.sections.map((s) => (
              <View key={s} style={[styles.section, { backgroundColor: colors.brandSoft }]}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.brandInk }}>{s}</Text>
              </View>
            ))}
            <IconButton
              icon="minus"
              size="sm"
              label={t('platform.wizard.removeSection')}
              disabled={row.sections.length === 0}
              onPress={() => update(i, { ...row, sections: row.sections.slice(0, -1) })}
            />
            <IconButton
              icon="plus"
              size="sm"
              label={t('platform.wizard.addSection')}
              disabled={row.sections.length >= LETTERS.length}
              onPress={() => update(i, { ...row, sections: [...row.sections, LETTERS[row.sections.length]] })}
            />
          </View>
          <IconButton
            icon="close"
            variant="bare"
            size="sm"
            label={t('platform.wizard.removeGrade')}
            onPress={() => setGrades(grades.filter((_g, j) => j !== i))}
          />
        </View>
      ))}
      <View style={{ alignSelf: 'flex-start' }}>
        <Button
          title={t('platform.wizard.addGrade')}
          icon="plus"
          variant="secondary"
          size="sm"
          onPress={() => setGrades([...grades, { grade: '', sections: ['A'] }])}
        />
      </View>
      {error ? (
        <Text variant="xs" color="bad">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function PersonFields({
  prefix,
  person,
  setPerson,
  errors,
}: {
  prefix: string;
  person: Person;
  setPerson: (p: Person) => void;
  errors: Record<string, string>;
}) {
  const { t } = useTranslation();
  return (
    <Row gap={16}>
      <Col span={5}>
        <TextField
          label={t('platform.wizard.fullName')}
          value={person.name}
          onChangeText={(name) => setPerson({ ...person, name })}
          error={errors[`${prefix}.name`]}
        />
      </Col>
      <Col span={3}>
        <TextField
          label={t('platform.wizard.phone')}
          prefix="+91"
          keyboardType="phone-pad"
          value={person.phone}
          onChangeText={(phone) => setPerson({ ...person, phone })}
          error={errors[`${prefix}.phone`]}
        />
      </Col>
      <Col span={4}>
        <TextField
          label={t('platform.wizard.email')}
          keyboardType="email-address"
          autoCapitalize="none"
          value={person.email}
          onChangeText={(email) => setPerson({ ...person, email })}
        />
      </Col>
    </Row>
  );
}

function PeopleStep({
  principal,
  setPrincipal,
  admin,
  setAdmin,
  method,
  setMethod,
  send,
  setSend,
  errors,
}: {
  principal: Person;
  setPrincipal: (p: Person) => void;
  admin: Person;
  setAdmin: (p: Person) => void;
  method: Method;
  setMethod: (m: Method) => void;
  send: Channel[];
  setSend: (c: Channel[]) => void;
  errors: Record<string, string>;
}) {
  const { t } = useTranslation();
  return (
    <View style={{ gap: 16 }}>
      <Text variant="h4">{t('platform.wizard.principal')}</Text>
      <PersonFields prefix="principal" person={principal} setPerson={setPrincipal} errors={errors} />
      <View style={{ gap: 4 }}>
        <Text variant="h4">{t('platform.wizard.admin')}</Text>
        <Text variant="xs" color="muted">
          {t('platform.wizard.adminHint')}
        </Text>
      </View>
      <PersonFields prefix="admin" person={admin} setPerson={setAdmin} errors={errors} />
      <HandoverFields method={method} setMethod={setMethod} send={send} setSend={setSend} />
    </View>
  );
}

function Review({ data, sections, onEdit }: { data: RegisterBody; sections: number; onEdit: (s: Step) => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const grades = data.grades.length;
  const rows: { step: Step; label: string; value: string }[] = [
    {
      step: 'school',
      label: t('platform.wizard.steps.school'),
      value: `${t('platform.wizard.reviewSchool', { name: data.school.name, code: data.school.code })} · ${[data.school.city, data.school.state].filter(Boolean).join(', ')}`,
    },
    {
      step: 'year',
      label: t('platform.wizard.steps.year'),
      value: t('platform.wizard.reviewYear', {
        name: data.year.name,
        from: formatDate(data.year.starts_on, { year: true }),
        to: formatDate(data.year.ends_on, { year: true }),
        terms: data.year.terms.map((x) => x.name).join(', '),
      }),
    },
    { step: 'grades', label: t('platform.wizard.steps.grades'), value: t('platform.wizard.sectionTotal', { count: sections, grades }) },
    {
      step: 'people',
      label: t('platform.wizard.steps.people'),
      value: [
        `${t('platform.slip.role.principal')}: ${t('platform.wizard.reviewPeople', { name: data.principal.name, phone: data.principal.phone })}`,
        data.admin
          ? `${t('platform.slip.role.admin')}: ${t('platform.wizard.reviewPeople', { name: data.admin.name, phone: data.admin.phone })}`
          : '',
        t(`platform.wizard.method.${data.method}`),
      ]
        .filter(Boolean)
        .join('\n'),
    },
  ];
  return (
    <View style={{ gap: 4 }}>
      <Text variant="h3">{t('platform.wizard.review')}</Text>
      {rows.map((r, i) => (
        <View key={r.step} style={[styles.reviewRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
          <Text variant="xs" color="muted" weight={700} style={{ width: 150 }}>
            {r.label}
          </Text>
          <Text variant="sm" style={{ flex: 1 }}>
            {r.value}
          </Text>
          <Button title={t('platform.wizard.edit')} variant="ghost" size="sm" onPress={() => onEdit(r.step)} />
        </View>
      ))}
    </View>
  );
}

function Preview({ school, sections, grades, year }: { school: SchoolState; sections: number; grades: number; year: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const primary = colourOk(school.primary_color) ? school.primary_color : colors.brand;
  const accent = colourOk(school.accent_color) ? school.accent_color : colors.accent;
  const initials = useMemo(
    () =>
      school.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join('') || '··',
    [school.name],
  );
  return (
    <Panel>
      <Text variant="kicker">{t('platform.wizard.preview')}</Text>
      <View style={[styles.previewCard, { borderColor: colors.line, backgroundColor: colors.surface }]}>
        <View style={[styles.previewTile, { backgroundColor: primary }]}>
          <Text style={{ fontFamily: fonts.bold, color: '#fff', fontSize: 15 }}>{initials}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="sm" weight={700} numberOfLines={1}>
            {school.name || t('platform.wizard.namePh')}
          </Text>
          <Text variant="xs" color="muted" numberOfLines={1}>
            {[school.campus || t('platform.wizard.campusPh'), year].join(' · ')}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={[styles.previewButton, { backgroundColor: primary }]}>
          <Text style={{ fontFamily: fonts.semibold, color: '#fff', fontSize: 13 }}>{t('console.shell.nav.dashboard')}</Text>
        </View>
        <View style={[styles.previewButton, { backgroundColor: accent }]}>
          <Text style={{ fontFamily: fonts.semibold, color: '#fff', fontSize: 13 }}>{school.code || 'CODE'}</Text>
        </View>
      </View>
      <Text variant="xs" color="muted">
        {t('platform.wizard.sectionTotal', { count: sections, grades })}
      </Text>
    </Panel>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  step: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  stepLine: { width: 36, height: 2, borderRadius: 1, marginLeft: 4 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    marginTop: 4,
    borderTopWidth: 1,
    borderColor: 'transparent',
  },
  gradesHead: { flexDirection: 'row', gap: 16, paddingBottom: 8, borderBottomWidth: 1 },
  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  section: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  reviewRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  previewCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1 },
  previewTile: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  previewButton: { paddingHorizontal: 14, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
