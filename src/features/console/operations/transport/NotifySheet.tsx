import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { formatClock } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Checkbox, pointer, Sheet, Text, TextField, useToast } from '@/ui';

import { useNotifyRoute, type RouteRun } from './api';

const T = 'console.operations.transport.notifySheet';

/** The message a principal would send: how late, why, and when the next stop can expect the bus. */
function draft(t: (k: string, o?: Record<string, unknown>) => string, run: RouteRun) {
  const bus = run.vehicle?.label ?? run.route.name;
  if (run.status !== 'late') {
    return { title: t(`${T}.defaultTitleOnTime`, { route: run.route.name }), body: t(`${T}.defaultBodyOnTime`, { bus }) };
  }
  // The desk's note reads mid-sentence here: "(traffic at the Outer Ring Road junction)".
  const note = run.reason ? run.reason.charAt(0).toLowerCase() + run.reason.slice(1) : null;
  const reason = note ?? (run.held ? t(`${T}.reasonHeld`, { stop: run.held.stop }) : t(`${T}.reasonTraffic`));
  const title = t(`${T}.defaultTitle`, { route: run.route.name, count: run.delay });
  const body =
    run.next && run.next.eta
      ? t(`${T}.defaultBody`, { bus, count: run.delay, reason, stop: run.next.name, eta: formatClock(run.next.eta) })
      : t(`${T}.defaultBodyNoStop`, { bus, count: run.delay, reason });
  return { title, body };
}

/** Confirm sheet for "Notify Route 07 parents": an editable message to every family on the route. */
export function NotifySheet({ run, visible, onClose }: { run: RouteRun; visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const send = useNotifyRoute(run.route.id);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sms, setSms] = useState(false);

  // A fresh draft each time the sheet opens (the run may have changed since).
  useEffect(() => {
    if (!visible) return;
    const d = draft((k, o) => t(k, o), run);
    setTitle(d.title);
    setBody(d.body);
    setSms(false);
    send.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const error = send.error instanceof ApiError ? send.error : null;
  const submit = () =>
    send.mutate(
      { title: title.trim(), body: body.trim(), sms },
      {
        onSuccess: (res) => {
          toast(t(`${T}.sent`, { count: res.recipients }));
          onClose();
        },
      },
    );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t(`${T}.title`, { route: run.route.name })}
      message={t(`${T}.message`, { count: run.notify.families, route: run.route.name })}>
      {run.notify.last_sent ? (
        <Text variant="xs" color="muted">
          {t(`${T}.lastSent`, { time: formatClock(run.notify.last_sent) })}
        </Text>
      ) : null}
      <TextField label={t(`${T}.subject`)} value={title} onChangeText={setTitle} maxLength={120} error={error?.fieldMessage('title')} />
      <TextField
        label={t(`${T}.body`)}
        value={body}
        onChangeText={setBody}
        multiline
        maxLength={1000}
        error={error?.fieldMessage('body')}
      />
      <Pressable
        style={[styles.check, pointer]}
        onPress={() => setSms(!sms)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: sms }}
        accessibilityLabel={t(`${T}.sms`)}>
        <Checkbox checked={sms} label={t(`${T}.sms`)} decorative />
        <Text variant="sm" color="ink2">
          {t(`${T}.sms`)}
        </Text>
      </Pressable>
      {error && (error.fieldMessage('route') || !error.fields) ? (
        <Text variant="sm" rawColor={colors.bad}>
          {error.fieldMessage('route') ?? error.message}
        </Text>
      ) : null}
      <View style={styles.buttons}>
        <Button title={t(`${T}.cancel`)} variant="secondary" onPress={onClose} />
        <Button title={t(`${T}.send`)} icon="send" onPress={submit} loading={send.isPending} disabled={!title.trim() || !body.trim()} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  check: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
});
