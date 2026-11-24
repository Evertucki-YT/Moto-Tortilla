import React from 'react';
import {
  ArrowLeft,
  Check,
  Coins,
  Flame,
  Lock,
  Play,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react';
import { BikeId, BIKES, BikeSpec, SaveData } from '../types';

interface ShopModalProps {
  save: SaveData;
  inspectedBike: BikeId;
  onInspect: (id: BikeId) => void;
  onBuy: (id: BikeId) => void;
  onEquip: (id: BikeId) => void;
  onBack: () => void;
  onPlayNow: () => void;
}

const STAT_META: Array<{ key: keyof BikeSpec['stats']; label: string; color: string }> = [
  { key: 'velocidad', label: 'Velocidad', color: 'from-amber-400 to-orange-500' },
  { key: 'manejo', label: 'Manejo', color: 'from-emerald-400 to-teal-500' },
  { key: 'turbo', label: 'Turbo', color: 'from-sky-400 to-blue-500' },
  { key: 'aguante', label: 'Aguante', color: 'from-pink-400 to-rose-500' },
];

function bikeSpecialIcon(bike: BikeSpec) {
  if (bike.blueFlame) return <Flame className="h-3.5 w-3.5 text-sky-300" />;
  if (bike.crashShield) return <Shield className="h-3.5 w-3.5 text-sky-300" />;
  if (bike.hasNeon) return <Sparkles className="h-3.5 w-3.5 text-pink-300" />;
  return <Zap className="h-3.5 w-3.5 text-amber-300" />;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  save,
  inspectedBike,
  onInspect,
  onBuy,
  onEquip,
  onBack,
  onPlayNow,
}) => {
  const active = BIKES.find((b) => b.id === inspectedBike) ?? BIKES[0];
  const owned = save.unlockedBikes.includes(active.id);
  const equipped = save.selectedBike === active.id;
  const canAfford = save.pesos >= active.price;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-5">
      {/* Subtle top edge fade for clean header legibility while leaving central 3D spinning bike bright & unobstructed! */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28"
        style={{
          background: 'linear-gradient(180deg, rgba(16,9,26,0.62) 0%, rgba(16,9,26,0) 100%)',
        }}
      />

      {/* Top Header */}
      <div className="relative flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="pointer-events-auto flex items-center gap-1.5 rounded-full border-2 border-white/40 bg-[#1c1028]/78 px-4 py-2 text-sm font-bold text-white backdrop-blur-md shadow-lg transition hover:bg-[#2c193f] active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Menú</span>
        </button>

        <h2 className="font-arcade title-stroke-sm text-2xl sm:text-4xl text-amber-300 tracking-wider">
          TALLER DE MOTOS
        </h2>

        <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border-2 border-amber-300/75 bg-[#1c1028]/82 px-3.5 py-1.5 backdrop-blur-md shadow-lg">
          <Coins className="h-5 w-5 text-amber-300" />
          <span className="text-base sm:text-lg font-bold text-amber-200 tabular-nums">
            ${save.pesos.toLocaleString('es-MX')}
          </span>
        </div>
      </div>

      {/* Bottom Docked Glassmorphic Shop Deck (leaves center turntable showcase crystal open!) */}
      <div className="pointer-events-auto relative mx-auto w-full max-w-4xl rounded-3xl border-2 border-white/25 bg-[#170d24]/84 p-3.5 sm:p-5 shadow-2xl backdrop-blur-lg">
        <div className="papel-stripe -mt-3.5 sm:-mt-5 mb-3 -mx-3.5 sm:-mx-5 h-1.5 rounded-t-3xl" />

        {/* Horizontal selector tabs for all 4 Mexican icon motorcycles */}
        <div className="no-scrollbar mb-3.5 flex gap-2 overflow-x-auto pb-1">
          {BIKES.map((bike) => {
            const isOwned = save.unlockedBikes.includes(bike.id);
            const isEquipped = save.selectedBike === bike.id;
            const isSelected = bike.id === active.id;
            return (
              <button
                key={bike.id}
                type="button"
                onClick={() => onInspect(bike.id)}
                className={`flex-1 min-w-[136px] rounded-2xl border-2 px-3 py-2 text-left transition cursor-pointer ${
                  isSelected
                    ? 'border-amber-300 bg-white/15 shadow-[0_0_20px_rgba(255,200,40,0.22)]'
                    : 'border-white/15 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: bike.accentHex }}
                  />
                  {isEquipped ? (
                    <span className="rounded-full bg-emerald-500/90 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                      En uso
                    </span>
                  ) : isOwned ? (
                    <span className="text-[10px] font-semibold text-emerald-300">Tuya</span>
                  ) : (
                    <span
                      className={`flex items-center gap-0.5 text-[11px] font-bold tabular-nums ${
                        save.pesos >= bike.price ? 'text-amber-300' : 'text-white/55'
                      }`}
                    >
                      <Lock className="h-2.5 w-2.5" />${bike.price.toLocaleString('es-MX')}
                    </span>
                  )}
                </div>
                <div className="mt-1 truncate text-xs sm:text-sm font-bold text-white">
                  {bike.name}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Bike Detail + Compact Stat Bars + Primary Action */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-arcade text-2xl sm:text-3xl tracking-wide text-white leading-none">
                {active.name}
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-200">
                {bikeSpecialIcon(active)}
                {active.badgeText}
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-white/80 leading-snug">
              {active.tagline}
            </p>

            {/* Crisp 4 Stat Bars */}
            <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STAT_META.map((st) => {
                const val = active.stats[st.key];
                return (
                  <div key={st.key} className="rounded-xl bg-white/6 px-2.5 py-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-white/75">
                      <span>{st.label}</span>
                      <span className="text-white tabular-nums">{val}/10</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-black/45">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${st.color} transition-all duration-300`}
                        style={{ width: `${val * 10}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Unlock / Equip / Ride Button */}
          <div className="flex sm:flex-col items-stretch gap-2 sm:w-48 shrink-0">
            {!owned ? (
              <button
                type="button"
                disabled={!canAfford}
                onClick={() => onBuy(active.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-2xl border-2 px-4 py-3 font-arcade text-xl sm:text-2xl tracking-wide transition ${
                  canAfford
                    ? 'border-amber-100 bg-gradient-to-b from-amber-300 to-orange-500 text-[#230e04] shadow-[0_5px_0_#853904] hover:brightness-105 active:translate-y-0.5 cursor-pointer'
                    : 'border-white/15 bg-white/10 text-white/45 cursor-not-allowed'
                }`}
              >
                <Coins className="h-5 w-5" />
                <span>
                  {canAfford
                    ? `COMPRAR $${active.price.toLocaleString('es-MX')}`
                    : `FALTA $${(active.price - save.pesos).toLocaleString('es-MX')}`}
                </span>
              </button>
            ) : equipped ? (
              <button
                type="button"
                onClick={onPlayNow}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl border-2 border-white/90 bg-gradient-to-b from-[#24f074] to-[#0da84d] px-4 py-3 font-arcade text-2xl tracking-wider text-white shadow-[0_5px_0_#075e2b] transition hover:brightness-105 active:translate-y-0.5 cursor-pointer"
              >
                <Play className="h-5 w-5 fill-white" />
                <span>¡A CORRER!</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onEquip(active.id)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border-2 border-sky-200 bg-gradient-to-b from-sky-400 to-blue-600 px-4 py-3 font-arcade text-2xl tracking-wider text-white shadow-[0_5px_0_#133a7a] transition hover:brightness-105 active:translate-y-0.5 cursor-pointer"
              >
                <Check className="h-5 w-5" />
                <span>USAR MOTO</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
