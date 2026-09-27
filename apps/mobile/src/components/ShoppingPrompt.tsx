import { useState } from 'react';
import { View } from 'react-native';
import { WEEKDAYS, allowReminders } from '../services/reminders';
import { useStore } from '../state/store';
import { space } from '../theme/tokens';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { DayStrip, TimeBar } from './ShoppingPickers';
import { Text } from './Text';

/**
 * Asked once, right after the first plan (D-047 NU3): the moment a shopping
 * day matters. Afterwards it lives in Settings and on the grocery list.
 */
export function ShoppingPrompt() {
  const { data, setShopping } = useStore();
  const [day, setDay] = useState(6);
  const [hour, setHour] = useState(9);
  const [note, setNote] = useState<string | null>(null);
  const visible = !!data.plan && !data.shopping.prompted && !data.shopping.remind;
  const later = () => setShopping({ prompted: true });

  const remind = async () => {
    if (!(await allowReminders())) {
      setNote('Notifications are off for Weekwell. You can turn them on in Settings → Weekwell → Notifications.');
      return;
    }
    setShopping({ day, hour, remind: true, prompted: true });
  };

  return (
    <Sheet
      visible={visible}
      title="Your week is ready. When do you shop?"
      onClose={later}
      testID="shopping-sheet"
      footer={
        <>
          <Button label={`Remind me ${WEEKDAYS[day] ?? 'Saturday'}s`} onPress={() => void remind()} testID="shopping-sheet-save" />
          <View style={{ alignItems: 'center' }}>
            <Button kind="quiet" label="Not now" onPress={later} testID="shopping-later" />
          </View>
        </>
      }
    >
      <Text tone="muted">That day you’ll get your list, what it should cost, and the way to your store.</Text>
      <View style={{ gap: space.m }}>
        <DayStrip value={day} onChange={setDay} />
        <TimeBar value={hour} onChange={setHour} />
      </View>
      {note ? (
        <Text variant="meta" tone="warning" accessibilityLiveRegion="polite">
          {note}
        </Text>
      ) : null}
    </Sheet>
  );
}
