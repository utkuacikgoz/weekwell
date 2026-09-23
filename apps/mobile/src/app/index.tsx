import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useStore } from '../state/store';
import { color } from '../theme/tokens';

export default function Index() {
  const { hydrated, data } = useStore();
  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.background }}>
        <ActivityIndicator accessibilityLabel="Loading your week" color={color.ink} />
      </View>
    );
  }
  return <Redirect href={data.plan ? '/week' : '/onboarding'} />;
}
