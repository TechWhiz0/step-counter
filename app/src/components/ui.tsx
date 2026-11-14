import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { haptic } from '@/lib/feel';
import { tapFeedback } from '@/lib/haptics';
import Svg, { Circle } from 'react-native-svg';
import { useColors, useTheme, type Palette } from '@/lib/theme';
import { Icon } from './icons';

export { useColors, useTheme };

// Loaded once in app/_layout.tsx.
export const fonts = {
  display: 'Baloo2_800ExtraBold',
  displaySoft: 'Baloo2_700Bold',
  displayBold: 'Baloo2_800ExtraBold',
  body: 'Nunito_400Regular',
  bodySemi: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyHeavy: 'Nunito_800ExtraBold',
  bodyBlack: 'Nunito_800ExtraBold',
};

export const radius = { sm: 12, md: 16, lg: 24, xl: 32, pill: 999 };

export const shadow: ViewStyle = {
  shadowColor: '#1E5A32',
  shadowOpacity: 0.08,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};

// Custom fonts on Android ignore fontWeight, so pick the family from the weight instead.
// Big heavy text (titles, step counts) gets the rounded Baloo display face; everything else is Nunito.
function familyFor(style: TextStyle): string | undefined {
  if (style.fontFamily) return style.fontFamily;
  if (style.fontWeight === undefined && style.fontSize === undefined) return undefined; // inherit from parent Text
  const w = style.fontWeight === 'bold' ? 700 : Number(style.fontWeight ?? 400);
  const size = style.fontSize ?? 14;
  if (w >= 800 && size >= 20) return fonts.display;
  if (w >= 800) return fonts.bodyHeavy;
  if (w >= 700) return fonts.bodyBold;
  if (w >= 600) return fonts.bodySemi;
  return fonts.body;
}

export function Text({ style, ...rest }: TextProps) {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const fontFamily = familyFor(flat);
  if (!fontFamily || flat.fontFamily) return <RNText {...rest} style={style} />;
  const display = fontFamily === fonts.display;
  return <RNText {...rest} style={[style, { fontFamily, fontWeight: 'normal' }, display && { includeFontPadding: false }]} />;
}

type Variant = 'hero' | 'title' | 'h2' | 'h3' | 'body' | 'bodyStrong' | 'small' | 'label' | 'number';

const VARIANTS: Record<Variant, TextStyle> = {
  hero: { fontFamily: fonts.display, fontSize: 40, lineHeight: 46, letterSpacing: -0.5, includeFontPadding: false },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.3, includeFontPadding: false },
  h2: { fontFamily: fonts.displaySoft, fontSize: 20, lineHeight: 26, includeFontPadding: false },
  h3: { fontFamily: fonts.bodyHeavy, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.bodyHeavy, fontSize: 12, lineHeight: 16, letterSpacing: 0.8, textTransform: 'uppercase' },
  number: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, fontVariant: ['tabular-nums'], includeFontPadding: false },
};

// Typography with the theme's ink; small and label text use the muted tone.
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
  const c = useColors();
  const color = v === 'small' || v === 'label' ? c.muted : c.ink;
  return (
    <RNText style={[VARIANTS[v], { color }, style]} numberOfLines={numberOfLines}>
      {children}
    </RNText>
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
  const c = useColors();
  return <View style={[styles.screen, { backgroundColor: c.bg }, style]}>{children}</View>;
}

// A chunky tile: outlined, sitting on a thicker bottom ledge.
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, style]}>{children}</View>;
}

export function Title({ children }: { children: ReactNode }) {
  const c = useColors();
  return <RNText style={[styles.title, { color: c.ink }]}>{children}</RNText>;
}

export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Text style={[styles.muted, { color: c.muted }, style]}>{children}</Text>;
}

const EDGE = 5;

type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark' | 'grape';

function buttonLook(c: Palette, kind: ButtonKind) {
  return {
    primary: { face: c.accent, edge: c.accentDeep, text: c.onAccent, border: c.accent },
    secondary: { face: c.card, edge: c.border, text: c.skyText, border: c.border },
    ghost: { face: c.surfaceAlt, edge: c.border, text: c.ink, border: c.surfaceAlt },
    danger: { face: c.dangerSoft, edge: c.dangerEdge, text: c.danger, border: c.dangerSoft },
    dark: { face: c.ink, edge: c.night, text: c.bg, border: c.ink },
    grape: { face: c.grape, edge: c.grapeDeep, text: '#FFFFFF', border: c.grape },
  }[kind];
}

