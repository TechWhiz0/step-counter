import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getJson, setJson } from './localDb';
import { itemLabel } from './items';
import type { Surprise } from './types';

const CHANNEL = 'pet';
const NUDGE_KEY = 'nudge';
const NUDGE_HOUR = 19;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function setupNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Your pet',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function notifySurprises(petName: string, surprises: Surprise[]) {
  for (const s of surprises) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${petName} found something!`,
        body: `Golden step ${s.step.toLocaleString()}: a ${itemLabel(s.item)}. Open the app to see it.`,
        data: { kind: 'golden' },
      },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
    });
  }
}

// One 7 pm reminder per day, only while the user is under goal. Re-run after every sync.
export async function updateEveningNudge(petName: string, total: number, goal: number, today: string) {
  const saved = await getJson<{ id: string; day: string }>(NUDGE_KEY);
  const at = new Date();
  at.setHours(NUDGE_HOUR, 0, 0, 0);
  const shouldNudge = total < goal && at > new Date();

  if (saved && (saved.day !== today || !shouldNudge)) {
    await Notifications.cancelScheduledNotificationAsync(saved.id);
    await setJson(NUDGE_KEY, null);
  }
  if (!shouldNudge || saved?.day === today) return;

  const left = goal - total;
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `${petName} is getting sleepy`,
      body: `${left.toLocaleString()} steps to go today. A short walk will cheer me up!`,
      data: { kind: 'nudge' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: at,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL } : {}),
    },
  });
  await setJson(NUDGE_KEY, { id, day: today });
}
