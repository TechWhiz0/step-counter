import * as Sharing from 'expo-sharing';
import { useRef, useState, type ComponentRef, useMemo } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { FORM_LABEL, STAGE_LABEL } from '@/lib/petText';
import type { Pet } from '@/lib/types';
import { PetArt } from './PetView';
import { Sky } from './Sky';
import type { Palette } from '@/lib/theme';
import { Button, fonts, radius, T, useColors } from './ui';

// A card of the pet and this week's steps, shared as an image.
export function ShareCard({ pet, weekSteps, streak, visible, onClose }: { pet: Pet; weekSteps: number; streak: number; visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [busy, setBusy] = useState(false);

  async function share() {
    setBusy(true);
    try {
      const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: `Share ${pet.name}` });
    } finally {
      setBusy(false);
    }
  }

  const title = pet.stage === 'adult' && pet.form ? FORM_LABEL[pet.form].name : STAGE_LABEL[pet.stage];
  const band = pet.form === 'sunrise' ? 'sunrise' : pet.form === 'moonlight' ? 'moonlight' : 'daytime';
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View ref={ref} collapsable={false} style={styles.card}>
          <Sky band={band} style={styles.sky}>
            <T v="label" style={{ color: band === 'moonlight' ? '#C9D6EA' : colors.accentDeep, marginTop: 14 }}>Step Pet</T>
            <PetArt look={pet} size={220} />
          </Sky>
          <View style={styles.info}>
            <T v="title">{pet.name}</T>
            <T v="small">{title} · one of a kind</T>
            <View style={styles.stats}>
              <Stat value={weekSteps.toLocaleString()} label="steps in 7 days" />
              <View style={styles.divider} />
              <Stat value={String(streak)} label="day streak" />
            </View>
          </View>
        </View>
        <Button label="Share" onPress={share} busy={busy} />
        <Button label="Close" kind="ghost" onPress={onClose} />
      </View>
    </Modal>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <T v="number" style={{ fontFamily: fonts.displayBold }}>{value}</T>
      <T v="small" style={{ fontSize: 12 }}>{label}</T>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,16,12,0.6)', justifyContent: 'center', padding: 24, gap: 12 },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden' },
  sky: { alignItems: 'center' },
  info: { alignItems: 'center', padding: 18, gap: 2 },
  stats: { flexDirection: 'row', alignItems: 'center', marginTop: 14, alignSelf: 'stretch' },
  divider: { width: 1, height: 32, backgroundColor: colors.line },
});
