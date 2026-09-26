import { getProductName } from '@/lib/product-name';

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{getProductName()}</h1>
      <p className="text-muted-foreground">Espace de gestion en construction.</p>
    </main>
  );
}
