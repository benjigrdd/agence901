import type { Procedure } from '@app/shared';
import { PROCEDURE_CATEGORY_LABELS, PROCEDURE_KIND_LABELS } from '@app/shared';
import { useCallback } from 'react';
import { Linking } from 'react-native';

import { Body, Button, Card, ErrorMessage, Loading, Screen, Title } from '@/components/ui';
import { useApp } from '@/lib/app-context';
import { repos } from '@/lib/data';
import { useAsync } from '@/lib/use-async';

function targetUrl(p: Procedure): string {
  if (p.kind === 'phone') return `tel:${p.value.replace(/\s/g, '')}`;
  if (p.kind === 'email') return `mailto:${p.value}`;
  return p.value;
}

export default function ProceduresScreen() {
  const { ctx } = useApp();
  const procedures = useAsync(useCallback(() => repos.procedures.list(ctx), [ctx]));

  if (procedures.status === 'loading') return <Loading />;
  if (procedures.status === 'error')
    return <ErrorMessage message={procedures.message} onRetry={procedures.reload} />;

  return (
    <Screen>
      {procedures.data.length === 0 ? <Body>Aucune démarche publiée.</Body> : null}
      {procedures.data.map((p) => (
        <Card key={p.id}>
          <Body muted>{PROCEDURE_CATEGORY_LABELS[p.category]}</Body>
          <Title>{p.title}</Title>
          <Body>{p.description}</Body>
          <Button
            label={PROCEDURE_KIND_LABELS[p.kind]}
            hint={p.value}
            onPress={() => void Linking.openURL(targetUrl(p))}
          />
        </Card>
      ))}
    </Screen>
  );
}
