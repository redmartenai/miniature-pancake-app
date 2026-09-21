import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

type Name = ComponentProps<typeof Ionicons>['name'];

/** Filled icon when the tab is selected, outline otherwise. */
export function tabIcon(filled: Name, outline: Name) {
  return function TabBarIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={focused ? filled : outline} size={23} color={color as string} />;
  };
}
