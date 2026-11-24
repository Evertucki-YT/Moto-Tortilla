import React, { useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Flame,
  Gamepad2,
  Pause,
  Shield,
  Smartphone,
  Volume2,
  VolumeX,
  Megaphone,
  Gauge,
} from 'lucide-react';
import { HudSnapshot, TouchInputState } from '../types';

interface GameHudProps {
  hud: HudSnapshot;
  muted: boolean;
  touchHud: boolean;
  mobileAutoAccel: boolean;
  onBindMinimap: (canvas: HTMLCanvasElement | null) => void;
  onTouchChange: (partial: Partial<TouchInputState>) => void;
  onToggleMute: () => void;
  onToggleTouchHud: () => void;
  onToggleAutoAccel: () => void;
  onPause: () => void;
  onHorn: () => void;
}

const CALLOUT_STYLE: Record<string, string> = {
  gold: 'text-amber-300 border-amber-300/80 bg-[#2a1704]/78',
  green: 'text-emerald-300 border-emerald-300/80 bg-[#072617]/78',
  cyan: 'text-sky-200 border-sky-300/80 bg-[#082038]/78',
  pink: 'text-pink-200 border-pink-300/85 bg-[#330924]/78',
  red: 'text-rose-200 border-rose-400/85 bg-[#380b12]/82',
};

