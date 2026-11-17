import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type RefreshControlProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { haptic, useReducedMotion } from '@/lib/feel';
import { fmt, fonts, useColors } from '@/lib/theme';

export { fmt, fonts, useColors };

const GRAIN = require('../../assets/paper-grain.png');

// ---------- Surfaces ----------

// The faint paper texture. Sits over a surface and lets touches through.
export function Grain({ night }: { night?: boolean }) {
  // Tiled over a fixed large area and clipped by the surface, so it always covers the whole surface
  // (Android sizes a repeating image once, before the surface has its final size).
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      <Image source={GRAIN} resizeMode="repeat" style={{ width: 2048, height: 4096, opacity: night ? 0.35 : 1 }} accessibilityIgnoresInvertColors />
    </View>
  );
}

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  contentStyle?: StyleProp<ViewStyle>;
  keyboard?: boolean;
}

// A daily screen: a dark desk strip with small caps meta, then a sheet of paper with a curled top.
export function DeskScreen({
  left,
  right,
  back,
  children,
  scroll = true,
  footer,
  refreshControl,
  contentStyle,
  keyboard,
  night,
}: ScreenProps & { left?: ReactNode; right?: ReactNode; back?: boolean | (() => void); night?: boolean }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const Body = scroll ? ScrollView : View;
  const focused = useIsFocused();
  const reveal = useRevealOnKeyboard();
  const body = (
    <View style={{ flex: 1, backgroundColor: c.desk }}>
      {focused && <StatusBar style="light" />}
      <View style={[styles.deskBar, { paddingTop: insets.top + 6 }]}>
        {back ? <BackButton color={c.deskText} onPress={typeof back === 'function' ? back : undefined} /> : <View style={{ width: 12 }} />}
        <View style={styles.deskMeta}>
          {typeof left === 'string' ? <Meta color={c.deskText}>{left}</Meta> : left}
          {typeof right === 'string' ? <Meta color={c.deskText}>{right}</Meta> : right}
        </View>
      </View>
      <View style={[styles.sheet, { backgroundColor: c.paper }]}>
        <Grain night={night} />
        {keyboard ? (
          // Forms: the buttons scroll with the fields, so the keyboard never hides the field being typed in.
          <RevealContext.Provider value={reveal.reveal}>
            <ScrollView
              ref={reveal.scrollRef}
              style={{ flex: 1 }}
              onScroll={reveal.onScroll}
              scrollEventThrottle={32}
              contentContainerStyle={[{ flexGrow: 1 }, contentStyle]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
            >
              {children}
              <View style={{ flexGrow: 1, minHeight: 16 }} />
              {footer}
            </ScrollView>
          </RevealContext.Provider>
        ) : (
          <>
            <Body
              style={{ flex: 1 }}
              {...(scroll
                ? {
                    contentContainerStyle: [{ paddingBottom: footer ? 16 : 32 }, contentStyle],
                    keyboardShouldPersistTaps: 'handled' as const,
                    refreshControl,
                    showsVerticalScrollIndicator: false,
                  }
                : { style: [{ flex: 1 }, contentStyle] })}
            >
              {children}
            </Body>
            {footer}
          </>
        )}
      </View>
    </View>
  );
  if (!keyboard) return body;
  // With edge-to-edge Android the window no longer shrinks for the keyboard, so pad on both platforms.
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      {body}
    </KeyboardAvoidingView>
  );
}

// Scrolls a focused field into the visible part of the form once the keyboard is up.
type Measurable = { measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void };
const RevealContext = createContext<((node: Measurable | null) => void) | null>(null);

