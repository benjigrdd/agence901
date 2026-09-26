'use client';

import type { AppRole, MembershipStatus, PermissionMap } from '@app/shared';
import { APP_ROLES, ROLE_LABELS } from '@app/shared';
import { UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { inviteMemberAction, setMemberEnabledAction, updateMemberAction } from './actions';
import { PermissionsMatrix } from './permissions-matrix';

type MemberRow = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: AppRole;
  roleLabel: string;
  status: MembershipStatus;
  statusLabel: string;
  lastSignIn: string;
  permissions: PermissionMap;
};

type Editing = { mode: 'invite' } | { mode: 'edit'; member: MemberRow };

export function MembersManager({ slug, members, currentUserId }: { slug: string; members: MemberRow[]; currentUserId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<AppRole>('agent');
  const [permissions, setPermissions] = useState<PermissionMap>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const open = (next: Editing) => {
    setErrors({});
    if (next.mode === 'invite') {
      setEmail('');
      setName('');
      setRole('agent');
      setPermissions({ news: 'read' });
    } else {
      setRole(next.member.role);
      setPermissions(next.member.permissions);
    }
    setEditing(next);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    startTransition(async () => {
      const r =
        editing.mode === 'invite'
          ? await inviteMemberAction(slug, { email: email.trim(), displayName: name.trim(), role, permissions: role === 'admin' ? {} : permissions })
          : await updateMemberAction(slug, editing.member.id, { role, permissions: role === 'admin' ? {} : permissions });
      if (r.ok) {
        toast.success(editing.mode === 'invite' ? 'Invitation créée' : 'Droits modifiés');
        setEditing(null);
        router.refresh();
      } else {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.message);
        if (!r.fieldErrors) setErrors({ form: r.message });
      }
    });
  };

  const toggle = (m: MemberRow) =>
    startTransition(async () => {
      const r = await setMemberEnabledAction(slug, m.id, m.status === 'disabled');
      if (r.ok) {
        toast.success(m.status === 'disabled' ? 'Membre réactivé' : 'Membre désactivé');
        router.refresh();
      } else toast.error(r.message);
    });

  return (
    <div className="space-y-4">
      <Button onClick={() => open({ mode: 'invite' })}>
        <UserPlus aria-hidden="true" />
        Inviter un membre
      </Button>
      <table className="w-full text-sm">
        <caption className="sr-only">Membres du personnel</caption>
        <thead>
          <tr className="border-b text-left">
            <th scope="col" className="py-2">
              Nom
            </th>
            <th scope="col">Email</th>
            <th scope="col">Rôle</th>
            <th scope="col">Statut</th>
            <th scope="col">Dernière connexion</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className="border-b">
              <td className="py-2 font-medium">
                {m.name}
                {m.userId === currentUserId ? ' (vous)' : ''}
              </td>
              <td>{m.email}</td>
              <td>{m.roleLabel}</td>
              <td>{m.statusLabel}</td>
              <td>{m.lastSignIn}</td>
              <td className="space-x-1 text-right">
                <Button size="sm" variant="ghost" onClick={() => open({ mode: 'edit', member: m })}>
                  Droits<span className="sr-only"> de {m.name}</span>
                </Button>
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => toggle(m)}>
                  {m.status === 'disabled' ? 'Réactiver' : 'Désactiver'}
                  <span className="sr-only"> {m.name}</span>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogTitle>{editing?.mode === 'invite' ? 'Inviter un membre' : `Droits de ${editing?.mode === 'edit' ? editing.member.name : ''}`}</DialogTitle>
          <DialogDescription>
            {editing?.mode === 'invite' ? 'Le membre apparaîtra au statut « Invité » (email envoyé au lot 13).' : 'Les administrateurs ont tous les droits sur la commune.'}
          </DialogDescription>
          <form onSubmit={submit} noValidate className="space-y-4">
            {editing?.mode === 'invite' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="inv-nom">Nom</Label>
                  <Input id="inv-nom" value={name} maxLength={100} aria-invalid={errors.displayName ? true : undefined} onChange={(e) => setName(e.target.value)} />
                  {errors.displayName ? <p role="alert" className="text-destructive text-sm">{errors.displayName}</p> : null}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="inv-email">Email</Label>
                  <Input id="inv-email" type="email" value={email} aria-invalid={errors.email ? true : undefined} onChange={(e) => setEmail(e.target.value)} />
                  {errors.email ? <p role="alert" className="text-destructive text-sm">{errors.email}</p> : null}
                </div>
              </div>
            ) : null}
            <fieldset className="flex gap-4">
              <legend className="mb-1 text-sm font-medium">Rôle</legend>
              {APP_ROLES.map((r) => (
                <div key={r} className="flex items-center gap-2">
                  <input type="radio" id={`role-${r}`} name="role" className="size-4" checked={role === r} onChange={() => setRole(r)} />
                  <Label htmlFor={`role-${r}`} className="font-normal">
                    {ROLE_LABELS[r]}
                  </Label>
                </div>
              ))}
            </fieldset>
            {role === 'agent' ? <PermissionsMatrix idPrefix="droits" value={permissions} onChange={setPermissions} /> : null}
            {errors.form ? <p role="alert" className="text-destructive text-sm">{errors.form}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Annuler
              </Button>
              <Button type="submit" disabled={pending}>
                {editing?.mode === 'invite' ? 'Envoyer l’invitation' : 'Enregistrer les droits'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
