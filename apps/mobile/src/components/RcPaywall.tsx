import { StyleSheet, View } from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';
import { color } from '../theme/tokens';

/**
 * RevenueCat's paywall (D-051), designed in the RevenueCat dashboard on the current offering.
 * Used only in builds with a RevenueCat key; the web preview and tests keep the built-in paywall.
 * Purchase and restore errors are shown by the paywall itself.
 */
export function RcPaywall({ onCompleted, onClose }: { onCompleted: (kind: 'purchase' | 'restore') => void; onClose: () => void }) {
  return (
    <View style={styles.fill} testID="rc-paywall">
      <RevenueCatUI.Paywall
        style={styles.fill}
        options={{ displayCloseButton: true }}
        onPurchaseCompleted={() => onCompleted('purchase')}
        onRestoreCompleted={() => onCompleted('restore')}
        onDismiss={onClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1, backgroundColor: color.background } });
