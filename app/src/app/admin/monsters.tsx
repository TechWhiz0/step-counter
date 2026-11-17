import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { AdminFrame } from '@/components/AdminFrame';
import { Monster } from '@/components/Monster';
import { Button, ErrorText, Icon, InkSwitch, Loading, Meta, T, fmt, fonts, useColors } from '@/components/paper';
import { api } from '@/lib/api';
import { haptic } from '@/lib/feel';
import type { AdminMonster } from '@/lib/types';

const STEP = 25_000;

function unlockText(m: AdminMonster) {
  if (m.unlock.kind === 'steps') return `unlocks at ${fmt(m.unlock.steps)}`;
  if (m.unlock.kind === 'streak') return `${m.unlock.days}-day run`;
  if (m.unlock.kind === 'event') return `${m.unlock.event} event`;
  return 'everyone';
}

function MonsterRow({ m, onChange }: { m: AdminMonster; onChange: (m: AdminMonster) => void }) {
  const c = useColors();
  const steps = m.unlock.kind === 'steps' ? m.unlock.steps : 0;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(steps);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: { enabled?: boolean; unlockSteps?: number }) {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ monster: AdminMonster }>(`/admin/monsters/${m.id}`, { method: 'PATCH', body });
      haptic.success();
      onChange({ ...m, ...r.monster, owners: m.owners });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: c.rule }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58 }}>
        <Monster species={m.id} size={40} ghost={!m.enabled} />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open, disabled: m.unlock.kind !== 'steps' }}
          disabled={m.unlock.kind !== 'steps'}
          onPress={() => {
            haptic.select();
            setOpen((o) => !o);
            setDraft(steps);
          }}
          style={{ flex: 1, minHeight: 52, justifyContent: 'center' }}
        >
          <T style={{ fontFamily: fonts.bodyBold }}>
            {m.name}
            <T v="small" color={m.rarity === 'starter' ? c.muted : c.accent}>{`  ${m.rarity.toUpperCase()}`}</T>
          </T>
          <T v="small">
            {unlockText(m)} · {fmt(m.owners)} raised
          </T>
        </Pressable>
        <InkSwitch value={m.enabled} onChange={(v) => void patch({ enabled: v })} label={`${m.name} can hatch`} />
      </View>
      {open && (
        <View style={{ paddingLeft: 52, paddingBottom: 14, gap: 8 }}>
          <Meta>Unlock at (lifetime steps)</Meta>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="25 000 fewer" onPress={() => setDraft((d) => Math.max(1000, d - STEP))} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: c.ink, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="minus" />
            </Pressable>
            <T v="num" style={{ flex: 1, textAlign: 'center', fontSize: 18 }}>
              {fmt(draft)}
            </T>
            <Pressable accessibilityRole="button" accessibilityLabel="25 000 more" onPress={() => setDraft((d) => Math.min(10_000_000, d + STEP))} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: c.ink, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" />
            </Pressable>
          </View>
          {draft !== steps && <Button label="Save threshold" onPress={() => void patch({ unlockSteps: draft })} busy={busy} />}
          <ErrorText message={error} />
        </View>
      )}
      {!open && <ErrorText message={error} />}
    </View>
  );
}

export default function AdminMonsters() {
  const c = useColors();
  const [list, setList] = useState<AdminMonster[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setList((await api<{ monsters: AdminMonster[] }>('/admin/monsters')).monsters);
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
  const live = list?.filter((m) => m.enabled).length ?? 0;
  return (
    <AdminFrame title="Monsters">
      <T v="small" style={{ marginHorizontal: 28, marginTop: 8 }}>
        Turn a monster off to stop it hatching. Pets already raised keep it. {list ? `${live} of ${list.length} can hatch.` : ''}
      </T>
      <ErrorText message={error} style={{ marginHorizontal: 28, marginTop: 8 }} />
      {!list ? (
        <Loading rows={8} />
      ) : (
        <View style={{ marginHorizontal: 28, marginTop: 14, borderTopWidth: 1, borderTopColor: c.ink }}>
          {list.map((m) => (
            <MonsterRow key={m.id} m={m} onChange={(next) => setList((l) => (l ? l.map((x) => (x.id === next.id ? next : x)) : l))} />
          ))}
        </View>
      )}
    </AdminFrame>
  );
}
