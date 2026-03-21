import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/context/GameContext";
import { TopBar } from "@/components/game/TopBar";
import { MaintenanceBays } from "@/components/game/MaintenanceBays";
import { TurnPhaseTracker } from "@/components/game/TurnPhaseTracker";
import { PhasePanel } from "@/components/game/PhasePanel";
import { RecommendationFeed } from "@/components/game/RecommendationFeed";
import { StatusKort } from "@/components/dashboard/StatusKort";
import { LarmPanel } from "@/components/dashboard/LarmPanel";
import { DagensMissioner } from "@/components/dashboard/DagensMissioner";
import { FlygschemaTidslinje } from "@/components/dashboard/FlygschemaTidslinje";
import { RemainingLifeGraf } from "@/components/dashboard/RemainingLifeGraf";
import { ResursPanel } from "@/components/dashboard/ResursPanel";
import { ResursPage } from "@/components/dashboard/ResursPage";
import { ATOBody } from "./ATO";
import FleetAnalyticsPage from "./FleetAnalyticsPage";
import AARPage from "./AARPage";
import { IntelligenceSidebar } from "@/components/dashboard/IntelligenceSidebar";
import { BaseMap, DropZone } from "@/components/game/BaseMap";
import { LandingReceptionModal } from "@/components/game/LandingReceptionModal";
import { RunwayCheckModal } from "@/components/game/RunwayCheckModal";
import { MaintenanceConfirmModal } from "@/components/game/MaintenanceConfirmModal";
import { HangarFullModal } from "@/components/game/HangarFullModal";
import { LastBayWarningModal } from "@/components/game/LastBayWarningModal";
import { SparePartsPickerModal } from "@/components/game/SparePartsPickerModal";
import { toast } from "sonner";
import { BaseType } from "@/types/game";
import {
  ShieldCheck, Crosshair, Hammer, Siren, Clock,
  MapPin, PlaneTakeoff, ChevronRight, BarChart3, BookOpen,
  Activity, AlertOctagon, Plane, Wrench, ClipboardList,
} from "lucide-react";

// ─── Section type ─────────────────────────────────────────────────────────────
type Section = "base" | "missions" | "maintenance" | "resources" | "ato" | "fleet" | "aar";

