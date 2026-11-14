import { router } from 'expo-router';
import type { ComponentType, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/icons';
import { fonts, Tap, useColors } from '@/components/ui';
import { haptic } from '@/lib/feel';

type Tab = 'overview' | 'users' | 'monsters' | 'review';
type IconCmp = ComponentType<{ size?: number; color?: string }>;

const TABS: { key: Tab; label: string; icon: IconCmp; go: () => void }[] = [
  { key: 'overview', label: 'Overview', icon: Icon.grid, go: () => router.replace('/admin') },
  { key: 'users', label: 'Users', icon: Icon.users, go: () => router.replace('/admin/users') },
  { key: 'monsters', label: 'Monsters', icon: Icon.egg, go: () => router.replace('/admin/monsters') },
  { key: 'review', label: 'Review', icon: Icon.flag, go: () => router.replace({ pathname: '/admin/users', params: { filter: 'flagged' } }) },
];

// The admin bottom bar. Tabs replace each other, so Back always leaves admin.
export function AdminNav({ active, reviewCount }: { active: Tab; reviewCount?: number }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.nav, { backgroundColor: c.tabBg, borderTopColor: c.border, paddingBottom: Math.max(insets.bottom, 10) }]}>
      {TABS.map((t) => {
        const on = t.key === active;
        const color = on ? c.accent : c.muted;
        const Glyph = t.icon;
        return (
          <Pressable
            key={t.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t.key === 'review' && reviewCount ? `Review, ${reviewCount} waiting` : t.label}
            onPress={() => {
              if (on) return;
              haptic.select();
              t.go();
            }}
            style={styles.tab}
          >
            <View style={[styles.tabIcon, on && { backgroundColor: c.accentSoft, borderColor: c.accent }]}>
              <Glyph size={20} color={color} />
            </View>
            <Text style={[styles.tabLabel, { color }]}>{t.label}</Text>
            {t.key === 'review' && !!reviewCount && (
              <View style={[styles.badge, { backgroundColor: c.berry }]}>
                <Text style={styles.badgeText}>{reviewCount}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

// A scrolling admin page with top safe-area padding and the admin bar pinned below.
export function AdminPage({ active, reviewCount, children }: { active: Tab; reviewCount?: number; children: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 18, paddingBottom: 28, gap: 12 }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      <AdminNav active={active} reviewCount={reviewCount} />
    </View>
  );
}

// Square outlined icon button, like the search and back buttons in the admin header.
export function SquareButton({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  const c = useColors();
  return (
    <Tap accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.square, { borderColor: c.border, backgroundColor: c.card }]}>
      {children}
    </Tap>
  );
}

export function BackButton() {
  const c = useColors();
  return (
    <SquareButton label="Leave admin" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
      <Icon.chevronLeft size={20} color={c.ink} />
    </SquareButton>
  );
}

export function PageTitle({ children, right, back }: { children: string; right?: ReactNode; back?: boolean }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {back && <BackButton />}
      <Text style={{ flex: 1, fontFamily: fonts.display, fontSize: 26, color: c.ink, includeFontPadding: false }}>{children}</Text>
      {right}
    </View>
  );
}

// Three-way segmented control (date ranges).
export function Segmented<T extends string | number>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const c = useColors();
  return (
    <View accessibilityRole="radiogroup" style={[styles.segment, { backgroundColor: c.surfaceAlt }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => {
              haptic.select();
              onChange(o.value);
            }}
            style={[styles.segmentItem, on && { backgroundColor: c.card }]}
          >
            <Text style={{ fontFamily: fonts.bodyHeavy, fontSize: 13, color: on ? c.ink : c.muted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Outlined filter pill; the selected one turns sun-yellow.
export function FilterPill({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Tap
      feedback="select"
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[styles.filter, { borderColor: on ? '#E0A000' : c.border, backgroundColor: on ? c.goldSoft : c.card }]}
    >
      <Text style={{ fontFamily: fonts.bodyHeavy, fontSize: 13, color: on ? c.goldText : c.ink }}>{label}</Text>
    </Tap>
  );
}

export function LiveSwitch({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const c = useColors();
  return (
    <Switch
      accessibilityLabel={label}
      value={value}
      onValueChange={(v) => {
        haptic.select();
        onChange(v);
      }}
      trackColor={{ false: c.border, true: c.accent }}
      thumbColor="#FFFFFF"
      ios_backgroundColor={c.border}
    />
  );
}

// A grouped list card whose rows are split by thin lines.
export function ListCard({ children }: { children: ReactNode }) {
  const c = useColors();
  return <View style={[styles.list, { backgroundColor: c.card, borderColor: c.border }]}>{children}</View>;
}

export function ListRow({ first, children, onPress }: { first?: boolean; children: ReactNode; onPress?: () => void }) {
  const c = useColors();
  const style = [styles.row, !first && { borderTopWidth: 2, borderTopColor: c.surfaceAlt }];
  if (!onPress) return <View style={style}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [style, pressed && { backgroundColor: c.surfaceAlt }]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', borderTopWidth: 2, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon: { width: 52, height: 36, borderRadius: 12, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontFamily: fonts.bodyHeavy, fontSize: 11 },
  badge: { position: 'absolute', top: 0, left: '56%', minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFFFFF', fontFamily: fonts.bodyHeavy, fontSize: 11 },
  square: { width: 44, height: 44, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row', padding: 4, borderRadius: 14 },
  segmentItem: { flex: 1, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  filter: { height: 36, paddingHorizontal: 12, borderRadius: 12, borderWidth: 2, justifyContent: 'center' },
  list: { borderWidth: 2, borderBottomWidth: 5, borderRadius: 20, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12 },
});
