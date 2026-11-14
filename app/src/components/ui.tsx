import { Ionicons } from '@expo/vector-icons';
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
import { useColors, useTheme, type Palette, type ThemeMode } from '@/lib/theme';

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

// White card sitting on a soft flat edge, like a chunky toy tile.
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View>
      <View style={[StyleSheet.absoluteFill, styles.cardEdge, { backgroundColor: c.shadow }]} />
      <View style={[styles.card, { backgroundColor: c.card }, style]}>{children}</View>
    </View>
  );
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

type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';

function buttonLook(c: Palette, kind: ButtonKind) {
  return {
    primary: { face: c.accent, edge: c.accentDeep, text: c.onAccent, border: c.accent },
    secondary: { face: c.card, edge: c.line, text: c.accentText, border: c.line },
    ghost: { face: c.surfaceAlt, edge: c.border, text: c.ink, border: c.surfaceAlt },
    danger: { face: c.dangerSoft, edge: c.dangerEdge, text: c.danger, border: c.dangerSoft },
    dark: { face: c.ink, edge: c.night, text: c.bg, border: c.ink },
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

const MODES: { mode: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: 'light', label: 'Light', icon: 'sunny' },
  { mode: 'dark', label: 'Dark', icon: 'moon' },
  { mode: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

// Light / Dark / System switch with a pill that slides to the chosen option.
export function ThemePicker() {
  const c = useColors();
  const { mode, setMode } = useTheme();
  const [width, setWidth] = useState(0);
  const index = MODES.findIndex((m) => m.mode === mode);
  const x = useRef(new Animated.Value(index)).current;

  useEffect(() => {
    Animated.spring(x, { toValue: index, useNativeDriver: true, speed: 18, bounciness: 10 }).start();
  }, [index, x]);

  const slot = width / MODES.length;
  return (
    <View
      accessibilityRole="radiogroup"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width - 8)}
      style={[styles.segment, { backgroundColor: c.accentSoft }]}
    >
      {width > 0 && (
        <Animated.View
          style={[
            styles.segmentPill,
            { width: slot, backgroundColor: c.card, transform: [{ translateX: Animated.multiply(x, slot) }] },
          ]}
        />
      )}
      {MODES.map((m) => {
        const on = m.mode === mode;
        return (
          <Pressable
            key={m.mode}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => {
              tapFeedback();
              setMode(m.mode);
            }}
            style={styles.segmentItem}
          >
            <Ionicons name={m.icon} size={16} color={on ? c.accent : c.muted} />
            <RNText style={[styles.segmentText, { color: on ? c.ink : c.muted }]}>{m.label}</RNText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 22, gap: 18 },
  card: { borderRadius: 22, padding: 18, gap: 8 },
  cardEdge: { borderRadius: 22, top: 4, bottom: -4 },
  title: { fontFamily: fonts.display, fontSize: 28, includeFontPadding: false },
  muted: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  buttonEdge: { position: 'absolute', left: 0, right: 0, top: EDGE, bottom: 0, borderRadius: 999 },
  button: { paddingVertical: 14, alignItems: 'center', borderRadius: 999, borderWidth: 2 },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { fontFamily: fonts.bodyHeavy, fontSize: 17, letterSpacing: 0.2 },
  chip: { paddingVertical: 11, paddingHorizontal: 16, borderRadius: radius.pill },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 15 },
  label: { fontFamily: fonts.bodyBold, fontSize: 14 },
  input: { borderWidth: 2, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 13, fontSize: 16, fontFamily: fonts.bodySemi },
  error: { fontFamily: fonts.bodyBold, fontSize: 14 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  pillText: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  segment: { flexDirection: 'row', borderRadius: 999, padding: 4 },
  segmentPill: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 999 },
  segmentItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  segmentText: { fontFamily: fonts.bodyBold, fontSize: 14 },
});
