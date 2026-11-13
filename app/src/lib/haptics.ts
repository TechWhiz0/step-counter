import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Tiny taps that make buttons and the pet feel physical. Failures (web, no vibrator) are ignored.
const ok = Platform.OS !== 'web';

export function tapFeedback() {
  if (ok) Haptics.selectionAsync().catch(() => {});
}

export function bumpFeedback() {
  if (ok) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
