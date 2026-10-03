import { PauseCircle } from 'lucide-react';
import type { Metadata } from 'next';

import { signOut } from '@/app/actions/session';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Espace suspendu' };

export default function SuspendedPage() {
  return (
    <AuthShell
      title="Espace suspendu"
      description="L’espace de gestion de votre commune est suspendu. Contactez votre éditeur pour en savoir plus."
    >
      <PauseCircle className="text-muted-foreground mt-6 size-8" aria-hidden="true" />
      <form action={signOut} className="mt-6">
        <Button type="submit" variant="outline">
          Se déconnecter
        </Button>
      </form>
    </AuthShell>
  );
}
