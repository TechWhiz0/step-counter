import { useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { Monster } from '@/components/Monster';
import { ErrorText, Loading, Meta, PaperScreen, Rule, T, fmt, fonts, useColors } from '@/components/paper';
import { useLive } from '@/lib/live';
import type { LeagueBoard, LeagueRow } from '@/lib/types';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Row({ r }: { r: LeagueRow }) {
  const c = useColors();
  return (
    <View
      accessible
      accessibilityLabel={`${r.rank}. ${r.isMe ? 'You, ' : ''}@${r.username}, ${fmt(r.steps)} steps`}
      style={{ flexDirection: 'row', alignItems: 'center', minHeight: 50, borderBottomWidth: 1, borderBottomColor: c.rule, gap: 6 }}
    >
      <T style={{ width: 16, color: c.accent, fontFamily: fonts.bodyBold }}>{r.isMe ? '→' : ''}</T>
      <T style={{ width: 26, color: c.muted }}>{r.rank}</T>
      <View style={{ width: 34 }}>{r.species && r.stage ? <Monster species={r.species} stage={r.stage} size={30} /> : null}</View>
      <View style={{ flex: 1 }}>
        <T style={{ fontFamily: r.isMe ? fonts.bodyBold : fonts.body }} numberOfLines={1}>
          @{r.username}
        </T>
        {r.streak > 0 ? <T v="small">{r.streak}-day run</T> : null}
      </View>
      <T style={{ fontFamily: r.isMe ? fonts.bodyBold : fonts.body }}>{fmt(r.steps)}</T>
    </View>
  );
}

function Line({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 30 }} accessibilityRole="text" accessibilityLabel={label}>
      <Rule dashed color={color} style={{ flex: 1 }} />
      <Meta color={color}>{label}</Meta>
      <Rule dashed color={color} style={{ flex: 1 }} />
    </View>
  );
}

export default function Leagues() {
  const c = useColors();
  // Updates by itself: the server answers as soon as anyone in this league syncs new steps.
  const { data: board, error, refresh } = useLive<LeagueBoard>('/leagues');
  const [refreshing, setRefreshing] = useState(false);

  if (!board) {
    return (
      <PaperScreen title="League">
        {error ? (
          <View style={{ padding: 28 }}>
            <ErrorText message={error} />
          </View>
        ) : (
          <Loading rows={8} />
        )}
      </PaperScreen>
    );
  }

  const me = board.rows.find((r) => r.isMe);
  const above = me && me.rank > 1 ? board.rows.find((r) => r.rank === me.rank - 1) : null;
  const promoteRow = board.promoteTop ? board.rows.find((r) => r.rank === board.promoteTop + 1) : null;
  let note = `${board.total} walkers this week.`;
  if (me && board.promoteTop && me.rank <= board.promoteTop) {
    note = promoteRow ? `You are ${me.rank}${ordinal(me.rank)}, ${fmt(me.steps - promoteRow.steps)} steps clear of the line.` : `You are ${me.rank}${ordinal(me.rank)}, in the move-up places.`;
  } else if (me && above) {
    note = `You are ${me.rank}${ordinal(me.rank)}. ${fmt(above.steps - me.steps + 1)} steps passes @${above.username}.`;
  }
  const next = board.tiers[board.tier + 1];

  return (
    <PaperScreen
      title="League"
      right={<T v="small">{board.daysLeft ? `${board.daysLeft} day${board.daysLeft === 1 ? '' : 's'} left` : 'last day'}</T>}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await refresh();
            setRefreshing(false);
          }}
          tintColor={c.ink}
        />
      }
    >
      <View style={{ paddingHorizontal: 28, paddingTop: 18, gap: 10 }}>
        <T v="display">{cap(board.tierName)}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {board.tiers.map((t, i) => (
            <View key={t} style={{ flexDirection: 'row', gap: 8 }}>
              <T
                v="small"
                style={[
                  i < board.tier && { textDecorationLine: 'line-through', color: c.muted },
                  i === board.tier && { color: c.ink, fontFamily: fonts.bodyBold },
                ]}
              >
                {t}
              </T>
              {i < board.tiers.length - 1 ? <T v="small">·</T> : null}
            </View>
          ))}
        </View>
        <T color={c.inkSoft}>
          {board.promoteTop && next ? `The top ${board.promoteTop} move up to ${cap(next)} on Monday. ` : ''}
          {note}
        </T>
      </View>

      <View style={{ marginHorizontal: 28, marginTop: 18, borderTopWidth: 1, borderTopColor: c.ink }}>
        {board.rows.map((r, i) => {
          const prev = board.rows[i - 1];
          return (
            <View key={r.userId}>
              {board.promoteTop > 0 && r.rank === board.promoteTop + 1 && <Line label="move up" color={c.sageSoft} />}
              {board.dropFrom && r.rank === board.dropFrom && <Line label="move down" color={c.accent} />}
              {prev && r.rank > prev.rank + 1 && <T style={{ textAlign: 'center', color: c.muted }}>· · ·</T>}
              <Row r={r} />
            </View>
          );
        })}
        {board.rows.length === 0 && <T style={{ paddingVertical: 20 }}>Nobody has walked in this league yet this week. You could be first.</T>}
      </View>
      <T v="small" style={{ marginHorizontal: 28, marginTop: 14 }}>
        Steps over {fmt(board.hourlyCap ?? 2500)} in one hour don't count here. The board updates by itself as people walk.
      </T>
    </PaperScreen>
  );
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
