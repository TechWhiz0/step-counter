import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { playSound } from './sound';

// Tiny taps that make buttons and the pet feel physical. Failures (web, no vibrator) are ignored.
const ok = Platform.OS !== 'web';

// Chunky buttons: a soft "thock" as the face lands on its ledge.
export function tapFeedback() {
  playSound('press');
  if (ok) Haptics.selectionAsync().catch(() => {});
}

export function bumpFeedback() {
  if (ok) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
