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
  'night-glow': 'Night glow set',
};

export const itemLabel = (item: string) => LABELS[item] ?? item;

const EMOJI: Record<string, string> = {
  cap: '🧢',
  bow: '🎀',
  glasses: '👓',
  flower: '🌸',
  scarf: '🧣',
  headphones: '🎧',
  leaf: '🍃',
  balloon: '🎈',
  'star-badge': '⭐',
  'scarf-gold': '🏅',
  crown: '👑',
};

export const itemEmoji = (item: string) => EMOJI[item] ?? '🎁';
