import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from '../services/motion';
import { color, radius, space } from '../theme/tokens';
import { Text } from './Text';

/**
 * Bottom sheet for detail and confirmation. Rises from the bottom (explains
 * where it came from); fades instead under reduced motion. Tapping the scrim
 * or the close action dismisses it.
 */
export function Sheet({ visible, title, onClose, children, footer, testID }: { visible: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; testID?: string }) {
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType={reduced ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.m) }]} testID={testID} accessibilityViewIsModal>
          <View style={styles.grabber} importantForAccessibility="no" />
          <Text variant="heading" accessibilityRole="header" style={{ marginBottom: space.s }}>
            {title}
          </Text>
          <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ gap: space.m, paddingBottom: space.s }}>
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: color.scrim },
  sheet: { backgroundColor: color.raised, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, paddingHorizontal: space.l - 4, paddingTop: space.s, width: '100%', maxWidth: 560, alignSelf: 'center' },
  grabber: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: color.divider, marginBottom: space.m },
  footer: { gap: space.s, paddingTop: space.m },
});
