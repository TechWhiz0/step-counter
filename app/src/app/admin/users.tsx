import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AdminPage, FilterPill, ListCard, ListRow, PageTitle } from '@/components/admin/AdminChrome';
import { Avatar, ReviewCard, tierLabel } from '@/components/admin/ReviewCard';
import { Icon } from '@/components/icons';
import { Card, compact, ErrorText, fonts, SmallButton, useColors } from '@/components/ui';
import { api } from '@/lib/api';
import type { AdminUser, AdminUsersResult } from '@/lib/types';

type Filter = 'all' | 'flagged' | 'hidden';

export default function AdminUsersScreen() {
  const c = useColors();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState<Filter>(params.filter === 'flagged' || params.filter === 'hidden' ? params.filter : 'all');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminUsersResult | null>(null);
  const [flaggedCount, setFlaggedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Debounce typing into the search box.
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const refreshCount = useCallback(() => {
    api<AdminUsersResult>('/admin/users?filter=flagged')
      .then((r) => setFlaggedCount(r.total))
      .catch(() => {});
  }, []);
  useEffect(refreshCount, [refreshCount]);

  useEffect(() => {
    let live = true;
    setError(null);
    setData(null);
    setPage(1);
    api<AdminUsersResult>(`/admin/users?filter=${filter}&q=${encodeURIComponent(query)}&page=1`)
      .then((r) => live && setData(r))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [filter, query]);

  const loadMore = async () => {
    if (!data || page >= data.pages || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await api<AdminUsersResult>(`/admin/users?filter=${filter}&q=${encodeURIComponent(query)}&page=${page + 1}`);
      setData({ ...next, users: [...data.users, ...next.users] });
      setPage(page + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingMore(false);
    }
  };

  const update = (u: AdminUser) => {
    setData((d) => {
      if (!d) return d;
      const keep = filter === 'flagged' ? u.flagged : filter === 'hidden' ? u.hiddenFromLeagues : true;
      return { ...d, total: keep ? d.total : d.total - 1, users: keep ? d.users.map((x) => (x.id === u.id ? u : x)) : d.users.filter((x) => x.id !== u.id) };
    });
    refreshCount();
  };

  const unhide = async (u: AdminUser) => {
    try {
      const r = await api<{ flagged: boolean; hiddenFromLeagues: boolean }>(`/admin/users/${u.id}/review`, { body: { action: 'unhide' } });
      update({ ...u, ...r });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const flagged = data?.users.filter((u) => u.flagged) ?? [];
  const rest = data?.users.filter((u) => !u.flagged) ?? [];

  return (
    <AdminPage active={filter === 'flagged' ? 'review' : 'users'} reviewCount={flaggedCount ?? undefined}>
      <PageTitle back>{filter === 'flagged' ? 'Review' : 'Users'}</PageTitle>

      <View style={[styles.search, { backgroundColor: c.card, borderColor: c.border }]}>
        <Icon.search size={18} color={c.muted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Nickname or email"
          placeholderTextColor={c.muted}
          selectionColor={c.accent}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search users"
          style={[styles.searchInput, { color: c.ink }]}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <FilterPill label="All" on={filter === 'all'} onPress={() => setFilter('all')} />
        <FilterPill label={flaggedCount ? `Flagged · ${flaggedCount}` : 'Flagged'} on={filter === 'flagged'} onPress={() => setFilter('flagged')} />
        <FilterPill label="Hidden" on={filter === 'hidden'} onPress={() => setFilter('hidden')} />
      </ScrollView>

      <ErrorText message={error} />
      {!data ? (
        !error && <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
      ) : data.users.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: 24, gap: 6 }}>
          <Icon.check size={28} color={c.accent} />
          <Text style={{ fontFamily: fonts.bodyHeavy, fontSize: 15, color: c.ink }}>
            {filter === 'flagged' ? 'Nobody to review' : filter === 'hidden' ? 'No hidden walkers' : 'No walkers match'}
          </Text>
        </Card>
      ) : (
        <>
          {flagged.map((u) => (
            <ReviewCard key={u.id} user={u} onDone={update} />
          ))}
          {rest.length > 0 && (
            <ListCard>
              {rest.map((u, i) => (
                <ListRow key={u.id} first={i === 0}>
                  <Avatar species={u.pet?.species} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: c.ink }]} numberOfLines={1}>
                      {u.nickname}
                      {u.role === 'admin' ? ' · admin' : ''}
                    </Text>
                    <Text style={[styles.sub, { color: c.muted }]} numberOfLines={1}>
                      {u.monstersRaised} {u.monstersRaised === 1 ? 'monster' : 'monsters'} · {tierLabel(u.league)}
                      {u.hiddenFromLeagues ? ' · hidden' : ''}
                    </Text>
                  </View>
                  {u.hiddenFromLeagues ? (
                    <SmallButton label="Unhide" tone="plain" onPress={() => unhide(u)} />
                  ) : (
                    <Text style={[styles.steps, { color: c.ink }]}>{compact(u.steps7d)}</Text>
                  )}
                </ListRow>
              ))}
            </ListCard>
          )}
          {page < data.pages && (
            <View style={{ alignItems: 'center' }}>
              {loadingMore ? <ActivityIndicator color={c.accent} /> : <SmallButton label={`Show more (${data.total - data.users.length})`} tone="plain" onPress={loadMore} />}
            </View>
          )}
          <Text style={[styles.foot, { color: c.muted }]}>Steps shown are the last 7 days, capped per hour.</Text>
        </>
      )}
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  search: { height: 46, borderWidth: 2, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 15, paddingVertical: 0 },
  name: { fontFamily: fonts.bodyHeavy, fontSize: 15 },
  sub: { fontFamily: fonts.body, fontSize: 12 },
  steps: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
  foot: { fontFamily: fonts.body, fontSize: 12, textAlign: 'center' },
});
