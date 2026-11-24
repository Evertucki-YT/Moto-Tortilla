import React from 'react';
import {
  Bike,
  Gamepad2,
  Play,
  Trophy,
  Volume2,
  VolumeX,
  PackageCheck,
  Coins,
  Sparkles,
} from 'lucide-react';
import { BIKES, CREATOR_NAME, getBikeSpec, SaveData } from '../types';

interface TitleOverlayProps {
  save: SaveData;
  gamepadConnected: boolean;
  onPlay: () => void;
  onOpenShop: () => void;
  onToggleMute: () => void;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  save,
  gamepadConnected,
  onPlay,
  onOpenShop,
  onToggleMute,
}) => {
  const currentBike = getBikeSpec(save.selectedBike);
  const canAffordNew = BIKES.some(
    (b) => !save.unlockedBikes.includes(b.id) && save.pesos >= b.price
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-6">
      {/* Subtle warm top & bottom edge scrim so type always sings with crystal readability over bright sky */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-44"
        style={{
          background:
            'linear-gradient(180deg, rgba(16,10,28,0.42) 0%, rgba(16,10,28,0.12) 60%, rgba(16,10,28,0) 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-56"
        style={{
          background:
            'linear-gradient(0deg, rgba(16,10,28,0.68) 0%, rgba(16,10,28,0.22) 58%, rgba(16,10,28,0) 100%)',
        }}
      />

      {/* Top Strip: Wallet, Optional Xbox Indicator, Sound Mute */}
      <div className="relative flex items-center justify-between gap-3">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border-2 border-amber-300/70 bg-[#1c1026]/70 px-3.5 py-1.5 backdrop-blur-md shadow-lg">
          <Coins className="h-5 w-5 text-amber-300" />
          <span className="text-base sm:text-lg font-bold tracking-tight text-amber-200 tabular-nums">
            ${save.pesos.toLocaleString('es-MX')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {gamepadConnected && (
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-300/60 bg-emerald-950/75 px-3 py-1.5 text-xs font-semibold text-emerald-200 backdrop-blur-md">
              <Gamepad2 className="h-4 w-4 text-emerald-400" />
              <span className="hidden sm:inline">Control Xbox</span>
            </div>
          )}
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={save.muted ? 'Activar sonido' : 'Silenciar sonido'}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/35 bg-[#1c1026]/70 text-white shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-[#2a1738]/85 active:scale-95 cursor-pointer"
          >
            {save.muted ? <VolumeX className="h-5 w-5 text-rose-300" /> : <Volume2 className="h-5 w-5 text-amber-300" />}
          </button>
        </div>
      </div>

      {/* Upper Open-Sky Bold Sunny Crazy-Taxi Title + Prominent Creator Credit */}
      <div className="relative flex flex-col items-center text-center -mt-9 sm:-mt-12 mb-auto pt-0.5 sm:pt-1 [@media(max-height:500px)]:-mt-10">
        <div className="papel-stripe mb-1.5 h-1.5 w-40 sm:w-60 rounded-full shadow-md [@media(max-height:500px)]:hidden" />
        <h1
          className="font-arcade text-[3.2rem] leading-[0.9] sm:text-[5.2rem] md:text-[6.3rem] [@media(max-height:500px)]:text-[2.9rem] tracking-wide text-[#FFE13B]"
          style={{
            WebkitTextStroke: '7px #230d24',
            paintOrder: 'stroke fill',
            textShadow:
              '0 6px 0 #c93312, 0 11px 0 #230d24, 0 16px 28px rgba(15, 6, 22, 0.55)',
          }}
        >
          MOTO TORTILLA
        </h1>

        <div className="mt-2 -rotate-1 rounded-xl border-2 border-amber-100/95 bg-gradient-to-r from-[#e62578] via-[#f03351] to-[#ff6b1a] px-5 sm:px-7 py-1 shadow-[0_5px_0_#590d28,0_10px_20px_rgba(0,0,0,0.35)]">
          <span className="font-arcade text-xl sm:text-3xl tracking-widest text-white hud-outline">
            REPARTO EXTREMO
          </span>
        </div>

        {/* Mandatory Prominent Elegant Creator Credit */}
        <div className="mt-2.5 inline-flex items-center gap-2 rounded-full border-2 border-amber-300/85 bg-[#1c0f2a]/84 px-4 py-1 text-xs sm:text-sm font-semibold tracking-wide text-amber-50 shadow-lg backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          <span>
            Creado por: <strong className="font-bold text-amber-300">{CREATOR_NAME}</strong>
          </span>
        </div>
      </div>

      {/* Lower Showcase Strip: Live Personal Records, Action CTAs, Subtle Controls */}
      <div className="relative flex flex-col items-center gap-3">
        {/* Compact Personal Best Bar + Equipped Moto */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5 rounded-full border border-white/25 bg-[#1a0f26]/72 px-3 py-1 backdrop-blur-md">
            <Trophy className="h-4 w-4 text-amber-300" />
            <span className="text-white/75">Mejor:</span>
            <span className="font-bold text-amber-300 tabular-nums">
              ${save.bestScore.toLocaleString('es-MX')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-white/25 bg-[#1a0f26]/72 px-3 py-1 backdrop-blur-md">
            <PackageCheck className="h-4 w-4 text-emerald-300" />
            <span className="text-white/75">Entregas Récord:</span>
            <span className="font-bold text-emerald-300 tabular-nums">{save.bestDeliveries}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-white/25 bg-[#1a0f26]/72 px-3 py-1 backdrop-blur-md">
            <Bike className="h-4 w-4 text-sky-300" />
            <span className="font-semibold text-white">{currentBike.name}</span>
          </div>
        </div>

        {/* Primary Play & Garage Shop Buttons */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onPlay}
            className="group relative flex items-center gap-2.5 rounded-2xl border-[3px] border-white/90 bg-gradient-to-b from-[#24f074] to-[#0da84d] px-8 sm:px-11 py-3.5 sm:py-4 text-white shadow-[0_7px_0_#075e2b,0_14px_28px_rgba(0,0,0,0.45)] transition duration-150 hover:brightness-105 hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_#075e2b] cursor-pointer"
          >
            <Play className="h-7 w-7 fill-white transition-transform group-hover:scale-110" />
            <span className="font-arcade text-3xl sm:text-4xl tracking-wider hud-outline">
              ¡A REPARTIR!
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenShop}
            className="relative flex items-center gap-2 rounded-2xl border-[3px] border-amber-200/90 bg-gradient-to-b from-[#ffbe1f] to-[#e07d0a] px-5 sm:px-7 py-3.5 sm:py-4 text-[#231008] shadow-[0_7px_0_#854205,0_14px_26px_rgba(0,0,0,0.4)] transition duration-150 hover:brightness-105 hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_#854205] cursor-pointer"
          >
            <Bike className="h-6 w-6 text-[#2c1205]" />
            <span className="font-arcade text-2xl sm:text-3xl tracking-wide text-[#240f06]">
              TIENDA MOTOS
            </span>
            {canAffordNew && (
              <span className="absolute -right-2 -top-2.5 rounded-full border-2 border-white bg-[#e62e7a] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow animate-bounce">
                ¡Alcanza!
              </span>
            )}
          </button>
        </div>

        {/* Crisp minimal one-line control whisper */}
        <p className="text-center text-[11px] sm:text-xs font-medium text-white/85 hud-outline">
          <span className="hidden sm:inline">
            WASD / Flechas: Conducir · Espacio: Saltar · Shift: Turbo / Caballito · H: Claxon · Xbox y Móvil listos
          </span>
          <span className="sm:hidden">
            Botones táctiles a dos pulgares · Auto-acelerador incluido
          </span>
        </p>
      </div>
    </div>
  );
};
