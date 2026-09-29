import { PRODUCT_NAME_FALLBACK } from '@app/shared';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Écran provisoire : les écrans de l'app citoyenne arrivent avec les lots 08–10. */
export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        {PRODUCT_NAME_FALLBACK}
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { fontSize: 28, fontWeight: '700' },
});
