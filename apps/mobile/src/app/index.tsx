import type { Href } from 'expo-router';
import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { Body, Card, Screen, styles, useColors } from '@/components/ui';
import { useApp } from '@/lib/app-context';

const ENTRIES: { label: string; hint: string; href: Href }[] = [
  { label: 'Actualités', hint: 'Les dernières informations de la commune', href: '/news' },
  { label: 'Agenda', hint: 'Les prochains événements', href: '/events' },
  { label: 'Signaler un problème', hint: 'Voirie, propreté, éclairage…', href: '/report' },
  { label: 'Mes signalements', hint: 'Suivre vos signalements', href: '/my-reports' },
  { label: 'Démarches', hint: 'Liens utiles et contacts de la mairie', href: '/procedures' },
  { label: 'Mes données', hint: 'Confidentialité et suppression', href: '/privacy' },
];

export default function HomeScreen() {
  const { tenantName, branding } = useApp();
  const colors = useColors();
  return (
    <Screen>
      <Card>
        <Text
          accessibilityRole="header"
          style={{ fontSize: 26, fontWeight: '800', color: colors.text }}
        >
          {branding?.appName ?? tenantName}
        </Text>
        <Body muted>L’application de la commune de {tenantName}.</Body>
      </Card>
      {ENTRIES.map((entry) => (
        <Pressable
          key={entry.label}
          accessibilityRole="link"
          accessibilityLabel={entry.label}
          accessibilityHint={entry.hint}
          onPress={() => router.push(entry.href)}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: colors.surface,
              borderLeftWidth: 6,
              borderLeftColor: colors.primary,
            },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>{entry.label}</Text>
          <Text style={[styles.body, styles.muted, { color: colors.text }]}>{entry.hint}</Text>
        </Pressable>
      ))}
    </Screen>
  );
}
