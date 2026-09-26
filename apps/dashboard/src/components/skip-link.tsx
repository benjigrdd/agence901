export function SkipLink() {
  return (
    <a
      href="#contenu"
      className="bg-background text-foreground sr-only z-50 rounded-md border px-4 py-2 font-medium shadow focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      Aller au contenu principal
    </a>
  );
}
