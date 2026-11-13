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
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { tapFeedback } from '@/lib/haptics';
import { useColors, useTheme, type ThemeMode } from '@/lib/theme';

export { useColors, useTheme };

// Loaded once in app/_layout.tsx.
export const fonts = {
  display: 'Baloo2_800ExtraBold',
  displaySoft: 'Baloo2_700Bold',
  body: 'Nunito_400Regular',
  bodySemi: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyHeavy: 'Nunito_800ExtraBold',
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

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useColors();
  return <View style={[styles.screen, { backgroundColor: c.bg }, style]}>{children}</View>;
}

// White card sitting on a soft flat edge, like a chunky toy tile.
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
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

export function Muted({ children, style }: { children: ReactNode; style?: TextStyle }) {
  const c = useColors();
  return <Text style={[styles.muted, { color: c.muted }, style]}>{children}</Text>;
}

const EDGE = 5;

// A 3D button: the face sits on a darker edge and squishes down onto it when pressed, then springs back.
export function Button({
  label,
  onPress,
  kind = 'primary',
  busy,
  disabled,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger';
  busy?: boolean;
  disabled?: boolean;
}) {
  const c = useColors();
  const off = !!(disabled || busy);
  const press = useRef(new Animated.Value(0)).current;
  const spring = (toValue: number) =>
    Animated.spring(press, { toValue, useNativeDriver: true, speed: 40, bounciness: toValue ? 0 : 14 }).start();

  const look = {
    primary: { face: c.accent, edge: c.accentDeep, text: c.onAccent, border: c.accent },
    secondary: { face: c.card, edge: c.line, text: c.accentText, border: c.line },
    danger: { face: c.dangerSoft, edge: c.dangerEdge, text: c.danger, border: c.dangerSoft },
  }[kind];

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
          <RNText style={[styles.buttonText, { color: off ? c.muted : look.text }]}>{label}</RNText>
        )}
      </Animated.View>
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label: string }) {
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
    </View>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  const c = useColors();
  return message ? <RNText style={[styles.error, { color: c.danger }]}>{message}</RNText> : null;
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
  buttonText: { fontFamily: fonts.bodyHeavy, fontSize: 17, letterSpacing: 0.2 },
  label: { fontFamily: fonts.bodyBold, fontSize: 14 },
  input: { borderWidth: 2, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 13, fontSize: 16, fontFamily: fonts.bodySemi },
  error: { fontFamily: fonts.bodyBold, fontSize: 14 },
  segment: { flexDirection: 'row', borderRadius: 999, padding: 4 },
  segmentPill: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 999 },
  segmentItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  segmentText: { fontFamily: fonts.bodyBold, fontSize: 14 },
});
