/**
 * @app/data — couche d'acces aux donnees.
 *
 * Seul point d'entree des applications (dashboard et mobile) vers les donnees.
 * L'interface n'appelle jamais Supabase directement.
 *
 * - ports : une interface par depot, chaque methode recoit un `DataContext`
 *   (session + tenant) et applique isolation et permissions (lot 02).
 * - adaptateur `mock` : en memoire, alimente par des donnees fictives (lot 02).
 * - adaptateur `supabase` : memes interfaces, branche au lot 14.
 *
 * La source est choisie par `DATA_SOURCE=mock|supabase`.
 */
export {};
