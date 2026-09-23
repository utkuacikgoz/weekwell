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
  // Screens read stored state; rendering them before it loads would redirect deep links to onboarding.
  if (!hydrated) {
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
