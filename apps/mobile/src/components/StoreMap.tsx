import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { StoreSearch } from '../../modules/store-search';
import { directionsUrl, driveText, formatMiles, storeLabel, type HomeStore } from '../services/nearbyStore';
import { MIN_TOUCH, color, scheme, space } from '../theme/tokens';
import { Text } from './Text';

const HEIGHT = 104;

/**
 * The grocery list's map strip (D-047 GR3): a still Apple Maps image of the
 * store's block, then the store, distance and drive time with a Go button.
 * Full-bleed inside a padded screen. Without MapKit (web, tests) a drawn
 * street pattern stands in.
 */
export function StoreMap({ store }: { store: HomeStore }) {
  const { width } = useWindowDimensions();
  const [uri, setUri] = useState<string | null>(null);
  const hasSpot = store.latitude !== 0 || store.longitude !== 0;

  useEffect(() => {
    if (!StoreSearch || !hasSpot) return;
    let live = true;
    StoreSearch.mapImageAsync(store.latitude, store.longitude, Math.round(width), HEIGHT, scheme === 'dark')
      .then((u) => live && setUri(u))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [store.latitude, store.longitude, hasSpot, width]);

  const facts = [formatMiles(store.miles), driveText(store)].filter(Boolean).join(' · ');
  return (
    <View style={styles.bleed} testID="store-map">
      <View style={styles.map} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {uri ? (
          <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <>
            <View style={[styles.road, { top: '58%', left: 0, right: 0, height: 5 }]} />
            <View style={[styles.road, { left: '48%', top: 0, bottom: 0, width: 5 }]} />
            <View style={[styles.road, { left: '12%', top: '10%', width: 3, height: '140%', transform: [{ rotate: '52deg' }] }]} />
            <View style={styles.pin} />
          </>
        )}
      </View>
      <View style={styles.bar}>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">{storeLabel(store)}</Text>
          <Text variant="meta" tone="muted">{facts}</Text>
        </View>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Directions to ${storeLabel(store)}`}
          onPress={() => void Linking.openURL(directionsUrl(store))}
          style={({ pressed }) => [styles.go, pressed && { opacity: 0.85 }]}
          testID="nearby-directions"
        >
          <Text variant="bodyStrong" tone="onAccent">Go</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -(space.m + 4) },
  map: { height: HEIGHT, backgroundColor: scheme === 'dark' ? '#2B3A33' : '#D5E3CF', overflow: 'hidden' },
  road: { position: 'absolute', backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.8)' },
  pin: { position: 'absolute', left: '50%', top: '38%', marginLeft: -11, width: 22, height: 22, borderRadius: 11, borderWidth: 4, borderColor: '#FFFFFF', backgroundColor: '#A83E28' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.m, backgroundColor: color.raised, paddingHorizontal: space.m + 4, paddingVertical: space.s + 2 },
  go: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH + 12, paddingHorizontal: space.m, alignItems: 'center', justifyContent: 'center', backgroundColor: color.accent },
});
