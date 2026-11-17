import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { AdminFrame, useReviewCount } from '@/components/AdminFrame';
import { Monster } from '@/components/Monster';
import { Bone, Button, ErrorText, Loading, Meta, T, fmt, fonts, useColors } from '@/components/paper';
import { api } from '@/lib/api';
import { haptic } from '@/lib/feel';
import type { AdminUser, AdminUsersResult } from '@/lib/types';

const TIERS = ['sprout', 'bloom', 'sunflower', 'starfruit'];
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Hours {
  days: { day: string; hourly: number[]; total: number }[];
}

function shade(v: number) {
  if (v > 6000) return '#A9472A';
  if (v > 2500) return '#C98A6E';
  if (v <= 0) return '#E2DBCD';
  const l = Math.round(86 - Math.min(1, v / 1500) * 66);
  return `hsl(30, 10%, ${l}%)`;
}

// Seven rows of 24 hours: darker means more steps, terracotta means over the anomaly line.
function HourGrid({ userId }: { userId: string }) {
  const c = useColors();
  const [data, setData] = useState<Hours | null>(null);
  useEffect(() => {
    setData(null);
    api<Hours>(`/admin/users/${userId}/hours`)
      .then(setData)
      .catch(() => setData({ days: [] }));
  }, [userId]);
  if (!data)
    return (
      <View style={{ gap: 3 }}>
        {Array.from({ length: 7 }, (_, i) => (
          <Bone key={i} h={11} r={2} />
        ))}
      </View>
    );
  return (
    <View style={{ gap: 3 }} accessible accessibilityLabel="Hourly steps for the last seven days">
      {data.days.map((d) => (
        <View key={d.day} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T v="small" style={{ width: 30, fontSize: 10 }}>
            {DAY[new Date(`${d.day}T12:00:00`).getDay()]}
          </T>
          <View style={{ flex: 1, flexDirection: 'row', gap: 2 }}>
            {d.hourly.map((v, h) => (
              <View key={h} style={{ flex: 1, height: 11, borderRadius: 2, backgroundColor: shade(v) }} />
            ))}
          </View>
        </View>
      ))}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 36, marginTop: 2 }}>
        {['12a', '6a', '12p', '6p', '11p'].map((l) => (
          <T key={l} v="small" style={{ fontSize: 9.5 }}>
            {l}
          </T>
        ))}
      </View>
      {data.days.length === 0 && <T v="small" color={c.muted}>No steps in the last week.</T>}
    </View>
  );
}

export default function AdminReview() {
  const c = useColors();
  const { reload: reloadCount } = useReviewCount();
  const [queue, setQueue] = useState<AdminUser[] | null>(null);
  const [done, setDone] = useState({ cleared: 0, hidden: 0 });
  const [busy, setBusy] = useState<'clear' | 'hide' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setQueue((await api<AdminUsersResult>('/admin/users?filter=flagged')).users);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const cur = queue?.[0];
  async function act(action: 'clear' | 'hide') {
    if (!cur) return;
    setBusy(action);
    try {
      await api(`/admin/users/${cur.id}/review`, { body: { action } });
      haptic.success();
      setDone((d) => ({ cleared: d.cleared + (action === 'clear' ? 1 : 0), hidden: d.hidden + (action === 'hide' ? 1 : 0) }));
      setQueue((q) => (q ? q.slice(1) : q));
      reloadCount();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminFrame title="Review">
      <T v="small" style={{ marginHorizontal: 28, marginTop: 8 }}>
        An hour over 6 000 steps flags a walker. Growth and leagues already ignore anything past 2 500 an hour.
      </T>
      <ErrorText message={error} style={{ marginHorizontal: 28, marginTop: 8 }} />
      {!queue ? (
        <Loading />
      ) : !cur ? (
        <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 40, gap: 10 }}>
          <Monster species="nubs" mood="asleep" size={140} />
          <T v="title">All caught up.</T>
          <T style={{ textAlign: 'center', color: c.inkSoft }}>
            {done.cleared + done.hidden ? `${done.cleared} cleared, ${done.hidden} hidden from leagues.\n` : ''}New flags show up here as walkers sync.
          </T>
        </View>
      ) : (
        <View style={{ marginHorizontal: 28, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.ink, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {cur.pet ? <Monster species={cur.pet.species} stage={cur.pet.stage} size={56} /> : null}
            <View style={{ flex: 1 }}>
              <T style={{ fontFamily: fonts.bodyBold, fontSize: 16 }}>@{cur.username}</T>
              <T v="small">{cur.email}</T>
            </View>
            <View style={{ borderWidth: 1.5, borderColor: c.accent, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, transform: [{ rotate: '-4deg' }] }}>
              <Meta color={c.accent}>Flagged</Meta>
            </View>
          </View>
          <T style={{ fontSize: 14.5 }}>{cur.flagReason ?? 'Unusual hourly steps.'}</T>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Meta>Last 7 days, by hour</Meta>
              <T v="small">darker = more</T>
            </View>
            <HourGrid userId={cur.id} />
          </View>
          <View style={{ flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.rule }}>
            {[
              ['This week', fmt(cur.steps7d)],
              ['League', TIERS[cur.league] ?? 'sprout'],
              ['Walked', fmt(cur.lifetimeSteps)],
            ].map(([l, v]) => (
              <View key={l} style={{ flex: 1, paddingVertical: 10 }}>
                <Meta>{l}</Meta>
                <T style={{ fontFamily: fonts.bodyBold, marginTop: 3 }}>{v}</T>
              </View>
            ))}
          </View>
          <T v="small">
            {queue.length > 1 ? `${queue.length - 1} more waiting after this one.` : 'Last one in the queue.'}
          </T>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button kind="outline" label="Looks fine" onPress={() => act('clear')} busy={busy === 'clear'} disabled={!!busy} style={{ flex: 1 }} />
            <Button label="Hide from leagues" onPress={() => act('hide')} busy={busy === 'hide'} disabled={!!busy} style={{ flex: 1 }} />
          </View>
        </View>
      )}
    </AdminFrame>
  );
}
