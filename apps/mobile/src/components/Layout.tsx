import { router } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MIN_TOUCH, color, space } from '../theme/tokens';
import { Text } from './Text';

/**
 * Page scaffold: one background surface, scrollable content, and an optional
 * bottom action bar that stays reachable at any text size.
 */
export function Screen({ children, footer, testID, scrollToTopKey }: { children: ReactNode; footer?: ReactNode; testID?: string; scrollToTopKey?: unknown }) {
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
      <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer ? <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.m) }]}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
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
      {children.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  content: { paddingHorizontal: space.m + 4, paddingBottom: space.xl },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: color.divider,
    backgroundColor: color.raised,
    paddingHorizontal: space.m + 4,
    paddingTop: space.m - 4,
    gap: space.s,
  },
  topBar: { minHeight: MIN_TOUCH + 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  back: { minHeight: MIN_TOUCH, justifyContent: 'center', paddingRight: space.m },
  divider: { height: StyleSheet.hairlineWidth * 2, backgroundColor: color.divider },
  section: { marginTop: space.l, marginBottom: space.xs },
});
