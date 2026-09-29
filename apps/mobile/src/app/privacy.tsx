import { useState } from 'react';
import { Alert } from 'react-native';

import { Body, Button, Card, Screen, Title } from '@/components/ui';
import { useApp } from '@/lib/app-context';
import { deleteMyData } from '@/lib/data';

export default function PrivacyScreen() {
  const { ctx, tenantName } = useApp();
  const [done, setDone] = useState(false);

  const confirmDelete = () =>
    Alert.alert(
      'Supprimer mes données ?',
      'Vos préférences et votre identifiant seront effacés. Vos signalements restent, sans lien avec vous.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            deleteMyData(ctx)
              .then(() => setDone(true))
              .catch(() => Alert.alert('Suppression impossible', 'Réessayez plus tard.'));
          },
        },
      ],
    );

  return (
    <Screen>
      <Card>
        <Title>Vos données</Title>
        <Body>
          L’application de {tenantName} fonctionne sans compte : un identifiant anonyme est créé sur
          votre téléphone. Aucun traceur publicitaire ni outil de mesure d’audience tiers n’est
          utilisé.
        </Body>
        <Body>Vos signalements sont traités par les services de la mairie.</Body>
      </Card>
      {done ? (
        <Card>
          <Body>Vos données ont été supprimées. Fermez l’application pour repartir de zéro.</Body>
        </Card>
      ) : (
        <Button label="Supprimer mes données" onPress={confirmDelete} />
      )}
    </Screen>
  );
}
