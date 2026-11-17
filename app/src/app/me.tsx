import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Monster } from '@/components/Monster';
import { Button, ErrorText, Grain, Icon, InkSwitch, Meta, PaperScreen, Rule, T, fmt, fonts, useColors } from '@/components/paper';
import { api } from '@/lib/api';
import { haptic } from '@/lib/feel';
import { openHealthSettings } from '@/lib/health';
import { ensureNotificationPermission, getNotifPrefs, NOTIF_KINDS, setNotifPref, type NotifKind } from '@/lib/notifications';
import { useSession } from '@/lib/session';
import { useSoundsEnabled } from '@/lib/sound';
import { syncSteps } from '@/lib/sync';
import type { Pet, User } from '@/lib/types';

const GOAL_STEP = 500;
const GOAL_MIN = 1000;
const GOAL_MAX = 50000;
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function Row({ label, value, onPress, children }: { label: string; value?: string; onPress?: () => void; children?: ReactNode }) {
  const c = useColors();
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, borderBottomWidth: 1, borderBottomColor: c.rule, gap: 10 }}>
      <T style={{ flex: 1 }}>{label}</T>
      {value ? <T color={c.inkSoft}>{value}</T> : null}
      {children}
      {onPress ? <Icon name="chevron" size={14} color={c.muted} /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      onPress={() => {
        haptic.select();
        onPress();
      }}
    >
      {body}
    </Pressable>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const c = useColors();
  const btn = (label: string, delta: number, icon: 'minus' | 'plus') => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        const next = Math.min(GOAL_MAX, Math.max(GOAL_MIN, value + delta));
        if (next === value) return haptic.warn();
        haptic.select();
        onChange(next);
      }}
      style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: c.ink, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name={icon} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {btn('500 fewer steps', -GOAL_STEP, 'minus')}
      <T v="num" style={{ minWidth: 86, textAlign: 'center', fontSize: 18 }} accessibilityLiveRegion="polite">
        {fmt(value)}
      </T>
      {btn('500 more steps', GOAL_STEP, 'plus')}
    </View>
  );
}

function SignOutSheet({ pet, onClose, onSignOut }: { pet: Pet | null; onClose: () => void; onSignOut: () => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: c.scrim }} onPress={onClose} accessibilityLabel="Close" />
      <View
        accessibilityViewIsModal
        style={{ backgroundColor: c.paperRaised, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 28, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16) + 20, overflow: 'hidden' }}
      >
        <Grain />
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.rule, alignSelf: 'center' }} />
        <View style={{ alignItems: 'center', marginTop: 16 }}>
          <Monster species={pet?.species} stage={pet?.stage ?? 'adult'} mood="asleep" size={96} />
        </View>
        <T v="title" style={{ textAlign: 'center', marginTop: 12 }}>
          Sign out?
        </T>
        <T style={{ textAlign: 'center', marginTop: 8, color: c.inkSoft }}>
          {pet ? `${pet.name} will wait here.` : 'Your pet will wait here.'} Step counting stops on this phone, and your steps, run and closet are saved for when you sign in again.
        </T>
        <View style={{ marginTop: 20, gap: 4 }}>
          <Button label="Sign out" onPress={onSignOut} />
          <Button kind="link" label="Stay signed in" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

