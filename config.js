export const APP_TITLE = "Vintage Shaft Deal Tracker";

export const SEARCH_TERMS = [
  "krypto pro lacrosse shaft",
  '"krypto pro" lacrosse shaft',
  '"gait ice" lacrosse shaft',
  '"db803" lacrosse shaft',
  '"titan levitation" lacrosse shaft',
  '"warrior titan" lacrosse shaft',
  '"gait titanium" lacrosse shaft',
  '"lacrosse shaft lot" vintage',
  '"old school lacrosse shaft"',
  '"rare lacrosse shaft"',
  '"og lacrosse shaft" titanium'
];

export const MAX_PRICE = 180;
export const MIN_RESALE_MARGIN = 20;
export const MAX_RESULTS_PER_SOURCE_TERM = 60;

export const TARGET_MODELS = [
  {
    id: "warrior-krypto-pro",
    label: "Warrior Krypto Pro",
    aliases: ["krypto pro", "og krypto pro", "krypto diamond", "krypto pro diamond", "krypto kevlar"],
    preferredPrice: 60,
    maxBuyPrice: 95,
    estimatedResaleLow: 80,
    estimatedResaleHigh: 130,
    rarity: 3,
    priority: 5
  },
  {
    id: "gait-ice",
    label: "Gait Ice",
    aliases: ["gait ice", "ice titanium", "ice titanium enhanced", "gait ice titanium"],
    preferredPrice: 65,
    maxBuyPrice: 95,
    estimatedResaleLow: 90,
    estimatedResaleHigh: 140,
    rarity: 4,
    priority: 5
  },
  {
    id: "gait-db803",
    label: "Gait dB803",
    aliases: ["db803", "d b803", "gait 803", "reactor db803", "db 803"],
    preferredPrice: 75,
    maxBuyPrice: 115,
    estimatedResaleLow: 100,
    estimatedResaleHigh: 170,
    rarity: 5,
    priority: 5
  },
  {
    id: "warrior-titan-classic",
    label: "Warrior Titan",
    aliases: ["warrior titan", "titan classic", "titan pro", "og titan", "titanium titan"],
    preferredPrice: 55,
    maxBuyPrice: 85,
    estimatedResaleLow: 75,
    estimatedResaleHigh: 120,
    rarity: 3,
    priority: 4
  },
  {
    id: "warrior-titan-levitation",
    label: "Warrior Titan Levitation",
    aliases: ["titan levitation", "levitation shaft", "warrior levitation"],
    preferredPrice: 80,
    maxBuyPrice: 130,
    estimatedResaleLow: 120,
    estimatedResaleHigh: 220,
    rarity: 5,
    priority: 5
  },
  {
    id: "gait-titanium-other",
    label: "Other Gait Titanium",
    aliases: ["gait titanium", "gait ti", "gait scandium", "gait enhanced"],
    preferredPrice: 55,
    maxBuyPrice: 85,
    estimatedResaleLow: 70,
    estimatedResaleHigh: 110,
    rarity: 2,
    priority: 3
  }
];

export const MUST_INCLUDE_ANY = [
  "shaft",
  "lacrosse",
  "attack",
  "middie",
  "midfield",
  "30\"",
  "30 inch",
  "30in"
];

export const EXCLUDE_KEYWORDS = [
  "women",
  "women's",
  "girls",
  "junior",
  "jr ",
  "complete stick",
  "head only",
  "head w/ shaft",
  "replacement butt",
  "butt end",
  "grip tape",
  "butt cap",
  "poster",
  "sticker",
  "wall hanger",
  "mini stick",
  "toy",
  "reproduction",
  "custom wrap"
];

export const CONDITION_POSITIVE = [
  "no dents",
  "no bends",
  "straight",
  "great condition",
  "excellent condition",
  "lightly used",
  "like new",
  "new",
  "unused"
];

export const CONDITION_NEGATIVE = [
  "bent",
  "slightly bent",
  "crack",
  "cracked",
  "dent",
  "dented",
  "ding",
  "heavily used",
  "rough",
  "beat",
  "beater",
  "project"
];

export const SOLD_PHRASES = [
  "item sold",
  "sold out",
  "current stock: sold out",
  "this item is sold out",
  "this listing was ended",
  "this item has been sold",
  "listing ended",
  "out of stock",
  "no longer available",
  "ended on",
  "this item is no longer available"
];

export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0 Safari/537.36";
