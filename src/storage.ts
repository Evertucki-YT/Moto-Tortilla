import { BikeId, BIKES, SaveData } from './types';

const STORAGE_KEY = 'moto_tortilla_reparto_extremo_v1';

const VALID_BIKES = new Set<BikeId>(BIKES.map((b) => b.id));

export const DEFAULT_SAVE: SaveData = {
  pesos: 0,
  unlockedBikes: ['clasica'],
  selectedBike: 'clasica',
  bestScore: 0,
  bestDeliveries: 0,
  muted: false,
  mobileAutoAccel: true,
};

export function loadSave(): SaveData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SAVE, unlockedBikes: ['clasica'] };
    const parsed = JSON.parse(raw) as Partial<SaveData>;

    const unlockedRaw = Array.isArray(parsed.unlockedBikes)
      ? parsed.unlockedBikes.filter((id): id is BikeId => VALID_BIKES.has(id as BikeId))
      : [];
    if (!unlockedRaw.includes('clasica')) unlockedRaw.unshift('clasica');

    const selectedBike: BikeId =
      parsed.selectedBike && unlockedRaw.includes(parsed.selectedBike)
        ? parsed.selectedBike
        : 'clasica';

    return {
      pesos: typeof parsed.pesos === 'number' && Number.isFinite(parsed.pesos) ? Math.max(0, Math.floor(parsed.pesos)) : 0,
      unlockedBikes: Array.from(new Set(unlockedRaw)),
      selectedBike,
      bestScore: typeof parsed.bestScore === 'number' && Number.isFinite(parsed.bestScore) ? Math.max(0, Math.floor(parsed.bestScore)) : 0,
      bestDeliveries: typeof parsed.bestDeliveries === 'number' && Number.isFinite(parsed.bestDeliveries) ? Math.max(0, Math.floor(parsed.bestDeliveries)) : 0,
      muted: Boolean(parsed.muted),
      mobileAutoAccel: parsed.mobileAutoAccel !== undefined ? Boolean(parsed.mobileAutoAccel) : true,
    };
  } catch {
    return { ...DEFAULT_SAVE, unlockedBikes: ['clasica'] };
  }
}

export function persistSave(data: SaveData): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota or private-mode restrictions gracefully
  }
}
