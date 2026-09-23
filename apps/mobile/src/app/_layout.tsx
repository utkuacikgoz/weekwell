import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FontScaleProvider } from '../components/Text';
import { useReducedMotion } from '../services/motion';
import { StoreProvider, useStore } from '../state/store';
import { color } from '../theme/tokens';

function Navigator() {
  const reduced = useReducedMotion();
  const { scenarios, hydrated } = useStore();
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
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
      <StatusBar style="dark" />
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
