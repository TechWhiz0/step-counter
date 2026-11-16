import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { playSound } from './sound';

// Each micro-interaction gets a haptic and a matching little sound.
// Haptics never block or throw: a phone without a motor just stays quiet.
export const haptic = {
  tap: () => {
    playSound('tap');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  select: () => {
    playSound('tick');
    void Haptics.selectionAsync().catch(() => {});
  },
  success: () => {
    playSound('chime');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  warn: () => {
    playSound('oops');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
  // Petting the pet: a soft bump and a happy squeak.
  pet: () => {
    playSound('boop');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
  },
  // Claiming a quest or receiving an item: a sparkly arpeggio.
  reward: () => {
    playSound('reward');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  // Big moments (hatching, evolving): a short fanfare.
  celebrate: () => {
    playSound('fanfare');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
};

// True when the user asked the OS for less motion; loops and flourishes rest then.
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

export type Band = 'sunrise' | 'daytime' | 'moonlight';

// Same hour bands the server uses to pick the adult form.
export function bandFor(hour: number): Band {
  if (hour >= 5 && hour <= 9) return 'sunrise';
  if (hour >= 10 && hour <= 16) return 'daytime';
  return 'moonlight';
}

// Sky colours for each band: top, bottom, and whether text on it should be light.
export const SKY: Record<Band, { top: string; bottom: string; light: boolean; glow: string }> = {
  sunrise: { top: '#FFB38A', bottom: '#FFE9D6', light: false, glow: '#FFF4E0' },
  daytime: { top: '#8FD3F4', bottom: '#E6F6FD', light: false, glow: '#FFFFFF' },
  moonlight: { top: '#14203A', bottom: '#2E4A72', light: true, glow: '#5B7DB0' },
};
