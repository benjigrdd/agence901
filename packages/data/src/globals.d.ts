// Seul global runtime utilise par le paquet, disponible sous Node, navigateur et Hermes.
declare function setTimeout(callback: () => void, ms?: number): unknown;
