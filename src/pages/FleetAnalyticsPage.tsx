import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "../context/GameContext";
import type { RiskLevel, AARActionType } from "../types/game";
import { FlygschemaTidslinje } from "../components/dashboard/FlygschemaTidslinje";
import { RemainingLifeGraf } from "../components/dashboard/RemainingLifeGraf";
import {
  ArrowLeft, Activity, Plane, Wrench, AlertTriangle, ChevronRight, Clock, Shield,
} from "lucide-react";

// ─── SAAB Brand colors ────────────────────────────────────────────────────────
const DEEP_BLUE = "#0C234C";
const RED       = "#D9192E";
const AMBER     = "#D7AB3A";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function borderColorForRisk(risk?: RiskLevel): string {
  if (risk === "catastrophic" || risk === "high") return RED;
  if (risk === "medium") return "#f59e0b";
  return "#22c55e";
}

const ACTION_BADGES: Record<AARActionType, { label: string; color: string; bg: string }> = {
  MISSION_DISPATCH:  { label: "UPPDRAG",    color: "#1d4ed8", bg: "#dbeafe" },
  MAINTENANCE_START: { label: "UNDERHÅLL",  color: "#6d28d9", bg: "#ede9fe" },
  MAINTENANCE_PAUSE: { label: "PAUSE",      color: "#92400e", bg: "#fef3c7" },
  UTFALL_APPLIED:    { label: "UTFALL",     color: "#c2410c", bg: "#ffedd5" },
  FAULT_NMC:         { label: "NMC",        color: RED,       bg: "#fee2e2" },
  LANDING_RECEIVED:  { label: "LANDNING",   color: "#15803d", bg: "#dcfce7" },
  SPARE_PART_USED:   { label: "RESERVDEL",  color: "#0e7490", bg: "#cffafe" },
  HANGAR_CONFIRM:    { label: "HANGAR",     color: "#6d28d9", bg: "#ede9fe" },
};

// ─── ReadinessScoreBar ────────────────────────────────────────────────────────

interface ReadinessProps {
  readiness: number;
  mcCount: number;
  uhCount: number;
  nmcCount: number;
  totalCount: number;
  avgHealth: number;
  serviceDue: number;
  phase: string;
}

