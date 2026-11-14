import * as SystemUI from 'expo-system-ui';
import { createContext, useContext, useEffect, type ReactNode } from 'react';

// "Quest Meadow": grass green actions on paper, with sky, sun, berry and grape accents.
const light = {
  bg: '#F6F8F3',
  card: '#FFFFFF',
  ink: '#1D2433',
  muted: '#5B6474',
  accent: '#138A47',
  accentDeep: '#0B6634', // the 3D edge under primary buttons
  accentSoft: '#E8F7EE',
  accentText: '#0B6634',
  onAccent: '#FFFFFF',
  good: '#138A47',
  gold: '#FFC233',
  border: '#E3E9DD',
  line: '#E3E9DD',
  shadow: '#DCE3D5', // the flat ledge under cards
  inputBorder: '#E3E9DD',
  disabledFace: '#EDF1E8',
  danger: '#B03A2E',
  dangerSoft: '#FFE3E0',
  dangerEdge: '#F5BDB6',
  overlay: '#10151FEE',
  tabBg: '#FFFFFF',
  hillFar: '#E2F2DA',
  hillNear: '#CFEBC4',
  sky: '#FFE08A',
  // Extra tones for the golden-step radar, walk rhythm, pills and quests.
  surface: '#FFFFFF',
  surfaceAlt: '#EDF1E8',
  faint: '#8A93A3',
  goldSoft: '#FFF4D6',
  goldText: '#5C4300',
  goodSoft: '#E8F7EE',
  night: '#14203A',
  skyBlue: '#3D9BF5',
  skySoft: '#E3F0FE',
  skyText: '#1A5FA3',
  berry: '#FF5C8A',
  berrySoft: '#FFE3EC',
  berryText: '#A3244B',
  grape: '#8B5CF6',
  grapeDeep: '#6B3FD6',
  grapeSoft: '#F3EAFF',
  grapeText: '#4B2AA8',
  flame: '#FF8A2B',
};

export type Palette = typeof light;

// Step Pet has one look: the light Quest Meadow palette, whatever the phone's own theme is.
export const palettes = { light };

type ThemeValue = { colors: Palette };
const ThemeContext = createContext<ThemeValue | null>(null);
const value: ThemeValue = { colors: light };

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Keeps the window behind the app (keyboard, screen transitions) the same colour as the app.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(light.bg).catch(() => {});
  }, []);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const v = useContext(ThemeContext);
  if (!v) throw new Error('useTheme must be used inside ThemeProvider');
  return v;
}

export function useColors() {
  return useTheme().colors;
}
