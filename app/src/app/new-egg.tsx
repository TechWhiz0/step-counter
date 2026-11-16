import { router } from 'expo-router';
import { useState, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { EggArt, EggTile, GuideBubble, type EggKind } from '@/components/AuthArt';
import { Button, ErrorText, Field, Screen, useColors } from '@/components/ui';
import { api } from '@/lib/api';
import { haptic } from '@/lib/feel';
import type { Palette } from '@/lib/theme';
import { syncSteps } from '@/lib/sync';

export default function NewEgg() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [name, setName] = useState('');
  const [egg, setEgg] = useState<EggKind>('confetti');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      await api('/pet/new-egg', { body: { name: name.trim() } });
      await syncSteps().catch(() => null);
      haptic.celebrate();
      router.dismissTo('/(tabs)');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <GuideBubble text="Your grown-up monster moves to your collection. Pick a new egg! It hatches after 5,000 steps." />
      <View accessibilityRole="radiogroup" accessibilityLabel="Choose an egg" style={styles.row}>
        {(['confetti', 'meadow', 'starry'] as const).map((k) => (
          <View key={k} style={{ flex: 1 }}>
            <EggTile kind={k} label={k[0].toUpperCase() + k.slice(1)} on={egg === k} onPress={() => setEgg(k)} />
          </View>
        ))}
      </View>
      <View style={styles.nameRow}>
        <EggArt kind={egg} size={72} />
        <View style={{ flex: 1 }}>
          <Field label="Name the new egg" value={name} onChangeText={setName} maxLength={20} />
        </View>
      </View>
      <ErrorText message={error} />
      <Button label="Hatch this one" onPress={create} busy={busy} disabled={!name.trim()} />
    </Screen>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, backgroundColor: colors.bg },
});
