import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import Svg, { Circle, Path as SvgPath } from 'react-native-svg';
import { ErrorText, Loading, Meta, PaperScreen, Rule, T, fmt, fonts, useColors } from '@/components/paper';
import { api } from '@/lib/api';
import { lastDays } from '@/lib/dates';
import { useSession } from '@/lib/session';
import type { Pet, Stage } from '@/lib/types';

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STAGES: Stage[] = ['egg', 'baby', 'teen', 'adult'];

interface HistoryDay {
  day: string;
  total: number;
  goalMet: boolean | null;
}

function MetMark() {
  const c = useColors();
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" accessibilityLabel="goal met">
      <Circle cx={10} cy={10} r={8.5} fill="none" stroke={c.sageSoft} strokeWidth={1.4} />
      <SvgPath d="M6.2 10.4l2.6 2.4 5-5.4" fill="none" stroke={c.sageSoft} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function PathScreen() {
  const c = useColors();
  const { user } = useSession();
  const [days, setDays] = useState<HistoryDay[] | null>(null);
  const [month, setMonth] = useState<HistoryDay[]>([]);
  const [pet, setPet] = useState<Pet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [h, p] = await Promise.all([api<{ days: HistoryDay[] }>('/steps/history?days=30'), api<{ pet: Pet | null }>('/pet')]);
      setMonth(h.days);
      const by = new Map(h.days.map((d) => [d.day, d]));
      setDays(lastDays(7).map((d) => by.get(d.day) ?? { day: d.day, total: 0, goalMet: null }));
      setPet(p.pet);
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

  const goal = user?.dailyGoal ?? 6000;
  const week = days ?? [];
  const weekTotal = week.reduce((s, d) => s + d.total, 0);
  const closed = week.slice(0, -1);
  const met = closed.filter((d) => d.goalMet ?? d.total >= goal).length;
  const scale = Math.max(goal * 1.6, ...week.map((d) => d.total));
  const first = week[0]?.day;
  const range = first ? `${MONTH[Number(first.slice(5, 7)) - 1]} ${Number(first.slice(8))} – ${Number(week[6]?.day.slice(8))}` : '';
  const monthTotal = month.reduce((s, d) => s + d.total, 0);
  const best = month.reduce((b, d) => (d.total > b.total ? d : b), { day: '', total: 0 } as HistoryDay);

  return (
    <PaperScreen
      title="Path"
      right={<T v="small">{range}</T>}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
          tintColor={c.ink}
        />
      }
    >
      <View style={{ paddingHorizontal: 28, paddingTop: 18, gap: 10 }}>
        <T v="display">Seven days,{'\n'}one long walk.</T>
        <T color={c.inkSoft}>
          {fmt(weekTotal)} steps. Goal met {met} of {closed.length} days{week.length ? ', today still going.' : '.'}
        </T>
        <ErrorText message={error} />
      </View>

      {!days && !error && <Loading rows={7} />}
      <View style={{ marginHorizontal: 28, marginTop: 18, display: days ? 'flex' : 'none' }}>
        <View style={{ alignItems: 'flex-end' }}>
          <Meta>goal {fmt(goal)}</Meta>
        </View>
        <View style={{ marginTop: 6 }}>
          {week.map((d, i) => {
            const today = i === week.length - 1;
            const date = new Date(`${d.day}T12:00:00`);
            const isMet = !today && (d.goalMet ?? d.total >= goal);
            return (
              <View
                key={d.day}
                accessible
                accessibilityLabel={`${DAY[date.getDay()]} ${date.getDate()}: ${fmt(d.total)} steps${isMet ? ', goal met' : today ? ', today' : ''}`}
                style={{ flexDirection: 'row', alignItems: 'center', height: 40, borderBottomWidth: 1, borderBottomColor: c.rule }}
              >
                <T style={{ width: 58, color: today ? c.ink : c.muted, fontFamily: today ? fonts.bodyBold : fonts.body }}>
                  {DAY[date.getDay()]} {date.getDate()}
                </T>
                <View style={{ flex: 1, height: 12, justifyContent: 'center' }}>
                  <View style={{ height: 4, width: `${Math.min(100, (d.total / scale) * 100)}%`, backgroundColor: today ? c.accent : c.ink, borderRadius: 2 }} />
                  <View style={{ position: 'absolute', left: `${(goal / scale) * 100}%`, top: -14, bottom: -14, width: 1, backgroundColor: c.ruleStrong }} />
                </View>
                <T style={{ width: 64, textAlign: 'right', fontFamily: today ? fonts.bodyBold : fonts.body }}>{fmt(d.total)}</T>
                <View style={{ width: 34, alignItems: 'flex-end' }}>{isMet ? <MetMark /> : today ? <T v="small" color={c.accent}>now</T> : null}</View>
              </View>
            );
          })}
        </View>
      </View>

      {pet && (
        <View style={{ marginHorizontal: 28, marginTop: 28, gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Meta>{pet.name}'s path</Meta>
            <T v="small">{fmt(pet.growth)} walked</T>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }} accessible accessibilityLabel={`${pet.name} is a ${pet.stage}`}>
            {STAGES.map((s, i) => {
              const at = STAGES.indexOf(pet.stage);
              const done = i < at;
              const now = i === at;
              return (
                <View key={s} style={{ flexDirection: 'row', alignItems: 'center', flex: i < 3 ? 1 : 0 }}>
                  <T
                    v="small"
                    style={[
                      { fontSize: 12.5 },
                      done && { textDecorationLine: 'line-through', color: c.muted },
                      now && { fontFamily: fonts.bodyBold, color: c.ink, textDecorationLine: 'underline' },
                    ]}
                  >
                    {s}
                  </T>
                  {i < 3 && (
                    <View style={{ flex: 1, height: 1, marginHorizontal: 8, backgroundColor: i < at ? c.ink : c.ruleStrong }}>
                      {now && <View style={{ position: 'absolute', left: 0, top: -1, height: 3, width: `${Math.round(pet.stageProgress * 100)}%`, backgroundColor: c.accent }} />}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
          <T>
            {pet.nextStage
              ? `${fmt(pet.stepsToNextStage)} more steps until ${pet.name} ${pet.nextStage === 'baby' ? 'hatches' : pet.nextStage === 'teen' ? 'grows up a bit' : 'grows up'}.${pet.nextStage === 'adult' ? ' Their form is decided by the last two weeks of walks.' : ''}`
              : `${pet.name} is grown up. A new monster can join from Today whenever you like.`}
          </T>
        </View>
      )}

      {month.length > 0 && (
        <View style={{ marginHorizontal: 28, marginTop: 26, gap: 12 }}>
          <Rule dashed />
          <Meta>Last 30 days</Meta>
          <View style={{ flexDirection: 'row' }}>
            {[
              ['walked', fmt(monthTotal)],
              ['a day', fmt(monthTotal / Math.max(1, month.length))],
              ['best day', fmt(best.total)],
            ].map(([label, value]) => (
              <View key={label} style={{ flex: 1 }}>
                <T v="num" style={{ fontSize: 17 }}>
                  {value}
                </T>
                <T v="small">{label}</T>
              </View>
            ))}
          </View>
        </View>
      )}
    </PaperScreen>
  );
}
