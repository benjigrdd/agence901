import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Bell,
  Bike,
  Building2,
  CalendarDays,
  FileText,
  House,
  Images,
  Info,
  Leaf,
  Map,
  MapPinned,
  MessageSquareWarning,
  Newspaper,
  Plus,
  ScrollText,
  Settings,
  Vote,
} from 'lucide-react';

import type { NavIcon as NavIconName } from '@/lib/navigation';

const ICONS: Record<NavIconName, LucideIcon> = {
  home: House,
  news: Newspaper,
  events: CalendarDays,
  media: Images,
  reports: MessageSquareWarning,
  map: Map,
  environment: Leaf,
  procedures: FileText,
  mobility: Bike,
  services: Info,
  notifications: Bell,
  participation: Vote,
  districts: MapPinned,
  settings: Settings,
  audit: ScrollText,
  tenants: Building2,
  'new-tenant': Plus,
  usage: BarChart3,
};

export function NavIcon({ name }: { name: NavIconName }) {
  const Icon = ICONS[name];
  return <Icon aria-hidden="true" />;
}
