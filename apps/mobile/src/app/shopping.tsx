import { RETAILER_LABEL } from '@weekwell/domain';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../components/Button';
import { Screen } from '../components/Layout';
import { NavBar } from '../components/NavBar';
import { NearbyStore } from '../components/NearbyStore';
import { DayStrip, TimeBar } from '../components/ShoppingPickers';
import { Text } from '../components/Text';
import { REMINDER_HOURS, WEEKDAYS, allowReminders } from '../services/reminders';
import { dinnerAfter, reminderText, useStore } from '../state/store';
import { space } from '../theme/tokens';

/** The reminder as it lands on the lock screen (D-047 SD2). Fixed colours: it depicts iOS, not the app. */
export function LockPreview({ day, hour, title, body }: { day: number; hour: number; title: string; body: string }) {
  const clock = `${hour > 12 ? hour - 12 : hour}:00`;
  return (
    <View style={styles.lock} testID="shopping-preview" accessible accessibilityLabel={`Preview of your reminder on ${WEEKDAYS[day] ?? ''} at ${REMINDER_HOURS.find((h) => h.hour === hour)?.time ?? ''}: ${title}. ${body}`}>
      <Text variant="bodyStrong" style={styles.lockDate}>{WEEKDAYS[day] ?? ''}</Text>
      <Text style={styles.clock}>{clock}</Text>
      <View style={styles.notice}>
        <View style={styles.noticeHead}>
          <View style={styles.appIcon}>
            <Text variant="caption" style={{ color: '#FFFFFF' }}>W</Text>
          </View>
          <Text variant="caption" style={[styles.noticeMeta, { flex: 1 }]}>WEEKWELL</Text>
          <Text variant="caption" style={styles.noticeMeta}>now</Text>
        </View>
        <Text variant="bodyStrong" style={styles.noticeText}>{title}</Text>
        <Text style={styles.noticeText}>{body}</Text>
      </View>
    </View>
  );
}

export default function ShoppingDay() {
  const { data, groceryItems, priceCheck, setShopping } = useStore();
  const saved = data.shopping;
  const [day, setDay] = useState<number>(saved.day ?? 0);
  const [hour, setHour] = useState<number>(saved.hour);
  const [note, setNote] = useState<string | null>(null);
  const retailer = data.plan?.preferences.retailer ?? data.draft.retailer;
  const total = priceCheck.status === 'done' && priceCheck.prices.total.status === 'available' ? priceCheck.prices.total.totalCents : null;
  const preview = reminderText(retailer ? RETAILER_LABEL[retailer] : 'your store', groceryItems.filter((i) => !i.staple).length, total, saved.store, dinnerAfter(data.plan, day));
  const dayName = WEEKDAYS[day] ?? 'Sunday';
  const time = REMINDER_HOURS.find((h) => h.hour === hour)?.time ?? '';
  const on = saved.remind && saved.day === day && saved.hour === hour;

  const save = async () => {
    if (!(await allowReminders())) {
      setNote('Notifications are off for Weekwell. Turn them on in Settings → Weekwell → Notifications, then try again.');
      return;
    }
    setNote(null);
    setShopping({ day, hour, remind: true, prompted: true });
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
      <Text variant="title" accessibilityRole="header" style={{ marginBottom: space.m }}>When do you shop?</Text>
      <LockPreview day={day} hour={hour} title={preview.title} body={preview.body} />
      <View style={{ gap: space.m, marginTop: space.l }}>
        <DayStrip value={day} onChange={setDay} />
        <TimeBar value={hour} onChange={setHour} showTimes />
      </View>
      <Text variant="label" style={{ marginTop: space.l, marginBottom: space.s }}>Your store</Text>
      <NearbyStore retailer={retailer} />
      {note ? (
        <Text variant="meta" tone="warning" style={{ marginTop: space.m }} accessibilityLiveRegion="polite" testID="shopping-note">
          {note}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  // A dusk-blue lock screen, like iOS's default wallpaper.
  lock: { backgroundColor: '#22405F', paddingHorizontal: space.m, paddingTop: space.m, paddingBottom: space.m + 4, borderRadius: 18, gap: space.s },
  lockDate: { color: '#FFFFFF', textAlign: 'center', opacity: 0.9 },
  clock: { color: '#FFFFFF', textAlign: 'center', fontSize: 64, lineHeight: 70, fontWeight: '300', letterSpacing: -1 },
  notice: { backgroundColor: 'rgba(245,245,245,0.94)', borderRadius: 16, padding: space.m - 4, gap: 2 },
  noticeHead: { flexDirection: 'row', alignItems: 'center', gap: space.s, marginBottom: 2 },
  noticeMeta: { color: '#555555' },
  noticeText: { color: '#111111' },
  appIcon: { width: 20, height: 20, borderRadius: 5, backgroundColor: '#1F5C40', alignItems: 'center', justifyContent: 'center' },
});
