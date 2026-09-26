/** Small line icons (24px grid). Decorative: callers provide the accessible label. */
import Svg, { Circle, Path } from 'react-native-svg';
import { color as palette } from '../theme/tokens';

export type IconName = 'chevron-right' | 'chevron-left' | 'chevron-down' | 'info' | 'edit' | 'check' | 'close' | 'refresh' | 'cart' | 'share' | 'timer';

const PATHS: Record<IconName, string> = {
  'chevron-right': 'M9 5l7 7-7 7',
  'chevron-left': 'M15 5l-7 7 7 7',
  'chevron-down': 'M5 9l7 7 7-7',
  info: 'M12 11v6M12 7.5v.5',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  close: 'M6 6l12 12M18 6L6 18',
  refresh: 'M19 12a7 7 0 1 1-2.05-4.95M19 5v4h-4',
  share: 'M12 4v11M8 8l4-4 4 4M6 13v6h12v-6',
  timer: 'M12 13V9M10 3h4M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  cart: 'M4 5h2l2 10h10l2-7H7.2M10 19.5a1 1 0 1 0 0 .01M17 19.5a1 1 0 1 0 0 .01',
};

export function Icon({ name, size = 24, color = palette.ink, strokeWidth = 2 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {name === 'info' ? <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={strokeWidth} /> : null}
      <Path d={PATHS[name]} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
