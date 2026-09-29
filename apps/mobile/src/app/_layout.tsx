import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { AppProvider } from '@/lib/app-context';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppProvider
        fallback={(state) => (
          <View style={styles.center}>
            {state.status === 'loading' ? (
              <Text style={styles.text}>Chargement…</Text>
            ) : (
              <View accessibilityRole="alert" style={styles.center}>
                <Text style={styles.text}>
                  Le service de la commune est momentanément indisponible.
                </Text>
                <Text style={styles.detail}>{state.message}</Text>
                <Pressable accessibilityRole="button" onPress={state.retry} style={styles.retry}>
                  <Text style={styles.link}>Réessayer</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      >
        <Stack screenOptions={{ headerBackTitle: 'Retour' }}>
          <Stack.Screen name="index" options={{ title: 'Accueil' }} />
          <Stack.Screen name="news/index" options={{ title: 'Actualités' }} />
          <Stack.Screen name="news/[id]" options={{ title: 'Actualité' }} />
          <Stack.Screen name="events" options={{ title: 'Agenda' }} />
          <Stack.Screen name="report" options={{ title: 'Signaler un problème' }} />
          <Stack.Screen name="my-reports" options={{ title: 'Mes signalements' }} />
          <Stack.Screen name="procedures" options={{ title: 'Démarches' }} />
          <Stack.Screen name="privacy" options={{ title: 'Mes données' }} />
        </Stack>
      </AppProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  text: { fontSize: 16, textAlign: 'center' },
  detail: { fontSize: 14, opacity: 0.7, textAlign: 'center' },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  link: { fontSize: 16, fontWeight: '600', textDecorationLine: 'underline' },
});
