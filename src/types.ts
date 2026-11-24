export type BikeId = 'clasica' | 'italika' | 'tortillera' | 'cohete';

export type ScreenMode = 'menu' | 'shop' | 'playing' | 'paused' | 'results';

export type MissionPhase = 'pickup' | 'deliver';

export type DishId = 'tacos' | 'tortillas' | 'esquites' | 'tamales';

export interface DishInfo {
  id: DishId;
  name: string;
  shortName: string;
  emoji: string;
  basePay: number;
  bonusSeconds: number;
  color: string;
  hex: number;
}

export const DISHES: DishInfo[] = [
  {
    id: 'tacos',
    name: 'Tacos al Pastor',
    shortName: 'Tacos al Pastor',
    emoji: '🌮',
    basePay: 75,
    bonusSeconds: 9,
    color: '#FF6B2B',
    hex: 0xff6b2b,
  },
  {
    id: 'tortillas',
    name: 'Tortillas Calientitas',
    shortName: 'Tortillas Calientes',
    emoji: '🫓',
    basePay: 65,
    bonusSeconds: 8,
    color: '#F5B82E',
    hex: 0xf5b82e,
  },
  {
    id: 'esquites',
    name: 'Esquites con Limón',
    shortName: 'Esquites',
    emoji: '🌽',
    basePay: 70,
    bonusSeconds: 8,
    color: '#F2DC38',
    hex: 0xf2dc38,
  },
  {
    id: 'tamales',
    name: 'Tamales Calientes',
    shortName: 'Tamales',
    emoji: '🫔',
    basePay: 85,
    bonusSeconds: 10,
    color: '#22C55E',
    hex: 0x22c55e,
  },
];

export interface BikeSpec {
  id: BikeId;
  name: string;
  tagline: string;
  price: number;
  maxSpeed: number;        // normal m/s
  turboSpeed: number;      // boosted m/s
  accel: number;           // m/s^2
  turnRate: number;        // rad/s
  driftGrip: number;       // lateral corner feel
  turboMax: number;        // 100 normal, 200 double turbo
  turboDrain: number;      // units/sec while active
  turboRegen: number;      // passive units/sec
  crashShield: boolean;    // resists crash without losing combo
  shieldCooldown: number;  // seconds between shield absorptions
  hasNeon: boolean;
  blueFlame: boolean;
  accentHex: string;
  badgeText: string;
  // Stat display (1..10)
  stats: {
    velocidad: number;
    manejo: number;
    turbo: number;
    aguante: number;
  };
}

export const BIKES: BikeSpec[] = [
  {
    id: 'clasica',
    name: 'La Clásica del Barrio',
    tagline: 'Equilibrada y fiel, con su caja térmica de reparto.',
    price: 0,
    maxSpeed: 34,
    turboSpeed: 48,
    accel: 34,
    turnRate: 2.55,
    driftGrip: 7.4,
    turboMax: 100,
    turboDrain: 30,
    turboRegen: 13,
    crashShield: false,
    shieldCooldown: 0,
    hasNeon: false,
    blueFlame: false,
    accentHex: '#EF4444',
    badgeText: 'Caja de Reparto',
    stats: { velocidad: 6, manejo: 7, turbo: 5, aguante: 6 },
  },
  {
    id: 'italika',
    name: 'La Italika Tunneada',
    tagline: 'Más veloz, derrape ultra ágil y luces neón callejeras.',
    price: 300,
    maxSpeed: 40,
    turboSpeed: 55,
    accel: 42,
    turnRate: 3.15,
    driftGrip: 9.2,
    turboMax: 115,
    turboDrain: 29,
    turboRegen: 15,
    crashShield: false,
    shieldCooldown: 0,
    hasNeon: true,
    blueFlame: false,
    accentHex: '#EC4899',
    badgeText: 'Derrape + Neón',
    stats: { velocidad: 8, manejo: 10, turbo: 7, aguante: 6 },
  },
  {
    id: 'tortillera',
    name: 'La Tortillera Turbo',
    tagline: 'Hielera gigante blindada: aguanta choques sin perder combo y doble turbo.',
    price: 750,
    maxSpeed: 42,
    turboSpeed: 58,
    accel: 43,
    turnRate: 2.75,
    driftGrip: 8.2,
    turboMax: 200,
    turboDrain: 26,
    turboRegen: 22,
    crashShield: true,
    shieldCooldown: 4.5,
    hasNeon: false,
    blueFlame: false,
    accentHex: '#0EA5E9',
    badgeText: 'Anti-Choque + 2x Turbo',
    stats: { velocidad: 8, manejo: 7, turbo: 10, aguante: 10 },
  },
  {
    id: 'cohete',
    name: 'El Cohete Azteca',
    tagline: 'Velocidad máxima extrema con escape de llama azul volcánica.',
    price: 1500,
    maxSpeed: 49,
    turboSpeed: 68,
    accel: 54,
    turnRate: 3.05,
    driftGrip: 9.0,
    turboMax: 155,
    turboDrain: 27,
    turboRegen: 20,
    crashShield: false,
    shieldCooldown: 0,
    hasNeon: true,
    blueFlame: true,
    accentHex: '#F59E0B',
    badgeText: 'Llama Azul Extrema',
    stats: { velocidad: 10, manejo: 9, turbo: 10, aguante: 8 },
  },
];

export function getBikeSpec(id: BikeId): BikeSpec {
  return BIKES.find((b) => b.id === id) ?? BIKES[0];
}

export interface SaveData {
  pesos: number;
  unlockedBikes: BikeId[];
  selectedBike: BikeId;
  bestScore: number;
  bestDeliveries: number;
  muted: boolean;
  mobileAutoAccel: boolean;
}

export interface StuntCallout {
  id: number;
  text: string;
  sub?: string;
  tone: 'gold' | 'green' | 'cyan' | 'pink' | 'red';
}

export interface RunSummary {
  score: number;         // total pesos earned this run
  deliveries: number;
  bestCombo: number;
  stuntBonus: number;
  nearMisses: number;
  rampJumps: number;
  isNewBestScore: boolean;
  isNewBestDeliveries: boolean;
  totalWallet: number;
}

export interface HudSnapshot {
  timeLeft: number;
  runPesos: number;
  deliveries: number;
  combo: number;
  speedKmh: number;
  turbo: number;         // 0..turboMax
  turboMax: number;
  turboActive: boolean;
  wheelieActive: boolean;
  blueFlame: boolean;
  shieldReady: boolean;
  shieldEnabled: boolean;
  shieldProgress: number; // 0..1
  crashed: boolean;
  phase: MissionPhase;
  currentDish: DishInfo;
  targetDistance: number;
  gamepadConnected: boolean;
  lowTime: boolean;
  callouts: StuntCallout[];
}

export interface TouchInputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  turbo: boolean;
  brake: boolean;
  horn: boolean;
}

export const CREATOR_NAME = 'Ever Baruc';
