import { Pressable, StyleSheet, View } from 'react-native';
import { MIN_TOUCH, color, radius, space } from '../theme/tokens';
import { Text } from './Text';

/** Short-lived confirmation above the action bar, with an optional action (e.g. Undo). */
export function Toast({ message, actionLabel, onAction, testID, tone = 'ink' }: { message: string; actionLabel?: string; onAction?: () => void; testID?: string; tone?: 'ink' | 'warning' }) {
  return (
    <View style={[styles.toast, tone === 'warning' && { backgroundColor: color.warning }]} accessibilityLiveRegion="polite" testID={testID}>
      <Text variant="meta" tone="onAccent" style={{ flex: 1 }} numberOfLines={2}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.btn}>
          <Text variant="label" tone="onAccent">{actionLabel}</Text>
        </Pressable>
      ) : (
        <View style={{ width: space.m, minHeight: MIN_TOUCH }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toast: { flexDirection: 'row', alignItems: 'center', backgroundColor: color.ink, borderRadius: radius.control, paddingLeft: space.m },
  btn: { minHeight: MIN_TOUCH, minWidth: 64, alignItems: 'center', justifyContent: 'center' },
});