function useRevealOnKeyboard() {
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const y = useRef(0);
  const last = useRef<Measurable | null>(null);
  const run = useCallback(() => {
    const node = last.current;
    const scroller = scrollRef.current as unknown as Measurable | null;
    if (!node || !scroller) return;
    scroller.measureInWindow((_sx, sy, _sw, sh) => {
      node.measureInWindow((_x, ny, _w, nh) => {
        const top = ny - sy;
        const bottom = top + nh;
        // Keep the field (and a little room under it) inside the visible window.
        if (bottom + 24 > sh) scrollRef.current?.scrollTo({ y: y.current + bottom + 24 - sh, animated: true });
        else if (top < 12) scrollRef.current?.scrollTo({ y: Math.max(0, y.current + top - 12), animated: true });
      });
    });
  }, []);
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => setTimeout(run, 30));
    return () => sub.remove();
  }, [run]);
  return {
    scrollRef,
    onScroll: (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      y.current = e.nativeEvent.contentOffset.y;
    },
    reveal: (node: Measurable | null) => {
      last.current = node;
      setTimeout(run, 280);
    },
  };
}

// A full-paper screen (lists, settings): a typed header line, then content.
export function PaperScreen({
  title,
  right,
  back,
  children,
  scroll = true,
  footer,
  refreshControl,
  contentStyle,
}: ScreenProps & { title: string; right?: ReactNode; back?: boolean | (() => void) }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const Body = scroll ? ScrollView : View;
  const focused = useIsFocused();
  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      {focused && <StatusBar style="dark" />}
      <Grain />
      <View style={[styles.paperHead, { paddingTop: insets.top + 8 }]}>
        {back ? <BackButton color={c.ink} onPress={typeof back === 'function' ? back : undefined} /> : <View style={{ width: 16 }} />}
        <Text style={[styles.paperTitle, { color: c.ink }]} accessibilityRole="header">
          {title}
        </Text>
        <View style={{ marginLeft: 'auto', paddingRight: 16 }}>{right}</View>
      </View>
      <Body
        style={{ flex: 1 }}
        {...(scroll
          ? { contentContainerStyle: [{ paddingBottom: 32 }, contentStyle], keyboardShouldPersistTaps: 'handled' as const, refreshControl, showsVerticalScrollIndicator: false }
          : { style: [{ flex: 1 }, contentStyle] })}
      >
        {children}
      </Body>
      {footer}
    </View>
  );
}

function BackButton({ color, onPress }: { color: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={6}
      onPress={() => {
        haptic.tap();
        if (onPress) onPress();
        else if (router.canGoBack()) router.back();
        else router.replace('/');
      }}
      style={styles.back}
    >
      <Icon name="back" color={color} size={18} />
    </Pressable>
  );
}

// Fixed bottom area for a screen's main action(s).
export function Footer({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={{ paddingHorizontal: 28, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 16) + 16, gap: 6 }}>{children}</View>;
}

// ---------- Type ----------

type Variant = 'display' | 'title' | 'body' | 'small' | 'meta' | 'label' | 'num';

export function T({
  v = 'body',
  color,
  style,
  children,
  ...rest
}: { v?: Variant; color?: string; style?: StyleProp<TextStyle>; children: ReactNode } & Omit<React.ComponentProps<typeof Text>, 'style'>) {
  const c = useColors();
  const base = typeStyles[v];
  const tone = color ?? (v === 'meta' || v === 'small' ? c.muted : c.ink);
  return (
    <Text {...rest} style={[base, { color: tone }, style]} accessibilityRole={v === 'display' || v === 'title' ? 'header' : rest.accessibilityRole}>
      {children}
    </Text>
  );
}

