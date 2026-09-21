import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { toneColors, type Tone } from '@/theme/tokens';

import { Text } from './Text';

const TONES: Tone[] = ['primary', 'accent', 'info', 'success', 'warning'];

function toneFor(seed: string): Tone {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return TONES[hash % TONES.length];
}

export function Avatar({ initials, size = 40, tone, seed }: { initials: string; size?: number; tone?: Tone; seed?: string }) {
  const { colors } = useTheme();
  const { fg, bg } = toneColors(colors, tone ?? toneFor(seed ?? initials));
  return (
    <View
      accessible={false}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text variant="label" rawColor={fg} style={{ fontSize: size * 0.36, lineHeight: size * 0.46 }}>
        {initials}
      </Text>
    </View>
  );
}
