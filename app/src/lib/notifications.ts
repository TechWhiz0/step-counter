import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import { api, tokenStore } from './api';
import { dayKey } from './dates';
import { itemLabel } from './items';
import { getJson, setJson } from './localDb';
import { energyLevel } from './petState';
import type { LeagueBoard, MonstersResult, QuestsResult, TodayState, User } from './types';

// Local notifications: the phone schedules and shows them itself, no push server needed.
// Everything is worked out after each sync (the app syncs on open and every ~30 min in the background).
//
//   Reminders (scheduled ahead, replaced on every sync): morning hello, evening steps, streak at risk,
//   low energy, league last day.
//   Alerts (shown once when something happens): goal reached, quest ready, hatched/evolved,
//   new unlock. Alerts are skipped while the app is open: you can already see it.
// Nothing is scheduled without a signed-in token, so a sync finishing after sign-out stays silent.

const CHANNEL = 'pet';

export type NotifKind = 'morning' | 'evening' | 'streak' | 'energy' | 'league' | 'goal' | 'quest' | 'growth' | 'unlock';

export const NOTIF_KINDS: { kind: NotifKind; label: string; detail: string }[] = [
  { kind: 'morning', label: 'Good morning', detail: '8 am hello from your pet' },
  { kind: 'evening', label: 'Evening reminder', detail: '7 pm if you are under goal' },
  { kind: 'streak', label: 'Streak at risk', detail: '9 pm before a streak breaks' },
  { kind: 'energy', label: 'Low energy', detail: 'When your pet gets tired or weak' },
  { kind: 'goal', label: 'Goal reached', detail: 'When you hit today’s goal' },
  { kind: 'quest', label: 'Quest ready', detail: 'A finished quest to claim' },
  { kind: 'growth', label: 'Hatched or evolved', detail: 'Big moments for your pet' },
  { kind: 'unlock', label: 'New unlocks', detail: 'Closet items and rare monsters' },
  { kind: 'league', label: 'League last day', detail: 'Sunday, your rank and zone' },
];

const PREFS_KEY = 'notifPrefs';
type Prefs = Record<NotifKind, boolean>;
const DEFAULT_PREFS = Object.fromEntries(NOTIF_KINDS.map((k) => [k.kind, true])) as Prefs;

export async function getNotifPrefs(): Promise<Prefs> {
  return { ...DEFAULT_PREFS, ...((await getJson<Partial<Prefs>>(PREFS_KEY)) ?? {}) };
}

export async function setNotifPref(kind: NotifKind, on: boolean) {
  const prefs = { ...(await getNotifPrefs()), [kind]: on };
  await setJson(PREFS_KEY, prefs);
  // Turning a reminder off cancels what is already scheduled for it.
  if (!on) await cancelReminder(kind);
  return prefs;
}

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

// Asks once if the person hasn't been asked yet (older accounts skipped it during onboarding).
export async function ensureNotificationPermission() {
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return setupNotifications();
  if (status === 'undetermined' && canAskAgain) return setupNotifications();
  return false;
}

// ---- helpers ----

const trigger = (date: Date): Notifications.NotificationTriggerInput => ({
  type: Notifications.SchedulableTriggerInputTypes.DATE,
  date,
  ...(Platform.OS === 'android' ? { channelId: CHANNEL } : {}),
});

const at = (base: Date, hour: number, minute = 0) => {
  const d = new Date(base);
  d.setHours(hour, minute, 0, 0);
  return d;
};

// One pending notification per reminder kind. Re-running with the same content keeps it; anything else replaces it.
async function setReminder(kind: NotifKind, when: Date | null, title: string, body: string, url: string) {
  if (!(await tokenStore.get())) return;
  const key = `reminder.${kind}`;
  const saved = await getJson<{ id: string; when: number; body: string }>(key);
  const wanted = when && when.getTime() > Date.now() ? when : null;
  if (saved && wanted && saved.when === wanted.getTime() && saved.body === body) return;
  if (saved) await Notifications.cancelScheduledNotificationAsync(saved.id).catch(() => {});
  if (!wanted) return setJson(key, null);
  const id = await Notifications.scheduleNotificationAsync({ content: { title, body, data: { kind, url } }, trigger: trigger(wanted) });
  await setJson(key, { id, when: wanted.getTime(), body });
}

