import React from 'react';
import {
  Bike,
  Coins,
  Home,
  PackageCheck,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import { BIKES, CREATOR_NAME, RunSummary, SaveData } from '../types';

interface ResultsOverlayProps {
  summary: RunSummary;
  save: SaveData;
  onReplay: () => void;
  onOpenShop: () => void;
  onMenu: () => void;
}

export const ResultsOverlay: React.FC<ResultsOverlayProps> = ({
  summary,
  save,
  onReplay,
  onOpenShop,
  onMenu,
}) => {
  const newRecord = summary.isNewBestScore || summary.isNewBestDeliveries;
  const unlockableBike = BIKES.find(
    (b) => !save.unlockedBikes.includes(b.id) && save.pesos >= b.price
  );

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-[#140a20]/55 p-3 sm:p-4 backdrop-blur-[5px]">
      <div className="animate-pop-in relative my-auto w-full max-w-md overflow-hidden rounded-3xl border-[3px] border-amber-300/80 bg-[#1c0f2b]/92 p-4 sm:p-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
        {/* Top colorful papel picado stripe */}
        <div className="papel-stripe -mx-6 -mt-6 mb-4 h-2.5" />

        {newRecord && (
          <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#e62e7a] to-[#ff8c1a] px-3.5 py-0.5 text-xs font-bold uppercase tracking-wider text-white shadow">
            <Trophy className="h-3.5 w-3.5 text-amber-200" />
            <span>¡Nuevo Récord Personal!</span>
          </div>
        )}

        <h2
          className="font-arcade text-5xl sm:text-6xl leading-none tracking-wider text-[#FFE13B]"
          style={{
            WebkitTextStroke: '5px #1e0a22',
            paintOrder: 'stroke fill',
            textShadow: '0 4px 0 #c93312, 0 8px 16px rgba(0,0,0,0.5)',
          }}
        >
          ¡SE ACABÓ EL TIEMPO!
        </h2>

        {/* Total Run Earnings Highlight */}
        <div className="mt-4 rounded-2xl border-2 border-amber-300/45 bg-gradient-to-b from-amber-500/20 to-amber-500/5 py-3 px-4">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-200/80">
            Propinas Ganadas
          </div>
          <div className="font-arcade mt-0.5 text-5xl sm:text-6xl text-amber-300 hud-outline tabular-nums leading-none">
            +${summary.score.toLocaleString('es-MX')}
          </div>
          <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-white/75">
            <Coins className="h-3.5 w-3.5 text-amber-300" />
            <span>
              Total guardado:{' '}
              <strong className="text-amber-200 tabular-nums">
                ${save.pesos.toLocaleString('es-MX')}
              </strong>
            </span>
          </div>
        </div>

        {/* Key Run Breakdown (clean & scannable) */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl border border-white/12 bg-white/6 py-2.5 px-2">
            <PackageCheck className="mx-auto h-4 w-4 text-emerald-300" />
            <div className="font-arcade mt-0.5 text-2xl sm:text-3xl text-white tabular-nums leading-none">
              {summary.deliveries}
            </div>
            <div className="text-[11px] font-medium text-white/65">Entregas</div>
          </div>

          <div className="rounded-2xl border border-white/12 bg-white/6 py-2.5 px-2">
            <Zap className="mx-auto h-4 w-4 text-pink-300" />
            <div className="font-arcade mt-0.5 text-2xl sm:text-3xl text-pink-300 tabular-nums leading-none">
              x{summary.bestCombo}
            </div>
            <div className="text-[11px] font-medium text-white/65">Mejor Combo</div>
          </div>

          <div className="rounded-2xl border border-white/12 bg-white/6 py-2.5 px-2">
            <Trophy className="mx-auto h-4 w-4 text-amber-300" />
            <div className="font-arcade mt-0.5 text-2xl sm:text-3xl text-amber-200 tabular-nums leading-none">
              ${summary.stuntBonus}
            </div>
            <div className="text-[11px] font-medium text-white/65">Acrobacias</div>
          </div>
        </div>

        {/* Personal Record Line */}
        <div className="mt-2.5 flex items-center justify-center gap-4 text-xs text-white/70">
          <span>
            Récord:{' '}
            <strong className="text-amber-300 tabular-nums">
              ${save.bestScore.toLocaleString('es-MX')}
            </strong>
          </span>
          <span>·</span>
          <span>
            Más entregas:{' '}
            <strong className="text-emerald-300 tabular-nums">{save.bestDeliveries}</strong>
          </span>
        </div>

        {/* Teaser banner if the player can now unlock a killer new bike! */}
        {unlockableBike && (
          <button
            type="button"
            onClick={onOpenShop}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-pink-300/70 bg-gradient-to-r from-pink-600/45 to-amber-500/35 px-3 py-2 text-xs font-bold text-amber-100 transition hover:brightness-110 cursor-pointer"
          >
            <Bike className="h-4 w-4 text-amber-300 shrink-0" />
            <span>
              ¡Ya puedes desbloquear <strong className="text-white">{unlockableBike.name}</strong>!
            </span>
          </button>
        )}

        {/* Instant "One More Try!" Actions */}
        <div className="mt-4 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onReplay}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-[3px] border-white/90 bg-gradient-to-b from-[#24f074] to-[#0da84d] py-3 text-white shadow-[0_6px_0_#075e2b] transition hover:brightness-105 active:translate-y-1 active:shadow-[0_2px_0_#075e2b] cursor-pointer"
          >
            <RotateCcw className="h-6 w-6" />
            <span className="font-arcade text-3xl tracking-wider hud-outline">
              ¡UN INTENTO MÁS!
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onOpenShop}
              className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-amber-200/80 bg-gradient-to-b from-amber-300 to-orange-500 py-2.5 font-arcade text-xl tracking-wide text-[#240e04] shadow-[0_4px_0_#853d05] transition hover:brightness-105 active:translate-y-0.5 cursor-pointer"
            >
              <Bike className="h-5 w-5" />
              <span>TIENDA</span>
            </button>
            <button
              type="button"
              onClick={onMenu}
              className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-white/25 bg-white/10 py-2.5 font-arcade text-xl tracking-wide text-white transition hover:bg-white/20 active:scale-95 cursor-pointer"
            >
              <Home className="h-5 w-5" />
              <span>MENÚ</span>
            </button>
          </div>
        </div>

        {/* Mandatory Prominent Elegant Creator Credit */}
        <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold text-amber-100/95">
          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          <span>
            Creado por: <strong className="font-bold text-amber-300">{CREATOR_NAME}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};

interface PauseOverlayProps {
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
}

export const PauseOverlay: React.FC<PauseOverlayProps> = ({
  onResume,
  onRestart,
  onMenu,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#140a20]/60 p-4 backdrop-blur-sm">
      <div className="animate-pop-in w-full max-w-xs overflow-hidden rounded-3xl border-[3px] border-white/40 bg-[#1c0f2b]/92 p-6 text-center shadow-2xl">
        <div className="papel-stripe -mx-6 -mt-6 mb-4 h-2" />
        <h2 className="font-arcade text-5xl tracking-wider text-amber-300 hud-outline">
          PAUSA
        </h2>
        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-white/85 bg-gradient-to-b from-[#24f074] to-[#0da84d] py-3 font-arcade text-2xl tracking-wider text-white shadow-[0_5px_0_#075e2b] transition hover:brightness-105 active:translate-y-0.5 cursor-pointer"
          >
            <Play className="h-5 w-5 fill-white" />
            <span>CONTINUAR</span>
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-amber-200/80 bg-gradient-to-b from-amber-300 to-orange-500 py-2.5 font-arcade text-2xl tracking-wider text-[#260f04] shadow-[0_4px_0_#853d05] transition hover:brightness-105 active:translate-y-0.5 cursor-pointer"
          >
            <RotateCcw className="h-5 w-5" />
            <span>REINICIAR</span>
          </button>
          <button
            type="button"
            onClick={onMenu}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-white/25 bg-white/10 py-2.5 font-arcade text-2xl tracking-wider text-white transition hover:bg-white/20 cursor-pointer"
          >
            <Home className="h-5 w-5" />
            <span>MENÚ</span>
          </button>
        </div>
        <p className="mt-4 text-[11px] font-semibold text-amber-200/80">
          Creado por: <strong className="text-amber-300">{CREATOR_NAME}</strong>
        </p>
      </div>
    </div>
  );
};