function ReadinessScoreBar({
  readiness, mcCount, uhCount, nmcCount, totalCount, avgHealth, serviceDue, phase,
}: ReadinessProps) {
  const scoreColor =
    readiness >= 70 ? "#16a34a"
    : readiness >= 40 ? "#d97706"
    : RED;

  const healthColor =
    avgHealth >= 70 ? "#16a34a"
    : avgHealth >= 40 ? "#d97706"
    : RED;

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        boxShadow: "0 2px 8px rgba(12,35,76,0.06)",
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div
            className="text-[9px] font-mono uppercase tracking-widest mb-1 font-bold"
            style={{ color: "#94a3b8" }}
          >
            FLEET READINESS
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-black font-mono" style={{ color: scoreColor }}>
              {readiness}%
            </span>
            <span className="text-sm font-mono" style={{ color: "#64748b" }}>
              sammanvägd flottberedskap
            </span>
          </div>
        </div>
        <span
          className="text-[9px] font-mono font-bold px-3 py-1 rounded-full"
          style={{
            background: "#fee2e2",
            border: "1px solid #fca5a5",
            color: RED,
          }}
        >
          {phase}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full overflow-hidden mb-4" style={{ background: "#e2e8f0" }}>
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${readiness}%` }}
          transition={{ duration: 1.0, ease: "easeOut" }}
          style={{ background: scoreColor }}
        />
      </div>

      {/* Stat pills */}
      <div className="flex flex-wrap gap-2">
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono font-bold"
          style={{ background: "#dbeafe", border: "1px solid #bfdbfe", color: "#1d4ed8" }}
        >
          <Plane className="h-3 w-3" />
          MC: {mcCount}/{totalCount}
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono font-bold"
          style={{ background: "#fef3c7", border: "1px solid #fde68a", color: "#92400e" }}
        >
          <Wrench className="h-3 w-3" />
          UH: {uhCount}
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono font-bold"
          style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c" }}
        >
          <AlertTriangle className="h-3 w-3" />
          NMC: {nmcCount}
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono font-bold"
          style={{
            background: avgHealth >= 70 ? "#dcfce7" : avgHealth >= 40 ? "#fef3c7" : "#fee2e2",
            border: `1px solid ${avgHealth >= 70 ? "#86efac" : avgHealth >= 40 ? "#fde68a" : "#fca5a5"}`,
            color: healthColor,
          }}
        >
          <Shield className="h-3 w-3" />
          Snittshälsa: {avgHealth}%
        </div>
        {serviceDue > 0 && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono font-bold"
            style={{
              background: serviceDue >= 3 ? "#fee2e2" : "#fef3c7",
              border: `1px solid ${serviceDue >= 3 ? "#fca5a5" : "#fde68a"}`,
              color: serviceDue >= 3 ? "#b91c1c" : "#92400e",
            }}
          >
            <Clock className="h-3 w-3" />
            Service inom 20h: {serviceDue}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BeslutloggPanel ──────────────────────────────────────────────────────────

interface BeslutloggProps {
  events: ReturnType<typeof useGame>["state"]["events"];
  navigate: ReturnType<typeof useNavigate>;
}

function BeslutloggPanel({ events, navigate }: BeslutloggProps) {
  const filtered = events.filter((e) => e.actionType != null).slice(0, 5);

  return (
    <div
      className="rounded-xl p-4 flex flex-col"
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        boxShadow: "0 2px 8px rgba(12,35,76,0.06)",
      }}
    >
      <div className="mb-3">
        <div
          className="text-[9px] font-mono uppercase tracking-widest font-bold"
          style={{ color: "#94a3b8" }}
        >
          BESLUTSLOGG
        </div>
        <div className="text-[9px] font-mono mt-0.5" style={{ color: "#94a3b8" }}>
          Händelser som påverkar flottans hälsa
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          className="flex-1 flex items-center justify-center text-[10px] font-mono text-center px-4"
          style={{ color: "#94a3b8" }}
        >
          Inga händelser loggade ännu — börja flyga plan för att fylla loggen.
        </div>
      ) : (
        <div className="flex-1 space-y-2">
          <AnimatePresence>
            {filtered.map((ev) => {
              const borderColor = borderColorForRisk(ev.riskLevel);
              const badge = ev.actionType ? ACTION_BADGES[ev.actionType] : null;
              return (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-lg overflow-hidden"
                  style={{
                    borderLeft: `3px solid ${borderColor}`,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderLeftColor: borderColor,
                    borderLeftWidth: "3px",
                  }}
                >
                  <div className="px-3 py-2 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="text-[8px] font-mono"
                        style={{ color: "#94a3b8" }}
                      >
                        {ev.timestamp}
                      </span>
                      {ev.aircraftId && (
                        <span
                          className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
                          style={{ background: DEEP_BLUE, color: AMBER }}
                        >
                          {ev.aircraftId}
                        </span>
                      )}
                      {badge && (
                        <span
                          className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
                          style={{ background: badge.bg, color: badge.color }}
                        >
                          {badge.label}
                        </span>
                      )}
                    </div>
                    <p
                      className="text-[10px] font-mono leading-tight truncate"
                      style={{ color: DEEP_BLUE }}
                      title={ev.message}
                    >
                      {ev.message}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <button
        onClick={() => navigate("/aar")}
        className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-mono font-bold transition-all hover:bg-slate-100"
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          color: DEEP_BLUE,
        }}
      >
        Visa full AAR
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Main FleetAnalyticsPage ──────────────────────────────────────────────────

export default function FleetAnalyticsPage({ embedded = false }: { embedded?: boolean }) {
  const { state } = useGame();
  const navigate  = useNavigate();
  const [selectedBaseId, setSelectedBaseId] = useState<string>(state.bases[0]?.id ?? "MOB");

  // Gather all aircraft across all bases
  const allAircraft = state.bases.flatMap((base) =>
    base.aircraft.map((ac) => ({ ...ac, baseName: base.name }))
  );

  // Fleet readiness calculation
  const mcCount = allAircraft.filter(
    (ac) =>
      ac.status === "ready" ||
      ac.status === "allocated" ||
      ac.status === "in_preparation" ||
      ac.status === "awaiting_launch"
  ).length;
  const uhCount    = allAircraft.filter((ac) => ac.status === "under_maintenance").length;
  const nmcCount   = allAircraft.filter((ac) => ac.status === "unavailable").length;
  const totalCount = allAircraft.length || 1;
  const avgHealth  = Math.round(
    allAircraft.reduce((s, ac) => s + (ac.health ?? 100), 0) / totalCount
  );
  const readiness  = Math.round((mcCount / totalCount) * 60 + avgHealth * 0.4);
  const serviceDue = allAircraft.filter(
    (ac) =>
      ac.hoursToService < 20 &&
      (ac.status === "ready" || ac.status === "allocated")
  ).length;

  return (
    <div
      className={embedded ? "font-mono min-h-full" : "min-h-screen font-mono"}
      style={{ background: "#f8fafc", color: DEEP_BLUE }}
    >
      {/* Header — only in standalone mode */}
      {!embedded && (
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ background: "#ffffff", borderColor: "#e2e8f0" }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-xs font-mono hover:opacity-70 transition-opacity"
              style={{ color: "#64748b" }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              DASHBOARD
            </button>
            <div className="h-4 w-px" style={{ background: "#e2e8f0" }} />
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" style={{ color: DEEP_BLUE }} />
              <span className="text-sm font-mono font-bold tracking-wider" style={{ color: DEEP_BLUE }}>
                FLEET ANALYTICS — FLOTTÖVERSIKT
              </span>
            </div>
          </div>
          <span className="text-xs font-mono" style={{ color: "#64748b" }}>
            Dag {state.day} · {String(state.hour).padStart(2, "0")}:00 · {state.phase}
          </span>
        </div>
      )}

      <div className="p-6 space-y-6">

        {/* Fleet Readiness Score */}
        <ReadinessScoreBar
          readiness={readiness}
          mcCount={mcCount}
          uhCount={uhCount}
          nmcCount={nmcCount}
          totalCount={totalCount}
          avgHealth={avgHealth}
          serviceDue={serviceDue}
          phase={state.phase}
        />

        {/* Life Chart + Beslutlogg */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 340px" }}>

          {/* Left — FlygschemaTidslinje with base selector */}
          <div
            className="rounded-xl p-4"
            style={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(12,35,76,0.06)" }}
          >
            {/* Base tabs */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[9px] font-mono uppercase tracking-widest font-bold mr-2" style={{ color: "#94a3b8" }}>
                LIVSLÄNGD &amp; FLYGSCHEMA
              </span>
              {state.bases.map((base) => (
                <button
                  key={base.id}
                  onClick={() => setSelectedBaseId(base.id)}
                  className="px-3 py-1 rounded text-[9px] font-mono font-bold transition-all"
                  style={{
                    background: selectedBaseId === base.id ? DEEP_BLUE : "#f1f5f9",
                    color: selectedBaseId === base.id ? "#ffffff" : "#64748b",
                    border: selectedBaseId === base.id ? "none" : "1px solid #e2e8f0",
                  }}
                >
                  {base.id}
                </button>
              ))}
            </div>

            <div className="rounded-lg overflow-hidden p-3" style={{ background: "#f8fafc" }}>
              {(() => {
                const base = state.bases.find((b) => b.id === selectedBaseId) ?? state.bases[0];
                return (
                  <FlygschemaTidslinje
                    base={base}
                    hour={state.hour}
                    atoOrders={state.atoOrders}
                  />
                );
              })()}
            </div>
          </div>

          <BeslutloggPanel events={state.events} navigate={navigate} />
        </div>

        {/* Per-base life & recommendations */}
        {(() => {
          const selectedBase = state.bases.find((b) => b.id === selectedBaseId) ?? state.bases[0];
          return (
            <div
              className="rounded-xl p-4"
              style={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(12,35,76,0.06)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-[9px] font-mono uppercase tracking-widest font-bold" style={{ color: "#94a3b8" }}>
                  REMAINING LIFE &amp; OPTIMERINGSREKOMMENDATIONER — {selectedBase.id}
                </div>
                <span className="text-[8px] font-mono px-2 py-0.5 rounded" style={{ background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" }}>
                  {selectedBase.aircraft.length} flygplan
                </span>
              </div>
              <div className="rounded-lg overflow-hidden p-4" style={{ background: "#f8fafc" }}>
                <RemainingLifeGraf bases={[selectedBase]} phase={state.phase} />
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
