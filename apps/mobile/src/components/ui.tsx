import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useApp } from '@/lib/app-context';

const DEFAULT_COLORS = {
  primary: '#1d4ed8',
  onPrimary: '#ffffff',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#0f172a',
};

/** Couleurs de la commune (contrastes vérifiés à la création de la marque), sinon couleurs neutres. */
export function useColors() {
  const { branding } = useApp();
  return branding?.colors ?? DEFAULT_COLORS;
}

export function Screen({ children }: { children: ReactNode }) {
  const colors = useColors();
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children }: { children: ReactNode }) {
  const colors = useColors();
  return <View style={[styles.card, { backgroundColor: colors.surface }]}>{children}</View>;
}

export function Title({ children }: { children: ReactNode }) {
  const colors = useColors();
  return (
    <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
      {children}
    </Text>
  );
}

export function Body({ children, muted }: { children: ReactNode; muted?: boolean }) {
  const colors = useColors();
  return (
    <Text style={[styles.body, { color: colors.text }, muted && styles.muted]}>{children}</Text>
  );
}

export function Button({
  label,
  onPress,
  disabled,
  hint,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  hint?: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      accessibilityHint={hint}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.primary },
        (pressed || disabled) && styles.pressed,
      ]}
    >
      <Text style={[styles.buttonLabel, { color: colors.onPrimary }]}>{label}</Text>
    </Pressable>
  );
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator accessibilityLabel="Chargement" size="large" />
    </View>
  );
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center} accessibilityRole="alert">
      <Text style={styles.body}>{message}</Text>
      {onRetry ? (
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}>
          <Text style={styles.link}>Réessayer</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12 },
  card: {
    borderRadius: 12,
    padding: 16,
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#cbd5e1',
  },
  title: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22 },
  muted: { opacity: 0.75 },
  button: {
    minHeight: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  link: { fontSize: 16, fontWeight: '600', textDecorationLine: 'underline' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#64748b',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#0f172a',
  },
  label: { fontSize: 15, fontWeight: '600' },
});