// ─── Section panel wrapper ────────────────────────────────────────────────────
function Panel({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl overflow-hidden"
      style={{ border: "1px solid hsl(215 14% 84%)", background: "hsl(0 0% 100%)", boxShadow: "0 1px 3px hsl(220 63% 18% / 0.06)" }}>
      <div className="flex items-center gap-2.5 px-4 py-3 border-b"
        style={{ borderColor: "hsl(215 14% 88%)", background: "linear-gradient(90deg, hsl(220 63% 18% / 0.04), transparent)" }}>
        <Icon className="h-4 w-4" style={{ color: "hsl(220 63% 30%)" }} />
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest"
          style={{ color: "hsl(220 63% 18%)" }}>{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const Index = () => {
  const {
    state, advanceTurn, startMaintenance, sendOnMission, resetGame,
    moveAircraftToMaintenance, sendMissionDrop, applyUtfallOutcome,
    completeLandingCheck, applyRecommendation, dismissRecommendation,
    hangarDropConfirm, pauseMaintenance, markFaultNMC, consumeSparePart,
  } = useGame();
  const navigate = useNavigate();

  const [selectedBaseId, setSelectedBaseId]           = useState<BaseType>("MOB");
  const [activeSection, setActiveSection]             = useState<Section>("base");
  const [pendingRunwayCheck, setPendingRunwayCheck]   = useState<string | null>(null);
  const [pendingMaintenanceCheck, setPendingMaintenanceCheck] = useState<string | null>(null);
  const [redRunwayWarning, setRedRunwayWarning]       = useState<string | null>(null);
  const [hangarFullWarning, setHangarFullWarning]     = useState<string | null>(null);
  const [lastBayWarning, setLastBayWarning]           = useState<string | null>(null);
  const [sparePartsFullWarning, setSparePartsFullWarning]   = useState<string | null>(null);
  const [sparePartsPickerAircraftId, setSparePartsPickerAircraftId] = useState<string | null>(null);
  const [pendingUtfallFull, setPendingUtfallFull]     = useState<{
    aircraftId: string; repairTime: number; typeKey: string; weaponLoss: number; label: string; requiredSparePart?: string;
  } | null>(null);

  const selectedBase     = state.bases.find((b) => b.id === selectedBaseId)!;
  const mcTotal          = selectedBase.aircraft.filter((a) => a.status === "ready").length;
  const onMissionTotal   = selectedBase.aircraft.filter((a) => a.status === "on_mission").length;
  const inMaintTotal     = selectedBase.aircraft.filter((a) => a.status === "under_maintenance" || a.status === "unavailable").length;
  const personnelAvail   = selectedBase.personnel.reduce((s, p) => s + p.available, 0);
  const personnelTotal   = selectedBase.personnel.reduce((s, p) => s + p.total, 0);
  const kritiskaResurser = selectedBase.spareParts.filter((p) => p.quantity / p.maxQuantity < 0.3).length +
    selectedBase.ammunition.filter((a) => a.quantity / a.max < 0.3).length;

  const handleDropAircraft = (aircraftId: string, zone: DropZone) => {
    const aircraft = selectedBase.aircraft.find((a) => a.id === aircraftId);
    if (!aircraft) return;
    const tail = aircraft.tailNumber || aircraftId;

    if (zone === "runway") {
      if (aircraft.status !== "ready") { toast.error(`${tail} är inte MC — kan ej sändas på uppdrag`); return; }
      if ((aircraft.health ?? 100) <= 30) { setRedRunwayWarning(aircraftId); return; }
      setPendingRunwayCheck(aircraftId);
    } else if (zone === "hangar") {
      if (aircraft.status === "on_mission") { toast.error(`${tail} är på uppdrag — kan inte gå till hangar`); return; }
      if (selectedBase.maintenanceBays.occupied >= selectedBase.maintenanceBays.total) { setHangarFullWarning(aircraftId); return; }
      if (selectedBase.maintenanceBays.total - selectedBase.maintenanceBays.occupied === 1) { setLastBayWarning(aircraftId); return; }
      if (aircraft.status === "unavailable" && aircraft.maintenanceTimeRemaining != null && aircraft.maintenanceType != null) {
        hangarDropConfirm(selectedBaseId, aircraftId, aircraft.maintenanceTimeRemaining, aircraft.maintenanceType, false);
        toast.success(`🔧 ${tail} → ${aircraft.maintenanceType} (${aircraft.maintenanceTimeRemaining}h) — direkt till hangar`);
        return;
      }
      setPendingMaintenanceCheck(aircraftId);
    } else if (zone === "spareparts") {
      if (aircraft.status === "on_mission") { toast.error(`${tail} är på uppdrag`); return; }
      if (selectedBase.maintenanceBays.occupied >= selectedBase.maintenanceBays.total) { setSparePartsFullWarning(aircraftId); return; }
      setSparePartsPickerAircraftId(aircraftId);
    } else if (zone === "fuel") {
      if (aircraft.status === "on_mission") { toast.info(`${tail} är på uppdrag — tankning vid retur`); return; }
      toast.info(`⛽ ${tail} schemalagd för tankning (bränslenivå: ${Math.round(selectedBase.fuel)}%)`);
    } else if (zone === "ammo") {
      if (aircraft.status === "on_mission") { toast.info(`${tail} är på uppdrag — beväpning vid retur`); return; }
      toast.info(`💣 ${tail} schemalagd för beväpning vid ammodepån`);
    }
  };

  const SCHD_MISSIONS = ["DCA", "QRA", "RECCE", "AEW", "AI_DT", "ESCORT"] as const;
  const urgentMap: Record<string, string>   = {};
  const upcomingMap: Record<string, string> = {};

  selectedBase.aircraft.forEach((ac) => {
    if (ac.status !== "ready" && ac.status !== "allocated") return;
    const myOrders = state.atoOrders.filter(
      (o) => o.launchBase === selectedBaseId && o.assignedAircraft.includes(ac.id) &&
             (o.status === "assigned" || o.status === "pending")
    );
    if (myOrders.length > 0) {
      const activeNow = myOrders.find((o) => o.startHour <= state.hour && o.endHour > state.hour);
      const upcoming  = myOrders.find((o) => o.startHour > state.hour);
      if (activeNow) urgentMap[ac.id] = activeNow.missionType;
      else if (upcoming) upcomingMap[ac.id] = `${upcoming.missionType} ${String(upcoming.startHour).padStart(2, "0")}:00`;
      return;
    }
    const hash   = parseInt(ac.id.replace(/\D/g, "")) || 1;
    const mStart = 6 + (hash % 9);
    const mEnd   = Math.min(21, mStart + 2 + (hash % 3));
    if (state.hour >= mStart && state.hour < mEnd) urgentMap[ac.id] = SCHD_MISSIONS[hash % SCHD_MISSIONS.length];
  });

  const overdueAircraftIds   = Object.keys(urgentMap);
  const overdueMissionLabels = urgentMap;

  let firstReturning: { aircraft: (typeof state.bases)[0]["aircraft"][0]; baseId: BaseType } | null = null;
  for (const base of state.bases) {
    const ac = base.aircraft.find((a) => a.status === "returning");
    if (ac) { firstReturning = { aircraft: ac, baseId: base.id }; break; }
  }

  const now     = new Date();
  const dateStr = now.toLocaleDateString("sv-SE", { weekday: "short", month: "short", day: "numeric" });

  const runwayAircraft = pendingRunwayCheck
    ? selectedBase.aircraft.find((a) => a.id === pendingRunwayCheck)
    : null;

  // ─── Nav items ─────────────────────────────────────────────────────────────
  const pendingATOCount = state.atoOrders.filter((o) => o.status === "pending").length;

  const navItems: { id: Section; label: string; Icon: React.ElementType; badge?: number; badgeColor?: string }[] = [
    { id: "base",        label: "Basöversikt",  Icon: MapPin,       badge: undefined },
    { id: "missions",    label: "Uppdrag",       Icon: Crosshair,    badge: onMissionTotal || undefined, badgeColor: "#3b82f6" },
    { id: "maintenance", label: "Hangar",        Icon: Hammer,       badge: inMaintTotal || undefined, badgeColor: inMaintTotal > 0 ? "#d97706" : "#22a05a" },
    { id: "resources",   label: "Resurser",      Icon: BarChart3,    badge: kritiskaResurser || undefined, badgeColor: "#D9192E" },
    { id: "ato",         label: "ATO Planering", Icon: BookOpen,     badge: pendingATOCount || undefined, badgeColor: "#D7AB3A" },
    { id: "fleet",       label: "Flottanalys",   Icon: Activity,     badge: undefined },
    { id: "aar",         label: "Historik",      Icon: ClipboardList, badge: undefined },
  ];

  // ─── Aircraft status styling ───────────────────────────────────────────────
  const acColor = (status: string) =>
    status === "ready"             ? "#22a05a"
    : status === "on_mission"      ? "#3b82f6"
    : status === "under_maintenance"? "#d97706"
    : status === "unavailable"     ? "#D9192E"
    : status === "returning"       ? "#a855f7"
    : "#64748b";

  const acLabel = (status: string) =>
    status === "ready"             ? "MC"
    : status === "on_mission"      ? "UP"
    : status === "under_maintenance"? "UH"
    : status === "unavailable"     ? "NMC"
    : status === "returning"       ? "RET"
    : "–";

  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen font-mono" style={{ background: "hsl(0 0% 100%)" }}>
      <TopBar state={state} onAdvanceTurn={advanceTurn} onReset={resetGame} />

      {/* ── COMMAND STRIP ── */}
      <div className="flex items-center gap-3 px-5 py-2 flex-shrink-0 border-b"
        style={{ background: "#0C234C", borderColor: "rgba(215,222,225,0.1)" }}>

        {/* Time / turn */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono pr-3 border-r"
          style={{ color: "rgba(215,222,225,0.38)", borderColor: "rgba(215,222,225,0.1)" }}>
          <Clock className="h-3 w-3" />
          {dateStr} · T{state.turnNumber} · {String(state.hour).padStart(2, "0")}:00Z
        </div>

        {/* Base selector */}
        <div className="flex items-center gap-1">
          {state.bases.map((base) => {
            const mc    = base.aircraft.filter((a) => a.status === "ready").length;
            const total = base.aircraft.length;
            const isSelected = base.id === selectedBaseId;
            return (
              <button key={base.id}
                onClick={() => setSelectedBaseId(base.id)}
                className="flex items-center gap-2 px-3 py-1 text-[10px] font-mono rounded-lg border transition-all"
                style={isSelected ? {
                  background: "rgba(217,25,46,0.18)", color: "#D7DEE1",
                  borderColor: "rgba(217,25,46,0.55)", fontWeight: 700,
                } : {
                  background: "rgba(255,255,255,0.04)", color: "rgba(215,222,225,0.4)",
                  borderColor: "rgba(215,222,225,0.1)",
                }}
              >
                <MapPin className="h-2.5 w-2.5" />
                <span className="font-black">{base.id}</span>
                <span style={{ color: isSelected ? "hsl(42 64% 60%)" : "rgba(215,222,225,0.3)" }}>
                  {mc}/{total} MC
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        {/* Live alerts in strip */}
        {firstReturning && (
          <span className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold"
            style={{ background: "rgba(168,85,247,0.12)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.35)" }}>
            <PlaneTakeoff className="h-3 w-3" />
            RETUR INKOMMANDE — {firstReturning.aircraft.tailNumber}
          </span>
        )}
        {kritiskaResurser > 0 && (
          <button
            onClick={() => setActiveSection("resources")}
            className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold transition-all hover:brightness-110"
            style={{ background: "rgba(217,25,46,0.12)", color: "#D9192E", border: "1px solid rgba(217,25,46,0.4)" }}
          >
            <Siren className="h-3 w-3 animate-pulse" />
            {kritiskaResurser} KRITISKA RESURSER →
          </button>
        )}
      </div>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT SIDEBAR NAV ── */}
        <nav className="w-52 flex-shrink-0 flex flex-col border-r"
          style={{ background: "hsl(0 0% 100%)", borderColor: "hsl(215 14% 86%)" }}>

          {/* Nav items */}
          <div className="py-1.5">
            {navItems.map(({ id, label, Icon, badge, badgeColor }) => {
              const isActive = activeSection === id;
              return (
                <button key={id}
                  onClick={() => setActiveSection(id)}
                  className="relative w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all border-l-2"
                  style={{
                    borderLeftColor: isActive ? "#D9192E" : "transparent",
                    background: isActive ? "hsl(220 63% 18% / 0.06)" : "transparent",
                    color: isActive ? "hsl(220 63% 18%)" : "hsl(218 15% 50%)",
                  }}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wide flex-1">{label}</span>
                  {badge != null && badge > 0 && (
                    <span className="h-4 min-w-[1rem] px-1 rounded-full text-[8px] font-black flex items-center justify-center"
                      style={{ background: badgeColor ?? "#D9192E", color: "white" }}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Fleet list ── */}
          <div className="flex-1 overflow-y-auto border-t" style={{ borderColor: "hsl(215 14% 88%)" }}>
            <div className="px-3 pt-2.5 pb-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[8px] font-mono uppercase tracking-widest"
                  style={{ color: "hsl(218 15% 55%)" }}>Flygplan</span>
                <span className="text-[8px] font-mono" style={{ color: "hsl(218 15% 55%)" }}>
                  → DASHBOARD
                </span>
              </div>
              <div className="space-y-0.5">
                {selectedBase.aircraft.map((ac) => {
                  const col = acColor(ac.status);
                  const lbl = acLabel(ac.status);
                  return (
                    <motion.button
                      key={ac.id}
                      whileHover={{ x: 2, transition: { duration: 0.1 } }}
                      onClick={() => navigate(`/aircraft/${ac.tailNumber}`)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors hover:bg-black/5"
                      style={{ border: `1px solid ${col}28` }}
                    >
                      <span className="text-[10px] font-mono font-black" style={{ color: "hsl(220 63% 18%)" }}>
                        {ac.tailNumber}
                      </span>
                      <span className="text-[8px] font-mono font-bold px-1 py-0.5 rounded"
                        style={{ background: `${col}1A`, color: col }}>
                        {lbl}
                      </span>
                      {(ac.health ?? 100) < 50 && (
                        <span className="text-[8px] font-mono font-bold" style={{ color: col }}>
                          {ac.health}%
                        </span>
                      )}
                      <ChevronRight className="h-2.5 w-2.5 ml-auto flex-shrink-0 opacity-20" />
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>

        {/* ── MAIN CONTENT ── */}
        {activeSection === "ato" ? (
          <ATOBody embedded />
        ) : (
        <div className="flex-1 overflow-y-auto" style={{ background: ["fleet","aar"].includes(activeSection) ? "#0C234C" : "hsl(0 0% 100%)" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className={["fleet","aar"].includes(activeSection) ? "" : "p-5 space-y-5"}
            >

              {/* ──── BASÖVERSIKT ──── */}
              {activeSection === "base" && (() => {
                const totalAc      = selectedBase.aircraft.length;
                const mcPct        = totalAc > 0 ? Math.round((mcTotal / totalAc) * 100) : 0;
                const r = 38, circ = 2 * Math.PI * r;
                const filled = (mcPct / 100) * circ;
                const readinessColor = mcPct >= 70 ? "#22a05a" : mcPct >= 40 ? "#d97706" : "#D9192E";
                const statusDot = (status: string) =>
                  status === "ready" ? "#22a05a" : status === "on_mission" ? "#3b82f6"
                  : status === "under_maintenance" ? "#d97706" : status === "returning" ? "#a855f7" : "#D9192E";

                return (
                <>
                  {/* ── Command readiness panel ── */}
                  <div className="rounded-xl overflow-hidden"
                    style={{ background: "#0C234C", border: "1px solid rgba(215,222,225,0.08)", boxShadow: "0 4px 24px rgba(12,35,76,0.18)" }}>

                    {/* Top bar */}
                    <div className="flex items-center justify-between px-5 py-2.5 border-b"
                      style={{ borderColor: "rgba(215,222,225,0.08)", background: "rgba(217,25,46,0.04)" }}>
                      <div className="flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5" style={{ color: "#D9192E" }} />
                        <span className="text-[10px] font-mono font-bold tracking-widest uppercase" style={{ color: "#D7DEE1" }}>
                          OPERATIONSLÄGE — {selectedBase.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono" style={{ color: "rgba(215,222,225,0.4)" }}>
                          T{state.turnNumber} · {String(state.hour).padStart(2,"0")}:00Z
                        </span>
                        {(() => {
                          const phaseStyle =
                            state.phase === "FRED"
                              ? { bg: "rgba(34,160,90,0.18)", fg: "#22a05a", border: "1px solid rgba(34,160,90,0.35)" }
                              : state.phase === "KRIS"
                              ? { bg: "rgba(217,171,58,0.18)", fg: "#D7AB3A", border: "1px solid rgba(217,171,58,0.35)" }
                              : { bg: "rgba(217,25,46,0.15)", fg: "#D9192E", border: "1px solid rgba(217,25,46,0.3)" };
                          return (
                            <span
                              className="text-[9px] font-mono font-bold px-2 py-0.5 rounded"
                              style={{ background: phaseStyle.bg, color: phaseStyle.fg, border: phaseStyle.border }}
                            >
                              {state.phase}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 divide-x" style={{ borderColor: "rgba(215,222,225,0.07)", divideColor: "rgba(215,222,225,0.07)" }}>

                      {/* Col 1 — Readiness donut */}
                      <div className="flex items-center gap-5 px-6 py-5">
                        <svg width={92} height={92} viewBox="0 0 92 92" style={{ flexShrink: 0 }}>
                          <circle cx={46} cy={46} r={r} fill="none" stroke="rgba(215,222,225,0.07)" strokeWidth={10} />
                          <motion.circle cx={46} cy={46} r={r} fill="none"
                            stroke={readinessColor} strokeWidth={10} strokeLinecap="round"
                            transform="rotate(-90 46 46)"
                            initial={{ strokeDasharray: `0 ${circ}` }}
                            animate={{ strokeDasharray: `${filled} ${circ}` }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                          />
                          <text x={46} y={42} textAnchor="middle" fontSize="18" fontFamily="monospace" fontWeight="700" fill={readinessColor}>{mcPct}%</text>
                          <text x={46} y={56} textAnchor="middle" fontSize="8" fontFamily="monospace" fill="rgba(215,222,225,0.45)">BEREDSKAP</text>
                        </svg>
                        <div className="space-y-1">
                          <div className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{ color: "rgba(215,222,225,0.35)" }}>Flottajstatus</div>
                          {[
                            { label: "Mission Capable",   val: mcTotal,       color: "#22a05a" },
                            { label: "På uppdrag",         val: onMissionTotal, color: "#3b82f6" },
                            { label: "Underhåll / NMC",    val: inMaintTotal,   color: inMaintTotal > 0 ? "#d97706" : "rgba(215,222,225,0.3)" },
                            { label: `Totalt`,             val: `${mcTotal}/${totalAc}`, color: "rgba(215,222,225,0.55)" },
                          ].map(k => (
                            <div key={k.label} className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ background: k.color, flexShrink: 0 }} />
                              <span className="text-[9px] font-mono" style={{ color: "rgba(215,222,225,0.5)", width: 110 }}>{k.label}</span>
                              <span className="text-[10px] font-mono font-bold" style={{ color: k.color }}>{k.val}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Col 2 — Aircraft grid */}
                      <div className="px-5 py-5">
                        <div className="text-[9px] font-mono uppercase tracking-wider mb-3" style={{ color: "rgba(215,222,225,0.35)" }}>
                          <Plane className="inline h-3 w-3 mr-1.5" />Flygplan — snabbstatus
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedBase.aircraft.map(ac => (
                            <button key={ac.id}
                              onClick={() => navigate(`/aircraft/${ac.tailNumber}`)}
                              className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-mono font-bold transition-all hover:brightness-125"
                              style={{
                                background: `${statusDot(ac.status)}18`,
                                border: `1px solid ${statusDot(ac.status)}40`,
                                color: statusDot(ac.status),
                              }}
                              title={`${ac.tailNumber} — ${ac.status}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusDot(ac.status), flexShrink: 0 }} />
                              {ac.tailNumber}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Col 3 — Alerts */}
                      <div className="px-5 py-5">
                        <div className="text-[9px] font-mono uppercase tracking-wider mb-3" style={{ color: "rgba(215,222,225,0.35)" }}>
                          <AlertOctagon className="inline h-3 w-3 mr-1.5" />Larm & åtgärder
                        </div>
                        <div className="space-y-1.5">
                          {kritiskaResurser > 0 && (
                            <button onClick={() => setActiveSection("resources")}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all hover:brightness-110"
                              style={{ background: "rgba(217,25,46,0.12)", border: "1px solid rgba(217,25,46,0.3)" }}>
                              <AlertOctagon className="h-3 w-3 animate-pulse" style={{ color: "#D9192E", flexShrink: 0 }} />
                              <span className="text-[9px] font-mono font-bold" style={{ color: "#D9192E" }}>
                                {kritiskaResurser} KRITISKA RESURSER →
                              </span>
                            </button>
                          )}
                          {inMaintTotal > 0 && (
                            <button onClick={() => setActiveSection("maintenance")}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all hover:brightness-110"
                              style={{ background: "rgba(217,151,42,0.10)", border: "1px solid rgba(217,151,42,0.25)" }}>
                              <Wrench className="h-3 w-3" style={{ color: "#d97706", flexShrink: 0 }} />
                              <span className="text-[9px] font-mono font-bold" style={{ color: "#d97706" }}>
                                {inMaintTotal} plan i UH/NMC →
                              </span>
                            </button>
                          )}
                          {kritiskaResurser === 0 && inMaintTotal === 0 && (
                            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                              style={{ background: "rgba(34,160,90,0.10)", border: "1px solid rgba(34,160,90,0.22)" }}>
                              <ShieldCheck className="h-3 w-3" style={{ color: "#22a05a" }} />
                              <span className="text-[9px] font-mono font-bold" style={{ color: "#22a05a" }}>NOMINELLT — ALLA SYSTEM OK</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Base Map */}
                  <Panel title={`Basöversikt — ${selectedBase.name} · Klicka på byggnader för detaljer`} icon={MapPin}>
                    <BaseMap
                      base={selectedBase}
                      onDropAircraft={handleDropAircraft}
                      overdueAircraftIds={overdueAircraftIds}
                      overdueMissionLabels={overdueMissionLabels}
                      onUtfallOutcome={(aircraftId, repairTime, maintenanceTypeKey, weaponLoss, actionLabel, requiredSparePart) => {
                        if (repairTime > 0 && selectedBase.maintenanceBays.occupied >= selectedBase.maintenanceBays.total) {
                          setPendingUtfallFull({ aircraftId, repairTime, typeKey: maintenanceTypeKey, weaponLoss, label: actionLabel, requiredSparePart });
                        } else {
                          applyUtfallOutcome(selectedBaseId, aircraftId, repairTime, maintenanceTypeKey, weaponLoss, actionLabel, requiredSparePart);
                        }
                      }}
                    />
                  </Panel>

                  {/* Remaining Life & Recommendations — current base */}
                  <Panel title={`Remaining Life & Rekommendationer — ${selectedBase.name}`} icon={BarChart3}>
                    <RemainingLifeGraf bases={[selectedBase]} phase={state.phase} />
                  </Panel>

                  {/* Turn tracker + Phase panel */}
                  <TurnPhaseTracker
                    currentPhase={state.turnPhase}
                    turnNumber={state.turnNumber}
                    onAdvancePhase={advanceTurn}
                  />
                  <PhasePanel state={state} />
                </>
                );
              })()}

              {/* ──── UPPDRAG ──── */}
              {activeSection === "missions" && (
                <>
                  <Panel title="Dagens Missioner — ATO-Uppdrag" icon={Crosshair}>
                    <DagensMissioner base={selectedBase} hour={state.hour} phase={state.phase} atoOrders={state.atoOrders} />
                  </Panel>

                  <Panel title={`Flygschema — 06:00–22:00 · Timmar till service visas höger`} icon={Clock}>
                    <FlygschemaTidslinje base={selectedBase} hour={state.hour} atoOrders={state.atoOrders} />
                  </Panel>

                  <LarmPanel events={state.events} />
                </>
              )}

              {/* ──── HANGAR ──── */}
              {activeSection === "maintenance" && (
                <MaintenanceBays base={selectedBase} onDropAircraft={handleDropAircraft} />
              )}

              {/* ──── RESURSER ──── */}
              {activeSection === "resources" && (
            <ResursPage base={selectedBase} phase={state.phase} events={state.events} />
              )}

              {/* ──── FLEET ANALYTICS ──── */}
              {activeSection === "fleet" && (
                <FleetAnalyticsPage embedded />
              )}

              {/* ──── AAR LOGG ──── */}
              {activeSection === "aar" && (
                <AARPage embedded />
              )}


            </motion.div>
          </AnimatePresence>
        </div>
        )}

        {/* ── RIGHT SIDEBAR — Intelligence Sidebar ── */}
        {!["ato","fleet","aar","flygplan"].includes(activeSection) && (
          <IntelligenceSidebar base={selectedBase} phase={state.phase} events={state.events} />
        )}

      </div>

      {/* ── ALL MODALS (unchanged logic) ── */}

      {pendingRunwayCheck && runwayAircraft && (
        <RunwayCheckModal
          key={pendingRunwayCheck}
          aircraft={runwayAircraft}
          maintenanceBays={selectedBase.maintenanceBays}
          onMission={(durationHours) => {
            sendMissionDrop(selectedBaseId, pendingRunwayCheck, "DCA", durationHours);
            setPendingRunwayCheck(null);
            toast.success(`✈️ ${runwayAircraft.tailNumber} lyfter! Uppdrag ${durationHours}h`);
          }}
          onMaintenance={(repairTime, typeKey, weaponLoss, label, requiredSparePart) => {
            setPendingRunwayCheck(null);
            if (selectedBase.maintenanceBays.occupied >= selectedBase.maintenanceBays.total) {
              setPendingUtfallFull({ aircraftId: pendingRunwayCheck, repairTime, typeKey, weaponLoss, label, requiredSparePart });
            } else {
              applyUtfallOutcome(selectedBaseId, pendingRunwayCheck, repairTime, typeKey, weaponLoss, label, requiredSparePart);
              toast.error(`${runwayAircraft.tailNumber} → Service: ${label} (${repairTime}h)`);
            }
          }}
          onIgnoreFault={(repairTime, typeKey, actionLabel, requiredSparePart) => {
            markFaultNMC(selectedBaseId, pendingRunwayCheck, repairTime, typeKey, actionLabel, requiredSparePart);
            setPendingRunwayCheck(null);
            toast.warning(`🔴 ${runwayAircraft.tailNumber} NMC — fel ignorerat, ej i hangar`);
          }}
          onClose={() => setPendingRunwayCheck(null)}
        />
      )}

      {redRunwayWarning && (() => {
        const ac = selectedBase.aircraft.find((a) => a.id === redRunwayWarning);
        if (!ac) return null;
        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)" }}>
            <div className="w-[420px] rounded-2xl overflow-hidden shadow-2xl" style={{ background: "#1a0505", border: "2px solid #D9192E" }}>
              <div className="px-6 py-4 flex items-center gap-3" style={{ background: "#0d0202", borderBottom: "1px solid #D9192E44" }}>
                <span className="text-2xl">🚨</span>
                <div>
                  <div className="text-xs font-mono font-bold" style={{ color: "#D9192E" }}>FLYGPLAN EJ OPERATIVT — NMC</div>
                  <div className="text-base font-mono font-black text-white">{ac.tailNumber}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-xs font-mono" style={{ color: "#8899bb" }}>Hälsa</div>
                  <div className="text-2xl font-black font-mono" style={{ color: "#D9192E" }}>{ac.health ?? 0}%</div>
                </div>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="rounded-xl p-4" style={{ background: "#3a0a0a", border: "1px solid #6a1a1a" }}>
                  <div className="text-sm font-mono font-bold mb-2" style={{ color: "#ff6655" }}>
                    Flygplanet är inte flygtillståndsklarat!
                  </div>
                  <div className="text-xs font-mono" style={{ color: "#ccd4e8" }}>
                    {ac.tailNumber} har {ac.health ?? 0}% hälsa och är röd NMC.
                    Det måste genomgå felsökning och service innan det kan flyga.
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setRedRunwayWarning(null); setPendingMaintenanceCheck(ac.id); }}
                    className="flex-1 py-3 rounded-xl font-mono font-bold text-sm transition-all hover:brightness-110 active:scale-95"
                    style={{ background: "#5a1a1a", border: "1px solid #D9192E", color: "#ff6655" }}
                  >
                    🔧 Skicka till service
                  </button>
                  <button
                    onClick={() => setRedRunwayWarning(null)}
                    className="px-5 py-3 rounded-xl font-mono font-bold text-sm transition-all hover:brightness-110 active:scale-95"
                    style={{ background: "#2a2a3a", border: "1px solid #5566aa", color: "#8899cc" }}
                  >
                    Ignorera
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {lastBayWarning && (() => {
        const ac = selectedBase.aircraft.find((a) => a.id === lastBayWarning);
        if (!ac) return null;
        const proceedWithHangar = () => {
          setLastBayWarning(null);
          if (ac.status === "unavailable" && ac.maintenanceTimeRemaining != null && ac.maintenanceType != null) {
            hangarDropConfirm(selectedBaseId, ac.id, ac.maintenanceTimeRemaining, ac.maintenanceType, false);
          } else {
            setPendingMaintenanceCheck(ac.id);
          }
        };
        return (
          <LastBayWarningModal
            key={lastBayWarning}
            aircraft={ac}
            totalBays={selectedBase.maintenanceBays.total}
            onContinue={proceedWithHangar}
            onReturnToApron={() => setLastBayWarning(null)}
          />
        );
      })()}

      {hangarFullWarning && (() => {
        const incoming = selectedBase.aircraft.find((a) => a.id === hangarFullWarning);
        const inMaint  = selectedBase.aircraft.filter((a) => a.status === "under_maintenance");
        if (!incoming) return null;
        return (
          <HangarFullModal
            key={hangarFullWarning}
            incomingAircraft={incoming}
            maintenanceAircraft={inMaint}
            baseId={selectedBaseId}
            onPause={(pauseId) => {
              pauseMaintenance(selectedBaseId, pauseId);
              setHangarFullWarning(null);
              if (incoming.status === "unavailable" && incoming.maintenanceTimeRemaining != null && incoming.maintenanceType != null) {
                hangarDropConfirm(selectedBaseId, incoming.id, incoming.maintenanceTimeRemaining, incoming.maintenanceType, false);
                toast.success(`🔧 ${incoming.tailNumber} → direkt till hangar (${incoming.maintenanceTimeRemaining}h)`);
              } else {
                setPendingMaintenanceCheck(incoming.id);
              }
              toast.info(`⏸ Underhåll pausat på ${pauseId} — ${incoming.tailNumber} köas`);
            }}
            onIgnore={() => setHangarFullWarning(null)}
          />
        );
      })()}

      {sparePartsFullWarning && (() => {
        const incoming = selectedBase.aircraft.find((a) => a.id === sparePartsFullWarning);
        const inMaint  = selectedBase.aircraft.filter((a) => a.status === "under_maintenance");
        if (!incoming) return null;
        return (
          <HangarFullModal
            key={`sp-${sparePartsFullWarning}`}
            incomingAircraft={incoming}
            maintenanceAircraft={inMaint}
            baseId={selectedBaseId}
            onPause={(pauseId) => {
              pauseMaintenance(selectedBaseId, pauseId);
              setSparePartsFullWarning(null);
              const lruPart = selectedBase.spareParts.find((p) => p.quantity > 0 && p.category === "Avionik")
                ?? selectedBase.spareParts.find((p) => p.quantity > 0);
              if (!lruPart) { toast.error(`Inga reservdelar kvar — LRU-rep ej möjlig`); return; }
              consumeSparePart(selectedBaseId, lruPart.id, 1);
              applyUtfallOutcome(selectedBaseId, incoming.id, 2, "quick_lru", 10, `Quick LRU replacement (${lruPart.name})`);
              toast.success(`${incoming.tailNumber} → LRU-reparation 2h — ${lruPart.name} använd`);
              toast.info(`Underhåll pausat på ${pauseId} — plats frigjord`);
            }}
            onIgnore={() => setSparePartsFullWarning(null)}
          />
        );
      })()}

      {sparePartsPickerAircraftId && (() => {
        const ac = selectedBase.aircraft.find((a) => a.id === sparePartsPickerAircraftId);
        if (!ac) return null;
        return (
          <SparePartsPickerModal
            key={sparePartsPickerAircraftId}
            aircraft={ac}
            spareParts={selectedBase.spareParts}
            onSelect={(partId, partName) => {
              consumeSparePart(selectedBaseId, partId, 1);
              applyUtfallOutcome(selectedBaseId, ac.id, 2, "quick_lru", 10, `Quick LRU replacement (${partName})`);
              const remaining = (selectedBase.spareParts.find((p) => p.id === partId)?.quantity ?? 1) - 1;
              toast.success(`${ac.tailNumber} → LRU-reparation 2h — ${partName} använd (kvar: ${remaining})`);
              setSparePartsPickerAircraftId(null);
            }}
            onClose={() => setSparePartsPickerAircraftId(null)}
          />
        );
      })()}

      {pendingUtfallFull && (() => {
        const incoming = selectedBase.aircraft.find((a) => a.id === pendingUtfallFull.aircraftId);
        const inMaint  = selectedBase.aircraft.filter((a) => a.status === "under_maintenance");
        if (!incoming) return null;
        return (
          <HangarFullModal
            key={`utfall-full-${pendingUtfallFull.aircraftId}`}
            incomingAircraft={incoming}
            maintenanceAircraft={inMaint}
            baseId={selectedBaseId}
            onPause={(pauseId) => {
              pauseMaintenance(selectedBaseId, pauseId);
              applyUtfallOutcome(selectedBaseId, pendingUtfallFull.aircraftId, pendingUtfallFull.repairTime, pendingUtfallFull.typeKey, pendingUtfallFull.weaponLoss, pendingUtfallFull.label, pendingUtfallFull.requiredSparePart);
              toast.error(`${incoming.tailNumber} → Service: ${pendingUtfallFull.label} (${pendingUtfallFull.repairTime}h)`);
              toast.info(`Underhåll pausat på ${pauseId} — plats frigjord`);
              setPendingUtfallFull(null);
            }}
            onIgnore={() => {
              markFaultNMC(selectedBaseId, pendingUtfallFull.aircraftId, pendingUtfallFull.repairTime, pendingUtfallFull.typeKey, pendingUtfallFull.label);
              toast.warning(`${incoming.tailNumber} NMC — felet registrerat, väntar på hangarplats`);
              setPendingUtfallFull(null);
            }}
          />
        );
      })()}

      {pendingMaintenanceCheck && (() => {
        const ac = selectedBase.aircraft.find((a) => a.id === pendingMaintenanceCheck);
        if (!ac) return null;
        return (
          <MaintenanceConfirmModal
            key={pendingMaintenanceCheck}
            aircraft={ac}
            baseId={selectedBaseId}
            onConfirm={(repairTime, typeKey, restoreHealth) => {
              hangarDropConfirm(selectedBaseId, pendingMaintenanceCheck, repairTime, typeKey, restoreHealth);
              setPendingMaintenanceCheck(null);
              toast.success(`🔧 ${ac.tailNumber} → ${restoreHealth ? "Förebyggande service" : "Reparation"} (${repairTime}h)`);
            }}
            onCancel={() => setPendingMaintenanceCheck(null)}
          />
        );
      })()}

      {firstReturning && (
        <LandingReceptionModal
          key={firstReturning.aircraft.id}
          aircraft={firstReturning.aircraft}
          baseId={firstReturning.baseId}
          remaining={state.bases.flatMap((b) => b.aircraft).filter((a) => a.status === "returning").length - 1}
          onComplete={(aircraftId, baseId, sendToMaintenance, repairTime, maintenanceTypeKey, weaponLoss, actionLabel) => {
            completeLandingCheck(baseId, aircraftId, sendToMaintenance, repairTime, maintenanceTypeKey, weaponLoss, actionLabel);
            if (sendToMaintenance) {
              toast.error(`🔧 ${aircraftId} skickad till underhåll (${repairTime}h)`);
            } else {
              toast.success(`✅ ${aircraftId} godkänd — tillbaka till uppställning`);
            }
          }}
        />
      )}

    </div>
  );
};

export default Index;
