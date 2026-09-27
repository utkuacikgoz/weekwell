import { RETAILER_LABEL } from '@weekwell/domain';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../components/Button';
import { Screen } from '../components/Layout';
import { NavBar } from '../components/NavBar';
import { NearbyStore } from '../components/NearbyStore';
import { ChoiceGroup } from '../components/Segmented';
import { Text } from '../components/Text';
import { REMINDER_HOURS, WEEKDAYS, allowReminders } from '../services/reminders';
import { reminderText, useStore } from '../state/store';
import { color, space } from '../theme/tokens';

/** Shopping day (D-047): pick a day and time; Weekwell sends this week's list, total and nearest store then. */
export default function ShoppingDay() {
  const { data, groceryItems, priceCheck, setShopping } = useStore();
  const saved = data.shopping;
  const [day, setDay] = useState<number>(saved.day ?? 0);
  const [hour, setHour] = useState<number>(saved.hour);
  const [note, setNote] = useState<string | null>(null);
  const retailer = data.plan?.preferences.retailer ?? data.draft.retailer;
  const total = priceCheck.status === 'done' && priceCheck.prices.total.status === 'available' ? priceCheck.prices.total.totalCents : null;
  const preview = reminderText(retailer ? RETAILER_LABEL[retailer] : 'grocery', groceryItems.filter((i) => !i.staple).length, total, saved.store);
  const time = REMINDER_HOURS.find((h) => h.hour === hour)?.time ?? '';
  const dayName = WEEKDAYS[day] ?? 'Sunday';
  const on = saved.remind && saved.day === day && saved.hour === hour;

  const save = async () => {
    if (!(await allowReminders())) {
      setNote('Notifications are off for Weekwell. Turn them on in Settings → Weekwell → Notifications, then try again.');
      return;
    }
    setNote(null);
    setShopping({ day, hour, remind: true });
    router.back();
  };

  return (
    <Screen
      footer={
        <>
          <Button label={on ? `Reminder on · ${dayName}s, ${time}` : `Remind me ${dayName}s at ${time}`} onPress={() => void save()} disabled={on} testID="shopping-save" />
          {saved.remind ? <Button kind="secondary" label="Turn off reminder" onPress={() => setShopping({ remind: false })} testID="shopping-off" /> : null}
        </>
      }
    >
      <NavBar backLabel="Back" />
      <Text variant="title" accessibilityRole="header">When do you shop?</Text>
      <Text tone="muted" style={{ marginTop: space.s, marginBottom: space.l }}>
        We’ll nudge you that day with your list, what it should cost, and the way to your store.
      </Text>

      <ChoiceGroup label="Day" columns={4} value={day} onChange={setDay} options={WEEKDAYS.map((d, i) => ({ value: i, label: d.slice(0, 3), testID: `shopping-day-${i}` }))} />
      <ChoiceGroup label="Time" columns={3} value={hour} onChange={setHour} options={REMINDER_HOURS.map((h) => ({ value: h.hour, label: h.label, detail: h.time, testID: `shopping-hour-${h.hour}` }))} />

      <Text variant="label" style={{ marginBottom: space.s }}>Your store</Text>
      <NearbyStore retailer={retailer} />

      <Text variant="label" style={{ marginTop: space.l, marginBottom: space.s }}>What you’ll get</Text>
      <View style={styles.notice} testID="shopping-preview" accessible accessibilityLabel={`Preview: ${preview.title}. ${preview.body}`}>
        <View style={styles.noticeHead}>
          <View style={styles.appIcon}>
            <Text variant="label" style={{ color: '#FFFFFF' }}>W</Text>
          </View>
          <Text variant="caption" tone="muted" style={{ flex: 1 }}>WEEKWELL</Text>
          <Text variant="caption" tone="muted">{`${dayName.slice(0, 3)} ${time}`}</Text>
        </View>
        <Text variant="bodyStrong">{preview.title}</Text>
        <Text>{preview.body}</Text>
      </View>
      {note ? (
        <Text variant="meta" tone="warning" style={{ marginTop: space.m }} accessibilityLiveRegion="polite" testID="shopping-note">
          {note}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { backgroundColor: color.raised, padding: space.m - 4, gap: 2, borderRadius: 14 },
  noticeHead: { flexDirection: 'row', alignItems: 'center', gap: space.s, marginBottom: space.xs },
  appIcon: { width: 20, height: 20, borderRadius: 5, backgroundColor: '#1F5C40', alignItems: 'center', justifyContent: 'center' },
});
