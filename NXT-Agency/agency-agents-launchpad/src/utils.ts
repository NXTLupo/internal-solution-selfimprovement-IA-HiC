const COLOR_MAP: Record<string, string> = {
  red: '#115054',
  orange: '#115054',
  amber: '#115054',
  yellow: '#115054',
  green: '#115054',
  teal: '#115054',
  cyan: '#115054',
  blue: '#115054',
  indigo: '#115054',
  purple: '#115054',
  pink: '#115054',
  gold: '#115054',
};

export function resolveColor(color: string): string {
  if (!color) return '#115054';
  if (color.startsWith('#')) return color;
  return COLOR_MAP[color.toLowerCase()] ?? '#115054';
}

export function colorWithAlpha(color: string, alpha: number): string {
  const hex = resolveColor(color);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const CATEGORY_LABELS: Record<string, string> = {
  academic: 'Academic',
  design: 'Design',
  engineering: 'Engineering',
  'game-development': 'Game Dev',
  marketing: 'Marketing',
  'paid-media': 'Paid Media',
  product: 'Product',
  'project-management': 'Project Mgmt',
  sales: 'Sales',
  'spatial-computing': 'Spatial',
  specialized: 'Specialized',
  strategy: 'Strategy',
  support: 'Support',
  testing: 'Testing',
};

const CATEGORY_ICONS: Record<string, string> = {
  academic: '',
  design: '',
  engineering: '',
  'game-development': '',
  marketing: '',
  'paid-media': '',
  product: '',
  'project-management': '',
  sales: '',
  'spatial-computing': '',
  specialized: '',
  strategy: '',
  support: '',
  testing: '',
};

export function getCategoryLabel(id: string): string {
  return CATEGORY_LABELS[id] ?? id;
}

export function getCategoryIcon(id: string): string {
  return CATEGORY_ICONS[id] ?? '';
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
