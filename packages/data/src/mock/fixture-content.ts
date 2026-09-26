import type { EventCategory, NotificationTargetType, PostType, ProcedureCategory, ProcedureKind, SortingBin, WasteType } from '@app/shared';

/* Textes des donnees de demonstration. Communes et personnes strictement fictives. */

export const TOPIC_LABELS = ['Culture', 'Sport', 'Travaux', 'Jeunesse', 'Environnement', 'Vie municipale'];

export const SERVICE_DEFS = [
  { name: 'Voirie', slug: 'voirie' },
  { name: 'Espaces verts', slug: 'espaces-verts' },
  { name: 'Propreté urbaine', slug: 'proprete' },
];

/** `service` : index dans SERVICE_DEFS. */
export const REPORT_CATEGORY_DEFS = [
  { key: 'road', label: 'Voirie', icon: 'construction', service: 0, slaDays: 7 },
  { key: 'lighting', label: 'Éclairage public', icon: 'lightbulb', service: 0, slaDays: 5 },
  { key: 'cleanliness', label: 'Propreté', icon: 'trash-2', service: 2, slaDays: 3 },
  { key: 'green', label: 'Espaces verts', icon: 'trees', service: 1, slaDays: 10 },
  { key: 'furniture', label: 'Mobilier urbain', icon: 'armchair', service: 0, slaDays: 14 },
] as const;

export const REPORT_DESCRIPTIONS: Record<(typeof REPORT_CATEGORY_DEFS)[number]['key'], string[]> = {
  road: [
    'Nid-de-poule profond sur la chaussée, dangereux pour les deux-roues.',
    'Affaissement du trottoir devant le numéro 12.',
    'Bouche d’égout descellée qui bouge au passage des voitures.',
    'Marquage du passage piéton presque effacé près de l’école.',
    'Plaque de verglas récurrente dans le virage, manque de sel.',
  ],
  lighting: [
    'Lampadaire éteint depuis plusieurs soirs, la rue est dans le noir.',
    'Éclairage qui clignote en continu devant l’arrêt de bus.',
    'Candélabre penché après un choc, risque de chute.',
    'Lampadaire allumé en pleine journée.',
    'Deux points lumineux hors service le long du parc.',
  ],
  cleanliness: [
    'Dépôt sauvage de sacs et de cartons au pied des conteneurs.',
    'Corbeille publique qui déborde depuis le week-end.',
    'Tags sur le mur de la salle des sports.',
    'Encombrants abandonnés sur le trottoir.',
    'Débris de verre sur la piste cyclable.',
  ],
  green: [
    'Branche cassée au-dessus du chemin piéton.',
    'Haie qui empiète sur le trottoir et gêne les poussettes.',
    'Arrosage automatique qui fuit dans le square.',
    'Herbe très haute autour de l’aire de jeux.',
    'Arbre malade qui perd son écorce.',
  ],
  furniture: [
    'Banc cassé, une latte manque.',
    'Barrière de sécurité arrachée près du rond-point.',
    'Panneau de signalisation tourné dans le mauvais sens.',
    'Abri-bus avec une vitre brisée.',
    'Jeu pour enfants endommagé (toboggan fissuré).',
  ],
};

export const PLACE_CATEGORY_DEFS = [
  { key: 'mairie', label: 'Mairie', icon: 'landmark', color: '#1D4ED8', count: 2 },
  { key: 'ecole', label: 'École', icon: 'school', color: '#7C3AED', count: 3 },
  { key: 'equipement-sportif', label: 'Équipement sportif', icon: 'dumbbell', color: '#047857', count: 3 },
  { key: 'parc', label: 'Parc', icon: 'trees', color: '#15803D', count: 3 },
  { key: 'parking', label: 'Parking', icon: 'square-parking', color: '#334155', count: 3 },
  { key: 'toilettes', label: 'Toilettes publiques', icon: 'toilet', color: '#0E7490', count: 2 },
  { key: 'fontaine', label: 'Fontaine', icon: 'glass-water', color: '#0369A1', count: 2 },
  { key: 'borne-recharge', label: 'Borne de recharge', icon: 'plug-zap', color: '#A16207', count: 2 },
  { key: 'decheterie', label: 'Déchèterie', icon: 'recycle', color: '#4D7C0F', count: 2 },
  { key: 'commerce', label: 'Commerce', icon: 'store', color: '#BE185D', count: 3 },
  { key: 'sante', label: 'Santé', icon: 'stethoscope', color: '#B91C1C', count: 3 },
  { key: 'culture', label: 'Culture', icon: 'library', color: '#9333EA', count: 2 },
] as const;

