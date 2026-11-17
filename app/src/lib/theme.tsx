import * as SystemUI from 'expo-system-ui';
import { createContext, useContext, useEffect, type ReactNode } from 'react';

// "Paper & Ink": warm paper, near-black ink, one terracotta accent. Colour belongs to the monsters.
const day = {
  desk: '#23201C', // the dark strip above daily screens
  deskText: '#B8AE9E',
  paper: '#EEE8DC',
  paperRaised: '#F6F1E7',
  paperShade: '#EAE3D6', // tab bar, sheets
  ink: '#2A2622',
  inkSoft: '#4A433B',
  muted: '#6B6256',
  faint: '#9A9082',
  rule: '#DDD5C6',
  ruleStrong: '#B9AF9F',
  accent: '#A9472A', // terracotta
  sage: '#5C6B4A', // goal met, move up
  sageSoft: '#6F7D5C',
  onInk: '#F3EDE2',
  inkEdge: '#0F0D0B', // the ledge under ink buttons
  scrim: 'rgba(35,32,28,0.45)',
};

// Night lamp: the same layout on dimmed paper, lit by a warm beam.
const night = {
  ...day,
  desk: '#141210',
  deskText: '#8F8676',
  paper: '#34302B',
  paperRaised: '#3E3934',
  paperShade: '#2E2A26',
  ink: '#EFE6D6',
  inkSoft: '#DCD2C1',
  muted: '#A69C8B',
  faint: '#8F8676',
  rule: '#45403A',
  ruleStrong: '#5E574E',
  accent: '#E9A86B',
  onInk: '#2A2622',
  inkEdge: '#000000',
};

export type Palette = typeof day;
export const palettes = { day, night };

export const fonts = {
  display: 'Newsreader_500Medium',
  displayItalic: 'Newsreader_500Medium_Italic',
  body: 'CourierPrime_400Regular',
  bodyBold: 'CourierPrime_700Bold',
};

type ThemeValue = { colors: Palette };
const ThemeContext = createContext<ThemeValue>({ colors: day });

export function ThemeProvider({ children, mode = 'day' }: { children: ReactNode; mode?: 'day' | 'night' }) {
  // Keeps the window behind the app (keyboard, screen transitions) the same colour as the paper.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(day.paper).catch(() => {});
  }, []);
  return <ThemeContext.Provider value={{ colors: palettes[mode] }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useColors() {
  return useContext(ThemeContext).colors;
}

export const fmt = (n: number) => Math.round(n).toLocaleString('en').replace(/,/g, ' ');