export function Meta({ children, color, style }: { children: ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  return (
    <T v="meta" color={color} style={style}>
      {children}
    </T>
  );
}

// Typed text that is crossed out, the way a typewriter corrects. Used for finished things.
export function Struck({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return (
    <T style={[{ textDecorationLine: 'line-through', textDecorationColor: c.ink, color: c.muted }, style]}>{children}</T>
  );
}

// ---------- Controls ----------

export function Button({
  label,
  onPress,
  busy,
  disabled,
  kind = 'ink',
  style,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  kind?: 'ink' | 'outline' | 'link' | 'danger';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const c = useColors();
  const off = disabled || busy;
  if (kind === 'link' || kind === 'danger') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: !!off }}
        disabled={off}
        onPress={() => {
          haptic.tap();
          onPress();
        }}
        style={({ pressed }) => [styles.link, { opacity: off ? 0.5 : pressed ? 0.6 : 1 }, style]}
      >
        <Text style={[styles.linkText, { color: kind === 'danger' ? c.accent : c.inkSoft, textDecorationLine: kind === 'danger' ? 'none' : 'underline' }]}>
          {label}
        </Text>
      </Pressable>
    );
  }
  const outline = kind === 'outline';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      disabled={off}
      onPress={() => {
        haptic.press();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        outline
          ? { borderWidth: 1.5, borderColor: c.ink, backgroundColor: 'transparent' }
          : { backgroundColor: off ? c.faint : c.ink, borderBottomWidth: pressed ? 0 : 3, borderBottomColor: c.inkEdge },
        { transform: [{ translateY: pressed && !outline ? 3 : 0 }], opacity: outline && off ? 0.5 : 1 },
        style,
      ]}
    >
      {busy ? (
        <BusyLabel label={label} color={outline ? c.ink : c.onInk} />
      ) : (
        <Text style={[styles.buttonText, { color: outline ? c.ink : c.onInk }]}>{label}</Text>
      )}
    </Pressable>
  );
}

// A busy button keeps its label and breathes, instead of swapping it for a spinner.
function BusyLabel({ label, color }: { label: string; color: string }) {
  const opacity = usePulse();
  return <Animated.Text style={[styles.buttonText, { color, opacity }]}>{label}…</Animated.Text>;
}

// An underline field, like typing on a ruled line.
export function Field({
  label,
  error,
  hint,
  prefix,
  status,
  ...input
}: TextInputProps & { label: string; error?: string | null; hint?: string | null; prefix?: string; status?: 'ok' | 'bad' | null }) {
  const c = useColors();
  const reveal = useContext(RevealContext);
  const box = useRef<React.ComponentRef<typeof View>>(null);
  const lineColor = status === 'bad' || error ? c.accent : status === 'ok' ? c.sage : c.ruleStrong;
  const note = error ?? hint;
  return (
    <View style={{ gap: 6 }} ref={box} collapsable={false}>
      <Meta>{label}</Meta>
      <View style={[styles.fieldRow, { borderBottomColor: lineColor }]}>
        {prefix ? <Text style={[styles.fieldText, { color: c.muted }]}>{prefix}</Text> : null}
        <TextInput
          placeholderTextColor={c.faint}
          selectionColor={c.accent}
          accessibilityLabel={label}
          {...input}
          onChangeText={(t) => {
            haptic.key();
            input.onChangeText?.(t);
          }}
          onFocus={(e) => {
            reveal?.(box.current as unknown as Measurable | null);
            input.onFocus?.(e);
          }}
          style={[styles.fieldText, { color: c.ink, flex: 1 }, input.style]}
        />
        {status ? (
          <Icon name={status === 'ok' ? 'check' : 'cross'} color={status === 'ok' ? c.sage : c.accent} size={16} />
        ) : null}
      </View>
      {note ? (
        <T v="small" color={error || status === 'bad' ? c.accent : status === 'ok' ? c.sage : c.muted} accessibilityLiveRegion="polite">
          {note}
        </T>
      ) : null}
    </View>
  );
}

// A choice with the dashed outline from Platen's settings: dashed ink when picked.
export function Choice({
  on,
  onPress,
  children,
  style,
  disabled,
  label,
}: {
  on: boolean;
  onPress: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  label: string;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on, disabled }}
      disabled={disabled}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={({ pressed }) => [
        styles.choice,
        { borderColor: on ? c.ink : c.rule, backgroundColor: on ? c.paperRaised : 'transparent', opacity: pressed ? 0.7 : 1 },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

export function InkSwitch({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const c = useColors();
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(x, { toValue: value ? 1 : 0, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [value, x]);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={10}
      onPress={() => {
        haptic.select();
        onChange(!value);
      }}
      style={[styles.switch, { borderColor: c.ink, backgroundColor: value ? c.ink : 'transparent' }]}
    >
      <Animated.View
        style={[
          styles.knob,
          { backgroundColor: value ? c.onInk : c.ink, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] },
        ]}
      />
    </Pressable>
  );
}

export function ErrorText({ message, style }: { message?: string | null; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  if (!message) return null;
  return (
    <T v="small" color={c.accent} accessibilityLiveRegion="polite" accessibilityRole="alert" style={style}>
      {message}
    </T>
  );
}

// ---------- Skeletons (shown while something loads, instead of a spinner) ----------

// One shared pulse so every placeholder on screen breathes together.
const pulse = new Animated.Value(0);
let pulseUsers = 0;
let pulseLoop: Animated.CompositeAnimation | null = null;
function usePulse() {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    if (pulseUsers++ === 0) {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      );
      pulseLoop.start();
    }
    return () => {
      if (--pulseUsers === 0) pulseLoop?.stop();
    };
  }, [reduced]);
  return pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] });
}

