import { useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { haptic } from '@/lib/feel';

export const colors = {
  bg: '#FBF5EC',
  surface: '#FFFFFF',
  surfaceAlt: '#F4ECE1',
  ink: '#1E1A16',
  muted: '#7B7166',
  faint: '#B4AA9F',
  line: '#EDE3D6',
  accent: '#FF7A30',
  accentDeep: '#E2601A',
  accentSoft: '#FFE8D8',
  good: '#1F9D63',
  goodSoft: '#DDF3E7',
  gold: '#F2B000',
  goldSoft: '#FFF1C7',
  danger: '#D2423A',
  dangerSoft: '#FCE6E4',
  night: '#14203A',
  // Older names kept for screens that still use them.
  card: '#FFFFFF',
  border: '#EDE3D6',
};

export const fonts = {
  display: 'Fredoka_600SemiBold',
  displayBold: 'Fredoka_700Bold',
  body: 'Nunito_400Regular',
  bodySemi: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyBlack: 'Nunito_800ExtraBold',
};

export const radius = { sm: 12, md: 16, lg: 24, xl: 32, pill: 999 };

export const shadow: ViewStyle = {
  shadowColor: '#7A4A1E',
  shadowOpacity: 0.08,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};

type Variant = 'hero' | 'title' | 'h2' | 'h3' | 'body' | 'bodyStrong' | 'small' | 'label' | 'number';

const VARIANTS: Record<Variant, TextStyle> = {
  hero: { fontFamily: fonts.displayBold, fontSize: 40, lineHeight: 44, color: colors.ink, letterSpacing: -0.5 },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: colors.ink, letterSpacing: -0.3 },
  h2: { fontFamily: fonts.display, fontSize: 20, lineHeight: 26, color: colors.ink },
  h3: { fontFamily: fonts.bodyBlack, fontSize: 16, lineHeight: 22, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.ink },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 23, color: colors.ink },
  small: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 20, color: colors.muted },
  label: { fontFamily: fonts.bodyBlack, fontSize: 12, lineHeight: 16, color: colors.muted, letterSpacing: 0.8, textTransform: 'uppercase' },
  number: { fontFamily: fonts.displayBold, fontSize: 22, lineHeight: 26, color: colors.ink, fontVariant: ['tabular-nums'] },
};

export function T({
  children,
  v = 'body',
  style,
  numberOfLines,
}: {
  children: ReactNode;
  v?: Variant;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  return (
    <Text style={[VARIANTS[v], style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

// Anything tappable: shrinks a touch under the finger and springs back.
export function Tap({
  children,
  style,
  onPress,
  disabled,
  scaleTo = 0.96,
  feedback = 'tap',
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  feedback?: 'tap' | 'select' | 'none';
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(scale, { toValue: v, speed: 40, bounciness: v === 1 ? 8 : 0, useNativeDriver: true }).start();
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPressIn={() => to(scaleTo)}
      onPressOut={() => to(1)}
      onPress={(e) => {
        if (feedback !== 'none') haptic[feedback]();
        onPress?.(e);
      }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Title({ children }: { children: ReactNode }) {
  return <T v="title">{children}</T>;
}

export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <T v="small" style={style}>{children}</T>;
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  busy,
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
  busy?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  const off = disabled || busy;
  const tone = BUTTON_TONES[kind];
  return (
    <Tap
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      onPress={onPress}
      disabled={off}
      style={[styles.button, { backgroundColor: tone.bg }, kind === 'primary' && styles.buttonLift, off && { opacity: 0.45 }]}
    >
      {busy ? (
        <ActivityIndicator color={tone.fg} />
      ) : (
        <View style={styles.buttonRow}>
          {icon}
          <Text style={[styles.buttonText, { color: tone.fg }]}>{label}</Text>
        </View>
      )}
    </Tap>
  );
}

const BUTTON_TONES = {
  primary: { bg: colors.accent, fg: '#FFFFFF' },
  secondary: { bg: colors.accentSoft, fg: colors.accentDeep },
  ghost: { bg: colors.surfaceAlt, fg: colors.ink },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  dark: { bg: colors.ink, fg: '#FFFFFF' },
};

// A selectable pill, for goal pickers and the wardrobe.
export function Chip({ label, on, onPress, disabled }: { label: string; on: boolean; onPress: () => void; disabled?: boolean }) {
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      feedback="select"
      accessibilityRole="button"
      accessibilityState={{ selected: on, disabled }}
      style={[styles.chip, on && styles.chipOn, disabled && { opacity: 0.45 }]}
    >
      <Text style={[styles.chipText, on && { color: '#fff' }]}>{label}</Text>
    </Tap>
  );
}

export function Field(props: TextInputProps & { label: string; hint?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <T v="label">{props.label}</T>
      <TextInput
        placeholderTextColor={colors.faint}
        selectionColor={colors.accent}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[styles.input, focused && styles.inputFocused, props.style]}
      />
      {props.hint ? <T v="small" style={{ fontSize: 13 }}>{props.hint}</T> : null}
    </View>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  return message ? (
    <View style={styles.error}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  ) : null;
}

// A small rounded label, e.g. a stage name or a streak.
export function Pill({ children, tone = 'soft', style }: { children: ReactNode; tone?: 'soft' | 'glass' | 'gold' | 'good'; style?: StyleProp<ViewStyle> }) {
  const t = PILL_TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }, style]}>
      <Text style={[styles.pillText, { color: t.fg }]}>{children}</Text>
    </View>
  );
}

const PILL_TONES = {
  soft: { bg: colors.accentSoft, fg: colors.accentDeep },
  glass: { bg: 'rgba(255,255,255,0.72)', fg: colors.ink },
  gold: { bg: colors.goldSoft, fg: '#8A6300' },
  good: { bg: colors.goodSoft, fg: colors.good },
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 20, gap: 18 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, gap: 10, ...shadow },
  button: { minHeight: 56, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  buttonLift: { shadowColor: colors.accentDeep, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { fontFamily: fonts.bodyBlack, fontSize: 16, letterSpacing: 0.2 },
  chip: { paddingVertical: 11, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  chipOn: { backgroundColor: colors.ink },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: fonts.bodySemi,
    color: colors.ink,
  },
  inputFocused: { borderColor: colors.accent, backgroundColor: colors.surface },
  error: { backgroundColor: colors.dangerSoft, borderRadius: radius.sm, padding: 12 },
  errorText: { color: colors.danger, fontSize: 14, fontFamily: fonts.bodySemi, lineHeight: 20 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  pillText: { fontFamily: fonts.bodyBlack, fontSize: 13 },
});