function bindTouchHold(
  onSet: (down: boolean) => void
): React.ButtonHTMLAttributes<HTMLButtonElement> {
  return {
    onPointerDown: (e) => {
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore if unsupported
      }
      onSet(true);
    },
    onPointerUp: (e) => {
      e.preventDefault();
      onSet(false);
    },
    onPointerCancel: () => onSet(false),
    onLostPointerCapture: () => onSet(false),
    onContextMenu: (e) => e.preventDefault(),
  };
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  muted,
  touchHud,
  mobileAutoAccel,
  onBindMinimap,
  onTouchChange,
  onToggleMute,
  onToggleTouchHud,
  onToggleAutoAccel,
  onPause,
  onHorn,
}) => {
  const mapRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    onBindMinimap(mapRef.current);
    return () => onBindMinimap(null);
  }, [onBindMinimap]);

  const turboPct = Math.max(0, Math.min(100, (hud.turbo / Math.max(1, hud.turboMax)) * 100));
  const secsWhole = Math.floor(hud.timeLeft);
  const tenths = Math.floor((hud.timeLeft - secsWhole) * 10);
  const isDeliver = hud.phase === 'deliver';

  return (
    <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
      {/* Dynamic Speed Edge Glow during Turbo (Blazing Blue for El Cohete Azteca!) */}
      {hud.turboActive && (
        <div
          className={`pointer-events-none absolute inset-0 ${
            hud.blueFlame ? 'turbo-vignette-blue' : 'turbo-vignette'
          }`}
        />
      )}
      {/* Urgent heartbeat rim under 10 seconds */}
      {hud.lowTime && (
        <div className="pointer-events-none absolute inset-0 low-time-vignette animate-pulse" />
      )}

      {/* TOP BAR */}
      <div className="relative flex items-start justify-between p-3 sm:p-4 gap-2">
        {/* TOP-LEFT: Run Cash ($), Combo Pop & Deliveries */}
        <div className="flex flex-col items-start gap-1.5 min-w-[100px]">
          <div className="flex items-baseline gap-1.5 rounded-2xl border-2 border-amber-300/80 bg-[#190e26]/75 px-3 sm:px-4 py-1 sm:py-1.5 backdrop-blur-md shadow-lg">
            <span className="font-arcade text-2xl sm:text-4xl text-amber-300 hud-outline tabular-nums leading-none">
              ${hud.runPesos.toLocaleString('es-MX')}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Deliveries tally */}
            <div className="rounded-full border border-white/25 bg-[#190e26]/72 px-2.5 py-0.5 text-xs sm:text-sm font-bold text-white backdrop-blur-md tabular-nums">
              🛵 {hud.deliveries}
            </div>

            {/* Explosive COMBO Multiplier badge */}
            {hud.combo > 1 && (
              <div
                key={hud.combo}
                className={`animate-pop-in rounded-full border-2 px-2.5 py-0.5 font-arcade text-base sm:text-xl leading-none tracking-wider shadow-lg ${
                  hud.combo >= 5
                    ? 'border-amber-200 bg-gradient-to-r from-[#e62e7a] to-[#ff8c1a] text-white'
                    : hud.combo >= 3
                    ? 'border-amber-200 bg-gradient-to-r from-amber-500 to-orange-600 text-white'
                    : 'border-emerald-200 bg-emerald-500 text-white'
                }`}
              >
                COMBO x{hud.combo}
              </div>
            )}

            {/* Live Xbox Controller indicator */}
            {hud.gamepadConnected && (
              <div className="hidden sm:flex items-center gap-1 rounded-full bg-emerald-950/75 border border-emerald-400/50 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                <Gamepad2 className="h-3.5 w-3.5" />
                Xbox
              </div>
            )}
          </div>
        </div>

        {/* TOP-CENTER: Giant Iconic Arcade Countdown Clock + Compact Order Target Pill */}
        <div className="flex flex-col items-center">
          <div
            className={`rounded-2xl border-[3px] px-4 sm:px-6 py-0.5 sm:py-1 shadow-xl backdrop-blur-md transition-colors ${
              hud.lowTime
                ? 'animate-urgent border-rose-200 bg-rose-600/90 text-white'
                : 'border-white/75 bg-[#180e24]/78 text-white'
            }`}
          >
            <div className="font-arcade flex items-baseline leading-none tabular-nums">
              <span className="text-4xl sm:text-6xl hud-outline">{secsWhole}</span>
              <span className="text-xl sm:text-2xl opacity-85 ml-0.5">.{tenths}s</span>
            </div>
          </div>

          {/* Crisp active dish & green/gold mission indicator */}
          <div
            className={`mt-1.5 flex items-center gap-1.5 rounded-full border-2 px-3 py-0.5 text-xs sm:text-sm font-bold shadow-md backdrop-blur-md ${
              isDeliver
                ? 'border-amber-200 bg-amber-500/90 text-[#231003]'
                : 'border-emerald-200 bg-emerald-600/88 text-white'
            }`}
          >
            <span className="text-sm sm:text-base leading-none">{hud.currentDish.emoji}</span>
            <span className="truncate max-w-[140px] sm:max-w-[210px]">
              {isDeliver ? `Entrega: ${hud.currentDish.shortName}` : '¡Recoge pedido!'}
            </span>
            <span className="opacity-80 tabular-nums text-[11px] sm:text-xs">
              {hud.targetDistance}m
            </span>
          </div>
        </div>

        {/* TOP-RIGHT: Quick Sound/Touch/Pause buttons + Crisp Rounded Corner Minimap */}
        <div className="flex flex-col items-end gap-2">
          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleMute}
              title={muted ? 'Activar música' : 'Silenciar'}
              aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 border-white/35 bg-[#1a0f26]/75 text-white shadow backdrop-blur-md transition hover:bg-[#2d1a40] active:scale-95 cursor-pointer"
            >
              {muted ? <VolumeX className="h-4 w-4 text-rose-300" /> : <Volume2 className="h-4 w-4 text-amber-300" />}
            </button>

            <button
              type="button"
              onClick={onToggleTouchHud}
              title="Controles táctiles"
              aria-label="Alternar controles táctiles"
              className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 shadow backdrop-blur-md transition active:scale-95 cursor-pointer ${
                touchHud
                  ? 'border-sky-300 bg-sky-600/80 text-white'
                  : 'border-white/35 bg-[#1a0f26]/75 text-white/80 hover:bg-[#2d1a40]'
              }`}
            >
              <Smartphone className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onPause}
              title="Pausa"
              aria-label="Pausar juego"
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 border-white/35 bg-[#1a0f26]/75 text-white shadow backdrop-blur-md transition hover:bg-[#2d1a40] active:scale-95 cursor-pointer"
            >
              <Pause className="h-4 w-4" />
            </button>
          </div>

          {/* Crisp Live Corner Minimap */}
          <div className="relative h-[88px] w-[88px] sm:h-[118px] sm:w-[118px] rounded-full border-[3px] border-white/75 bg-[#190f24]/80 shadow-xl overflow-hidden">
            <canvas
              ref={mapRef}
              width={136}
              height={136}
              className="h-full w-full block"
            />
            <span className="pointer-events-none absolute top-0.5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-white/70">
              N
            </span>
          </div>
        </div>
      </div>

      {/* CENTER-UPPER FLOATING STUNT & DELIVERY POPUPS (never covers your bike!) */}
      <div className="pointer-events-none absolute left-1/2 top-[22%] sm:top-[20%] -translate-x-1/2 flex flex-col items-center gap-1.5">
        {hud.callouts.map((c) => (
          <div
            key={c.id}
            className={`animate-stunt rounded-2xl border-2 px-4 py-1 text-center shadow-xl backdrop-blur-sm ${
              CALLOUT_STYLE[c.tone] ?? CALLOUT_STYLE.gold
            }`}
          >
            <div className="font-arcade text-2xl sm:text-4xl tracking-wider leading-none hud-outline whitespace-nowrap">
              {c.text}
            </div>
            {c.sub && (
              <div className="text-[11px] sm:text-xs font-bold text-white/95 leading-tight mt-0.5 whitespace-nowrap">
                {c.sub}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* TURBO + SPEED + TORTILLERA SHIELD GAUGE (shifts cleanly under top-left pill on touch screens!) */}
      <div
        className={`absolute left-3 sm:left-5 flex flex-col gap-1.5 transition-all ${
          touchHud ? 'top-[104px] sm:top-[122px]' : 'bottom-4 sm:bottom-5'
        }`}
      >
        {/* Optional Hielera Anti-Choque indicator (only for La Tortillera Turbo!) */}
        {hud.shieldEnabled && (
          <div className="flex items-center gap-1.5 rounded-full border border-sky-300/70 bg-[#0b233d]/80 px-2.5 py-0.5 text-[11px] font-bold text-sky-200 backdrop-blur-sm w-fit">
            <Shield className={`h-3.5 w-3.5 ${hud.shieldReady ? 'text-sky-300 fill-sky-400/40' : 'text-white/40'}`} />
            <span>{hud.shieldReady ? 'ESCUDO LISTO' : `Escudo ${Math.round(hud.shieldProgress * 100)}%`}</span>
          </div>
        )}

        {/* Crisp Glowing TURBO Gauge + Wheelie indicator + km/h */}
        <div className="flex items-center gap-2 rounded-2xl border-2 border-white/30 bg-[#170d24]/76 px-3 py-1.5 backdrop-blur-md shadow-lg">
          <Flame
            className={`h-5 w-5 shrink-0 ${
              hud.turboActive
                ? hud.blueFlame
                  ? 'text-sky-300 animate-bounce'
                  : 'text-amber-300 animate-bounce'
                : hud.blueFlame
                ? 'text-sky-400'
                : 'text-orange-400'
            }`}
          />
          <div className="w-28 sm:w-40">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/85 mb-0.5">
              <span>
                {hud.wheelieActive
                  ? '¡CABALLITO!'
                  : hud.turboMax > 180
                  ? 'DOBLE TURBO'
                  : 'TURBO'}
              </span>
              <span className="tabular-nums text-white/95">{hud.speedKmh} km/h</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/55 p-[1px]">
              <div
                className={`h-full rounded-full transition-[width] duration-75 ${
                  hud.blueFlame
                    ? 'bg-gradient-to-r from-cyan-400 via-sky-300 to-white'
                    : hud.turboActive
                    ? 'bg-gradient-to-r from-yellow-300 via-orange-400 to-rose-500'
                    : 'bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300'
                }`}
                style={{ width: `${turboPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Subtle PC corner horn chip (only when NOT in touch HUD mode) */}
      {!touchHud && (
        <div className="pointer-events-auto hidden sm:flex items-center gap-2 absolute right-5 bottom-5">
          <button
            type="button"
            onClick={onHorn}
            title="Claxon mexicano (H)"
            className="flex items-center gap-1.5 rounded-full border border-white/25 bg-[#170d24]/65 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur-md transition hover:bg-[#2a183e] active:scale-95 cursor-pointer"
          >
            <Megaphone className="h-3.5 w-3.5 text-amber-300" />
            <span>Claxon [H]</span>
          </button>
        </div>
      )}

      {/* CLEAN RESPONSIVE TWO-THUMB MOBILE / TABLET TOUCH HUD */}
      {touchHud && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-3 sm:p-5 pb-[max(14px,env(safe-area-inset-bottom))]">
          {/* Left Thumb: Big crisp semitransparent LEFT / RIGHT */}
          <div className="pointer-events-auto flex items-center gap-2.5 sm:gap-3.5">
            <button
              type="button"
              aria-label="Girar izquierda"
              {...bindTouchHold((d) => onTouchChange({ left: d }))}
              className="flex h-[74px] w-[74px] sm:h-[84px] sm:w-[84px] items-center justify-center rounded-full border-2 border-white/55 bg-black/35 text-white backdrop-blur-sm shadow-lg active:scale-90 active:bg-amber-400/55 transition-transform"
            >
              <ArrowLeft className="h-9 w-9 drop-shadow" />
            </button>
            <button
              type="button"
              aria-label="Girar derecha"
              {...bindTouchHold((d) => onTouchChange({ right: d }))}
              className="flex h-[74px] w-[74px] sm:h-[84px] sm:w-[84px] items-center justify-center rounded-full border-2 border-white/55 bg-black/35 text-white backdrop-blur-sm shadow-lg active:scale-90 active:bg-amber-400/55 transition-transform"
            >
              <ArrowRight className="h-9 w-9 drop-shadow" />
            </button>
          </div>

          {/* Slim Center Auto-Accel & Quick Horn Pill */}
          <div className="pointer-events-auto flex flex-col items-center gap-1.5 mb-1">
            <button
              type="button"
              onClick={onToggleAutoAccel}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase backdrop-blur-sm transition ${
                mobileAutoAccel
                  ? 'border-emerald-300/75 bg-emerald-500/40 text-emerald-100'
                  : 'border-white/35 bg-black/35 text-white/75'
              }`}
            >
              <Gauge className="h-3 w-3" />
              <span>{mobileAutoAccel ? 'Auto: ON' : 'Auto: OFF'}</span>
            </button>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Frenar"
                {...bindTouchHold((d) => onTouchChange({ brake: d }))}
                className="rounded-full border border-white/40 bg-rose-600/40 px-2.5 py-1 text-[10px] font-bold uppercase text-white active:bg-rose-500/75"
              >
                Freno
              </button>
              <button
                type="button"
                aria-label="Claxon"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onHorn();
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-amber-200/50 bg-amber-400/35 text-amber-100 active:scale-90"
              >
                <Megaphone className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Right Thumb: Big joyful SALTAR & TURBO / CABALLITO */}
          <div className="pointer-events-auto flex items-center gap-2.5 sm:gap-3.5">
            <button
              type="button"
              aria-label="Saltar"
              {...bindTouchHold((d) => onTouchChange({ jump: d }))}
              className="flex h-[74px] w-[74px] sm:h-[84px] sm:w-[84px] flex-col items-center justify-center rounded-full border-2 border-emerald-200/75 bg-emerald-500/40 text-white backdrop-blur-sm shadow-lg active:scale-90 active:bg-emerald-400/75 transition-transform"
            >
              <ArrowUp className="h-7 w-7 drop-shadow" />
              <span className="text-[10px] font-bold tracking-wider uppercase leading-none">
                Saltar
              </span>
            </button>
            <button
              type="button"
              aria-label="Turbo y caballito"
              {...bindTouchHold((d) => onTouchChange({ turbo: d }))}
              className={`flex h-[82px] w-[82px] sm:h-[92px] sm:w-[92px] flex-col items-center justify-center rounded-full border-2 text-white backdrop-blur-sm shadow-lg active:scale-90 transition-transform ${
                hud.blueFlame
                  ? 'border-sky-200/85 bg-sky-500/45 active:bg-sky-400/80'
                  : 'border-amber-200/85 bg-orange-500/48 active:bg-amber-400/80'
              }`}
            >
              <Flame className="h-8 w-8 drop-shadow" />
              <span className="text-[10px] font-bold tracking-wider uppercase leading-none">
                Turbo
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
