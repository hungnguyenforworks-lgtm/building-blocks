import { useState } from "react";
import { useGame } from "@/context/GameContext";
import { TopBar } from "@/components/game/TopBar";
import { ATOEditor } from "@/components/game/ATOEditor";
import { ATOImporter } from "@/components/game/ATOImporter";
import { ATOOrder, Aircraft, MissionType, GameState } from "@/types/game";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Shield, Target, Eye, Radio, Zap, Plane, Send, AlertTriangle,
  ChevronRight, MapPin, Package, Pencil, Trash2, Plus, CheckCircle2,
  XCircle, Wand2, ChevronDown, ChevronUp, Users, Clock, Fuel,
  Activity, AlertOctagon,
} from "lucide-react";
import { ATOGanttView } from "@/components/game/ATOGanttView";
import { validateATOOrder } from "@/utils/atoValidation";

// ── Constants ─────────────────────────────────────────────────────────────────

const missionIcons: Partial<Record<MissionType, React.ReactNode>> = {
  DCA: <Shield className="h-3.5 w-3.5" />,
  QRA: <Target className="h-3.5 w-3.5" />,
  RECCE: <Eye className="h-3.5 w-3.5" />,
  AEW: <Radio className="h-3.5 w-3.5" />,
  AI_DT: <Zap className="h-3.5 w-3.5" />,
  AI_ST: <Zap className="h-3.5 w-3.5" />,
  ESCORT: <Shield className="h-3.5 w-3.5" />,
  TRANSPORT: <Plane className="h-3.5 w-3.5" />,
};

const PRIORITY_BORDER: Record<string, string> = {
  high: "#D9192E",
  medium: "#D7AB3A",
  low: "#cbd5e1",
};
const PRIORITY_LABEL: Record<string, string> = { high: "HÖG", medium: "MEDEL", low: "LÅG" };
const STATUS_LABEL: Record<string, string> = {
  pending: "VÄNTANDE", assigned: "TILLDELAD", dispatched: "SKICKAD", completed: "GENOMFÖRD",
};

function fmtH(h: number) { return `${String(h).padStart(2, "0")}:00`; }

// ── Helpers ───────────────────────────────────────────────────────────────────

interface ReadinessResult { ready: boolean; issues: string[] }

function checkReadiness(order: ATOOrder, state: GameState): ReadinessResult {
  const base = state.bases.find((b) => b.id === order.launchBase);
  if (!base) return { ready: false, issues: ["Bas hittades inte"] };
  const issues: string[] = [];

  // Aircraft health
  const assigned = order.assignedAircraft
    .map((id) => base.aircraft.find((ac) => ac.id === id))
    .filter(Boolean) as Aircraft[];
  const lowHealth = assigned.filter((ac) => (ac.health ?? 100) < 80);
  if (lowHealth.length > 0) issues.push(`${lowHealth.length} plan under 80% hälsa`);
  if (order.assignedAircraft.length < order.requiredCount)
    issues.push(`${order.requiredCount - order.assignedAircraft.length} plan saknas`);

  // Fuel
  if (base.fuel < 30) issues.push("Kritisk bränslenivå på basen");
  else if (base.fuel < 60) issues.push("Reducerat bränsle på basen");

  // Personnel
  const pilots = base.personnel.find((p) =>
    p.role.toLowerCase().includes("pilot") || p.role.toLowerCase().includes("flyg")
  );
  if (pilots && pilots.available < order.requiredCount)
    issues.push(`Otillräcklig personal (${pilots.available}/${order.requiredCount})`);

  // Ammo
  if (order.payload) {
    base.ammunition.forEach((a) => {
      if (order.payload?.toUpperCase().includes(a.type.toUpperCase()) && a.quantity < order.requiredCount)
        issues.push(`Otillräcklig beväpning: ${a.type}`);
    });
  }

  return { ready: issues.length === 0, issues };
}

function detectConflicts(orders: ATOOrder[]): Set<string> {
  const conflicted = new Set<string>();
  for (let i = 0; i < orders.length; i++) {
    for (let j = i + 1; j < orders.length; j++) {
      const a = orders[i], b = orders[j];
      if (a.day !== b.day) continue;
      const shared = a.assignedAircraft.filter((id) => b.assignedAircraft.includes(id));
      if (shared.length > 0 && a.startHour < b.endHour && b.startHour < a.endHour) {
        conflicted.add(a.id);
        conflicted.add(b.id);
      }
    }
  }
  return conflicted;
}