export const PLACE_NAMES: Record<(typeof PLACE_CATEGORY_DEFS)[number]['key'], string[]> = {
  mairie: ['Hôtel de ville', 'Mairie annexe'],
  ecole: ['École maternelle des Lilas', 'École élémentaire Jules-Ferry', 'Groupe scolaire du Moulin'],
  'equipement-sportif': ['Gymnase municipal', 'Stade des Grands-Champs', 'City-stade'],
  parc: ['Parc du Château', 'Square des Tilleuls', 'Jardin partagé'],
  parking: ['Parking de la Gare', 'Parking du Marché', 'Parking relais'],
  toilettes: ['Toilettes place du Marché', 'Toilettes du parc'],
  fontaine: ['Fontaine de la place', 'Point d’eau du cimetière'],
  'borne-recharge': ['Borne de recharge Gare', 'Borne de recharge Mairie'],
  decheterie: ['Déchèterie intercommunale', 'Point d’apport volontaire'],
  commerce: ['Boulangerie du Centre', 'Marché couvert', 'Épicerie solidaire'],
  sante: ['Maison de santé', 'Pharmacie de la Place', 'Centre de soins infirmiers'],
  culture: ['Médiathèque', 'Salle des fêtes'],
};

export const POST_SAMPLES: { type: PostType; title: string; summary: string; body: string }[] = [
  {
    type: 'alert',
    title: 'Coupure d’eau rue des Tilleuls',
    summary: 'Intervention sur le réseau d’eau potable : coupure prévue de 8 h à 12 h.',
    body: 'Une intervention sur le réseau d’eau potable impose une coupure rue des Tilleuls.\nPrévoyez une réserve d’eau. Merci de votre compréhension.',
  },
  {
    type: 'works',
    title: 'Réfection de la chaussée avenue de la Gare',
    summary: 'Circulation alternée pendant trois semaines, accès riverains maintenu.',
    body: 'Les travaux de réfection de la chaussée débutent lundi.\nLa circulation sera alternée par feux tricolores.',
  },
  {
    type: 'decision',
    title: 'Compte rendu du conseil municipal',
    summary: 'Budget, tarifs de la cantine et subventions aux associations : les décisions du conseil.',
    body: 'Le conseil municipal s’est réuni en séance publique.\nRetrouvez l’ensemble des délibérations adoptées.',
  },
  {
    type: 'news',
    title: 'Inscriptions à la cantine scolaire',
    summary: 'Les inscriptions pour la rentrée sont ouvertes jusqu’au 15 du mois.',
    body: 'Les familles peuvent inscrire leurs enfants au service de restauration scolaire.\nLe dossier est disponible en mairie.',
  },
  {
    type: 'news',
    title: 'Nouveaux horaires de la médiathèque',
    summary: 'La médiathèque ouvre désormais le mercredi toute la journée.',
    body: 'Pour mieux accueillir les familles, la médiathèque élargit ses horaires.\nOuverture le mercredi de 10 h à 18 h.',
  },
  {
    type: 'works',
    title: 'Travaux d’accessibilité à la mairie',
    summary: 'Une rampe d’accès et un ascenseur seront installés d’ici la fin de l’année.',
    body: 'La mairie engage des travaux pour faciliter l’accès des personnes à mobilité réduite.',
  },
  {
    type: 'news',
    title: 'Collecte de sang à la salle des fêtes',
    summary: 'Donnez votre sang le mardi de 15 h à 19 h, sur rendez-vous ou sans.',
    body: 'L’établissement de santé organise une collecte à la salle des fêtes.\nPensez à vous munir d’une pièce d’identité.',
  },
  {
    type: 'decision',
    title: 'Vote du budget participatif',
    summary: 'Choisissez les projets financés par le budget participatif de la commune.',
    body: 'Douze projets proposés par les habitants sont soumis au vote.\nLe vote est ouvert à tous les habitants de plus de 16 ans.',
  },
  {
    type: 'news',
    title: 'Semaine de la mobilité : ateliers vélo',
    summary: 'Réparation gratuite et apprentissage du vélo pour petits et grands.',
    body: 'Des ateliers sont proposés toute la semaine sur la place du Marché.',
  },
  {
    type: 'works',
    title: 'Élagage des platanes place du Marché',
    summary: 'Stationnement interdit sur la place pendant deux jours.',
    body: 'Les services techniques procèdent à l’élagage des platanes.\nLe marché est déplacé rue de la République.',
  },
  {
    type: 'news',
    title: 'Ouverture du nouveau city-stade',
    summary: 'Le city-stade du quartier est ouvert tous les jours de 9 h à 21 h.',
    body: 'Le nouvel équipement est accessible librement.\nMerci de respecter le règlement affiché à l’entrée.',
  },
  {
    type: 'news',
    title: 'Repas des aînés : inscriptions',
    summary: 'Le repas annuel des aînés aura lieu en décembre, inscriptions en mairie.',
    body: 'Les personnes de plus de 70 ans sont invitées au repas offert par la commune.',
  },
  {
    type: 'decision',
    title: 'Modification du plan local d’urbanisme',
    summary: 'Une enquête publique est ouverte : consultez le dossier et donnez votre avis.',
    body: 'Le dossier est consultable en mairie aux heures d’ouverture.\nUn registre est mis à disposition du public.',
  },
  {
    type: 'alert',
    title: 'Vigilance canicule',
    summary: 'Fortes chaleurs attendues : pensez à vous hydrater et à prendre des nouvelles de vos proches.',
    body: 'Un registre des personnes vulnérables est tenu en mairie.\nLes salles rafraîchies sont ouvertes.',
  },
  {
    type: 'news',
    title: 'Fermeture exceptionnelle de la mairie',
    summary: 'La mairie sera fermée le lundi du pont, une permanence téléphonique est assurée.',
    body: 'En cas d’urgence, contactez l’élu de permanence.',
  },
];

