import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { AdminPage, ListCard, ListRow, LiveSwitch, PageTitle } from '@/components/admin/AdminChrome';
import { Avatar } from '@/components/admin/ReviewCard';
import { Icon } from '@/components/icons';
import { Button, Card, ErrorText, fonts, SmallButton, Tap, useColors } from '@/components/ui';
import { api } from '@/lib/api';
import { haptic } from '@/lib/feel';
import type { AdminMonster } from '@/lib/types';

const STEP = 50_000;
const MIN = 1000;
const MAX = 10_000_000;

function unlockText(m: AdminMonster) {
  const u = m.unlock;
  const rarity = m.rarity === 'epic' ? 'Epic' : m.rarity === 'rare' ? 'Rare' : 'Starter';
  if (u.kind === 'steps') return `${rarity} · ${u.steps.toLocaleString('en')} steps`;
  if (u.kind === 'streak') return `${rarity} · ${u.days}-day streak`;
  if (u.kind === 'event') return `${rarity} · ${u.event}`;
  return rarity;
}

// The selected monster: who has it, whether it's live, and its unlock threshold on a ±50k stepper.
function Editor({ m, onSaved, onToggle }: { m: AdminMonster; onSaved: (m: AdminMonster) => void; onToggle: (m: AdminMonster, v: boolean) => void }) {
  const c = useColors();
  const current = m.unlock.kind === 'steps' ? m.unlock.steps : 0;
  const [draft, setDraft] = useState(current);
  const [text, setText] = useState(current.toLocaleString('en'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(current);
    setText(current.toLocaleString('en'));
    setError(null);
  }, [m.id, current]);

  const set = (n: number) => {
    const v = Math.min(MAX, Math.max(MIN, Math.round(n)));
    setDraft(v);
    setText(v.toLocaleString('en'));
  };
  const accent = m.rarity === 'epic' ? c.grapeDeep : c.skyText;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const { monster } = await api<{ monster: AdminMonster }>(`/admin/monsters/${m.id}`, { method: 'PATCH', body: { unlockSteps: draft } });
      haptic.success?.();
      onSaved({ ...m, ...monster, owners: m.owners });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: 10, borderRadius: 20, padding: 12 }}>
      <View style={styles.rowHead}>
        <Avatar species={m.id} size={46} square />
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: c.ink, fontSize: 16 }]}>{m.name}</Text>
          <Text style={[styles.meta, { color: accent }]}>
            {m.rarity === 'epic' ? 'Epic' : m.rarity === 'rare' ? 'Rare' : 'Starter'} · {m.owners.toLocaleString('en')} walkers raised
          </Text>
        </View>
        <Text style={[styles.liveLabel, { color: c.muted }]}>Live</Text>
        <LiveSwitch label={`${m.name} live`} value={m.enabled} onChange={(v) => onToggle(m, v)} />
      </View>
      {m.unlock.kind === 'steps' ? (
        <>
          <Text style={[styles.liveLabel, { color: c.muted }]}>Unlock at (lifetime steps)</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Tap accessibilityRole="button" accessibilityLabel="Lower by 50,000" onPress={() => set(draft - STEP)} style={[styles.step, { borderColor: c.border, backgroundColor: c.card }]}>
              <Text style={[styles.stepText, { color: c.ink }]}>−</Text>
            </Tap>
            <TextInput
              value={text}
              onChangeText={(t) => {
                setText(t);
                const n = Number(t.replace(/[^0-9]/g, ''));
                if (n) setDraft(Math.min(MAX, n));
              }}
              onBlur={() => set(draft)}
              keyboardType="number-pad"
              accessibilityLabel="Unlock steps"
              selectionColor={c.accent}
              style={[styles.stepInput, { borderColor: c.border, backgroundColor: c.bg, color: c.ink }]}
            />
            <Tap accessibilityRole="button" accessibilityLabel="Raise by 50,000" onPress={() => set(draft + STEP)} style={[styles.step, { borderColor: c.border, backgroundColor: c.card }]}>
              <Text style={[styles.stepText, { color: c.ink }]}>+</Text>
            </Tap>
          </View>
          {draft !== current && <Button label="Save threshold" busy={busy} onPress={save} />}
        </>
      ) : (
        <Text style={[styles.note, { color: c.muted }]}>{unlockText(m)}. Only step-unlocked monsters have an editable threshold.</Text>
      )}
      <ErrorText message={error} />
    </Card>
  );
}

