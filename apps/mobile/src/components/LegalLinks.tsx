import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { MIN_TOUCH, space } from '../theme/tokens';
import { Text } from './Text';

/**
 * The public site (site/ in the repo) holds the privacy policy and terms.
 * Set EXPO_PUBLIC_SITE_URL (for example https://weekwell.app) in EAS. App
 * Store guideline 3.1.2 needs both links on the subscription screen, so a
 * release build without it fails review.
 */
export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? '').replace(/\/$/u, '') || null;
export const siteLink = (page: 'privacy' | 'terms' | 'health-data' | 'support') => (SITE_URL ? `${SITE_URL}/${page}.html` : null);

export function LegalLinks({ pages, testID }: { pages: { page: 'privacy' | 'terms' | 'health-data' | 'support'; label: string }[]; testID?: string }) {
  if (!SITE_URL) return null;
  return (
    <View style={styles.row} testID={testID}>
      {pages.map(({ page, label }) => (
        <Pressable key={page} accessibilityRole="link" onPress={() => void Linking.openURL(siteLink(page)!)} style={styles.link} testID={`link-${page}`}>
          <Text variant="meta" tone="accent" style={{ textDecorationLine: 'underline' }}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.m },
  link: { minHeight: MIN_TOUCH, justifyContent: 'center' },
});
