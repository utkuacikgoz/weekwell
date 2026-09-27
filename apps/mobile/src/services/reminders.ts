/**
 * Shopping-day reminder (D-047): one weekly local notification, scheduled on
 * the phone. No push, no server. The text carries this week's list size,
 * estimated total and nearest store, and is rescheduled whenever those change.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const ID = 'weekwell-shopping-day';

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const REMINDER_HOURS = [
  { hour: 9, label: 'Morning', time: '9 AM' },
  { hour: 12, label: 'Midday', time: '12 PM' },
  { hour: 17, label: 'Evening', time: '5 PM' },
] as const;

const native = Platform.OS !== 'web';

/** Show the reminder even while the app is open. */
export function configureReminderDisplay() {
  if (!native) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

/** Asks once; true when reminders can show. The web preview always says yes (nothing is scheduled there). */
export async function allowReminders(): Promise<boolean> {
  if (!native) return true;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } })).granted;
  } catch {
    return false;
  }
}

/** Replaces the weekly reminder. `day` is 0 = Sunday … 6 = Saturday. */
export async function scheduleShoppingReminder(day: number, hour: number, title: string, body: string): Promise<void> {
  if (!native) return;
  await Notifications.cancelScheduledNotificationAsync(ID).catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    identifier: ID,
    content: { title, body, data: { url: '/grocery' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: day + 1, hour, minute: 0 },
  });
}

export async function cancelShoppingReminder(): Promise<void> {
  if (!native) return;
  await Notifications.cancelScheduledNotificationAsync(ID).catch(() => undefined);
}

/** Taps on the reminder open the grocery list. Returns an unsubscribe function. */
export function onReminderTap(open: (url: string) => void): () => void {
  if (!native) return () => undefined;
  const handle = (r: Notifications.NotificationResponse | null) => {
    const url = r?.notification.request.content.data?.url;
    if (typeof url === 'string') open(url);
  };
  // A tap that launched the app arrives before this listener exists.
  handle(Notifications.getLastNotificationResponse());
  Notifications.clearLastNotificationResponse();
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