export default function AdminMonstersScreen() {
  const c = useColors();
  const [list, setList] = useState<AdminMonster[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ monsters: AdminMonster[] }>('/admin/monsters')
      .then(({ monsters }) => {
        setList(monsters);
        const first = monsters.find((m) => m.rarity === 'epic' && m.unlock.kind === 'steps') ?? monsters.find((m) => m.unlock.kind === 'steps');
        setSelected(first?.id ?? null);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const replace = (m: AdminMonster) => setList((l) => l?.map((x) => (x.id === m.id ? m : x)) ?? l);

  // Optimistic on/off with rollback.
  const toggle = async (m: AdminMonster, enabled: boolean) => {
    replace({ ...m, enabled });
    setError(null);
    try {
      await api(`/admin/monsters/${m.id}`, { method: 'PATCH', body: { enabled } });
    } catch (e) {
      replace(m);
      setError((e as Error).message);
    }
  };

  const groups = useMemo(() => {
    const l = list ?? [];
    return {
      unlockable: l.filter((m) => m.unlock.kind === 'steps' || m.unlock.kind === 'streak'),
      events: l.filter((m) => m.unlock.kind === 'event'),
      starters: l.filter((m) => m.unlock.kind === 'starter'),
    };
  }, [list]);
  const current = list?.find((m) => m.id === selected) ?? null;

  return (
    <AdminPage active="monsters">
      <PageTitle back>Monsters</PageTitle>
      <Text style={[styles.note, { color: c.muted }]}>
        Rare and epic monsters unlock at a lifetime step total. Changes apply to the next egg each walker hatches.
      </Text>
      <ErrorText message={error} />

      {!list ? (
        !error && <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
      ) : (
        <>
          {current && <Editor m={current} onSaved={replace} onToggle={toggle} />}

          <ListCard>
            {groups.unlockable.map((m, i) => (
              <ListRow key={m.id} first={i === 0} onPress={() => setSelected(m.id)}>
                <Avatar species={m.id} size={40} square />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: c.ink }]}>
                    {m.name}
                    {m.id === selected ? ' · editing' : ''}
                  </Text>
                  <Text style={[styles.meta, { color: m.rarity === 'epic' ? c.grapeDeep : c.skyText }]}>{unlockText(m)}</Text>
                </View>
                <LiveSwitch label={`${m.name} live`} value={m.enabled} onChange={(v) => toggle(m, v)} />
              </ListRow>
            ))}
          </ListCard>

          {groups.events.length > 0 && (
            <>
              <Text style={[styles.section, { color: c.muted }]}>Events</Text>
              {groups.events.map((m) => (
                <View key={m.id} style={[styles.event, { backgroundColor: m.enabled ? c.accentSoft : c.skySoft }]}>
                  <View style={[styles.eventIcon, { backgroundColor: c.card }]}>
                    <Avatar species={m.id} size={38} square />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: c.ink }]}>{m.unlock.kind === 'event' ? m.unlock.event : m.name}</Text>
                    <Text style={[styles.meta, { color: m.enabled ? c.accentText : c.skyText }]}>
                      {m.name} hatches · {m.enabled ? 'running now' : 'not running'}
                    </Text>
                  </View>
                  <SmallButton label={m.enabled ? 'Stop' : 'Start'} tone={m.enabled ? 'plain' : 'grass'} onPress={() => toggle(m, !m.enabled)} />
                </View>
              ))}
            </>
          )}

          {groups.starters.length > 0 && (
            <View style={[styles.event, { backgroundColor: c.surfaceAlt }]}>
              <Icon.egg size={22} color={c.muted} />
              <Text style={[styles.note, { color: c.muted, flex: 1 }]}>
                {groups.starters.length} starter monsters ({groups.starters.map((m) => m.name).join(', ')}) can always hatch.
              </Text>
            </View>
          )}
        </>
      )}
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontFamily: fonts.bodyHeavy, fontSize: 15 },
  meta: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  liveLabel: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  note: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  step: { width: 44, height: 44, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontFamily: fonts.bodyHeavy, fontSize: 20 },
  stepInput: { flex: 1, minWidth: 0, height: 44, borderWidth: 2, borderRadius: 12, textAlign: 'center', fontFamily: fonts.display, fontSize: 18, paddingVertical: 0 },
  section: { fontFamily: fonts.bodyHeavy, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 },
  event: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18 },
  eventIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
