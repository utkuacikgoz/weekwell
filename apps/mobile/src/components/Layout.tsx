import { router } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MIN_TOUCH, color, space } from '../theme/tokens';
import { Text } from './Text';

/**
 * Page scaffold: one background surface, scrollable content, and an optional
 * compact action bar. The bar is a sibling of the scroll view, never an
 * overlay, so the last row always scrolls fully above it (checked by
 * e2e/footer.spec.ts at 320px and 150% text). Keep the bar to one primary
 * action plus at most the price chip (`footerRow`, with the action in <FooterAction>).
 */
export function Screen({ children, footer, footerRow, overlay, testID, scrollToTopKey }: { children: ReactNode; footer?: ReactNode; footerRow?: boolean; overlay?: ReactNode; testID?: string; scrollToTopKey?: unknown }) {
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  // Bring a result (e.g. a swap confirmation at the top) into view after an action lower on the page.
  useEffect(() => {
    if (scrollToTopKey) scroll.current?.scrollTo({ y: 0, animated: false });
  }, [scrollToTopKey]);
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { paddingTop: insets.top }]}
      testID={testID}
    >
      <ScrollView ref={scroll} style={styles.scroll} contentContainerStyle={[styles.content, !footer && { paddingBottom: space.xl + insets.bottom }]} keyboardShouldPersistTaps="handled" testID="screen-scroll">
        {children}
      </ScrollView>
      {footer ? (
        <View style={[styles.footer, footerRow && styles.footerRow, { paddingBottom: Math.max(insets.bottom, space.s + 4) }]} testID="screen-footer">
          {/* Transient messages (e.g. undo toasts) float just above the action bar. */}
          {overlay ? <View style={styles.overlay} pointerEvents="box-none">{overlay}</View> : null}
          {footer}
        </View>
      ) : overlay ? (
        <View style={[styles.overlay, { bottom: Math.max(insets.bottom, space.m) }]} pointerEvents="box-none">{overlay}</View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

/** The primary action in the bar: takes the remaining width, and drops to its own row when there isn't room. */
export function FooterAction({ children }: { children: ReactNode }) {
  return <View style={styles.action}>{children}</View>;
}

/** Back affordance plus optional step status ("Step 2 of 8"). */
export function TopBar({ step, total, backLabel = 'Back', onBack, right }: { step?: number; total?: number; backLabel?: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <View style={styles.topBar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
        hitSlop={8}
        style={styles.back}
      >
        <Text variant="bodyStrong">‹ {backLabel}</Text>
      </Pressable>
      {step && total ? (
        <Text variant="meta" tone="muted" accessibilityLabel={`Step ${step} of ${total}`}>
          Step {step} of {total}
        </Text>
      ) : null}
      {right}
    </View>
  );
}

export function Divider({ spaced }: { spaced?: boolean }) {
  return <View style={[styles.divider, spaced && { marginVertical: space.m }]} importantForAccessibility="no" />;
}

export function SectionLabel({ children }: { children: string }) {
  return (
    <Text variant="label" tone="muted" accessibilityRole="header" style={styles.section}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: space.m + 4, paddingBottom: space.xl },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: color.divider,
    backgroundColor: color.background,
    paddingHorizontal: space.m + 4,
    paddingTop: space.s + 4,
    gap: space.s,
  },
  footerRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  action: { flexGrow: 1, flexBasis: 176 },
  overlay: { position: 'absolute', left: space.m, right: space.m, bottom: '100%', marginBottom: space.s },
  topBar: { minHeight: MIN_TOUCH + 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  back: { minHeight: MIN_TOUCH, justifyContent: 'center', paddingRight: space.m },
  divider: { height: StyleSheet.hairlineWidth * 2, backgroundColor: color.divider },
  section: { marginTop: space.l, marginBottom: space.xs },
});