export const EVENT_SAMPLES: { title: string; category: EventCategory; description: string; organizer: string }[] = [
  { title: 'Marché hebdomadaire', category: 'municipal', description: 'Producteurs locaux et commerçants sur la place.', organizer: 'Mairie' },
  { title: 'Conseil municipal', category: 'municipal', description: 'Séance publique du conseil municipal.', organizer: 'Mairie' },
  { title: 'Fête de la science', category: 'culture', description: 'Ateliers et démonstrations pour toute la famille.', organizer: 'Médiathèque' },
  { title: 'Tournoi de football des jeunes', category: 'sport', description: 'Tournoi amical des écoles de football.', organizer: 'Club sportif' },
  { title: 'Forum des associations', category: 'association', description: 'Rencontrez les associations de la commune.', organizer: 'Mairie' },
  { title: 'Concert de l’harmonie', category: 'culture', description: 'Concert gratuit de l’harmonie municipale.', organizer: 'Harmonie municipale' },
  { title: 'Atelier numérique seniors', category: 'municipal', description: 'Initiation aux démarches en ligne.', organizer: 'Centre social' },
  { title: 'Bourse aux jouets', category: 'association', description: 'Vente de jouets d’occasion entre particuliers.', organizer: 'Association des parents' },
  { title: 'Soirée jeux de société', category: 'youth', description: 'Soirée ouverte aux adolescents.', organizer: 'Espace jeunes' },
  { title: 'Course solidaire', category: 'sport', description: 'Course de 5 km au profit d’une association.', organizer: 'Comité des fêtes' },
  { title: 'Exposition de peinture', category: 'culture', description: 'Œuvres des artistes amateurs de la commune.', organizer: 'Atelier d’art' },
  { title: 'Cérémonie commémorative', category: 'other', description: 'Cérémonie au monument aux morts.', organizer: 'Mairie' },
];

