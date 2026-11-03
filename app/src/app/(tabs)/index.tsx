import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Modal, RefreshControl, ScrollView, Text, View } from 'react-native';
import { PetArt, PetView } from '@/components/PetView';
import { ShareCard } from '@/components/ShareCard';
import { StepRing } from '@/components/StepRing';
import { Button, Card, colors, ErrorText, Muted } from '@/components/ui';
import { api } from '@/lib/api';
import { itemLabel } from '@/lib/items';
import { FORM_LABEL, growthMessage, moodLine, STAGE_LABEL } from '@/lib/petText';
import { cachedSync, syncSteps, takePendingSurprises } from '@/lib/sync';
import type { Pet, Surprise, SyncResult } from '@/lib/types';

export default function Home() {
  const [data, setData] = useState<SyncResult | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [surprises, setSurprises] = useState<Surprise[]>([]);
  const [sharing, setSharing] = useState(false);
  const [weekSteps, setWeekSteps] = useState(0);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await syncSteps();
      if (result) {
        setData(result);
        setError(null);
        if (!result.pet) return router.replace('/onboarding');
      }
      setSurprises(await takePendingSurprises());
      const { days } = await api<{ days: { total: number }[] }>('/steps/history?days=7');
      setWeekSteps(days.reduce((s, d) => s + d.total, 0));
    } catch (e) {
      setError(`Couldn't sync: ${(e as Error).message}. Showing your last saved data.`);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cachedSync().then((c) => c && setData((d) => d ?? c));
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void refresh());
    return () => sub.remove();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const pet = data?.pet;
  if (!data || !pet) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <Muted>{error ?? 'Waking up your pet…'}</Muted>
      </View>
    );
  }

  const stageName = pet.stage === 'adult' && pet.form ? FORM_LABEL[pet.form].name : STAGE_LABEL[pet.stage];
  const grew = pet.stage !== pet.seenStage;

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 20, gap: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
    >
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 28, fontWeight: '900', color: colors.ink }}>{pet.name}</Text>
        <Muted>{stageName}</Muted>
        <PetView look={pet} size={240} />
        <Text style={{ fontSize: 16, color: colors.ink, textAlign: 'center' }}>{moodLine(pet)}</Text>
      </View>

      <ErrorText message={error} />

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <StepRing steps={data.today.total} goal={data.today.goal} size={130} />
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ fontWeight: '800', fontSize: 16, color: colors.ink }}>Today</Text>
          <Muted>
            {data.today.total >= data.today.goal
              ? 'Goal reached. Your pet is happy!'
              : `${(data.today.goal - data.today.total).toLocaleString()} steps to your goal.`}
          </Muted>
          <Text style={{ fontWeight: '700', color: colors.ink }}>
            🔥 {data.streak.current} day streak <Text style={{ color: colors.muted, fontWeight: '400' }}>(best {data.streak.best})</Text>
          </Text>
        </View>
      </Card>

      <GrowthCard pet={pet} />
      <Card>
        <Text style={{ fontWeight: '800', fontSize: 16, color: colors.ink }}>Golden steps</Text>
        <Muted>Three hidden step numbers are waiting today. Reach one and {pet.name} finds a surprise.</Muted>
      </Card>

      <Button label={`Share ${pet.name}`} kind="secondary" onPress={() => setSharing(true)} />
      <ShareCard pet={pet} weekSteps={weekSteps} streak={data.streak.current} visible={sharing} onClose={() => setSharing(false)} />

      <SurpriseModal petName={pet.name} surprises={grew ? [] : surprises} onDone={() => setSurprises([])} />
      <GrowModal
        pet={pet}
        visible={grew}
        onDone={async () => {
          const { pet: seen } = await api<{ pet: Pet }>('/pet/seen', { method: 'POST' });
          setData((d) => (d ? { ...d, pet: seen } : d));
        }}
      />
    </ScrollView>
  );
}

function GrowthCard({ pet }: { pet: Pet }) {
  if (!pet.nextStage) {
    return (
      <Card>
        <Text style={{ fontWeight: '800', fontSize: 16, color: colors.ink }}>Fully grown</Text>
        <Muted>{pet.form ? FORM_LABEL[pet.form].line : ''}. Start a new egg from your Collection any time.</Muted>
      </Card>
    );
  }
  const next = pet.nextStage === 'baby' ? 'hatching' : STAGE_LABEL[pet.nextStage];
  return (
    <Card>
      <Text style={{ fontWeight: '800', fontSize: 16, color: colors.ink }}>Growing to {next}</Text>
      <View style={{ height: 12, backgroundColor: colors.accentSoft, borderRadius: 6, overflow: 'hidden' }}>
        <View style={{ width: `${Math.round(pet.stageProgress * 100)}%`, height: '100%', backgroundColor: colors.accent }} />
      </View>
      <Muted>{pet.stepsToNextStage.toLocaleString()} more steps</Muted>
      {pet.nextStage === 'adult' && <Muted>When you walk most in the next weeks decides {pet.name}'s adult form.</Muted>}
    </Card>
  );
}

function SurpriseModal({ petName, surprises, onDone }: { petName: string; surprises: Surprise[]; onDone: () => void }) {
  return (
    <Modal visible={surprises.length > 0} transparent animationType="slide" onRequestClose={onDone}>
      <View style={{ flex: 1, backgroundColor: '#0006', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: colors.card, padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 12 }}>
          <Text style={{ fontSize: 40, textAlign: 'center' }}>✨</Text>
          <Text style={{ fontSize: 22, fontWeight: '900', color: colors.ink, textAlign: 'center' }}>{petName} found something!</Text>
          {surprises.map((s) => (
            <Text key={s.step} style={{ fontSize: 16, color: colors.ink, textAlign: 'center' }}>
              Golden step {s.step.toLocaleString()}: <Text style={{ fontWeight: '800' }}>{itemLabel(s.item)}</Text>
            </Text>
          ))}
          <Muted style={{ textAlign: 'center' }}>Put it on your pet from the Collection tab.</Muted>
          <Button label="Yay!" onPress={onDone} />
        </View>
      </View>
    </Modal>
  );
}

function GrowModal({ pet, visible, onDone }: { pet: Pet; visible: boolean; onDone: () => void }) {
  const scale = useRef(new Animated.Value(0.2)).current;
  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.2);
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }).start();
  }, [visible, scale]);
  const msg = growthMessage(pet);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <View style={{ flex: 1, backgroundColor: '#2B2233EE', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <PetArt look={pet} size={260} />
        </Animated.View>
        <Text style={{ fontSize: 28, fontWeight: '900', color: '#fff', textAlign: 'center' }}>{msg.title}</Text>
        <Text style={{ fontSize: 16, color: '#fffc', textAlign: 'center' }}>{msg.body}</Text>
        <View style={{ alignSelf: 'stretch' }}>
          <Button label="Amazing!" onPress={onDone} />
        </View>
      </View>
    </Modal>
  );
}
