import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Checkbox, Icon, ICON_SIZE, pointer, Text } from '@/ui';

import type { Channel, Method } from './api';

/** Temporary password or invite link, and whether to also send it by SMS/email. Shared with the school page. */
export function HandoverFields({
  method,
  setMethod,
  send,
  setSend,
}: {
  method: Method;
  setMethod: (m: Method) => void;
  send: Channel[];
  setSend: (c: Channel[]) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <Text variant="h4">{t('platform.wizard.handover')}</Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {(['password', 'invite'] as const).map((m) => {
          const on = method === m;
          return (
            <Pressable
              key={m}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => setMethod(m)}
              style={[
                styles.option,
                pointer,
                { borderColor: on ? colors.brand : colors.line, backgroundColor: on ? colors.brandSoft : colors.surface },
              ]}>
              <Icon name={m === 'password' ? 'key' : 'link'} size={ICON_SIZE.md} rawColor={on ? colors.brandInk : colors.ink2} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="sm" weight={700} rawColor={on ? colors.brandInk : colors.ink}>
                  {t(`platform.wizard.method.${m}`)}
                </Text>
                <Text variant="xs" color="muted">
                  {t(`platform.wizard.method.${m}Sub`)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Text variant="sm" weight={600} color="ink2">
          {t('platform.wizard.send')}
        </Text>
        {(['sms', 'email'] as const).map((c) => (
          <View key={c} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Checkbox
              checked={send.includes(c)}
              label={c === 'sms' ? t('platform.wizard.sms') : t('platform.wizard.email_')}
              onChange={(on) => setSend(on ? [...send, c] : send.filter((x) => x !== c))}
            />
            <Text variant="sm">{c === 'sms' ? t('platform.wizard.sms') : t('platform.wizard.email_')}</Text>
          </View>
        ))}
      </View>
      <Text variant="xs" color="muted">
        {t('platform.wizard.sendNote')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  option: { flex: 1, flexDirection: 'row', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5 },
});
