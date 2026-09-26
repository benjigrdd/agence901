import type { LucideIcon } from 'lucide-react';
import {
  Armchair,
  Baby,
  Bike,
  Bus,
  Car,
  Church,
  Construction,
  Dumbbell,
  GlassWater,
  HeartPulse,
  Landmark,
  Library,
  Lightbulb,
  MapPin,
  PlugZap,
  Recycle,
  School,
  SquareParking,
  Stethoscope,
  Store,
  Tent,
  Toilet,
  Trash2,
  Trees,
  Waves,
} from 'lucide-react';

/** Icones lucide autorisees pour les categories (nom kebab-case stocke en base). */
const ICONS: Record<string, LucideIcon> = {
  armchair: Armchair,
  baby: Baby,
  bike: Bike,
  bus: Bus,
  car: Car,
  church: Church,
  construction: Construction,
  dumbbell: Dumbbell,
  'glass-water': GlassWater,
  'heart-pulse': HeartPulse,
  landmark: Landmark,
  library: Library,
  lightbulb: Lightbulb,
  'map-pin': MapPin,
  'plug-zap': PlugZap,
  recycle: Recycle,
  school: School,
  'square-parking': SquareParking,
  stethoscope: Stethoscope,
  store: Store,
  tent: Tent,
  toilet: Toilet,
  'trash-2': Trash2,
  trees: Trees,
  waves: Waves,
};

export const CATEGORY_ICON_NAMES = ['map-pin', 'school', 'landmark', 'trees', 'dumbbell', 'library', 'bus', 'car', 'bike', 'heart-pulse', 'baby', 'recycle', 'store', 'church', 'tent', 'waves'] as const;

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? MapPin;
  return <Icon className={className} aria-hidden="true" />;
}
