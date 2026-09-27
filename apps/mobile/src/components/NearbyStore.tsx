import { RETAILER_LABEL, RETAILERS, type Retailer } from '@weekwell/domain';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { directionsUrl, driveText, findNearestStore, formatMiles, nearbyAvailable, storeLabel } from '../services/nearbyStore';
import { useStore } from '../state/store';
import { MIN_TOUCH, color, space } from '../theme/tokens';
import { Icon } from './Icon';
import { StoreMap } from './StoreMap';
import { Text } from './Text';

type State = 'idle' | 'busy' | 'denied' | 'none' | 'failed';

/**
 * "Use my location" (D-047). Finds the nearest store for `retailer`, or for
 * either chain when none is chosen yet, and calls `onRetailer` with the chain
 * it found so the setup sentence can fill itself in.
 */
/** `map`: the grocery list's map strip (GR3) once a store is known; otherwise the card (ST1). */
export function NearbyStore({ retailer, onRetailer, map = false }: { retailer: Retailer | null; onRetailer?: (r: Retailer) => void; map?: boolean }) {
  const { data, scenarios, setShopping } = useStore();
  const [state, setState] = useState<State>('idle');
  if (!nearbyAvailable(scenarios.nearby)) return null;
  const store = data.shopping.store && (!retailer || data.shopping.store.retailer === retailer) ? data.shopping.store : null;

  const find = async () => {
    setState('busy');
    const r = await findNearestStore(retailer ? [retailer] : RETAILERS, scenarios.nearby);
    if (r.status === 'found') {
      setShopping({ store: r.store });
      onRetailer?.(r.store.retailer);
      setState('idle');
    } else setState(r.status);
  };

  if (store && map) return <StoreMap store={store} />;
  if (store) {
    return (
      <View style={styles.card} testID="nearby-store">
        <View style={styles.pin}>
          <Icon name="cart" size={18} color={color.onAccent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="label" tone="muted">YOUR NEAREST STORE</Text>
          <Text variant="bodyStrong">{storeLabel(store)}</Text>
          <Text variant="meta" tone="muted">{[formatMiles(store.miles), driveText(store) ?? store.city].filter(Boolean).join(' · ')}</Text>
        </View>
        <Pressable accessibilityRole="link" accessibilityLabel={`Directions to ${storeLabel(store)}`} onPress={() => void Linking.openURL(directionsUrl(store))} style={styles.go} testID="nearby-directions">
          <Text variant="label" tone="accent" style={{ textDecorationLine: 'underline' }}>Directions</Text>
        </Pressable>
      </View>
    );
  }

  const chain = retailer ? RETAILER_LABEL[retailer] : 'Trader Joe’s or Walmart';
  const note =
    state === 'denied'
      ? 'Location is off for Weekwell. Turn it on in Settings → Weekwell, or just pick your store.'
      : state === 'none'
        ? `No ${chain} within 25 miles. ${retailer ? 'Try the other store.' : ''}`.trim()
        : state === 'failed'
          ? 'We couldn’t search right now. Pick your store, or try again in a moment.'
          : null;

  return (
    <View style={{ gap: space.xs }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Find my nearest ${chain}`}
        disabled={state === 'busy'}
        onPress={() => void find()}
        style={({ pressed }) => [styles.find, pressed && { opacity: 0.85 }]}
        testID="nearby-find"
      >
        {state === 'busy' ? <ActivityIndicator color={color.accent} /> : <Icon name="cart" size={18} color={color.accent} />}
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">{state === 'busy' ? 'Finding your nearest store…' : `Find my nearest ${chain}`}</Text>
          <Text variant="meta" tone="muted">Uses your location once. It’s never stored.</Text>
        </View>
      </Pressable>
      {note ? (
        <Text variant="meta" tone="warning" accessibilityLiveRegion="polite" testID="nearby-note">
          {note}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.m - 4, backgroundColor: color.raised, padding: space.m - 4, borderLeftWidth: 4, borderLeftColor: color.accent },
  pin: { width: 36, height: 36, borderRadius: 18, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  go: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, justifyContent: 'center' },
  find: { flexDirection: 'row', alignItems: 'center', gap: space.m - 4, minHeight: MIN_TOUCH + 12, borderWidth: 1.5, borderColor: color.divider, borderStyle: 'dashed', paddingHorizontal: space.m - 4, paddingVertical: space.s },
});