export function Bone({ w = '100%', h = 14, r = 4, style }: { w?: number | `${number}%`; h?: number; r?: number; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const opacity = usePulse();
  return <Animated.View style={[{ width: w, height: h, borderRadius: r, backgroundColor: c.rule, opacity }, style]} />;
}

type SkeletonKind = 'list' | 'grid' | 'items' | 'stats' | 'today';

// A placeholder in the shape of what's coming: ruled rows, a grid of round stamps, closet chips, or Today.
export function Loading({ kind = 'list', rows = 6 }: { kind?: SkeletonKind; rows?: number; label?: string }) {
  const c = useColors();
  const body = (() => {
    if (kind === 'grid')
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, marginTop: 14 }}>
          {Array.from({ length: 9 }, (_, i) => (
            <View key={i} style={{ width: '33.33%', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
              <Bone w={84} h={84} r={42} />
              <Bone w={56} h={10} />
              <Bone w={70} h={8} />
            </View>
          ))}
        </View>
      );
    if (kind === 'items')
      return (
        <View style={{ paddingHorizontal: 28, gap: 18 }}>
          <View style={{ flexDirection: 'row', gap: 18, alignItems: 'center' }}>
            <Bone w={112} h={104} r={52} />
            <View style={{ flex: 1, gap: 10 }}>
              <Bone w="80%" />
              <Bone w="60%" h={10} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 22 }}>
            {Array.from({ length: 6 }, (_, i) => (
              <View key={i} style={{ width: '48%', alignItems: 'center', gap: 8 }}>
                <Bone w={86} h={42} r={21} />
                <Bone w={80} h={10} />
              </View>
            ))}
          </View>
        </View>
      );
    if (kind === 'stats')
      return (
        <View style={{ marginHorizontal: 28, gap: 16, marginTop: 8 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 18 }}>
            {Array.from({ length: 4 }, (_, i) => (
              <View key={i} style={{ width: '50%', gap: 8 }}>
                <Bone w={90} h={9} />
                <Bone w={70} h={20} />
              </View>
            ))}
          </View>
          <Bone h={46} r={14} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 80 }}>
            {[50, 62, 40, 70, 78, 58, 30].map((h, i) => (
              <Bone key={i} w={34} h={h} r={2} style={{ flex: 1 }} />
            ))}
          </View>
        </View>
      );
    if (kind === 'today')
      return (
        <View style={{ paddingTop: 28, gap: 18 }}>
          <View style={{ flexDirection: 'row', paddingHorizontal: 28, gap: 16 }}>
            <View style={{ flex: 1, gap: 10 }}>
              <Bone w="75%" />
              <Bone w="55%" />
              <Bone w="65%" />
            </View>
            <Bone w={66} h={66} r={33} />
          </View>
          <View style={{ alignItems: 'center' }}>
            <Bone w={150} h={140} r={70} />
          </View>
          <View style={{ paddingHorizontal: 10 }}>
            <Bone h={8} r={4} />
          </View>
          <View style={{ paddingHorizontal: 28, gap: 12, marginTop: 8 }}>
            <Bone w={120} h={9} />
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 40 }}>
              {Array.from({ length: 24 }, (_, i) => (
                <Bone key={i} w={4} h={6 + ((i * 7) % 26)} r={1} />
              ))}
            </View>
            <Bone w="70%" style={{ marginTop: 16 }} />
            <Bone w="60%" />
          </View>
        </View>
      );
    return (
      <View style={{ marginHorizontal: 28, marginTop: 14, borderTopWidth: 1, borderTopColor: c.rule }}>
        {Array.from({ length: rows }, (_, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 54, borderBottomWidth: 1, borderBottomColor: c.rule }}>
            <Bone w={34} h={30} r={15} />
            <View style={{ flex: 1, gap: 7 }}>
              <Bone w={`${55 + ((i * 17) % 35)}%`} h={11} />
              <Bone w="35%" h={8} />
            </View>
            <Bone w={54} h={11} />
          </View>
        ))}
      </View>
    );
  })();
  return (
    <View accessible accessibilityLabel="Loading" accessibilityState={{ busy: true }}>
      {body}
    </View>
  );
}

