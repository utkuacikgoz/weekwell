import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { MIN_TOUCH, space } from '../theme/tokens';
import { Text } from './Text';

/**
 * The public site (site/ in the repo, deployed by Vercel to weekwell.pro, D-042)
 * holds the privacy policy and terms. App Store guideline 3.1.2 needs both
 * links on the subscription screen. EXPO_PUBLIC_SITE_URL overrides the address.
 */
export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || 'https://weekwell.pro').replace(/\/$/u, '');
export const siteLink = (page: 'privacy' | 'terms' | 'health-data' | 'support') => `${SITE_URL}/${page}`;

export function LegalLinks({ pages, testID }: { pages: { page: 'privacy' | 'terms' | 'health-data' | 'support'; label: string }[]; testID?: string }) {
  return (
    <View style={styles.row} testID={testID}>
      {pages.map(({ page, label }) => (
        <Pressable key={page} accessibilityRole="link" onPress={() => void Linking.openURL(siteLink(page))} style={styles.link} testID={`link-${page}`}>
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
