/**
 * Correspondance etiquettes OpenStreetMap → categories de lieux par defaut.
 * Fichier SANS dependance : `pnpm db:generate` en depose une copie dans `supabase/functions/_shared/`
 * pour l'Edge Function `import-osm` (le test de parite verifie que la copie est a jour).
 */

export type OsmTags = Record<string, string | undefined>;

export type OsmElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: OsmTags;
};

export type OsmWheelchair = 'yes' | 'limited' | 'no' | 'unknown';

/** Lieu pret a importer (colonnes de `places`, cle de categorie par defaut). */
export type OsmPlace = {
  externalId: string;
  categoryKey: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  openingHours: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  wheelchair: OsmWheelchair;
  attributes: { subtype?: string };
};

type Rule = {
  categoryKey: string;
  /** Etiquette principale et valeurs retenues (requete Overpass). */
  tag: 'amenity' | 'leisure';
  values: string[];
  /** Condition supplementaire (ex. `recycling_type=centre`). */
  extra?: [string, string];
  subtype?: (tags: OsmTags) => string | undefined;
};

export const OSM_RULES: readonly Rule[] = [
  { categoryKey: 'toilettes', tag: 'amenity', values: ['toilets'] },
  { categoryKey: 'fontaine', tag: 'amenity', values: ['drinking_water'] },
  { categoryKey: 'parking', tag: 'amenity', values: ['parking'] },
  {
    categoryKey: 'parc',
    tag: 'leisure',
    values: ['park', 'garden', 'playground'],
    subtype: (t) => (t.leisure === 'playground' ? 'aire-de-jeux' : undefined),
  },
  {
    categoryKey: 'equipement-sportif',
    tag: 'leisure',
    values: ['sports_centre', 'pitch', 'swimming_pool'],
  },
  { categoryKey: 'mairie', tag: 'amenity', values: ['townhall'] },
  { categoryKey: 'ecole', tag: 'amenity', values: ['school', 'kindergarten'] },
  { categoryKey: 'culture', tag: 'amenity', values: ['library', 'theatre', 'arts_centre'] },
  {
    categoryKey: 'decheterie',
    tag: 'amenity',
    values: ['recycling'],
    extra: ['recycling_type', 'centre'],
  },
  { categoryKey: 'sante', tag: 'amenity', values: ['pharmacy', 'doctors'] },
  { categoryKey: 'borne-recharge', tag: 'amenity', values: ['charging_station'] },
];

/** Categories importables depuis OpenStreetMap (ordre d'affichage). */
export const OSM_CATEGORY_KEYS: readonly string[] = [
  ...new Set(OSM_RULES.map((r) => r.categoryKey)),
];

/** Libelle generique quand l'objet OSM n'a pas de nom. */
export const OSM_DEFAULT_NAMES: Readonly<Record<string, string>> = {
  toilettes: 'Toilettes publiques',
  fontaine: "Fontaine d'eau potable",
  parking: 'Parking',
  parc: 'Parc',
  'equipement-sportif': 'Équipement sportif',
  mairie: 'Mairie',
  ecole: 'École',
  culture: 'Lieu culturel',
  decheterie: 'Déchèterie',
  sante: 'Santé',
  'borne-recharge': 'Borne de recharge',
};

export function osmCategory(tags: OsmTags): { categoryKey: string; subtype?: string } | null {
  for (const rule of OSM_RULES) {
    const value = tags[rule.tag];
    if (!value || !rule.values.includes(value)) continue;
    if (rule.extra && tags[rule.extra[0]] !== rule.extra[1]) continue;
    const subtype = rule.subtype?.(tags);
    return subtype ? { categoryKey: rule.categoryKey, subtype } : { categoryKey: rule.categoryKey };
  }
  return null;
}

const WHEELCHAIR: Readonly<Record<string, OsmWheelchair>> = {
  yes: 'yes',
  designated: 'yes',
  limited: 'limited',
  no: 'no',
};

const httpsUrl = (url: string | undefined) =>
  url && /^https:\/\/\S+$/.test(url) ? url.slice(0, 300) : null;

/** Objet Overpass → lieu, ou `null` s'il est hors des categories demandees ou sans position. */
export function osmElementToPlace(
  element: OsmElement,
  communeName: string,
  categories?: readonly string[],
): OsmPlace | null {
  const tags = element.tags ?? {};
  const category = osmCategory(tags);
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  if (!category || lat === undefined || lng === undefined) return null;
  if (categories && !categories.includes(category.categoryKey)) return null;
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  const name = tags.name?.trim() || OSM_DEFAULT_NAMES[category.categoryKey] || 'Lieu';
  return {
    externalId: `${element.type}/${element.id}`,
    categoryKey: category.categoryKey,
    name: name.slice(0, 120),
    lat,
    lng,
    address: (street ? `${street}, ${tags['addr:city'] ?? communeName}` : communeName).slice(
      0,
      300,
    ),
    openingHours: tags.opening_hours?.slice(0, 500) ?? null,
    phone: tags.phone ?? tags['contact:phone'] ?? null,
    website: httpsUrl(tags.website ?? tags['contact:website']),
    description: tags.description?.slice(0, 1000) ?? null,
    wheelchair: WHEELCHAIR[tags.wheelchair ?? ''] ?? 'unknown',
    attributes: category.subtype ? { subtype: category.subtype } : {},
  };
}

/**
 * Requete Overpass limitee a la commune (limite administrative par code INSEE), `out center`,
 * 60 s au plus. Seules les etiquettes des categories demandees sont interrogees.
 */
export function overpassQuery(
  inseeCode: string,
  categories: readonly string[] = OSM_CATEGORY_KEYS,
): string {
  const insee = inseeCode.replace(/[^0-9AB]/g, '');
  const selectors = OSM_RULES.filter((r) => categories.includes(r.categoryKey)).map((r) => {
    const extra = r.extra ? `["${r.extra[0]}"="${r.extra[1]}"]` : '';
    return `  nwr(area.commune)["${r.tag}"~"^(${r.values.join('|')})$"]${extra};`;
  });
  return `[out:json][timeout:60];
area["ref:INSEE"="${insee}"]["boundary"="administrative"]["admin_level"="8"]->.commune;
(
${selectors.join('\n')}
);
out center tags;`;
}
