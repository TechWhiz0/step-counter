import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useColors } from '@/lib/theme';
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


// Rolling hills along the bottom, plus the sun when `sky` is set.
// Sits behind the screen content; place it as the first child of a full-screen View.
export function MeadowBackdrop({ height = 150, sky = false }: { height?: number; sky?: boolean }) {
  const colors = useColors();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {sky && (
        <Svg width={72} height={72} viewBox="0 0 72 72" style={{ position: 'absolute', top: 64, right: 28 }}>
          <Circle cx={36} cy={36} r={26} fill={colors.sky} opacity={0.85} />
        </Svg>
      )}
      <Svg width="100%" height={height} viewBox="0 0 400 150" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0 }}>
        <Path d="M0 70 Q90 20 210 58 T400 46 V150 H0Z" fill={colors.hillFar} />
        <Path d="M0 106 Q120 66 250 98 T400 92 V150 H0Z" fill={colors.hillNear} />
      </Svg>
    </View>
  );
}
