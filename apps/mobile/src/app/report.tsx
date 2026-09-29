import type { Report } from '@app/shared';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import {
  Body,
  Button,
  Card,
  ErrorMessage,
  Loading,
  Screen,
  styles,
  Title,
  useColors,
} from '@/components/ui';
import { useApp } from '@/lib/app-context';
import { repos } from '@/lib/data';
import type { AddressMatch } from '@/lib/geocode';
import { searchAddress } from '@/lib/geocode';
import { useAsync } from '@/lib/use-async';
import { randomUuid } from '@/lib/uuid';

function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[
        styles.input,
        { justifyContent: 'center' },
        selected && { borderColor: colors.primary, borderWidth: 3 },
      ]}
    >
      {/* Le rond plein double la bordure colorée : l'état ne repose pas sur la seule couleur. */}
      <Text style={{ fontSize: 16, color: '#0f172a' }}>
        {selected ? '● ' : '○ '}
        {label}
      </Text>
    </Pressable>
  );
}

export default function ReportScreen() {
  const { ctx, inseeCode, center } = useApp();
  const colors = useColors();
  const categories = useAsync(useCallback(() => repos.reportCategories.list(ctx), [ctx]));

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [addressText, setAddressText] = useState('');
  const [matches, setMatches] = useState<AddressMatch[]>([]);
  const [address, setAddress] = useState<AddressMatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [created, setCreated] = useState<Report | null>(null);
  // Un identifiant par signalement : un second appui (ou un renvoi) ne crée pas de doublon.
  const requestId = useRef(randomUuid());

  if (categories.status === 'loading') return <Loading />;
  if (categories.status === 'error')
    return <ErrorMessage message={categories.message} onRetry={categories.reload} />;

  if (created) {
    return (
      <Screen>
        <Card>
          <Title>Merci, signalement envoyé</Title>
          <Body>Référence : {created.reference}</Body>
          <Body muted>Suivez son traitement dans « Mes signalements ».</Body>
        </Card>
        <Button label="Voir mes signalements" onPress={() => router.replace('/my-reports')} />
      </Screen>
    );
  }

  const lookup = async () => {
    setAddress(null);
    const found = await searchAddress(addressText, inseeCode);
    // Adresse introuvable : l'habitant peut garder sa saisie, placée au centre de la commune (à préciser par la mairie).
    setMatches(
      found.length > 0 ? found : [{ label: addressText.trim(), point: center, approximate: true }],
    );
    setError(null);
  };

  const submit = async () => {
    if (!categoryId) return setError('Choisissez une catégorie.');
    if (!description.trim()) return setError('Décrivez le problème.');
    if (!address) return setError('Recherchez puis choisissez l’adresse du problème.');
    setError(null);
    setSending(true);
    try {
      const report = await repos.citizen.createReport(ctx, {
        categoryId,
        description: description.trim(),
        point: address.point,
        address: address.label,
        contactEmail: null,
        photos: [],
        clientRequestId: requestId.current,
      });
      setCreated(report);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Envoi impossible, réessayez.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen>
      <Card>
        <Text style={[styles.label, { color: colors.text }]} nativeID="category-label">
          Catégorie
        </Text>
        <View
          accessibilityLabel="Catégorie"
          accessibilityRole="radiogroup"
          style={{ gap: 8 }}
        >
          {categories.data.map((c) => (
            <Choice
              key={c.id}
              label={c.label}
              selected={c.id === categoryId}
              onPress={() => setCategoryId(c.id)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <Text style={[styles.label, { color: colors.text }]} nativeID="description-label">
          Description
        </Text>
        <TextInput
          accessibilityLabel="Description"
          multiline
          maxLength={1000}
          value={description}
          onChangeText={setDescription}
          placeholder="Ex. : lampadaire éteint devant le n° 12"
          style={[styles.input, { minHeight: 100, textAlignVertical: 'top', paddingTop: 12 }]}
        />
      </Card>

      <Card>
        <Text style={[styles.label, { color: colors.text }]} nativeID="address-label">
          Adresse
        </Text>
        <TextInput
          accessibilityLabel="Adresse"
          value={addressText}
          onChangeText={(t) => {
            setAddressText(t);
            setAddress(null);
          }}
          onSubmitEditing={lookup}
          returnKeyType="search"
          autoComplete="street-address"
          placeholder="Numéro et rue"
          style={styles.input}
        />
        <Button
          label="Rechercher l’adresse"
          onPress={lookup}
          disabled={addressText.trim().length < 3}
        />
        <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
          {matches.map((m) => (
            <Choice
              key={m.label}
              label={
                m.approximate ? `${m.label} (adresse non trouvée, position approximative)` : m.label
              }
              selected={address?.label === m.label}
              onPress={() => setAddress(m)}
            />
          ))}
        </View>
      </Card>

      {error ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          style={[styles.body, { color: '#b91c1c' }]}
        >
          {error}
        </Text>
      ) : null}
      <Button
        label={sending ? 'Envoi…' : 'Envoyer le signalement'}
        onPress={submit}
        disabled={sending}
      />
    </Screen>
  );
}
