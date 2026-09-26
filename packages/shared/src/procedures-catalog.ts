import type { ProcedureCategory, ProcedureKind } from './enums';

export type ProcedureSuggestion = {
  key: string;
  category: ProcedureCategory;
  title: string;
  description: string;
  kind: ProcedureKind;
  /** Vide : la commune doit saisir l'adresse (ex. son portail famille). */
  value: string;
};

const SP = 'https://www.service-public.gouv.fr/particuliers/vosdroits';

/** Suggestions ajoutables en un clic. URLs verifiees le 26/09/2026. */
export const PROCEDURES_CATALOG: readonly ProcedureSuggestion[] = [
  { key: 'cni', category: 'civil_status', title: 'Carte d’identité', description: 'Première demande ou renouvellement, sur rendez-vous en mairie équipée.', kind: 'link', value: `${SP}/F1341` },
  { key: 'passport', category: 'civil_status', title: 'Passeport', description: 'Pré-demande en ligne puis rendez-vous en mairie équipée.', kind: 'link', value: `${SP}/F14929` },
  { key: 'birth-certificate', category: 'civil_status', title: 'Acte de naissance', description: 'Copie intégrale ou extrait, auprès de la commune de naissance.', kind: 'link', value: `${SP}/F1427` },
  { key: 'marriage-certificate', category: 'civil_status', title: 'Acte de mariage', description: 'Copie intégrale ou extrait, auprès de la commune du mariage.', kind: 'link', value: `${SP}/F1432` },
  { key: 'death-certificate', category: 'civil_status', title: 'Acte de décès', description: 'Copie intégrale, auprès de la commune du décès ou du dernier domicile.', kind: 'link', value: `${SP}/F1444` },
  { key: 'electoral-roll', category: 'elections', title: 'Inscription sur les listes électorales', description: 'En ligne ou en mairie, avec un justificatif de domicile.', kind: 'link', value: `${SP}/F1367` },
  { key: 'citizen-census', category: 'elections', title: 'Recensement citoyen', description: 'Obligatoire à 16 ans, en ligne ou en mairie.', kind: 'link', value: `${SP}/F870` },
  { key: 'proxy-vote', category: 'elections', title: 'Vote par procuration', description: 'Demande en ligne ou au commissariat, à la gendarmerie.', kind: 'link', value: `${SP}/F1604` },
  { key: 'building-permit', category: 'town_planning', title: 'Permis de construire', description: 'Pour une construction nouvelle ou des travaux importants.', kind: 'link', value: `${SP}/F1986` },
  { key: 'prior-declaration', category: 'town_planning', title: 'Déclaration préalable de travaux', description: 'Pour les travaux de faible importance (clôture, abri, façade).', kind: 'link', value: `${SP}/F17578` },
  { key: 'family-portal', category: 'family', title: 'Portail famille', description: 'Cantine, périscolaire et centre de loisirs : inscriptions et paiements.', kind: 'link', value: '' },
];