// A 3D button: the face sits on a darker edge and squishes down onto it when pressed, then springs back.
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
  kind?: ButtonKind;
  busy?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  const c = useColors();
  const off = !!(disabled || busy);
  const press = useRef(new Animated.Value(0)).current;
  const spring = (toValue: number) =>
    Animated.spring(press, { toValue, useNativeDriver: true, speed: 40, bounciness: toValue ? 0 : 14 }).start();
  const look = buttonLook(c, kind);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: !!busy }}
      disabled={off}
      onPress={onPress}
      onPressIn={() => {
        spring(1);
        tapFeedback();
      }}
      onPressOut={() => spring(0)}
      style={{ paddingBottom: EDGE }}
    >
      <View style={[styles.buttonEdge, { backgroundColor: off ? c.border : look.edge }]} />
      <Animated.View
        style={[
          styles.button,
          { backgroundColor: off ? c.disabledFace : look.face, borderColor: off ? c.border : look.border },
          { transform: [{ translateY: press.interpolate({ inputRange: [-1, 0, 1], outputRange: [-EDGE, 0, EDGE] }) }] },
        ]}
      >
        {busy ? (
          <ActivityIndicator color={look.text} />
        ) : (
          <View style={styles.buttonRow}>
            {icon}
            <RNText style={[styles.buttonText, { color: off ? c.muted : look.text }]}>{label}</RNText>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// A selectable pill, for goal pickers and the wardrobe.
export function Chip({ label, on, onPress, disabled }: { label: string; on: boolean; onPress: () => void; disabled?: boolean }) {
  const c = useColors();
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      feedback="select"
      accessibilityRole="button"
      accessibilityState={{ selected: on, disabled }}
      style={[styles.chip, { backgroundColor: on ? c.accent : c.surfaceAlt }, disabled && { opacity: 0.45 }]}
    >
      <RNText style={[styles.chipText, { color: on ? c.onAccent : c.ink }]}>{label}</RNText>
    </Tap>
  );
}

export function Field(props: TextInputProps & { label: string; hint?: string }) {
  const c = useColors();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <RNText style={[styles.label, { color: c.ink }]}>{props.label}</RNText>
      <TextInput
        placeholderTextColor={c.muted}
        selectionColor={c.accent}
        cursorColor={c.accent}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[
          styles.input,
          { backgroundColor: c.card, color: c.ink, borderColor: focused ? c.accent : c.inputBorder },
          props.style,
        ]}
      />
      {props.hint ? <T v="small" style={{ fontSize: 13 }}>{props.hint}</T> : null}
    </View>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  const c = useColors();
  return message ? <RNText style={[styles.error, { color: c.danger }]}>{message}</RNText> : null;
}

// A small rounded label, e.g. a stage name or a streak.
export function Pill({ children, tone = 'soft', style }: { children: ReactNode; tone?: 'soft' | 'glass' | 'gold' | 'good'; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const t = {
    soft: { bg: c.accentSoft, fg: c.accentText },
    glass: { bg: c.card + 'B8', fg: c.ink },
    gold: { bg: c.goldSoft, fg: c.goldText },
    good: { bg: c.goodSoft, fg: c.good },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }, style]}>
      <RNText style={[styles.pillText, { color: t.fg }]}>{children}</RNText>
    </View>
  );
}

// ---- Quest Meadow game pieces ----

export const compact = (n: number) =>
  n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `${Math.round(n / 1000)}k` : n.toLocaleString('en');

// Header counters: streak (sun), lifetime steps (sky), treats (berry).
export function StatChip({ tone, icon, value, label }: { tone: 'sun' | 'sky' | 'berry' | 'grape'; icon: ReactNode; value: string | number; label?: string }) {
  const c = useColors();
  const t = {
    sun: { bg: c.goldSoft, fg: c.goldText },
    sky: { bg: c.skySoft, fg: c.skyText },
    berry: { bg: c.berrySoft, fg: c.berryText },
    grape: { bg: c.grapeSoft, fg: c.grapeText },
  }[tone];
  return (
    <View accessibilityLabel={label} style={[styles.statChip, { backgroundColor: t.bg }]}>
      {icon}
      <RNText style={[styles.statChipText, { color: t.fg }]}>{value}</RNText>
    </View>
  );
}

// A rounded progress bar that springs to its value, with an optional centred label.
export function Bar({
  value,
  color,
  height = 16,
  label,
  labelColor,
  track,
}: {
  value: number;
  color?: string;
  height?: number;
  label?: string;
  labelColor?: string;
  track?: string;
}) {
  const c = useColors();
  const w = useRef(new Animated.Value(0)).current;
  const v = Math.max(0, Math.min(1, value));
  useEffect(() => {
    Animated.spring(w, { toValue: v, useNativeDriver: false, speed: 10, bounciness: 6 }).start();
  }, [v, w]);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
      style={{ height, borderRadius: 999, backgroundColor: track ?? c.surfaceAlt, overflow: 'hidden', justifyContent: 'center' }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          borderRadius: 999,
          backgroundColor: color ?? c.accent,
          width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
      {label ? (
        <RNText style={{ textAlign: 'center', fontFamily: fonts.bodyHeavy, fontSize: height >= 18 ? 12 : 11, color: labelColor ?? c.muted }}>{label}</RNText>
      ) : null}
    </View>
  );
}

