'use client';

import { useRouter } from 'next/navigation';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type TenantSwitcherProps = {
  tenants: { slug: string; name: string }[];
  current: string;
};

export function TenantSwitcher({ tenants, current }: TenantSwitcherProps) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="changer-commune" className="sr-only">
        Changer de commune
      </Label>
      <Select value={current} onValueChange={(slug) => router.push(`/${slug}`)}>
        <SelectTrigger id="changer-commune" className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {tenants.map((t) => (
            <SelectItem key={t.slug} value={t.slug}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
