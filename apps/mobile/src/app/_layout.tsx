import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Appearance, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FontScaleProvider } from '../components/Text';
import { useReducedMotion } from '../services/motion';
import { StoreProvider, useStore } from '../state/store';
import { color, scheme } from '../theme/tokens';

function Navigator() {
  const reduced = useReducedMotion();
  // Colors are resolved at launch. On web, reload so a system change applies immediately.
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      if (Platform.OS === 'web' && (colorScheme === 'dark' ? 'dark' : 'light') !== scheme && typeof window !== 'undefined') window.location.reload();
    });
    return () => sub.remove();
  }, []);
  const { scenarios, hydrated } = useStore();
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, BricolageGrotesque_800ExtraBold });
  // If fonts fail to load, continue with system fonts rather than blocking the app.
  const fontsReady = fontsLoaded || !!fontError;
  // Screens read stored state; rendering them before it loads would redirect deep links to onboarding.
  if (!hydrated || !fontsReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.background }}>
        <ActivityIndicator accessibilityLabel="Loading your week" color={color.ink} />
      </View>
    );
  }
  return (
    <FontScaleProvider scale={scenarios.fontScale}>
      {/* Bold blocks (D-040): light status bar text on the green ground in both themes. */}
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.background },
          // Navigation motion explains push/pop; removed entirely under reduced motion.
          animation: reduced ? 'none' : 'default',
        }}
      />
    </FontScaleProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Navigator />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