export default function Me() {
  const c = useColors();
  const { user, setUser, signOut } = useSession();
  const [sounds, setSounds] = useSoundsEnabled();
  const [notifs, setNotifs] = useState<Record<NotifKind, boolean> | null>(null);
  const [goal, setGoal] = useState(user?.dailyGoal ?? 6000);
  const [pets, setPets] = useState<Pet[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [showReminders, setShowReminders] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void getNotifPrefs().then(setNotifs);
      void Promise.allSettled([api<{ pets: Pet[] }>('/pet/collection'), api<{ user: User }>('/auth/me')]).then(([col, me]) => {
        if (col.status === 'fulfilled') setPets(col.value.pets);
        if (me.status === 'fulfilled') {
          setUser(me.value.user);
          setGoal(me.value.user.dailyGoal);
        }
      });
    }, [setUser]),
  );

  async function saveGoal() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ user: User }>('/auth/me', { method: 'PATCH', body: { dailyGoal: goal } });
      setUser(r.user);
      haptic.success();
      void syncSteps().catch(() => null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleNotif(kind: NotifKind, on: boolean) {
    setNotifs((p) => (p ? { ...p, [kind]: on } : p));
    if (on) await ensureNotificationPermission().catch(() => false);
    setNotifs(await setNotifPref(kind, on));
    if (on) void syncSteps().catch(() => null);
  }

  const active = pets.find((p) => p.isActive) ?? null;
  const raised = pets.filter((p) => p.stage !== 'egg');
  const since = user?.createdAt ? new Date(user.createdAt) : null;
  const notifsOn = notifs ? NOTIF_KINDS.filter((k) => notifs[k.kind]).length : 0;

  return (
    <PaperScreen title="Me" back>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 28, paddingTop: 8 }}>
        <Monster species={active?.species} stage={active?.stage ?? 'adult'} form={active?.form} equipped={active?.equipped} size={88} />
        <View style={{ flex: 1 }}>
          <T v="title" numberOfLines={1}>
            @{user?.username ?? user?.nickname}
          </T>
          {since ? <T v="small">Walking since {MONTH[since.getMonth()]} {since.getFullYear()}</T> : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', marginHorizontal: 28, marginTop: 22, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.rule }}>
        {[
          ['Run', `${user?.currentStreak ?? 0} days`],
          ['Best', `${user?.bestStreak ?? 0} days`],
          ['Walked', fmt(user?.lifetimeSteps ?? 0)],
        ].map(([label, value]) => (
          <View key={label} style={{ flex: 1, paddingVertical: 12 }} accessible accessibilityLabel={`${label} ${value}`}>
            <Meta>{label}</Meta>
            <T v="num" style={{ fontSize: 17, marginTop: 4 }}>
              {value}
            </T>
          </View>
        ))}
      </View>

      <View style={{ marginHorizontal: 28, marginTop: 10 }}>
        <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.rule, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T>Daily goal</T>
            <Stepper value={goal} onChange={setGoal} />
          </View>
          {goal !== user?.dailyGoal && <Button label="Save goal" onPress={saveGoal} busy={busy} />}
          <ErrorText message={error} />
        </View>
        <Row label="Reminders" value={notifs ? `${notifsOn} on` : ''} onPress={() => setShowReminders((v) => !v)} />
        {showReminders && notifs && (
          <View style={{ paddingVertical: 6, paddingLeft: 12 }}>
            {NOTIF_KINDS.map((k) => (
              <View key={k.kind} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <T>{k.label}</T>
                  <T v="small">{k.detail}</T>
                </View>
                <InkSwitch value={notifs[k.kind]} onChange={(v) => void toggleNotif(k.kind, v)} label={k.label} />
              </View>
            ))}
          </View>
        )}
        <Row label="Sounds">
          <InkSwitch value={sounds} onChange={setSounds} label="Sounds" />
        </Row>
        <Row label="Step access" value="open settings" onPress={openHealthSettings} />
        <Row label="Username" value={`@${user?.username ?? ''}`} />
        <Row label="Email" value={user?.email} />
      </View>

      {raised.length > 0 && (
        <View style={{ marginTop: 26 }}>
          <Meta style={{ marginHorizontal: 28 }}>Pets you raised</Meta>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, gap: 6, paddingTop: 10 }}>
            {raised.map((p) => (
              <View key={p.id} style={{ alignItems: 'center', width: 86 }} accessible accessibilityLabel={`${p.name}, ${p.stage}`}>
                <Monster species={p.species} stage={p.stage} form={p.form} size={68} />
                <T v="small" numberOfLines={1} style={{ fontFamily: p.isActive ? fonts.bodyBold : fonts.body }}>
                  {p.name}
                </T>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={{ marginHorizontal: 28, marginTop: 24, gap: 2, alignItems: 'flex-start' }}>
        <Rule style={{ alignSelf: 'stretch', marginBottom: 8 }} />
        <Button kind="link" label="Sign out" onPress={() => setSheet(true)} style={{ paddingHorizontal: 0 }} />
      </View>

      {sheet && (
        <SignOutSheet
          pet={active}
          onClose={() => setSheet(false)}
          onSignOut={async () => {
            setSheet(false);
            await signOut();
            router.replace('/welcome');
          }}
        />
      )}
    </PaperScreen>
  );
}
