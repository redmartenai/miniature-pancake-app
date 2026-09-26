import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';

import { formatDate, formatTime } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Banner, Button, Icon, ICON_SIZE, Tear, Text, Ticket, useToast } from '@/ui';

import type { Slip } from './api';

function when(iso: string): string {
  return `${formatDate(iso, { year: true })}, ${formatTime(iso)}`;
}

/** The slip as plain text, for the clipboard and for handing over in person. */
export function slipText(t: TFunction, slip: Slip): string {
  const secret =
    slip.method === 'password'
      ? t('platform.slip.copyPassword', { password: slip.password })
      : slip.method === 'invite'
        ? t('platform.slip.copyInvite', { url: slip.invite_url, date: slip.expires_at ? when(slip.expires_at) : '' })
        : '';
  return t('platform.slip.copyText', {
    school: slip.school.name,
    code: slip.school.code,
    url: slip.sign_in_url,
    name: slip.person.name,
    role: t(`platform.slip.role.${slip.person.role}`),
    phone: slip.person.phone,
    secret,
  }).trim();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Opens a clean, printable page with just the slip (the browser's "Save as PDF" makes the PDF). */
function printSlip(t: TFunction, slip: Slip) {
  if (Platform.OS !== 'web') return;
  const rows = slipText(t, slip)
    .split('\n')
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');
  const win = window.open('', '_blank', 'width=640,height=720');
  if (!win) return;
  win.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(t('platform.slip.title'))}</title>` +
      `<style>body{font:15px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;margin:48px;color:#141a2e}` +
      `.slip{border:2px dashed #9aa1b5;border-radius:16px;padding:28px 32px;max-width:520px}` +
      `h1{font-size:20px;margin:0 0 16px}p{margin:6px 0;white-space:pre-wrap;word-break:break-all}` +
      `.note{margin-top:24px;font-size:12px;color:#5b6275}</style></head><body><div class="slip">` +
      `<h1>EduFlow · ${escapeHtml(slip.school.name)}</h1>${rows}` +
      `<p class="note">${escapeHtml(t('platform.slip.shownOnce'))}</p></div>` +
      `<script>window.onload=function(){window.print()}</script></body></html>`,
  );
  win.document.close();
}

function Row({ label, value, mono, strong }: { label: string; value: string; mono?: boolean; strong?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text variant="xs" color="muted" weight={600} style={{ width: 132 }}>
        {label}
      </Text>
      <Text
        selectable
        style={[
          { flex: 1, color: colors.ink, fontFamily: strong ? fonts.bold : fonts.semibold, fontSize: strong ? 18 : 14 },
          mono && { fontFamily: Platform.OS === 'web' ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : fonts.bold, letterSpacing: 1 },
        ]}>
        {value}
      </Text>
    </View>
  );
}

/**
 * The one-time credential slip: who, which school, where to sign in, and the temporary password or invite link.
 * EduFlow doesn't keep the password, so this is the only time it's shown.
 */
export function CredentialSlip({ slip, onDone, doneLabel }: { slip: Slip; onDone: () => void; doneLabel?: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(slipText(t, slip));
      toast(t('platform.slip.copied'));
    } catch {
      toast(t('common.somethingWrong'), 'danger');
    }
  };
  const delivered = Object.entries(slip.delivered ?? {}).map(
    ([channel, status]) =>
      `${channel.toUpperCase()} (${status === 'logged' ? t('platform.slip.deliveredLogged') : status === 'no_address' ? t('platform.slip.deliveredNoAddress') : status})`,
  );

  return (
    <View style={{ gap: 16, maxWidth: 620 }}>
      {slip.method === 'existing' ? (
        <Banner tone="info" icon="info" message={t('platform.slip.existing', { name: slip.person.name })} />
      ) : (
        <Banner tone="warning" icon="alert" message={t('platform.slip.shownOnce')} />
      )}
      <Ticket color="sky">
        <View style={{ padding: 24, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Icon name="key" size={ICON_SIZE.md} rawColor={colors.ink2} />
            <Text variant="kicker">{t('platform.slip.title')}</Text>
          </View>
          <Row label={t('platform.slip.school')} value={slip.school.name} strong />
          <Row label={t('platform.slip.code')} value={slip.school.code} mono />
          <Row label={t('platform.slip.signIn')} value={slip.sign_in_url} />
        </View>
        <Tear />
        <View style={{ padding: 24, gap: 4 }}>
          <Row label={t('platform.slip.person')} value={`${slip.person.name} · ${t(`platform.slip.role.${slip.person.role}`)}`} />
          <Row label={t('platform.slip.phone')} value={slip.person.phone} mono />
          {slip.person.email ? <Row label={t('platform.slip.email')} value={slip.person.email} /> : null}
          {slip.method === 'password' && slip.password ? (
            <>
              <Row label={t('platform.slip.password')} value={slip.password} mono strong />
              <Text variant="xs" color="muted" style={{ marginLeft: 132 }}>
                {t('platform.slip.passwordNote')}
              </Text>
            </>
          ) : null}
          {slip.method === 'invite' && slip.invite_url ? (
            <>
              <Row label={t('platform.slip.invite')} value={slip.invite_url} />
              <Text variant="xs" color="muted" style={{ marginLeft: 132 }}>
                {t('platform.slip.inviteNote', { date: slip.expires_at ? when(slip.expires_at) : '' })}
              </Text>
            </>
          ) : null}
        </View>
      </Ticket>
      {delivered.length ? (
        <Text variant="xs" color="muted">
          {t('platform.slip.delivered', { list: delivered.join(', ') })}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        {slip.method !== 'existing' ? (
          <>
            <Button title={t('platform.slip.copy')} icon="clipboard" variant="secondary" onPress={() => void copy()} />
            <Button title={t('platform.slip.print')} icon="print" variant="secondary" onPress={() => printSlip(t, slip)} />
          </>
        ) : null}
        <View style={{ flex: 1 }} />
        <Button title={doneLabel ?? t('platform.slip.done')} onPress={onDone} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 12, paddingVertical: 5 },
});