export const PROCEDURE_SAMPLES: { category: ProcedureCategory; title: string; description: string; kind: ProcedureKind; value: string }[] = [
  {
    category: 'civil_status',
    title: 'Carte d’identité',
    description: 'Demande ou renouvellement, sur rendez-vous.',
    kind: 'link',
    value: 'https://www.service-public.fr/particuliers/vosdroits/N358',
  },
  {
    category: 'civil_status',
    title: 'Passeport',
    description: 'Pré-demande en ligne puis rendez-vous en mairie équipée.',
    kind: 'link',
    value: 'https://www.service-public.fr/particuliers/vosdroits/N360',
  },
  {
    category: 'civil_status',
    title: 'Acte de naissance',
    description: 'Copie intégrale ou extrait d’acte.',
    kind: 'link',
    value: 'https://www.service-public.fr/particuliers/vosdroits/F1427',
  },
  {
    category: 'elections',
    title: 'Inscription sur les listes électorales',
    description: 'En ligne ou en mairie.',
    kind: 'link',
    value: 'https://www.service-public.fr/particuliers/vosdroits/F1367',
  },
  {
    category: 'town_planning',
    title: 'Permis de construire',
    description: 'Formulaires et pièces à fournir.',
    kind: 'link',
    value: 'https://www.service-public.fr/particuliers/vosdroits/F1986',
  },
  {
    category: 'family',
    title: 'Inscription scolaire',
    description: 'Contactez le service scolaire.',
    kind: 'email',
    value: 'scolaire@{domain}',
  },
  {
    category: 'social',
    title: 'Centre communal d’action sociale',
    description: 'Accueil, aides et accompagnement.',
    kind: 'phone',
    value: '{phone}',
  },
  {
    category: 'associations',
    title: 'Réserver une salle municipale',
    description: 'Demande de réservation pour les associations.',
    kind: 'email',
    value: 'associations@{domain}',
  },
];

export const SORTING_SAMPLES: { name: string; bin: SortingBin; advice: string }[] = [
  { name: 'Bouteille en verre', bin: 'glass', advice: 'Sans bouchon, inutile de la laver.' },
  { name: 'Bocal en verre', bin: 'glass', advice: 'Retirez le couvercle métallique (bac emballages).' },
  { name: 'Pot de yaourt', bin: 'recycling', advice: 'Bien vidé, sans le laver.' },
  { name: 'Carton d’emballage', bin: 'recycling', advice: 'Aplati. Les gros cartons vont en déchèterie.' },
  { name: 'Journal et magazine', bin: 'recycling', advice: 'Sans film plastique.' },
  { name: 'Canette', bin: 'recycling', advice: 'Vide, non écrasée.' },
  { name: 'Épluchures', bin: 'biowaste', advice: 'Dans le bac à biodéchets ou le composteur.' },
  { name: 'Marc de café', bin: 'biowaste', advice: 'Filtre papier compris.' },
  { name: 'Tonte de gazon', bin: 'green', advice: 'En petite quantité, sinon en déchèterie.' },
  { name: 'Branchages', bin: 'green', advice: 'Fagotés, longueur maximale 1 m.' },
  { name: 'Canapé', bin: 'bulky', advice: 'Collecte des encombrants sur rendez-vous.' },
  { name: 'Électroménager', bin: 'dechetterie', advice: 'Ou reprise par le vendeur lors d’un achat.' },
  { name: 'Piles et batteries', bin: 'dechetterie', advice: 'Aussi en points de collecte en magasin.' },
  { name: 'Ampoule LED', bin: 'dechetterie', advice: 'Ne jamais la jeter avec le verre.' },
  { name: 'Pot de peinture', bin: 'dechetterie', advice: 'Déchet dangereux, en déchèterie uniquement.' },
  { name: 'Huile de friture', bin: 'dechetterie', advice: 'Refroidie, dans une bouteille fermée.' },
  { name: 'Couches', bin: 'household', advice: 'Dans un sac fermé, avec les ordures ménagères.' },
  { name: 'Vaisselle cassée', bin: 'household', advice: 'Emballée pour éviter les blessures.' },
  { name: 'Vêtements usagés', bin: 'other', advice: 'Dans les bornes textiles, même abîmés.' },
  { name: 'Médicaments', bin: 'other', advice: 'À rapporter en pharmacie.' },
];

