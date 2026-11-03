// Display names for items the server can grant.
const LABELS: Record<string, string> = {
  cap: 'Cap',
  bow: 'Bow',
  glasses: 'Glasses',
  flower: 'Flower',
  scarf: 'Scarf',
  headphones: 'Headphones',
  leaf: 'Leaf',
  balloon: 'Balloon',
  'star-badge': 'Star badge',
  'scarf-gold': 'Golden scarf',
  crown: 'Crown',
};

export const itemLabel = (item: string) => LABELS[item] ?? item;
