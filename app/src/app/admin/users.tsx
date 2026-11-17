import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { AdminFrame, useReviewCount } from '@/components/AdminFrame';
import { Monster } from '@/components/Monster';
import { Button, Choice, ErrorText, Icon, Loading, T, fmt, fonts, useColors } from '@/components/paper';
import { api } from '@/lib/api';
import { haptic } from '@/lib/feel';
import type { AdminUser, AdminUsersResult } from '@/lib/types';

type Filter = 'all' | 'flagged' | 'hidden';
const TIERS = ['sprout', 'bloom', 'sunflower', 'starfruit'];

function UserRow({ u, onUnhide }: { u: AdminUser; onUnhide: (u: AdminUser) => void }) {
  const c = useColors();
  const tag = u.flagged ? 'flagged' : u.hiddenFromLeagues ? 'hidden' : '';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, borderBottomWidth: 1, borderBottomColor: c.rule }} accessible accessibilityLabel={`@${u.username}, ${u.email}, ${fmt(u.steps7d)} steps this week${tag ? `, ${tag}` : ''}`}>
      {u.pet ? <Monster species={u.pet.species} stage={u.pet.stage} size={38} /> : <View style={{ width: 38 }} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <T style={{ fontFamily: fonts.bodyBold }} numberOfLines={1}>
          @{u.username}
          {tag ? <T v="small" color={u.flagged ? c.accent : c.muted}>{`  ${tag}`}</T> : null}
        </T>
        <T v="small" numberOfLines={1}>
          {u.email}
        </T>
        {u.hiddenFromLeagues && (
          <Pressable accessibilityRole="button" onPress={() => onUnhide(u)} hitSlop={8} style={{ minHeight: 28, justifyContent: 'center' }}>
            <T v="small" style={{ textDecorationLine: 'underline' }}>
              Show in leagues again
            </T>
          </Pressable>
        )}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <T>{fmt(u.steps7d)}</T>
        <T v="small">
          {TIERS[u.league] ?? 'sprout'} · {u.currentStreak}d
        </T>
      </View>
    </View>
  );
}

export default function AdminUsers() {
  const c = useColors();
  const { reload: reloadCount } = useReviewCount();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [data, setData] = useState<AdminUsersResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const seq = useRef(0);

  const load = useCallback(async (f: Filter, q: string) => {
    const mine = ++seq.current;
    try {
      const r = await api<AdminUsersResult>(`/admin/users?filter=${f}&q=${encodeURIComponent(q)}&page=1`);
      if (mine === seq.current) {
        setData(r);
        setError(null);
      }
    } catch (e) {
      if (mine === seq.current) setError((e as Error).message);
    }
  }, []);

  // Search waits for a pause in typing.
  useEffect(() => {
    const t = setTimeout(() => void load(filter, query.trim()), 300);
    return () => clearTimeout(t);
  }, [filter, query, load]);
  useFocusEffect(
    useCallback(() => {
      void load(filter, query.trim());
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  async function loadMore() {
    if (!data || data.page >= data.pages) return;
    setMore(true);
    try {
      const next = await api<AdminUsersResult>(`/admin/users?filter=${filter}&q=${encodeURIComponent(query.trim())}&page=${data.page + 1}`);
      setData({ ...next, users: [...data.users, ...next.users] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setMore(false);
    }
  }

  async function unhide(u: AdminUser) {
    try {
      const r = await api<{ hiddenFromLeagues: boolean }>(`/admin/users/${u.id}/review`, { body: { action: 'unhide' } });
      haptic.success();
      setData((d) => (d ? { ...d, users: d.users.map((x) => (x.id === u.id ? { ...x, hiddenFromLeagues: r.hiddenFromLeagues } : x)) } : d));
      reloadCount();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <AdminFrame title="Walkers">
      <View style={{ marginHorizontal: 28, marginTop: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1.5, borderBottomColor: c.ruleStrong, minHeight: 44 }}>
          <Icon name="search" size={16} color={c.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="username or email"
            placeholderTextColor={c.faint}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search walkers"
            style={{ flex: 1, fontFamily: fonts.body, fontSize: 14, color: c.ink, paddingVertical: 8 }}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {(['all', 'flagged', 'hidden'] as Filter[]).map((f) => (
            <Choice key={f} on={filter === f} onPress={() => setFilter(f)} label={`Show ${f}`} style={{ paddingHorizontal: 14, justifyContent: 'center', borderRadius: 22 }}>
              <T style={{ fontFamily: filter === f ? fonts.bodyBold : fonts.body }}>{f}</T>
            </Choice>
          ))}
        </View>
      </View>
      <ErrorText message={error} style={{ marginHorizontal: 28, marginTop: 8 }} />
      {!data ? (
        <Loading />
      ) : (
        <View style={{ marginHorizontal: 28, marginTop: 10, borderTopWidth: 1, borderTopColor: c.ink }}>
          {data.users.map((u) => (
            <UserRow key={u.id} u={u} onUnhide={unhide} />
          ))}
          {data.users.length === 0 && <T style={{ paddingVertical: 18 }}>No walkers match.</T>}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <T v="small">7-day steps, capped</T>
            <T v="small">
              {fmt(data.total)} walker{data.total === 1 ? '' : 's'}
            </T>
          </View>
          {data.page < data.pages && <Button kind="outline" label="Show more" onPress={loadMore} busy={more} style={{ marginTop: 12 }} />}
        </View>
      )}
    </AdminFrame>
  );
}