// ---------- Marks ----------

export function Rule({ dashed, color, style }: { dashed?: boolean; color?: string; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const stroke = color ?? (dashed ? c.ruleStrong : c.rule);
  if (!dashed) return <View style={[{ height: 1, backgroundColor: stroke }, style]} />;
  return (
    <View style={[{ height: 2 }, style]}>
      <Svg width="100%" height={2}>
        <Line x1="0" y1="1" x2="100%" y2="1" stroke={stroke} strokeWidth={1.5} strokeDasharray="5 4" />
      </Svg>
    </View>
  );
}

// A small rubber stamp: a number with a word under it, tilted.
export function Stamp({ value, label }: { value: string | number; label: string }) {
  const c = useColors();
  return (
    <View
      accessible
      accessibilityLabel={`${value} ${label.toLowerCase()}`}
      style={[styles.stamp, { borderColor: c.muted, transform: [{ rotate: '-8deg' }] }]}
    >
      <View style={[styles.stampInner, { borderColor: c.ruleStrong }]}>
        <Text style={{ fontFamily: fonts.display, fontSize: 22, color: c.inkSoft, lineHeight: 24 }}>{value}</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 7.5, letterSpacing: 1, color: c.muted }}>{label}</Text>
      </View>
    </View>
  );
}

// ---------- The step capsule on its rail ----------

