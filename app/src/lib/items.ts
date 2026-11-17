// Display names for closet items the server can grant.
const LABELS: Record<string, string> = {
  cap: 'Walking cap',
  glasses: 'Round glasses',
  flower: 'Flower',
  balloon: 'Balloon',
  'star-badge': 'Star badge',
  'scarf-gold': 'Gold scarf',
  crown: 'Crown',
  'night-glow': 'Night glow',
};

export const itemLabel = (item: string) => LABELS[item] ?? item;