export const NOTIFICATION_SAMPLES: { title: string; body: string; target: NotificationTargetType; urgent: boolean }[] = [
  { title: 'Coupure d’eau demain matin', body: 'Coupure rue des Tilleuls de 8 h à 12 h. Prévoyez une réserve d’eau.', target: 'districts', urgent: true },
  { title: 'Conseil municipal jeudi', body: 'Séance publique à 19 h en salle du conseil.', target: 'all', urgent: false },
  { title: 'Travaux avenue de la Gare', body: 'Circulation alternée à partir de lundi pour trois semaines.', target: 'topics', urgent: false },
  { title: 'Marché de Noël', body: 'Rendez-vous samedi sur la place, animations pour les enfants.', target: 'all', urgent: false },
  { title: 'Vigilance canicule', body: 'Fortes chaleurs : hydratez-vous et prenez des nouvelles de vos proches.', target: 'all', urgent: true },
  { title: 'Budget participatif', body: 'Il vous reste une semaine pour voter pour vos projets préférés.', target: 'topics', urgent: false },
];

export const MEDIA_SAMPLES: { label: string; alt: string; decorative: boolean; credit: string | null; color: string }[] = [
  { label: 'Mairie', alt: 'Façade de l’hôtel de ville', decorative: false, credit: 'Service communication', color: '#1D4ED8' },
  { label: 'Travaux', alt: 'Engins de chantier sur une route', decorative: false, credit: null, color: '#B45309' },
  { label: 'Marché', alt: 'Étals du marché sur la place', decorative: false, credit: 'Service communication', color: '#15803D' },
  { label: 'École', alt: 'Cour de l’école élémentaire', decorative: false, credit: null, color: '#7C3AED' },
  { label: 'Parc', alt: 'Allée arborée du parc du Château', decorative: false, credit: null, color: '#166534' },
  { label: 'Concert', alt: 'Harmonie municipale en concert', decorative: false, credit: 'Harmonie municipale', color: '#9333EA' },
  { label: 'Sport', alt: 'Terrain du city-stade', decorative: false, credit: null, color: '#047857' },
  { label: 'Conseil', alt: 'Salle du conseil municipal', decorative: false, credit: null, color: '#334155' },
  { label: 'Motif', alt: '', decorative: true, credit: null, color: '#64748B' },
  { label: 'Bandeau', alt: '', decorative: true, credit: null, color: '#0E7490' },
];

export const WASTE_PLAN: { wasteType: WasteType; interval: 1 | 2; north: 'MO' | 'TU' | 'WE' | 'TH' | 'FR'; south: 'MO' | 'TU' | 'WE' | 'TH' | 'FR' }[] = [
  { wasteType: 'household', interval: 1, north: 'WE', south: 'FR' },
  { wasteType: 'recycling', interval: 2, north: 'MO', south: 'TH' },
  { wasteType: 'green', interval: 2, north: 'TU', south: 'TU' },
];