// The rail is today's goal; the capsule slides along it as steps come in. Its window shows the count.
export function Rail({ steps, goal, night }: { steps: number; goal: number; night?: boolean }) {
  const c = useColors();
  const reduced = useReducedMotion();
  const p = goal ? Math.min(1, steps / goal) : 0;
  const pos = useRef(new Animated.Value(p)).current;
  const width = useRef(0);
  const anim = useRef(new Animated.Value(0)).current;
  const lastSteps = useRef(steps);
  const lastSound = useRef(0);
  useEffect(() => {
    if (reduced) pos.setValue(p);
    else Animated.spring(pos, { toValue: p, useNativeDriver: false, speed: 6, bounciness: 4 }).start();
  }, [p, pos, reduced]);
  // The capsule clicks along the rail as new steps come in.
  useEffect(() => {
    if (steps > lastSteps.current && lastSteps.current > 0 && Date.now() - lastSound.current > 1500 && p < 1) {
      lastSound.current = Date.now();
      haptic.ratchet();
    }
    lastSteps.current = steps;
  }, [steps, p]);
  const met = steps >= goal;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${fmt(steps)} of ${fmt(goal)} steps`}
      accessibilityValue={{ min: 0, max: goal, now: Math.min(steps, goal) }}
      style={{ height: 58 }}
      onLayout={(e) => {
        width.current = e.nativeEvent.layout.width;
        anim.setValue(e.nativeEvent.layout.width);
      }}
    >
      <View style={[styles.rail, { backgroundColor: night ? '#1E1C1A' : '#2F2C29', borderTopColor: night ? '#5A5550' : '#6A655F' }]} />
      <View style={[styles.railCap, { left: 4, backgroundColor: night ? '#161412' : '#24211F' }]} />
      <View style={[styles.railCap, { right: 4, backgroundColor: night ? '#161412' : '#24211F' }]} />
      <Animated.View
        style={[
          styles.capsuleWrap,
          {
            left: Animated.add(18, Animated.multiply(pos, Animated.subtract(anim, 134))) as unknown as number,
          },
        ]}
      >
        <View style={[styles.pinStem, { backgroundColor: night ? '#8F8676' : '#3B3835' }]} />
        <View style={[styles.pinBar, { backgroundColor: night ? '#8F8676' : '#3B3835' }]} />
        <View style={[styles.capsule, night ? styles.capsuleNight : styles.capsuleDay]}>
          <View
            style={[
              styles.capsuleDot,
              { backgroundColor: night ? '#F2B56E' : met ? c.sageSoft : c.sageSoft },
              night && { shadowColor: '#F2B56E', shadowOpacity: 0.9, shadowRadius: 6, elevation: 4 },
            ]}
          />
          <Text style={[styles.capsuleText, { color: night ? '#F3E9D8' : '#2A2622' }]}>{fmt(steps)}</Text>
        </View>
        {!night && <View style={[styles.capsuleLine, { backgroundColor: c.accent }]} />}
      </Animated.View>
    </View>
  );
}

// 24 ink ticks, one per hour, the current hour in terracotta, future hours as faint stubs.
export function Rhythm({ hourly, nowHour, max = 1000 }: { hourly: number[]; nowHour: number; max?: number }) {
  const c = useColors();
  const top = Math.max(max, ...hourly);
  return (
    <View accessible accessibilityLabel={`Steps per hour today, most around ${peakLabel(hourly)}`}>
      <View style={[styles.ticks, { borderBottomColor: c.rule }]}>
        {hourly.map((v, i) => (
          <View
            key={i}
            style={{
              width: 4,
              borderTopLeftRadius: 1,
              borderTopRightRadius: 1,
              height: i > nowHour ? 3 : Math.max(3, Math.round((v / top) * 38)),
              backgroundColor: i > nowHour ? c.rule : i === nowHour ? c.accent : c.ink,
            }}
          />
        ))}
      </View>
      <View style={styles.tickLabels}>
        {['12a', '6a', '12p', '6p', '12a'].map((l, i) => (
          <T key={i} v="small" style={{ fontSize: 10 }}>
            {l}
          </T>
        ))}
      </View>
    </View>
  );
}

function peakLabel(hourly: number[]) {
  const h = hourly.indexOf(Math.max(...hourly));
  if (h < 0 || !hourly[h]) return 'no hour yet';
  return h === 0 ? 'midnight' : h < 12 ? `${h} am` : h === 12 ? 'noon' : `${h - 12} pm`;
}

// ---------- Icons (inline strokes, never emoji) ----------

type IconName = 'back' | 'check' | 'cross' | 'search' | 'plus' | 'minus' | 'spark' | 'chevron' | 'me' | 'lamp';

export function Icon({ name, size = 18, color }: { name: IconName; size?: number; color?: string }) {
  const c = useColors();
  const stroke = color ?? c.ink;
  const common = { fill: 'none', stroke, strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {name === 'back' && <Path d="M11 3L5 9l6 6" {...common} />}
      {name === 'chevron' && <Path d="M7 3l6 6-6 6" {...common} />}
      {name === 'check' && <Path d="M3.5 9.5l3.5 3.5 7.5-8" {...common} />}
      {name === 'cross' && <Path d="M4.5 4.5l9 9M13.5 4.5l-9 9" {...common} />}
      {name === 'plus' && <Path d="M9 3.5v11M3.5 9h11" {...common} />}
      {name === 'minus' && <Path d="M3.5 9h11" {...common} />}
      {name === 'search' && (
        <>
          <Circle cx="8" cy="8" r="5" {...common} />
          <Path d="M12 12l3.5 3.5" {...common} />
        </>
      )}
      {name === 'spark' && <Path d="M9 1.5v4M9 12.5v4M1.5 9h4M12.5 9h4M3.7 3.7l2 2M12.3 12.3l2 2M14.3 3.7l-2 2M5.7 12.3l-2 2" {...common} />}
      {name === 'me' && (
        <>
          <Circle cx="9" cy="6.5" r="3.2" {...common} />
          <Path d="M3 16c.8-3.2 3.2-5 6-5s5.2 1.8 6 5" {...common} />
        </>
      )}
      {name === 'lamp' && <Path d="M5 3h8l2 6H3l2-6zM9 9v5M6 15.5h6" {...common} />}
    </Svg>
  );
}

// ---------- Tab bar ----------

export function TextTabs({
  tabs,
  active,
  onPress,
  badge,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  onPress: (key: string) => void;
  badge?: Record<string, number | undefined>;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.tabs, { backgroundColor: c.paperShade, borderTopColor: c.rule, paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      {tabs.map((t) => {
        const on = t.key === active;
        const n = badge?.[t.key];
        return (
          <Pressable
            key={t.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={n ? `${t.label}, ${n} waiting` : t.label}
            onPress={() => {
              if (on) return;
              haptic.page();
              onPress(t.key);
            }}
            style={styles.tab}
          >
            <Text
              style={[
                styles.tabText,
                { color: on ? c.ink : c.muted, fontFamily: on ? fonts.bodyBold : fonts.body },
                on && { textDecorationLine: 'underline', textDecorationColor: c.ink },
              ]}
            >
              {t.label}
              {n ? <Text style={{ color: c.accent }}>{`  ${n}`}</Text> : null}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- Styles ----------

const typeStyles = StyleSheet.create({
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, letterSpacing: -0.3 },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30 },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  small: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18 },
  meta: { fontFamily: fonts.body, fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase' },
  label: { fontFamily: fonts.bodyBold, fontSize: 13.5, lineHeight: 19 },
  num: { fontFamily: fonts.bodyBold, fontSize: 20, lineHeight: 24 },
});

const styles = StyleSheet.create({
  deskBar: { flexDirection: 'row', alignItems: 'center', paddingRight: 28, paddingBottom: 12, minHeight: 44 },
  deskMeta: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  paperHead: { flexDirection: 'row', alignItems: 'center', paddingBottom: 6, minHeight: 50 },
  paperTitle: { fontFamily: fonts.bodyBold, fontSize: 14 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  button: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  buttonText: { fontFamily: fonts.bodyBold, fontSize: 15, letterSpacing: 0.6 },
  link: { minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  linkText: { fontFamily: fonts.body, fontSize: 13.5 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5, minHeight: 44, gap: 4 },
  fieldText: { fontFamily: fonts.body, fontSize: 16, paddingVertical: 8 },
  choice: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 16, minHeight: 44 },
  switch: { width: 46, height: 26, borderRadius: 13, borderWidth: 1.5, padding: 2, justifyContent: 'center' },
  knob: { width: 18, height: 18, borderRadius: 9 },
  stamp: { width: 66, height: 66, borderRadius: 33, borderWidth: 1.5, padding: 4 },
  stampInner: { flex: 1, borderRadius: 30, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rail: { position: 'absolute', left: 10, right: 10, top: 27, height: 7, borderRadius: 4, borderTopWidth: 2 },
  railCap: { position: 'absolute', top: 23, width: 12, height: 15, borderRadius: 3 },
  capsuleWrap: { position: 'absolute', top: 9, width: 98, height: 40 },
  pinStem: { position: 'absolute', left: 47, top: -9, width: 3, height: 10, borderRadius: 1 },
  pinBar: { position: 'absolute', left: 42, top: -11, width: 13, height: 3, borderRadius: 1 },
  capsule: {
    flex: 1,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderTopWidth: 1,
    shadowColor: '#2A1C12',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  capsuleDay: { backgroundColor: '#F4EFE5', borderTopColor: '#FFFFFF', borderBottomWidth: 2, borderBottomColor: '#DDD4C3' },
  capsuleNight: { backgroundColor: '#2E2A26', borderTopColor: 'rgba(255,255,255,0.12)' },
  capsuleDot: { width: 6, height: 6, borderRadius: 3 },
  capsuleText: { fontFamily: fonts.bodyBold, fontSize: 14, letterSpacing: 0.5 },
  capsuleLine: { position: 'absolute', left: 30, right: 30, bottom: 7, height: 2, borderRadius: 1, opacity: 0.85 },
  ticks: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 40, borderBottomWidth: 1 },
  tickLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  tabs: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 6, paddingHorizontal: 12 },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 12.5 },
});