async function cancelReminder(kind: NotifKind) {
  const saved = await getJson<{ id: string }>(`reminder.${kind}`);
  if (saved) await Notifications.cancelScheduledNotificationAsync(saved.id).catch(() => {});
  await setJson(`reminder.${kind}`, null);
}

// Shows an alert at most once per `stamp` (e.g. once per day, once per stage).
async function alertOnce(kind: NotifKind, stamp: string, title: string, body: string, url: string) {
  if (!(await tokenStore.get())) return;
  const key = `alert.${kind}`;
  if ((await getJson<string>(key)) === stamp) return;
  await setJson(key, stamp);
  if (AppState.currentState === 'active') return; // they can already see it
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: { kind, url } },
    trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
  });
}

const steps = (n: number) => n.toLocaleString('en');

// ---- the one entry point, called after every sync ----

export async function refreshNotifications(result: TodayState) {
  const user = await getJson<User>('user');
  // Admin accounts don't walk in the app, so they get no walker notifications.
  if (user?.role === 'admin') return cancelAll();
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  const prefs = await getNotifPrefs();
  const pet = result.pet;
  const name = pet && pet.stage !== 'egg' ? pet.name : 'Your egg';
  const now = new Date();
  const today = result.today.day;
  const { total, goal } = result.today;
  const left = Math.max(0, goal - total);
  const streak = result.streak.current;
  const level = energyLevel(pet?.energy);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const run = (kind: NotifKind, f: () => Promise<unknown>) =>
    prefs[kind]
      ? f().catch((e) => {
          if (__DEV__) console.warn(`notification ${kind}:`, e);
        })
      : Promise.resolve();

  await Promise.all([
    // Good morning: 8 am, today if it's still early, else tomorrow.
    run('morning', () => {
      const when = now.getHours() < 8 ? at(now, 8) : at(tomorrow, 8);
      const body =
        level === 'weak' ? `${name} woke up feeling weak. A walk today will help a lot.` : `${name} is awake and ready for a walk. Let’s go!`;
      return setReminder('morning', when, 'Good morning', body, '/');
    }),
    // Evening reminder: 7 pm while under goal.
    run('evening', () =>
      setReminder(
        'evening',
        left ? at(now, 19) : null,
        `${name} is getting sleepy`,
        `${steps(left)} steps to go today. A short walk will cheer them up!`,
        '/',
      ),
    ),
    // Streak at risk: 9 pm while a streak is running and today's goal isn't met.
    run('streak', () =>
      setReminder(
        'streak',
        left && streak > 0 ? at(now, 21) : null,
        `Your ${streak}-day run ends at midnight`,
        `Walk ${steps(left)} more steps to keep it going.`,
        '/',
      ),
    ),
    // Low energy: early afternoon when the pet is tired or weak and today has barely started.
    run('energy', () => {
      const low = pet && pet.stage !== 'egg' && (level === 'weak' || level === 'tired') && total < goal / 2;
      // Fixed slots (1 pm, else 5 pm) so the time doesn't drift later with every sync.
      const when = now.getHours() < 13 ? at(now, 13) : now.getHours() < 17 ? at(now, 17) : null;
      return setReminder(
        'energy',
        low && when ? when : null,
        level === 'weak' ? `${name} needs a walk` : `${name} is getting tired`,
        level === 'weak' ? 'After the missed days they feel weak. Every walk gives energy back.' : 'A walk today will perk them right up.',
        '/',
      );
    }),
    // Goal reached.
    run('goal', () => (total >= goal ? alertOnce('goal', today, 'Goal reached', `${steps(total)} steps today. ${name} is bouncing with joy!`, '/') : Promise.resolve())),
    // Hatched or evolved: pet.seenStage lags until the app shows the reveal.
    run('growth', () => {
      if (!pet || pet.stage === pet.seenStage) return Promise.resolve();
      const title = pet.stage === 'baby' ? 'Your egg hatched' : pet.stage === 'adult' ? `${pet.name} grew up` : `${pet.name} grew up a bit!`;
      return alertOnce('growth', `${pet.id}:${pet.stage}`, title, 'Open Step Pet to see who they’ve become.', '/');
    }),
    // New closet items from lifetime milestones.
    run('unlock', async () => {
      for (const item of result.unlockedItems ?? []) {
        await alertOnce('unlock', `item:${item}`, 'New in the closet', `You unlocked the ${itemLabel(item)}. Put it on in the Closet.`, '/closet');
      }
      await checkMonsterUnlocks(result.lifetimeSteps);
    }),
    // Quests finished but not yet claimed.
    run('quest', async () => {
      const { quests } = await api<QuestsResult>('/quests');
      const ready = quests.filter((q) => q.done && !q.claimed).map((q) => q.id);
      if (ready.length) await alertOnce('quest', `${today}:${ready.join(',')}`, 'Quest done', `Claim it on Today.`, '/');
    }),
    // League last day: Sunday 6 pm, with where you stand.
    run('league', () => (now.getDay() === 0 ? leagueReminder(now) : setReminder('league', null, '', '', '/leagues'))),
  ]);
}

