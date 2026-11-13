import * as Sharing from 'expo-sharing';
import { useRef, useState, type ComponentRef } from 'react';
import { Modal, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { FORM_LABEL, STAGE_LABEL } from '@/lib/petText';
import type { Pet } from '@/lib/types';
import { PetArt } from './PetView';
import { Button, Text, useColors } from './ui';

// A square card of the pet and this week's steps, shared as an image.
export function ShareCard({ pet, weekSteps, streak, visible, onClose }: { pet: Pet; weekSteps: number; streak: number; visible: boolean; onClose: () => void }) {
  const colors = useColors();
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
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 24, gap: 12 }}>
        <View ref={ref} collapsable={false} style={{ backgroundColor: colors.bg, borderRadius: 24, borderWidth: 2, borderColor: colors.line, padding: 20, alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent, letterSpacing: 1 }}>STEP PET</Text>
          <PetArt look={pet} size={230} />
          <Text style={{ fontSize: 26, fontWeight: '900', color: colors.ink }}>{pet.name}</Text>
          <Text style={{ fontSize: 15, color: colors.muted }}>{title} · one of a kind</Text>
          <View style={{ flexDirection: 'row', gap: 24, marginTop: 10 }}>
            <Stat value={weekSteps.toLocaleString()} label="steps in 7 days" />
            <Stat value={String(streak)} label="day streak" />
          </View>
        </View>
        <Button label="Share" onPress={share} busy={busy} />
        <Button label="Close" kind="secondary" onPress={onClose} />
      </View>
    </Modal>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const colors = useColors();
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink }}>{value}</Text>
      <Text style={{ fontSize: 12, color: colors.muted }}>{label}</Text>
    </View>
  );
}