// A square soft-colour tile holding an icon, used at the start of quest and list rows.
export function IconTile({ children, bg, size = 40, radius: r = 12 }: { children: ReactNode; bg: string; size?: number; radius?: number }) {
  return <View style={{ width: size, height: size, borderRadius: r, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>{children}</View>;
}

// A small ledge button for inline actions like "Claim" or "Wear".
export function SmallButton({
  label,
  onPress,
  tone = 'sun',
  disabled,
}: {
  label: string;
  onPress: () => void;
  tone?: 'sun' | 'grass' | 'plain' | 'grape';
  disabled?: boolean;
}) {
  const c = useColors();
  const look = {
    sun: { face: c.gold, edge: '#E0A000', text: '#1D2433' },
    grass: { face: c.accent, edge: c.accentDeep, text: c.onAccent },
    plain: { face: c.card, edge: c.border, text: c.ink },
    grape: { face: c.grape, edge: c.grapeDeep, text: '#FFFFFF' },
  }[tone];
  const press = useRef(new Animated.Value(0)).current;
  const spring = (toValue: number) => Animated.spring(press, { toValue, useNativeDriver: true, speed: 40, bounciness: toValue ? 0 : 12 }).start();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        spring(1);
        tapFeedback();
      }}
      onPressOut={() => spring(0)}
      style={{ paddingBottom: 3, opacity: disabled ? 0.5 : 1 }}
    >
      <View style={{ position: 'absolute', left: 0, right: 0, top: 3, bottom: 0, borderRadius: 10, backgroundColor: look.edge }} />
      <Animated.View
        style={[
          styles.smallButton,
          { backgroundColor: look.face, borderColor: tone === 'plain' ? c.border : look.face },
          { transform: [{ translateY: press.interpolate({ inputRange: [0, 1], outputRange: [0, 3] }) }] },
        ]}
      >
        <RNText style={[styles.smallButtonText, { color: look.text }]}>{label}</RNText>
      </Animated.View>
    </Pressable>
  );
}

// A donut ring with a value in the middle.
export function Ring({ value, size = 78, stroke = 18, color, track, children }: { value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode }) {
  const c = useColors();
  const r = 60 - stroke / 2 - 3;
  const circ = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 120 120" style={StyleSheet.absoluteFill}>
        <Circle cx={60} cy={60} r={r} stroke={track ?? c.accentSoft} strokeWidth={stroke} fill="none" />
        {v > 0 && (
          <Circle
            cx={60}
            cy={60}
            r={r}
            stroke={color ?? c.accent}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circ * v} ${circ}`}
            transform="rotate(-90 60 60)"
          />
        )}
      </Svg>
      {children}
    </View>
  );
}

// Section heading inside a card: Baloo title with an optional muted note on the right.
export function CardHeader({ title, note, right }: { title: string; note?: string; right?: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <RNText style={{ fontFamily: fonts.display, fontSize: 21, color: c.ink, includeFontPadding: false }}>{title}</RNText>
      {note ? <RNText style={{ fontFamily: fonts.bodyHeavy, fontSize: 12, color: c.muted }}>{note}</RNText> : null}
      {right}
    </View>
  );
}

// The top-of-screen bar: streak, lifetime steps and treats, with an optional button on the right.
export function TopBar({ streak, lifetime, treats, right }: { streak: number; lifetime: number; treats: number; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <StatChip tone="sun" icon={<Icon.flame size={18} />} value={streak} label={`${streak} day streak`} />
      <StatChip tone="sky" icon={<Icon.feet size={18} />} value={compact(lifetime)} label={`${lifetime.toLocaleString('en')} lifetime steps`} />
      <StatChip tone="berry" icon={<Icon.berry size={18} />} value={treats} label={`${treats} treats`} />
      <View style={{ flex: 1 }} />
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  statChip: { height: 34, paddingHorizontal: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
  statChipText: { fontFamily: fonts.bodyHeavy, fontSize: 15 },
  smallButton: { height: 34, paddingHorizontal: 12, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  smallButtonText: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  screen: { flex: 1, padding: 22, gap: 18 },
  card: { borderRadius: 22, padding: 16, gap: 8, borderWidth: 2, borderBottomWidth: 5 },
  title: { fontFamily: fonts.display, fontSize: 28, includeFontPadding: false },
  muted: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  buttonEdge: { position: 'absolute', left: 0, right: 0, top: EDGE, bottom: 0, borderRadius: 16 },
  button: { minHeight: 54, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 2 },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { fontFamily: fonts.bodyHeavy, fontSize: 16, letterSpacing: 0.6, textTransform: 'uppercase' },
  chip: { paddingVertical: 11, paddingHorizontal: 16, borderRadius: radius.pill },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 15 },
  label: { fontFamily: fonts.bodyBold, fontSize: 14 },
  input: { borderWidth: 2, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 13, fontSize: 16, fontFamily: fonts.bodySemi },
  error: { fontFamily: fonts.bodyBold, fontSize: 14 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  pillText: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
});