// ── Digital Twin Preview ───────────────────────────────────────────────────────

function DigitalTwinPreview({ ac, baseFuel }: { ac: Aircraft; baseFuel: number }) {
  const hp = ac.health ?? 100;
  const hColor = hp >= 80 ? "#22a05a" : hp >= 50 ? "#D7AB3A" : "#D9192E";
  const svc = ac.hoursToService ?? 100;
  const svcColor = svc >= 30 ? "#22a05a" : svc >= 10 ? "#D7AB3A" : "#D9192E";
  const fuelColor = baseFuel >= 60 ? "#22a05a" : baseFuel >= 30 ? "#D7AB3A" : "#D9192E";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      className="absolute z-50 w-56 rounded-xl p-3 font-mono text-[10px]"
      style={{
        background: "rgba(6,18,42,0.92)",
        border: "1px solid rgba(215,222,225,0.18)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-[13px]" style={{ color: "#D7AB3A" }}>{ac.tailNumber}</span>
        <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: "rgba(217,25,46,0.15)", color: "#D9192E", border: "1px solid rgba(217,25,46,0.3)" }}>
          DIGITAL TWIN
        </span>
      </div>
      <div className="text-[9px] mb-2" style={{ color: "rgba(215,222,225,0.5)" }}>{ac.type}</div>

      {[
        { label: "HÄLSA", val: hp, unit: "%", color: hColor, pct: hp },
        { label: "SERVICE OM", val: svc, unit: "h", color: svcColor, pct: Math.min(100, svc) },
        { label: "BRÄNSLE (BAS)", val: Math.round(baseFuel), unit: "%", color: fuelColor, pct: baseFuel },
      ].map(({ label, val, unit, color, pct }) => (
        <div key={label} className="mb-1.5">
          <div className="flex justify-between mb-0.5">
            <span style={{ color: "rgba(215,222,225,0.45)" }}>{label}</span>
            <span style={{ color }} className="font-bold">{val}{unit}</span>
          </div>
          <div className="h-1 rounded-full" style={{ background: "rgba(215,222,225,0.08)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
          </div>
        </div>
      ))}

      {ac.payload && (
        <div className="mt-2 pt-2 border-t" style={{ borderColor: "rgba(215,222,225,0.1)" }}>
          <span style={{ color: "rgba(215,222,225,0.45)" }}>LAST: </span>
          <span style={{ color: "#D7DEE1" }}>{ac.payload}</span>
        </div>
      )}
      {ac.maintenanceTimeRemaining !== undefined && (
        <div className="flex items-center gap-1 mt-1" style={{ color: "#D7AB3A" }}>
          <AlertTriangle className="h-2.5 w-2.5" />
          <span>UH kvar: {ac.maintenanceTimeRemaining}h</span>
        </div>
      )}
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function ATOBody({ embedded = false }: { embedded?: boolean }) {
  const {
    state, advanceTurn, resetGame,
    assignAircraftToOrder, dispatchOrder,
    createATOOrder, editATOOrder, deleteATOOrder,
  } = useGame();

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedAircraft, setSelectedAircraft] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "assigned" | "dispatched" | "completed">("all");
  const [showEditor, setShowEditor] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ATOOrder | undefined>(undefined);
  const [newOrderStartHour, setNewOrderStartHour] = useState<number | undefined>(undefined);
  const [hoveredAcId, setHoveredAcId] = useState<string | null>(null);
  const [showImporter, setShowImporter] = useState(false);
  const [autoOptimizeFlash, setAutoOptimizeFlash] = useState(false);

  const selectedOrder = state.atoOrders.find((o) => o.id === selectedOrderId) ?? null;
  const selectedBase = selectedOrder
    ? state.bases.find((b) => b.id === selectedOrder.launchBase)
    : null;
  const mobReadyAircraft =
    state.bases.find((b) => b.id === "MOB")?.aircraft.filter((ac) => ac.status === "ready") ?? [];

  const availableAircraft: Aircraft[] = selectedBase
    ? selectedBase.aircraft.filter(
        (ac) =>
          ac.status === "ready" &&
          (!selectedOrder?.aircraftType || ac.type === selectedOrder.aircraftType)
      )
    : [];

  const filteredOrders = state.atoOrders.filter(
    (o) => filterStatus === "all" || o.status === filterStatus
  );

  const conflictIds = detectConflicts(state.atoOrders);
  const pendingCount = state.atoOrders.filter((o) => o.status === "pending").length;
  const dispatchedCount = state.atoOrders.filter((o) => o.status === "dispatched").length;

  function handleSelectOrder(order: ATOOrder) {
    setSelectedOrderId(order.id);
    setSelectedAircraft(order.assignedAircraft.length > 0 ? order.assignedAircraft : []);
    setHoveredAcId(null);
  }

  function handleAssign() {
    if (!selectedOrder) return;
    assignAircraftToOrder(selectedOrder.id, selectedAircraft);
    toast.success(`Tilldelat ${selectedAircraft.length} flygplan till ${selectedOrder.missionType}`);
  }

  function handleDispatch() {
    if (!selectedOrder) return;
    if (selectedAircraft.length === 0) {
      toast.error("Inga flygplan tilldelade. Tilldela flygplan först.");
      return;
    }
    assignAircraftToOrder(selectedOrder.id, selectedAircraft);
    dispatchOrder(selectedOrder.id);
    toast.success(
      `${selectedAircraft.length} fpl skickade på ${selectedOrder.missionType}-uppdrag från ${selectedOrder.launchBase}`
    );
    setSelectedOrderId(null);
    setSelectedAircraft([]);
  }

  function handleDelete() {
    if (!selectedOrderId) return;
    deleteATOOrder(selectedOrderId);
    toast.success("Order raderad");
    setSelectedOrderId(null);
    setSelectedAircraft([]);
  }

  function handleGanttClickEmpty(startHour: number) {
    setEditingOrder(undefined);
    setNewOrderStartHour(startHour);
    setShowEditor(true);
  }

  function handleAutoOptimize() {
    let count = 0;
    state.atoOrders
      .filter((o) => o.status === "pending")
      .forEach((order) => {
        const base = state.bases.find((b) => b.id === order.launchBase);
        if (!base) return;
        const candidates = base.aircraft
          .filter(
            (ac) =>
              ac.status === "ready" &&
              (ac.health ?? 100) >= 80 &&
              (!order.aircraftType || ac.type === order.aircraftType)
          )
          .sort((a, b) => (b.hoursToService ?? 100) - (a.hoursToService ?? 100))
          .slice(0, order.requiredCount);
        if (candidates.length > 0) {
          assignAircraftToOrder(
            order.id,
            candidates.map((ac) => ac.id)
          );
          count++;
        }
      });
    setAutoOptimizeFlash(true);
    setTimeout(() => setAutoOptimizeFlash(false), 1200);
    toast.success(
      count > 0
        ? `AUTO-OPTIMIZE: ${count} uppdrag optimerade`
        : "Inga väntande order att optimera"
    );
  }

  // Readiness check for selected order
  const readiness = selectedOrder ? checkReadiness(selectedOrder, state) : null;
  const canDispatch = readiness?.ready && selectedAircraft.length >= (selectedOrder?.requiredCount ?? 0);

  // Hoverable aircraft for digital twin
  const hoveredAc = hoveredAcId
    ? availableAircraft.find((ac) => ac.id === hoveredAcId) ?? null
    : null;

  return (
    <div
      className={embedded ? "flex flex-col flex-1 overflow-hidden" : "flex flex-col h-screen"}
      style={{ background: "#f8fafc" }}
    >
      {!embedded && <TopBar state={state} onAdvanceTurn={advanceTurn} onReset={resetGame} />}

      {/* ── HEADER ── */}
      <div
        className="shrink-0 px-5 py-2.5 flex items-center justify-between border-b"
        style={{ borderColor: "#e2e8f0", background: "#ffffff" }}
      >
        <div className="flex items-center gap-3">
          <Send className="h-4 w-4" style={{ color: "#D9192E" }} />
          <span className="text-[11px] font-mono font-bold tracking-widest uppercase" style={{ color: "#0C234C" }}>
            ATO — UPPDRAGSORDERN
          </span>
          <span className="text-[9px] font-mono" style={{ color: "#64748b" }}>
            Dag {state.day} · {String(state.hour).padStart(2, "0")}:00Z · {state.phase}
          </span>
          {pendingCount > 0 && (
            <span className="text-[9px] font-mono px-2 py-0.5 rounded flex items-center gap-1"
              style={{ background: "#fee2e2", color: "#D9192E", border: "1px solid #fca5a5" }}>
              <AlertTriangle className="h-2.5 w-2.5" />
              {pendingCount} VÄNTANDE
            </span>
          )}
          {dispatchedCount > 0 && (
            <span className="text-[9px] font-mono px-2 py-0.5 rounded"
              style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #86efac" }}>
              {dispatchedCount} AKTIVA
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            animate={autoOptimizeFlash ? { scale: [1, 1.06, 1] } : {}}
            onClick={handleAutoOptimize}
            className="flex items-center gap-1.5 text-[10px] font-mono font-bold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}
          >
            <Wand2 className="h-3 w-3" />
            AUTO-OPTIMIZE
          </motion.button>
          <button
            onClick={() => setShowImporter((v) => !v)}
            className="text-[10px] font-mono px-3 py-1.5 rounded-lg transition-all"
            style={{ background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" }}
          >
            CSV IMPORT {showImporter ? <ChevronUp className="inline h-3 w-3 ml-1" /> : <ChevronDown className="inline h-3 w-3 ml-1" />}
          </button>
          <button
            onClick={() => { setEditingOrder(undefined); setNewOrderStartHour(undefined); setShowEditor(true); }}
            className="flex items-center gap-1.5 text-[10px] font-mono font-bold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: "#fee2e2", color: "#D9192E", border: "1px solid #fca5a5" }}
          >
            <Plus className="h-3 w-3" />
            NY ORDER
          </button>
        </div>
      </div>

      {/* ── CSV IMPORTER (collapsible) ── */}
      <AnimatePresence>
        {showImporter && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="shrink-0 overflow-hidden border-b"
            style={{ borderColor: "#e2e8f0", background: "#f1f5f9" }}
          >
            <div className="px-5 py-3">
              <ATOImporter onImportComplete={() => setShowImporter(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN BODY ── */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">

        {/* TOP ZONE: Left sidebar + Center sandbox */}
        <div className="flex-1 overflow-hidden grid min-h-0" style={{ gridTemplateColumns: "300px 1fr" }}>

          {/* ══ LEFT SIDEBAR — Mission Queue ══ */}
          <div
            className="flex flex-col overflow-hidden border-r"
            style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderTop: "none", borderBottom: "none" }}
          >
            {/* Sidebar header */}
            <div className="shrink-0 px-4 py-2.5 border-b flex items-center justify-between"
              style={{ borderColor: "#e2e8f0", background: "#f8fafc" }}>
              <span className="text-[9px] font-mono font-bold tracking-widest uppercase"
                style={{ color: "#94a3b8" }}>
                UPPDRAGSKÖ
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                style={{ background: "#fee2e2", color: "#D9192E", border: "1px solid #fca5a5" }}>
                {pendingCount} VÄNTANDE
              </span>
            </div>

            {/* Filter tabs */}
            <div className="shrink-0 px-3 py-1.5 flex gap-1 border-b" style={{ borderColor: "#e2e8f0" }}>
              {(["all", "pending", "assigned", "dispatched", "completed"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className="px-2 py-0.5 text-[8px] font-mono rounded transition-colors"
                  style={{
                    background: filterStatus === f ? "#fee2e2" : "transparent",
                    color: filterStatus === f ? "#D9192E" : "#94a3b8",
                    border: filterStatus === f ? "1px solid #fca5a5" : "1px solid transparent",
                  }}
                >
                  {f === "all" ? "ALLA" : f === "pending" ? "VÄNT" : f === "assigned" ? "TILL" : f === "dispatched" ? "SKICK" : "KLAR"}
                </button>
              ))}
            </div>

            {/* Order list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {filteredOrders.length === 0 && (
                <div className="text-center py-10 text-[10px] font-mono"
                  style={{ color: "#94a3b8" }}>
                  Inga order
                </div>
              )}
              {filteredOrders.map((order) => {
                const isSelected = order.id === selectedOrderId;
                const isConflict = conflictIds.has(order.id);
                const rdy = checkReadiness(order, state);
                const base = state.bases.find((b) => b.id === order.launchBase);
                const mcAtBase =
                  base?.aircraft.filter(
                    (ac) =>
                      ac.status === "ready" &&
                      (!order.aircraftType || ac.type === order.aircraftType)
                  ).length ?? 0;
                const warnings = validateATOOrder(order, state);
                const errorCount = warnings.filter((w) => w.severity === "error").length;

                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => handleSelectOrder(order)}
                    className="rounded-lg p-2.5 cursor-pointer transition-all"
                    style={{
                      background: isSelected ? "#fff5f5" : "#ffffff",
                      border: `1px solid ${isConflict ? "#D9192E" : isSelected ? "#fca5a5" : "#e2e8f0"}`,
                      borderLeftWidth: "3px",
                      borderLeftColor: isConflict ? "#D9192E" : PRIORITY_BORDER[order.priority],
                    }}
                  >
                    {/* Top row: icon + type + ready-check */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span style={{ color: PRIORITY_BORDER[order.priority] }}>
                          {missionIcons[order.missionType] ?? <Plane className="h-3.5 w-3.5" />}
                        </span>
                        <div>
                          <div className="text-[10px] font-mono font-bold" style={{ color: "#0C234C" }}>
                            {order.missionType}
                          </div>
                          <div className="text-[8px] font-mono" style={{ color: "#64748b" }}>
                            {order.label}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {isConflict && (
                          <span title="Konflikt!" className="text-[8px] font-mono"
                            style={{ color: "#D9192E" }}>
                            <AlertOctagon className="h-3 w-3" />
                          </span>
                        )}
                        {rdy.ready ? (
                          <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "#22a05a" }} title="Klart för uppdrag" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" style={{ color: "#cbd5e1" }} title={rdy.issues.join(", ")} />
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingOrder(order); setShowEditor(true); }}
                          className="p-0.5 rounded transition-colors"
                          style={{ color: "#94a3b8" }}
                        >
                          <Pencil className="h-2.5 w-2.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteATOOrder(order.id); toast.success("Order raderad"); if (selectedOrderId === order.id) { setSelectedOrderId(null); setSelectedAircraft([]); } }}
                          className="p-0.5 rounded transition-colors"
                          style={{ color: "#94a3b8" }}
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </div>

                    {/* Time + aircraft count */}
                    <div className="flex items-center gap-3 text-[8px] font-mono" style={{ color: "#64748b" }}>
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {fmtH(order.startHour)}–{fmtH(order.endHour)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Plane className="h-2.5 w-2.5" />
                        <span style={{ color: mcAtBase < order.requiredCount ? "#D9192E" : "#22a05a" }}>
                          {mcAtBase} MC
                        </span>
                        /{order.requiredCount}
                      </span>
                      <span className="ml-auto px-1 py-0.5 rounded text-[7px] font-bold"
                        style={{
                          background: `${PRIORITY_BORDER[order.priority]}18`,
                          color: PRIORITY_BORDER[order.priority],
                          border: `1px solid ${PRIORITY_BORDER[order.priority]}40`,
                        }}>
                        {PRIORITY_LABEL[order.priority]}
                      </span>
                    </div>

                    {/* Payload requirement */}
                    {order.payload && (
                      <div className="mt-1.5 flex items-center gap-1 text-[8px] font-mono"
                        style={{ color: "#92400e" }}>
                        <Package className="h-2.5 w-2.5" />
                        {order.payload}
                      </div>
                    )}

                    {/* Status + error badges */}
                    <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                      <span className="text-[7px] font-mono px-1 py-0.5 rounded"
                        style={{ background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" }}>
                        {STATUS_LABEL[order.status]}
                      </span>
                      {errorCount > 0 && (
                        <span className="text-[7px] font-mono px-1 py-0.5 rounded flex items-center gap-0.5"
                          style={{ background: "#fee2e2", color: "#D9192E", border: "1px solid #fca5a5" }}>
                          <AlertTriangle className="h-2 w-2" />{errorCount} FEL
                        </span>
                      )}
                      {isSelected && (
                        <span className="ml-auto text-[7px] font-mono flex items-center gap-0.5"
                          style={{ color: "#D9192E" }}>
                          <ChevronRight className="h-2.5 w-2.5" />VALD
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* ══ CENTER — Planning Sandbox ══ */}
          <div className="flex flex-col overflow-hidden relative" style={{ background: "#f8fafc" }}>
            <AnimatePresence mode="wait">
              {selectedOrder ? (
                <motion.div
                  key={selectedOrder.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col h-full overflow-hidden"
                >
                  {/* Order header */}
                  <div className="shrink-0 px-5 py-3 border-b flex items-center gap-3"
                    style={{ borderColor: "#e2e8f0", background: "#ffffff" }}>
                    <span style={{ color: PRIORITY_BORDER[selectedOrder.priority] }}>
                      {missionIcons[selectedOrder.missionType] ?? <Plane className="h-5 w-5" />}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-mono font-bold" style={{ color: "#0C234C" }}>
                        {selectedOrder.missionType} — {selectedOrder.label}
                      </div>
                      <div className="flex items-center gap-4 mt-0.5 text-[9px] font-mono" style={{ color: "#64748b" }}>
                        <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{fmtH(selectedOrder.startHour)}–{fmtH(selectedOrder.endHour)}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5" />{selectedOrder.launchBase}</span>
                        <span className="flex items-center gap-1"><Users className="h-2.5 w-2.5" />{selectedOrder.requiredCount} fpl krävs</span>
                        {selectedOrder.payload && <span className="flex items-center gap-1"><Package className="h-2.5 w-2.5" />{selectedOrder.payload}</span>}
                      </div>
                    </div>

                    {/* Selected count */}
                    <div className="text-right">
                      <div className="text-lg font-mono font-bold"
                        style={{ color: selectedAircraft.length >= selectedOrder.requiredCount ? "#22a05a" : "#D9192E" }}>
                        {selectedAircraft.length}/{selectedOrder.requiredCount}
                      </div>
                      <div className="text-[8px] font-mono" style={{ color: "#94a3b8" }}>TILLDELADE</div>
                    </div>
                  </div>

                  {/* Aircraft grid */}
                  <div className="flex-1 overflow-y-auto p-5">
                    {/* Readiness issues */}
                    {readiness && !readiness.ready && readiness.issues.length > 0 && (
                      <div className="mb-4 rounded-lg p-3 space-y-1"
                        style={{ background: "#fff5f5", border: "1px solid #fca5a5" }}>
                        <div className="text-[9px] font-mono font-bold mb-1" style={{ color: "#D9192E" }}>
                          KLARLÄGGNING EJ MÖJLIG
                        </div>
                        {readiness.issues.map((issue, i) => (
                          <div key={i} className="text-[9px] font-mono flex items-center gap-2"
                            style={{ color: "#64748b" }}>
                            <AlertTriangle className="h-2.5 w-2.5 shrink-0" style={{ color: "#D9192E" }} />
                            {issue}
                          </div>
                        ))}
                      </div>
                    )}

                    {availableAircraft.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 text-center rounded-xl"
                        style={{ background: "#fff5f5", border: "1px solid #fca5a5" }}>
                        <AlertTriangle className="h-8 w-8 mb-2" style={{ color: "#D9192E" }} />
                        <div className="text-sm font-mono font-bold" style={{ color: "#D9192E" }}>
                          Inga tillgängliga flygplan
                        </div>
                        <div className="text-[10px] font-mono mt-1" style={{ color: "#64748b" }}>
                          Inga MC-plan vid {selectedOrder.launchBase}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-[9px] font-mono mb-3 uppercase tracking-widest"
                          style={{ color: "#94a3b8" }}>
                          TILLGÄNGLIGA FLYGPLAN — HOVRA FÖR DIGITAL TWIN PREVIEW
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {availableAircraft.map((ac) => {
                            const sel = selectedAircraft.includes(ac.id);
                            const hp = ac.health ?? 100;
                            const hColor = hp >= 80 ? "#22a05a" : hp >= 50 ? "#D7AB3A" : "#D9192E";
                            const svc = ac.hoursToService ?? 100;
                            const overCount = !sel && selectedAircraft.length >= selectedOrder.requiredCount;
                            return (
                              <div key={ac.id} className="relative">
                                <button
                                  onClick={() => {
                                    if (overCount) return;
                                    const newIds = sel
                                      ? selectedAircraft.filter((x) => x !== ac.id)
                                      : [...selectedAircraft, ac.id];
                                    setSelectedAircraft(newIds);
                                  }}
                                  onMouseEnter={() => setHoveredAcId(ac.id)}
                                  onMouseLeave={() => setHoveredAcId(null)}
                                  disabled={overCount}
                                  className="w-full rounded-xl p-3 text-left transition-all"
                                  style={{
                                    background: sel ? "#dcfce7" : "#ffffff",
                                    border: `1px solid ${sel ? "#86efac" : overCount ? "#f1f5f9" : "#e2e8f0"}`,
                                    opacity: overCount ? 0.4 : 1,
                                    cursor: overCount ? "not-allowed" : "pointer",
                                  }}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[12px] font-mono font-bold" style={{ color: sel ? "#15803d" : "#0C234C" }}>
                                      {ac.tailNumber}
                                    </span>
                                    {sel && <CheckCircle2 className="h-4 w-4" style={{ color: "#22a05a" }} />}
                                  </div>
                                  <div className="text-[8px] font-mono mb-2" style={{ color: "#64748b" }}>
                                    {ac.type}
                                  </div>
                                  {/* Mini health bar */}
                                  <div className="mb-1">
                                    <div className="h-1 rounded-full" style={{ background: "#e2e8f0" }}>
                                      <div className="h-full rounded-full"
                                        style={{ width: `${hp}%`, background: hColor }} />
                                    </div>
                                    <div className="flex justify-between mt-0.5 text-[7px] font-mono"
                                      style={{ color: "#94a3b8" }}>
                                      <span>Hälsa</span>
                                      <span style={{ color: hColor }}>{hp}%</span>
                                    </div>
                                  </div>
                                  <div className="text-[7px] font-mono" style={{ color: "#94a3b8" }}>
                                    Service om <span style={{ color: svc < 20 ? "#D9192E" : "#64748b" }}>{svc}h</span>
                                  </div>
                                </button>

                                {/* Digital Twin Preview */}
                                <AnimatePresence>
                                  {hoveredAcId === ac.id && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
                                      <DigitalTwinPreview
                                        ac={ac}
                                        baseFuel={selectedBase?.fuel ?? 100}
                                      />
                                    </div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* ── ACTION FOOTER ── */}
                  <div className="shrink-0 px-5 py-3 border-t flex items-center gap-3"
                    style={{ borderColor: "#e2e8f0", background: "#ffffff" }}>

                    <button
                      onClick={handleAssign}
                      disabled={selectedAircraft.length === 0}
                      className="px-4 py-2 text-[10px] font-mono font-bold rounded-lg transition-all disabled:opacity-30"
                      style={{ background: "#f1f5f9", color: "#0C234C", border: "1px solid #e2e8f0" }}
                    >
                      SPARA TILLDELNING
                    </button>

                    {/* BEORDRA KLARGÖRING — prominent SAAB red when ready */}
                    <motion.button
                      animate={canDispatch ? { boxShadow: ["0 0 0 0 rgba(217,25,46,0)", "0 0 16px 4px rgba(217,25,46,0.35)", "0 0 0 0 rgba(217,25,46,0)"] } : {}}
                      transition={{ repeat: Infinity, duration: 2 }}
                      onClick={handleDispatch}
                      disabled={selectedAircraft.length === 0 || (selectedOrder.status === "dispatched")}
                      className="flex items-center gap-2 px-6 py-2.5 text-[11px] font-mono font-bold rounded-lg transition-all disabled:opacity-30"
                      style={{
                        background: canDispatch ? "#D9192E" : "#fee2e2",
                        color: canDispatch ? "#ffffff" : "#D9192E",
                        border: `1px solid ${canDispatch ? "#D9192E" : "#fca5a5"}`,
                        letterSpacing: "0.05em",
                      }}
                    >
                      <Send className="h-4 w-4" />
                      BEORDRA KLARGÖRING
                    </motion.button>

                    {readiness && readiness.ready && (
                      <div className="flex items-center gap-1.5 text-[9px] font-mono"
                        style={{ color: "#22a05a" }}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        ALLA VILLKOR UPPFYLLDA
                      </div>
                    )}

                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={() => { setEditingOrder(selectedOrder); setShowEditor(true); }}
                        className="p-1.5 rounded transition-colors hover:bg-slate-100"
                        style={{ color: "#64748b", background: "#f8fafc" }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={handleDelete}
                        className="p-1.5 rounded transition-colors hover:bg-red-50"
                        style={{ color: "#D9192E", background: "#fff5f5" }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full gap-4"
                >
                  <div className="rounded-full p-4" style={{ background: "#f1f5f9", border: "1px solid #e2e8f0" }}>
                    <Activity className="h-10 w-10" style={{ color: "#cbd5e1" }} />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-mono font-bold" style={{ color: "#94a3b8" }}>
                      PLANERINGSYTA
                    </div>
                    <div className="text-[10px] font-mono mt-1" style={{ color: "#cbd5e1" }}>
                      Välj ett uppdrag i kön för att tilldela flygplan
                    </div>
                  </div>
                  <button
                    onClick={handleAutoOptimize}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[10px] font-mono font-bold transition-all hover:bg-amber-50"
                    style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}
                  >
                    <Wand2 className="h-4 w-4" />
                    KLIK FÖR AUTO-OPTIMIZE
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ══ BOTTOM — Enhanced Timeline ══ */}
        <div
          className="shrink-0 border-t"
          style={{ height: "260px", borderColor: "#e2e8f0", background: "#ffffff" }}
        >
          <div className="px-4 py-1.5 flex items-center justify-between border-b"
            style={{ borderColor: "#e2e8f0" }}>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono font-bold tracking-widest uppercase"
                style={{ color: "#64748b" }}>
                DAGLIG ATO-PLAN
              </span>
              <span className="text-[9px] font-mono" style={{ color: "#94a3b8" }}>
                · Dag {state.day}
              </span>
              {conflictIds.size > 0 && (
                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1"
                  style={{ background: "#fee2e2", color: "#D9192E", border: "1px solid #fca5a5" }}>
                  <AlertOctagon className="h-2.5 w-2.5" />
                  {conflictIds.size / 2 | 0} KONFLIKT(ER)
                </span>
              )}
            </div>
            <span className="text-[8px] font-mono italic"
              style={{ color: "#94a3b8" }}>
              Klicka på tomt fält för att skapa ny order
            </span>
          </div>
          <div style={{ height: "220px" }}>
            <ATOGanttView
              orders={state.atoOrders.filter((o) => o.day === state.day)}
              currentHour={state.hour}
              selectedOrderId={selectedOrderId ?? ""}
              conflictIds={conflictIds}
              onSelectOrder={(id) => {
                const o = state.atoOrders.find((o) => o.id === id);
                if (o) handleSelectOrder(o);
              }}
              onClickEmpty={handleGanttClickEmpty}
            />
          </div>
        </div>
      </div>

      {/* ATO Editor Modal */}
      {showEditor && (
        <ATOEditor
          order={editingOrder}
          defaultStartHour={editingOrder ? undefined : newOrderStartHour}
          availableAircraft={editingOrder ? undefined : mobReadyAircraft}
          onSave={(order, selAircraft) => {
            if (editingOrder) {
              editATOOrder(editingOrder.id, order);
              toast.success("Order uppdaterad");
            } else {
              createATOOrder(order, selAircraft);
              toast.success(`Ny ATO-order skapad`);
            }
            setShowEditor(false);
            setEditingOrder(undefined);
            setNewOrderStartHour(undefined);
          }}
          onCancel={() => { setShowEditor(false); setEditingOrder(undefined); setNewOrderStartHour(undefined); }}
        />
      )}
    </div>
  );
}

export default function ATO() {
  return <ATOBody />;
}
