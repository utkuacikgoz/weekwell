import { StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';
import { color, radius, space } from '../theme/tokens';
import { Text } from './Text';

type Props = { tone: 'info' | 'warning'; title: string; children?: ReactNode; testID?: string };

/**
 * Status banner. Warning banners carry a "!" mark and a title so the state is
 * readable without color. Announced politely by screen readers.
 */
export function Banner({ tone, title, children, testID }: Props) {
  return (
    <View
      testID={testID}
      accessibilityRole={tone === 'warning' ? 'alert' : 'summary'}
      accessibilityLiveRegion="polite"
      style={[styles.box, tone === 'warning' ? styles.warning : styles.info]}
    >
      <View style={styles.head}>
        <View style={[styles.mark, { borderColor: tone === 'warning' ? color.warning : color.accent }]} importantForAccessibility="no" accessibilityElementsHidden>
          <Text variant="label" tone={tone === 'warning' ? 'warning' : 'accent'}>{tone === 'warning' ? '!' : 'i'}</Text>
        </View>
        <Text variant="bodyStrong" tone={tone === 'warning' ? 'warning' : 'ink'} style={{ flex: 1 }}>
          {title}
        </Text>
      </View>
      {children ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.control, padding: space.m, marginVertical: space.s },
  info: { backgroundColor: color.accentTint },
  warning: { backgroundColor: color.warningTint },
  head: { flexDirection: 'row', alignItems: 'flex-start' },
  mark: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginRight: space.s, marginTop: 2 },
  body: { marginTop: space.xs, marginLeft: 28 },
});
