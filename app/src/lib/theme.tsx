import * as SecureStore from 'expo-secure-store';
import * as SystemUI from 'expo-system-ui';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, StyleSheet, useColorScheme, View } from 'react-native';

// "Sunny Meadow": leaf green and sunshine by day, a quiet meadow at night.
const light = {
  bg: '#EEF8EA',
  card: '#FFFFFF',
  ink: '#17301F',
  muted: '#5E7A66',
  accent: '#22A55B',
  accentDeep: '#17844A', // the 3D edge under primary buttons
  accentSoft: '#DCEFD9',
  accentText: '#145C33',
  onAccent: '#FFFFFF',
  good: '#1E9E57',
  gold: '#FFC93C',
  border: '#DCEFD9',
  line: '#BFE3BA',
  shadow: '#D3E9CF', // the flat edge under cards
  inputBorder: '#CFE6CB',
  disabledFace: '#E3EEE0',
  danger: '#C8423B',
  dangerSoft: '#FCE4E2',
  dangerEdge: '#F1C3BF',
  overlay: '#0F2A1AEE',
  tabBg: '#FFFFFF',
  hillFar: '#D3EDCD',
  hillNear: '#BFE3BA',
  sky: '#FFE07A',
  // Extra tones for the golden-step radar, walk rhythm and pills.
  surface: '#FFFFFF',
  surfaceAlt: '#E6F3E2',
  faint: '#8AA492',
  goldSoft: '#FFF1C7',
  goldText: '#7A5600',
  goodSoft: '#DDF3E7',
  night: '#14203A',
};

export type Palette = typeof light;

const dark: Palette = {
  bg: '#0E1712',
  card: '#17241C',
  ink: '#E4F2E8',
  muted: '#8FAA97',
  accent: '#3DDC84',
  accentDeep: '#23A862',
  accentSoft: '#1D3527',
  accentText: '#7EEBAE',
  onAccent: '#06130B',
  good: '#3DDC84',
  gold: '#FFD25E',
  border: '#22362A',
  line: '#2C4A37',
  shadow: '#0A110D',
  inputBorder: '#2C4A37',
  disabledFace: '#1B2A21',
  danger: '#FF8A80',
  dangerSoft: '#3A1F1D',
  dangerEdge: '#24120F',
  overlay: '#050B08F0',
  tabBg: '#121D17',
  hillFar: '#142219',
  hillNear: '#1A2E21',
  sky: '#F3EFCB',
  surface: '#17241C',
  surfaceAlt: '#1F3026',
  faint: '#6F8A77',
  goldSoft: '#3A3118',
  goldText: '#FFD25E',
  goodSoft: '#1D3527',
  night: '#0A1224',
};

export const palettes = { light, dark };
export type Scheme = keyof typeof palettes;
export type ThemeMode = 'system' | Scheme;

type ThemeValue = { colors: Palette; scheme: Scheme; mode: ThemeMode; setMode: (mode: ThemeMode) => void };
const ThemeContext = createContext<ThemeValue | null>(null);

const KEY = 'steppet.theme';
const isMode = (v: unknown): v is ThemeMode => v === 'system' || v === 'light' || v === 'dark';
const prefs =
  Platform.OS === 'web'
    ? { get: async () => globalThis.localStorage?.getItem(KEY) ?? null, set: async (v: string) => globalThis.localStorage?.setItem(KEY, v) }
    : { get: () => SecureStore.getItemAsync(KEY), set: (v: string) => SecureStore.setItemAsync(KEY, v) };

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system: Scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [mode, setModeState] = useState<ThemeMode | null>(null);
  const [veil, setVeil] = useState<string | null>(null);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    prefs
      .get()
      .then((v) => setModeState(isMode(v) ? v : 'system'))
      .catch(() => setModeState('system'));
  }, []);

  const scheme: Scheme = !mode || mode === 'system' ? system : mode;
  const colors = palettes[scheme];

  // Keeps the window behind the app (keyboard, screen transitions) the same colour as the theme.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [colors.bg]);

  // Switching fades a veil of the new background in, swaps the palette underneath, then fades it away,
  // so the whole app dissolves into the new theme instead of snapping.
  const setMode = useCallback(
    (next: ThemeMode) => {
      prefs.set(next).catch(() => {});
      const nextScheme: Scheme = next === 'system' ? system : next;
      if (nextScheme === scheme) return setModeState(next);
      setVeil(palettes[nextScheme].bg);
      fade.setValue(0);
      Animated.timing(fade, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
        setModeState(next);
        requestAnimationFrame(() =>
          Animated.timing(fade, { toValue: 0, duration: 360, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start(() => setVeil(null)),
        );
      });
    },
    [fade, scheme, system],
  );

  const value = useMemo(() => ({ colors, scheme, mode: mode ?? 'system', setMode }), [colors, scheme, mode, setMode]);

  if (!mode) return <View style={{ flex: 1, backgroundColor: palettes[system].bg }} />;
  return (
    <ThemeContext.Provider value={value}>
      {children}
      {veil && <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: veil, opacity: fade }]} />}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}

export function useColors() {
  return useTheme().colors;
}
