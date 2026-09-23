import { router } from 'expo-router';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { Text } from './Text';

/** Shown when a plan-changing action needs a subscription (read-only after the free week). */
export function LockedSheet({ visible, onClose, action }: { visible: boolean; onClose: () => void; action: string }) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Your free week has ended"
      testID="locked-sheet"
      footer={
        <>
          <Button
            label="See plans"
            onPress={() => {
              onClose();
              router.push('/trial?trigger=plan_header');
            }}
            testID="locked-see-plans"
          />
          <Button label="Not now" kind="secondary" onPress={onClose} />
        </>
      }
    >
      <Text>Your current plan and grocery list are still here to cook and shop from.</Text>
      <Text tone="muted">{`To ${action}, start a subscription.`}</Text>
    </Sheet>
  );
}
