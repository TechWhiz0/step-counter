import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { haptic } from '@/lib/feel';
import { Button, fonts, useColors } from './ui';

// The app's own pop-up, used instead of Android's plain grey alert box.
// Call it like Alert.alert:  dialog('Leave group?', 'You can join again later.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Leave', style: 'destructive', onPress }])
// <DialogHost /> is mounted once in the root layout.

export interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
}

interface DialogRequest {
  title: string;
  message?: string;
  buttons: DialogButton[];
  art?: ReactNode;
}

let show: ((d: DialogRequest) => void) | null = null;
const queue: DialogRequest[] = [];

export function dialog(title: string, message?: string, buttons?: DialogButton[], options?: { art?: ReactNode }) {
  const req: DialogRequest = { title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }], art: options?.art };
  if (show) show(req);
  else queue.push(req);
}

export function DialogHost() {
  const c = useColors();
  const [current, setCurrent] = useState<DialogRequest | null>(null);
  const pending = useRef<DialogRequest[]>([]);
  const fade = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    show = (d) => {
      setCurrent((cur) => {
        if (cur) {
          pending.current.push(d);
          return cur;
        }
        return d;
      });
    };
    queue.splice(0).forEach((d) => show?.(d));
    return () => {
      show = null;
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    haptic.tap();
    fade.setValue(0);
    pop.setValue(0);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, speed: 16, bounciness: 9, useNativeDriver: true }),
    ]).start();
  }, [current, fade, pop]);

  const close = (then?: () => void | Promise<void>) => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(pop, { toValue: 0, duration: 130, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => {
      setCurrent(pending.current.shift() ?? null);
      void then?.();
    });
  };

  if (!current) return null;
  const cancel = current.buttons.find((b) => b.style === 'cancel');
  // Main actions first (stacked full width), the cancel choice last as a quiet button.
  const actions = current.buttons.filter((b) => b.style !== 'cancel');

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={() => close(cancel?.onPress)}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { opacity: fade }]}>
        {/* Tapping outside counts as cancel when there is one; a plain message just closes. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={() => (cancel || actions.length <= 1 ? close(cancel?.onPress) : undefined)} accessibilityLabel="Close" />
        <Animated.View
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={[
            styles.card,
            { backgroundColor: c.card, borderColor: c.border },
            {
              transform: [
                { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) },
                { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
              ],
            },
          ]}
        >
          {current.art ? <View style={styles.art}>{current.art}</View> : null}
          <Text style={[styles.title, { color: c.ink }]}>{current.title}</Text>
          {current.message ? <Text style={[styles.message, { color: c.muted }]}>{current.message}</Text> : null}
          <View style={styles.buttons}>
            {actions.map((b) => (
              <Button key={b.text} label={b.text} kind={b.style === 'destructive' ? 'danger' : 'primary'} onPress={() => close(b.onPress)} />
            ))}
            {cancel ? <Button label={cancel.text} kind="secondary" onPress={() => close(cancel.onPress)} /> : null}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: '#10151F99', alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { width: '100%', maxWidth: 360, borderRadius: 28, borderWidth: 2, borderBottomWidth: 6, padding: 22, paddingTop: 18, gap: 8, alignItems: 'center' },
  art: { marginBottom: 2 },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, textAlign: 'center', includeFontPadding: false },
  message: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  buttons: { alignSelf: 'stretch', gap: 10, marginTop: 10 },
});
