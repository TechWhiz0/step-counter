import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '@/lib/theme';
import { PetView, type PetLook } from './PetView';

const EGG: PetLook = { stage: 'egg', form: null, traits: null, mood: 'neutral', equipped: [], stageProgress: 0.6 };

// The egg on form screens, so they aren't just bare fields.
export function EggHeader({ size = 120 }: { size?: number }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <PetView look={EGG} size={size} />
    </View>
  );
}

const STARS = [
  [8, 12, 1.6],
  [22, 6, 1],
  [34, 16, 1.3],
  [60, 8, 1],
  [74, 20, 1.6],
  [88, 10, 1.1],
  [14, 30, 1],
  [48, 26, 1],
] as const;

// Rolling hills along the bottom, plus the sun (day) or a moon and stars (night) when `sky` is set.
// Sits behind the screen content; place it as the first child of a full-screen View.
export function MeadowBackdrop({ height = 150, sky = false }: { height?: number; sky?: boolean }) {
  const { colors, scheme } = useTheme();
  const night = scheme === 'dark';
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {sky && night && (
        <Svg width="100%" height={180} viewBox="0 0 100 40" preserveAspectRatio="xMidYMin slice" style={{ position: 'absolute', top: 0 }}>
          {STARS.map(([x, y, r]) => (
            <Circle key={`${x}-${y}`} cx={x} cy={y} r={r * 0.45} fill={colors.sky} opacity={0.75} />
          ))}
        </Svg>
      )}
      {sky && (
        <Svg width={72} height={72} viewBox="0 0 72 72" style={{ position: 'absolute', top: 64, right: 28 }}>
          <Circle cx={36} cy={36} r={26} fill={colors.sky} opacity={night ? 1 : 0.85} />
          {night && <Circle cx={47} cy={28} r={22} fill={colors.bg} />}
        </Svg>
      )}
      <Svg width="100%" height={height} viewBox="0 0 400 150" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0 }}>
        <Path d="M0 70 Q90 20 210 58 T400 46 V150 H0Z" fill={colors.hillFar} />
        <Path d="M0 106 Q120 66 250 98 T400 92 V150 H0Z" fill={colors.hillNear} />
      </Svg>
    </View>
  );
}
