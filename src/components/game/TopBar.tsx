import { GameState } from "@/types/game";
import { PhaseBadge } from "./StatusBadge";
import { getPhaseDefinition } from "@/data/config/phases";
import { Clock, RotateCcw, LayoutDashboard, Map, ChevronRight } from "lucide-react";
import { NavLink } from "react-router-dom";
import gripenSilhouette from "@/assets/gripen-silhouette.png";

interface TopBarProps {
  state: GameState;
  onAdvanceTurn: () => void;
  onReset: () => void;
}

export function TopBar({ state, onAdvanceTurn, onReset }: TopBarProps) {
  const totalAircraft = state.bases.reduce((s, b) => s + b.aircraft.length, 0);
  const mcAircraft = state.bases.reduce((s, b) => s + b.aircraft.filter((a) => a.status === "ready").length, 0);
  const mcPct = totalAircraft > 0 ? Math.round((mcAircraft / totalAircraft) * 100) : 0;

  return (
    <header
      className="flex items-center justify-between gap-4 px-5 py-0"
      style={{
        background: "var(--gradient-navy)",
        borderBottom: "2px solid hsl(42 64% 53% / 0.6)",
        boxShadow: "0 2px 16px hsl(220 63% 10% / 0.25)",
        minHeight: "52px",
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-lg overflow-hidden"
            style={{ background: "hsl(42 64% 53% / 0.15)", border: "1px solid hsl(42 64% 53% / 0.4)" }}>
            <img
              src={gripenSilhouette}
              alt="Gripen"
              className="h-6 w-auto object-contain"
              style={{ filter: "brightness(0) invert(1) sepia(1) saturate(2) hue-rotate(3deg) brightness(1.1)" }}
            />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[13px] font-black font-sans tracking-widest"
              style={{ color: "hsl(42 64% 62%)", letterSpacing: "0.18em" }}>
              ROAD2AIR
            </span>
            <span className="text-[8px] font-mono tracking-widest"
              style={{ color: "hsl(200 12% 72%)" }}>
              SAAB SMART AIRBASE SIM
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-0.5 ml-2">
          {[
            { to: "/", icon: <LayoutDashboard className="h-3.5 w-3.5" />, label: "DASHBOARD" },
            { to: "/map", icon: <Map className="h-3.5 w-3.5" />, label: "KARTA" },
          ].map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 text-[11px] font-mono font-semibold rounded transition-all duration-150 tracking-wider ${
                  isActive
                    ? "text-white"
                    : "hover:text-white"
                }`
              }
              style={({ isActive }) => isActive
                ? { background: "hsl(42 64% 53% / 0.2)", color: "hsl(42 64% 62%)", borderBottom: "2px solid hsl(42 64% 53%)" }
                : { color: "hsl(200 12% 72%)" }
              }
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Center stats */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-3.5 w-3.5" style={{ color: "hsl(42 64% 53%)" }} />
          <span className="font-mono font-semibold" style={{ color: "hsl(200 12% 86%)" }}>
            DAG&nbsp;{state.day}
          </span>
          <ChevronRight className="h-3 w-3 opacity-30" style={{ color: "hsl(200 12% 86%)" }} />
          <span className="font-mono font-bold text-white">{String(state.hour).padStart(2, "0")}:00</span>
        </div>
        <PhaseBadge phase={state.phase} />
        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full" style={{ background: "hsl(42 64% 53% / 0.15)", color: "hsl(42 64% 62%)", border: "1px solid hsl(42 64% 53% / 0.3)" }}>
          {getPhaseDefinition(state.turnPhase).shortLabel}
        </span>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-[10px] font-mono" style={{ color: "hsl(200 12% 60%)" }}>MC-RATE</div>
            <div className="text-base font-black font-mono leading-none"
              style={{ color: mcPct >= 70 ? "hsl(152 60% 52%)" : mcPct >= 40 ? "hsl(42 64% 53%)" : "hsl(353 74% 60%)" }}>
              {mcPct}%
            </div>
          </div>
          <div className="w-px h-8 opacity-20" style={{ background: "hsl(200 12% 86%)" }} />
          <div className="text-right">
            <div className="text-[10px] font-mono" style={{ color: "hsl(200 12% 60%)" }}>FLYG MC</div>
            <div className="font-mono font-bold text-base leading-none text-white">
              {mcAircraft}<span className="text-[10px] opacity-50">/{totalAircraft}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onAdvanceTurn}
          className="flex items-center gap-2 px-4 py-2 text-[11px] font-mono font-bold rounded-lg transition-all duration-150 hover:opacity-90 active:scale-95"
          style={{
            background: "var(--gradient-gold)",
            color: "hsl(220 63% 14%)",
            boxShadow: "0 2px 12px hsl(42 64% 53% / 0.4)",
            letterSpacing: "0.12em",
          }}
        >
          {getPhaseDefinition(state.turnPhase).buttonLabel ?? "NÄSTA FAS"}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onReset}
          className="p-2 rounded-lg transition-all hover:bg-white/10"
          title="Starta om"
          style={{ color: "hsl(200 12% 72%)" }}
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
