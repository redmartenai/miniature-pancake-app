import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/ui';

import type { FleetMapProps } from './FleetMap.types';

/** Native fallback: the console is a web page; the live fleet map is Leaflet (FleetMap.web.tsx). */
export function FleetMap(_props: FleetMapProps) {
  const { t } = useTranslation();
  return (
    <Card style={styles.card}>
      <View style={styles.center}>
        <Text variant="sm" color="muted">
          {t('console.operations.transport.map.webOnly')}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { height: 240 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
