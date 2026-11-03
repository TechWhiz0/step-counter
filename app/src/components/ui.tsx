import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

export const colors = {
  bg: '#FFF8EE',
  card: '#FFFFFF',
  ink: '#2B2233',
  muted: '#7A6F80',
  accent: '#FF8A3D',
  accentSoft: '#FFE3CC',
  good: '#3DA35D',
  border: '#EFE4D6',
  gold: '#FFC531',
};

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: object }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

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
  const off = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.button,
        kind === 'secondary' && styles.buttonSecondary,
        kind === 'danger' && styles.buttonDanger,
        (pressed || off) && { opacity: 0.6 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={kind === 'primary' ? '#fff' : colors.ink} />
      ) : (
        <Text style={[styles.buttonText, kind !== 'primary' && { color: kind === 'danger' ? '#C0392B' : colors.ink }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput placeholderTextColor="#B3A9B8" {...props} style={[styles.input, props.style]} />
    </View>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  return message ? <Text style={styles.error}>{message}</Text> : null;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 20, gap: 16 },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 8 },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink },
  muted: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  button: { backgroundColor: colors.accent, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  buttonSecondary: { backgroundColor: colors.accentSoft },
  buttonDanger: { backgroundColor: '#FDECEA' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.ink },
  error: { color: '#C0392B', fontSize: 14 },
});
