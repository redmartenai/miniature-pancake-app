import Svg, { Path } from 'react-native-svg';

/** The EduFlow mark from the prototype (an open book with a ribbon). */
export function BrandMark({ color, size = 44 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="EduFlow">
      <Path d="M39 15H61L50 27Z" fill={color} />
      <Path d="M30 22L46.5 35V79L30 66Z" fill={color} />
      <Path d="M70 22L53.5 35V79L70 66Z" fill={color} />
    </Svg>
  );
}
