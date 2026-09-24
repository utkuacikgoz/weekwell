/**
 * Review-only food-art direction board (design audit 2026-09-24): six meals,
 * Direction A (editorial photography, spec and placeholder frames) beside
 * Direction B (refined illustration, drawn). Hidden unless ?review=1 (web preview).
 * `?only=b` shows the illustrations alone, for captures.
 */
import { Redirect } from 'expo-router';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Screen } from '../../components/Layout';
import { Text } from '../../components/Text';
import { FOOD_DIRECTIONS, PHOTO_SPEC } from '../../review/foodDirections';
import { color, radius, space } from '../../theme/tokens';

const square = (svg: string) => svg.replace('<svg ', '<svg preserveAspectRatio="xMidYMid slice" ');

function PhotoSlot({ width, shot }: { width: number; shot: string }) {
  return (
    <View style={[styles.slot, { width, height: (width * 3) / 4 }]} accessible accessibilityLabel={`Photo placeholder. ${shot}`}>
      <Text variant="label" tone="muted">Photo slot · 4:3</Text>
      <Text variant="meta" tone="muted" style={{ textAlign: 'center' }}>{shot}</Text>
    </View>
  );
}

export default function FoodDirections() {
  const { width } = useWindowDimensions();
  const params = Platform.OS === 'web' && typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  if (params?.get('review') !== '1') return <Redirect href="/" />;
  const only = params.get('only');
  const col = Math.min(width, 560) - 2 * (space.m + 4);
  return (
    <Screen testID="food-directions">
      <Text variant="title" accessibilityRole="header" style={{ marginTop: space.m }}>Food art: two directions</Text>
      <Text tone="muted" style={{ marginTop: space.xs }}>Six representative meals. Pick one direction before it goes into any screen. The photography direction has no photographs yet: its frames are placeholders with the shot brief.</Text>

      {only !== 'b' ? (
        <View style={styles.spec}>
          <Text variant="bodyStrong">A · Editorial photography (recommended by the audit)</Text>
          <Text variant="meta" tone="muted">{PHOTO_SPEC.style}</Text>
          {PHOTO_SPEC.crops.map((c) => <Text key={c} variant="meta" tone="muted">• {c}</Text>)}
          <Text variant="label" style={{ marginTop: space.s }}>Sourcing options</Text>
          {PHOTO_SPEC.sourcing.map((c) => <Text key={c} variant="meta" tone="muted">• {c}</Text>)}
        </View>
      ) : null}
      {only !== 'a' ? (
        <View style={styles.spec}>
          <Text variant="bodyStrong">B · Refined illustration</Text>
          <Text variant="meta" tone="muted">3/4 view, one light from the upper left, the right dish for each meal, ingredient shapes you can recognise, a paper-grain texture, and a warm ink outline on the main shapes only.</Text>
        </View>
      ) : null}

      {FOOD_DIRECTIONS.map((d) => (
        <View key={d.id} style={styles.meal} testID={`direction-${d.id}`}>
          <Text variant="dish">{d.name}</Text>
          <Text variant="caption" tone="muted">{d.vessel}</Text>
          {only !== 'b' ? (
            <>
              <Text variant="label" style={styles.tag}>A · Photography</Text>
              <PhotoSlot width={col} shot={d.shot} />
              <Text variant="caption" tone="muted">Prompt: {d.prompt}</Text>
            </>
          ) : null}
          {only !== 'a' ? (
            <>
              <Text variant="label" style={styles.tag}>B · Illustration</Text>
              <View style={styles.art}>
                <SvgXml xml={d.svg} width={col} height={(col * 2) / 3} />
              </View>
              <View style={styles.thumbs}>
                <View style={styles.thumb}><SvgXml xml={square(d.svg)} width={60} height={60} /></View>
                <Text variant="caption" tone="muted" style={{ flex: 1 }}>The same art as a week-row thumbnail (60pt, square crop).</Text>
              </View>
            </>
          ) : null}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  spec: { marginTop: space.m, gap: space.xs, backgroundColor: color.raised, borderRadius: radius.card, padding: space.m },
  meal: { marginTop: space.xl, gap: space.xs },
  tag: { marginTop: space.s },
  slot: { borderRadius: radius.card, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.control, alignItems: 'center', justifyContent: 'center', gap: space.xs, padding: space.m, backgroundColor: color.placeholder },
  art: { borderRadius: radius.card, overflow: 'hidden' },
  thumbs: { flexDirection: 'row', alignItems: 'center', gap: space.m - 4, marginTop: space.xs },
  thumb: { width: 60, height: 60, borderRadius: radius.thumb, overflow: 'hidden' },
});