// Rare monsters unlock at lifetime step totals; compares with the last total seen.
async function checkMonsterUnlocks(lifetime: number | undefined) {
  if (lifetime === undefined) return;
  const last = await getJson<number>('notif.lifetime');
  await setJson('notif.lifetime', lifetime);
  if (last === null || lifetime <= last) return;
  let catalog = await getJson<{ day: string; list: { name: string; steps: number }[] }>('notif.monsters');
  if (!catalog || catalog.day !== dayKey(new Date())) {
    const { monsters } = await api<MonstersResult>('/monsters');
    const list = monsters.flatMap((m) => (m.enabled && m.unlock.kind === 'steps' ? [{ name: m.name, steps: m.unlock.steps }] : []));
    catalog = { day: dayKey(new Date()), list };
    await setJson('notif.monsters', catalog);
  }
  for (const m of catalog.list) {
    if (last < m.steps && lifetime >= m.steps) {
      await alertOnce('unlock', `monster:${m.name}`, `${m.name} can hatch now`, `${m.name} can now hatch from your next egg.`, '/guide');
    }
  }
}

async function leagueReminder(now: Date) {
  const board = await api<LeagueBoard>('/leagues');
  const tier = board.tierName.charAt(0).toUpperCase() + board.tierName.slice(1);
  const rank = board.myRank;
  let body = `Last day in the ${tier} league. Every step counts!`;
  if (rank && board.promoteTop && rank <= board.promoteTop) body = `You're #${rank} in ${tier}, in the promotion zone. Hold on today!`;
  else if (rank && board.dropFrom && rank >= board.dropFrom) body = `You're #${rank} in ${tier}, in the drop zone. A walk today could save you.`;
  else if (rank && board.promoteTop) body = `You're #${rank} in ${tier}. Top ${board.promoteTop} move up tonight!`;
  return setReminder('league', at(now, 18), 'League ends tonight', body, '/leagues');
}

// Logging out or switching to an admin account clears every scheduled reminder.
export async function cancelAll() {
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
  for (const k of NOTIF_KINDS) await setJson(`reminder.${k.kind}`, null);
}

// Tapping a notification opens the screen it is about.
export function notificationUrl(response: Notifications.NotificationResponse): string | null {
  const url = response.notification.request.content.data?.url;
  return typeof url === 'string' ? url : null;
}
