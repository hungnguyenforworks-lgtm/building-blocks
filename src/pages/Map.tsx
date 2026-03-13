import { useState } from "react";
import { useGame } from "@/context/GameContext";
import { TopBar } from "@/components/game/TopBar";
import { Base, BaseType, Aircraft } from "@/types/game";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fuel,
  Package,
  Users,
  Wrench,
  Shield,
  X,
  AlertTriangle,
  CheckCircle2,
  Radio,
  Zap,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { AircraftIcon } from "@/components/game/AircraftIcons";

// ── Geographic positions (% of map container) ──────────────────────────────
// Derived from approximate lat/lon, scaled to fit a 70% horizontal band
const BASE_POSITIONS: Record<string, { x: number; y: number }> = {
  MOB:   { x: 42, y: 56 },
  FOB_N: { x: 63, y: 22 },
  FOB_S: { x: 31, y: 81 },
  ROB_N: { x: 74, y: 16 },
  ROB_S: { x: 26, y: 87 },
  ROB_E: { x: 53, y: 69 },
};

const SUPPLY_LINES: [string, string][] = [
  ["MOB", "FOB_N"],
  ["MOB", "FOB_S"],
  ["MOB", "ROB_E"],
  ["FOB_N", "ROB_N"],
  ["FOB_S", "ROB_S"],
];

// ── Sweden outline (1000×900 SVG viewBox) ──────────────────────────────────
const SWEDEN_PATH =
  "M 648,82 L 760,148 L 795,205 L 812,268 L 820,335 " +
  "L 800,400 L 785,455 L 800,510 L 790,560 " +
  "L 760,598 L 720,625 L 680,645 L 645,660 " +
  "L 600,672 L 555,675 L 510,668 L 468,655 " +
  "L 428,638 L 395,615 L 372,585 L 358,552 " +
  "L 348,515 L 345,475 L 350,438 L 342,395 " +
  "L 330,352 L 322,308 L 328,265 L 335,228 " +
  "L 350,188 L 368,152 L 388,120 L 415,92 " +
  "L 450,72 L 500,60 L 560,62 L 610,70 Z";

// Gotland island
const GOTLAND_PATH = "M 730,490 L 748,485 L 758,498 L 752,518 L 738,525 L 725,512 Z";

// ── Helpers ─────────────────────────────────────────────────────────────────
function statusColor(base: Base | undefined) {
  if (!base) return "#4a5568";
  const mc = base.aircraft.filter((a) => a.status === "ready").length;
  const ratio = mc / base.aircraft.length;
  if (ratio >= 0.7) return "#22c55e";
  if (ratio >= 0.4) return "#eab308";
  return "#ef4444";
}

function fuelColor(pct: number) {
  if (pct >= 60) return "#22c55e";
  if (pct >= 30) return "#eab308";
  return "#ef4444";
}

function getReadiness(base: Base) {
  const mc = base.aircraft.filter((a) => a.status === "ready").length;
  const total = base.aircraft.length;
  const ratio = mc / total;
  if (ratio >= 0.7) return { label: "GRÖN", cls: "text-status-green bg-status-green/10 border-status-green/40" };
  if (ratio >= 0.4) return { label: "GULT", cls: "text-status-yellow bg-status-yellow/10 border-status-yellow/40" };
  return { label: "RÖTT", cls: "text-status-red bg-status-red/10 border-status-red/40" };
}

// ── Types ────────────────────────────────────────────────────────────────────
type SelectedEntity =
  | { kind: "base"; baseId: string }
  | { kind: "aircraft"; baseId: string; aircraftId: string }
  | null;

// ── Component ────────────────────────────────────────────────────────────────
export default function MapPage() {
  const { state, advanceTurn, resetGame } = useGame();
  const [selected, setSelected] = useState<SelectedEntity>(null);

  const selectedBase =
    selected?.kind === "base" || selected?.kind === "aircraft"
      ? state.bases.find((b) => b.id === selected.baseId)
      : undefined;

  const selectedAircraft =
    selected?.kind === "aircraft"
      ? selectedBase?.aircraft.find((a) => a.id === selected.aircraftId)
      : undefined;

  // Convert % positions to SVG coords (viewBox 1000×900)
  function toSVG(px: number, py: number) {
    return { x: px * 10, y: py * 9 };
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <TopBar state={state} onAdvanceTurn={advanceTurn} onReset={resetGame} />

      {/* Sub-header */}
      <div className="border-b border-border bg-card px-6 py-2.5 flex items-center gap-3">
        <MapPin className="h-4 w-4 text-primary" />
        <h2 className="font-sans font-bold text-sm text-foreground tracking-wider">
          TAKTISK KARTA — FLYGBASGRUPP
        </h2>
        <span className="text-[10px] font-mono text-muted-foreground ml-2">
          Dag {state.day} · Fas: {state.phase}
        </span>
        <div className="ml-auto flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-status-green inline-block" /> Hög beredskap</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-status-yellow inline-block" /> Medel beredskap</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-status-red inline-block" /> Låg beredskap</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40 inline-block" /> Inaktiv bas</span>
        </div>
      </div>

      {/* Map + panel */}
      <div className="flex-1 overflow-hidden flex">

        {/* ── MAP AREA ─────────────────────────────────────────────────── */}
        <div
          className="flex-1 relative overflow-hidden"
          style={{ background: "radial-gradient(ellipse at 50% 40%, #0a1628 0%, #060d1a 100%)" }}
          onClick={() => setSelected(null)}
        >
          {/* Grid overlay */}
          <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#4a9eff" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Scan-line effect */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,100,0.01) 2px, rgba(0,255,100,0.01) 4px)",
            }}
          />

          {/* Main SVG: terrain + connections + bases */}
          <svg
            viewBox="0 0 1000 900"
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0 w-full h-full"
          >
            {/* Water background */}
            <rect width="1000" height="900" fill="#061020" />

            {/* Topographic contour decorations */}
            {[80, 160, 240].map((r, i) => (
              <ellipse
                key={i}
                cx="500" cy="380"
                rx={r * 3.5} ry={r * 2.8}
                fill="none"
                stroke="#1a3a5c"
                strokeWidth="0.5"
                opacity="0.4"
              />
            ))}

            {/* Sweden landmass */}
            <path
              d={SWEDEN_PATH}
              fill="#0d2218"
              stroke="#1a4030"
              strokeWidth="1.5"
            />
            {/* Gotland */}
            <path d={GOTLAND_PATH} fill="#0d2218" stroke="#1a4030" strokeWidth="1" />

            {/* Subtle terrain texture */}
            <path
              d={SWEDEN_PATH}
              fill="url(#terrainGrad)"
              opacity="0.3"
            />
            <defs>
              <radialGradient id="terrainGrad" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#1a4030" />
                <stop offset="100%" stopColor="#0d2218" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Supply lines — thickness reflects logistics flow */}
            {SUPPLY_LINES.map(([a, b]) => {
              const pa = toSVG(BASE_POSITIONS[a].x, BASE_POSITIONS[a].y);
              const pb = toSVG(BASE_POSITIONS[b].x, BASE_POSITIONS[b].y);
              const aBase = state.bases.find((bs) => bs.id === a);
              const bBase = state.bases.find((bs) => bs.id === b);
              const active = aBase && bBase;
              // Logistics flow: more aircraft + lower fuel = thicker line (more demand)
              const totalAc = (aBase?.aircraft.length ?? 0) + (bBase?.aircraft.length ?? 0);
              const avgFuel = ((aBase?.fuel ?? 100) + (bBase?.fuel ?? 100)) / 2;
              const flowIntensity = active ? Math.max(1, Math.min(4, totalAc / 10 + (100 - avgFuel) / 40)) : 1;
              const stressed = active && avgFuel < 30;
              return (
                <g key={`${a}-${b}`}>
                  <line
                    x1={pa.x} y1={pa.y}
                    x2={pb.x} y2={pb.y}
                    stroke={stressed ? "#ef4444" : active ? "#2563eb" : "#1e293b"}
                    strokeWidth={active ? flowIntensity : 1}
                    strokeDasharray={active ? "8 4" : "4 6"}
                    opacity={active ? 0.6 : 0.25}
                  />
                  {stressed && (
                    <circle
                      cx={(pa.x + pb.x) / 2}
                      cy={(pa.y + pb.y) / 2}
                      r="5"
                      fill="#ef4444"
                      opacity="0.8"
                    >
                      <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  )}
                </g>
              );
            })}

            {/* Base markers */}
            {Object.entries(BASE_POSITIONS).map(([id, pos]) => {
              const base = state.bases.find((b) => b.id === id);
              const { x, y } = toSVG(pos.x, pos.y);
              const isSelected = selected?.baseId === id;
              const mc = base ? base.aircraft.filter((a) => a.status === "ready").length : 0;
              const onMission = base ? base.aircraft.filter((a) => a.status === "on_mission").length : 0;
              const color = statusColor(base);
              const isMainBase = id === "MOB";
              const radius = isMainBase ? 22 : 16;
              const isBottleneck = base && (
                mc / base.aircraft.length < 0.4 ||
                base.maintenanceBays.occupied >= base.maintenanceBays.total ||
                base.fuel < 20
              );

              return (
                <g
                  key={id}
                  style={{ cursor: base ? "pointer" : "default" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (base) setSelected({ kind: "base", baseId: id });
                  }}
                >
                  {/* Pulse ring for active bases */}
                  {base && (
                    <circle
                      cx={x} cy={y}
                      r={radius + 8}
                      fill="none"
                      stroke={color}
                      strokeWidth="1"
                      opacity="0.3"
                    >
                      <animate attributeName="r" values={`${radius + 6};${radius + 16};${radius + 6}`} dur="3s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Bottleneck indicator — pulsing red ring */}
                  {isBottleneck && (
                    <circle
                      cx={x} cy={y}
                      r={radius + 4}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2.5"
                      strokeDasharray="4 3"
                      opacity="0.8"
                    >
                      <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1s" repeatCount="indefinite" />
                      <animate attributeName="stroke-dashoffset" values="0;14" dur="1s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Selection ring */}
                  {isSelected && (
                    <circle
                      cx={x} cy={y}
                      r={radius + 10}
                      fill="none"
                      stroke="#60a5fa"
                      strokeWidth="2"
                      strokeDasharray="6 3"
                      opacity="0.9"
                    />
                  )}

                  {/* Base body */}
                  <circle
                    cx={x} cy={y} r={radius}
                    fill={base ? "#0f172a" : "#0a0f1a"}
                    stroke={base ? color : "#1e293b"}
                    strokeWidth={isMainBase ? 2.5 : 1.8}
                    opacity={base ? 1 : 0.4}
                  />

                  {/* Inner icon */}
                  {isMainBase ? (
                    <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="12" fill={color} fontFamily="monospace" fontWeight="bold">
                      MOB
                    </text>
                  ) : (
                    <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill={base ? color : "#334155"} fontFamily="monospace" fontWeight="bold">
                      {id.replace("_", "\n")}
                    </text>
                  )}

                  {/* Aircraft count bubble */}
                  {base && mc > 0 && (
                    <g>
                      <circle cx={x + radius - 2} cy={y - radius + 2} r="9" fill="#1e3a5f" stroke="#2563eb" strokeWidth="1" />
                      <text x={x + radius - 2} y={y - radius + 3} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="#60a5fa" fontWeight="bold">
                        {mc}
                      </text>
                    </g>
                  )}

                  {/* On-mission indicator */}
                  {base && onMission > 0 && (
                    <g>
                      <circle cx={x - radius + 2} cy={y - radius + 2} r="8" fill="#0f2e1a" stroke="#22c55e" strokeWidth="1" />
                      <text x={x - radius + 2} y={y - radius + 3} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill="#22c55e" fontWeight="bold">
                        {onMission}↗
                      </text>
                    </g>
                  )}

                  {/* Base label */}
                  <text
                    x={x} y={y + radius + 12}
                    textAnchor="middle"
                    fontSize={base ? "10" : "8"}
                    fill={base ? "#94a3b8" : "#334155"}
                    fontFamily="monospace"
                  >
                    {id}
                  </text>

                  {/* Fuel bar below label */}
                  {base && (
                    <>
                      <rect x={x - 18} y={y + radius + 18} width="36" height="3" rx="1.5" fill="#1e293b" />
                      <rect
                        x={x - 18} y={y + radius + 18}
                        width={36 * (base.fuel / 100)}
                        height="3" rx="1.5"
                        fill={fuelColor(base.fuel)}
                      />
                    </>
                  )}
                </g>
              );
            })}

            {/* Flying aircraft dots between base and notional mission area */}
            {state.bases.flatMap((base) =>
              base.aircraft
                .filter((ac) => ac.status === "on_mission")
                .map((ac, idx) => {
                  const pos = BASE_POSITIONS[base.id];
                  if (!pos) return null;
                  const { x, y } = toSVG(pos.x, pos.y);
                  const angle = (idx * 55) % 360;
                  const dist = 60 + (idx % 3) * 20;
                  const tx = x + Math.cos((angle * Math.PI) / 180) * dist;
                  const ty = y + Math.sin((angle * Math.PI) / 180) * dist;
                  return (
                    <g key={ac.id}>
                      <line x1={x} y1={y} x2={tx} y2={ty} stroke="#22c55e" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.4" />
                      <circle cx={tx} cy={ty} r="4" fill="#22c55e" opacity="0.8">
                        <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
                      </circle>
                    </g>
                  );
                })
            )}
          </svg>

          {/* Corner compass */}
          <div className="absolute top-4 right-4 opacity-30 text-[10px] font-mono text-primary">
            <div className="text-center">N</div>
            <div className="text-center">↑</div>
          </div>

          {/* Corner scale */}
          <div className="absolute bottom-4 left-4 text-[9px] font-mono text-muted-foreground/40 flex items-center gap-2">
            <div className="w-16 h-px bg-muted-foreground/40" />
            <span>~200 km</span>
          </div>
        </div>

        {/* ── DETAIL PANEL ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {selected && (
            <motion.div
              key="detail"
              initial={{ x: 340, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 340, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-[340px] border-l border-border bg-card overflow-y-auto flex flex-col"
            >
              {/* Panel header */}
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div>
                  {selectedAircraft ? (
                    <>
                      <div className="text-xs font-bold text-foreground font-mono">{selectedAircraft.tailNumber}</div>
                      <div className="text-[10px] text-muted-foreground">{selectedAircraft.type} · {selectedBase?.name}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs font-bold text-foreground font-mono">{selectedBase?.name ?? selected.baseId}</div>
                      <div className="text-[10px] text-muted-foreground capitalize">{selectedBase?.type ?? "Reservbas"}</div>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1 text-muted-foreground hover:text-foreground rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {selectedAircraft ? (
                <AircraftDetail
                  aircraft={selectedAircraft}
                  onBack={() => setSelected({ kind: "base", baseId: selected.baseId })}
                />
              ) : selectedBase ? (
                <BaseDetail
                  base={selectedBase}
                  onSelectAircraft={(id) => setSelected({ kind: "aircraft", baseId: selectedBase.id, aircraftId: id })}
                />
              ) : (
                <div className="p-4 text-xs text-muted-foreground">
                  Bas ej aktiv i detta scenario.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Base detail panel ─────────────────────────────────────────────────────
function BaseDetail({
  base,
  onSelectAircraft,
}: {
  base: Base;
  onSelectAircraft: (id: string) => void;
}) {
  const mc = base.aircraft.filter((a) => a.status === "ready");
  const nmc = base.aircraft.filter((a) => a.status === "unavailable");
  const maintenance = base.aircraft.filter((a) => a.status === "under_maintenance");
  const onMission = base.aircraft.filter((a) => a.status === "on_mission");
  const readiness = getReadiness(base);
  const totalPersonnel = base.personnel.reduce((s, p) => s + p.total, 0);
  const availPersonnel = base.personnel.reduce((s, p) => s + p.available, 0);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">

      {/* Beredskap */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold font-mono ${readiness.cls}`}>
        <Shield className="h-4 w-4" />
        BEREDSKAP: {readiness.label}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatBox icon={<AircraftIcon type="GripenE" size={14} />} label="Mission Capable" value={mc.length} total={base.aircraft.length} color="green" />
        <StatBox icon={<AircraftIcon type="GripenE" size={14} />} label="På uppdrag" value={onMission.length} total={base.aircraft.length} color="blue" />
        <StatBox icon={<Wrench className="h-3.5 w-3.5" />} label="I underhåll" value={maintenance.length + nmc.length} total={base.aircraft.length} color="yellow" />
        <StatBox icon={<Users className="h-3.5 w-3.5" />} label="Personal" value={availPersonnel} total={totalPersonnel} color="purple" />
      </div>

      {/* Fuel */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
            <Fuel className="h-3 w-3" /> BRÄNSLE
          </span>
          <span className="text-[10px] font-mono" style={{ color: fuelColor(base.fuel) }}>
            {base.fuel.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${base.fuel}%`, backgroundColor: fuelColor(base.fuel) }}
          />
        </div>
      </div>

      {/* Ammunition */}
      <div>
        <div className="text-[10px] font-mono text-muted-foreground mb-2 flex items-center gap-1">
          <Package className="h-3 w-3" /> AMMUNITION
        </div>
        <div className="space-y-1.5">
          {base.ammunition.map((a) => {
            const pct = (a.quantity / a.max) * 100;
            return (
              <div key={a.type}>
                <div className="flex justify-between text-[9px] font-mono mb-0.5">
                  <span className="text-foreground">{a.type}</span>
                  <span className={pct < 30 ? "text-status-red" : "text-muted-foreground"}>
                    {a.quantity}/{a.max}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: pct < 30 ? "#ef4444" : pct < 60 ? "#eab308" : "#22c55e" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Spare parts */}
      <div>
        <div className="text-[10px] font-mono text-muted-foreground mb-2 flex items-center gap-1">
          <Wrench className="h-3 w-3" /> RESERVDELAR
        </div>
        <div className="space-y-1">
          {base.spareParts.map((p) => {
            const pct = (p.quantity / p.maxQuantity) * 100;
            const critical = pct < 30;
            return (
              <div key={p.id} className="flex items-center gap-2">
                {critical && <AlertTriangle className="h-3 w-3 text-status-red shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-[9px] font-mono">
                    <span className={critical ? "text-status-red" : "text-foreground truncate"}>{p.name}</span>
                    <span className="text-muted-foreground shrink-0 ml-1">{p.quantity}/{p.maxQuantity}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Maintenance bays */}
      <div>
        <div className="text-[10px] font-mono text-muted-foreground mb-2 flex items-center gap-1">
          <Wrench className="h-3 w-3" /> UNDERHÅLLSPLATSER
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: base.maintenanceBays.total }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-6 rounded border text-[9px] font-mono flex items-center justify-center ${
                i < base.maintenanceBays.occupied
                  ? "bg-status-yellow/10 border-status-yellow/40 text-status-yellow"
                  : "bg-muted border-border text-muted-foreground"
              }`}
            >
              {i < base.maintenanceBays.occupied ? "UH" : "FRI"}
            </div>
          ))}
        </div>
      </div>

      {/* Personnel */}
      <div>
        <div className="text-[10px] font-mono text-muted-foreground mb-2 flex items-center gap-1">
          <Users className="h-3 w-3" /> PERSONAL
        </div>
        <div className="space-y-1">
          {base.personnel.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-[10px]">
              <span className="text-foreground">{p.role}</span>
              <span className={`font-mono ${p.available / p.total < 0.5 ? "text-status-red" : "text-muted-foreground"}`}>
                {p.available}/{p.total}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Zone overview */}
      {base.zones && base.zones.length > 0 && (
        <div>
          <div className="text-[10px] font-mono text-muted-foreground mb-2 flex items-center gap-1">
            <MapPin className="h-3 w-3" /> BASYZONER
          </div>
          <div className="space-y-1">
            {base.zones.filter((z) => z.capacity > 0).map((zone) => {
              const load = zone.currentQueue.length / zone.capacity;
              const isFull = zone.currentQueue.length >= zone.capacity;
              const zoneLabels: Record<string, string> = {
                runway: "Rullbana",
                prep_slot: "Klargöringsplats",
                front_maintenance: "Främre UH",
                rear_maintenance: "Bakre UH",
                parking: "Parkering",
                fuel_zone: "Bränsledepå",
                ammo_zone: "Ammunitionsdepå",
                spare_parts_zone: "Reservdelslager",
                logistics_area: "Logistikyta",
              };
              return (
                <div key={zone.id} className="flex items-center justify-between text-[10px]">
                  <span className={isFull ? "text-status-red font-bold" : "text-foreground"}>
                    {zoneLabels[zone.type] ?? zone.type}
                  </span>
                  <span className={`font-mono ${isFull ? "text-status-red" : load > 0.7 ? "text-status-yellow" : "text-muted-foreground"}`}>
                    {zone.currentQueue.length}/{zone.capacity}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Aircraft list */}
      <div>
        <div className="text-[10px] font-mono text-muted-foreground mb-2 flex items-center gap-1">
          <AircraftIcon type="GripenE" size={12} /> FLYGPLAN ({base.aircraft.length} st)
        </div>
        <div className="space-y-1">
          {base.aircraft.map((ac) => (
            <button
              key={ac.id}
              onClick={() => onSelectAircraft(ac.id)}
              className="w-full flex items-center gap-2 p-2 rounded border border-border bg-card hover:border-primary/40 hover:bg-muted/30 transition-colors text-left"
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  ac.status === "ready"
                    ? "bg-status-green"
                    : ac.status === "on_mission"
                    ? "bg-status-blue"
                    : ac.status === "under_maintenance"
                    ? "bg-status-yellow"
                    : "bg-status-red"
                }`}
              />
              <span className="text-[10px] font-mono font-bold text-foreground">{ac.tailNumber}</span>
              <span className="text-[9px] text-muted-foreground flex-1">{ac.type.replace("_", "/")}</span>
              <span className="text-[9px] font-mono text-muted-foreground">{ac.flightHours}h</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Aircraft detail panel ─────────────────────────────────────────────────
function AircraftDetail({
  aircraft,
  onBack,
}: {
  aircraft: Aircraft;
  onBack: () => void;
}) {
  const statusMap: Record<string, { label: string; cls: string }> = {
    ready: { label: "Mission Capable", cls: "text-status-green bg-status-green/10 border-status-green/40" },
    allocated: { label: "Tilldelad", cls: "text-status-blue bg-status-blue/10 border-status-blue/40" },
    in_preparation: { label: "Klargöring", cls: "text-status-yellow bg-status-yellow/10 border-status-yellow/40" },
    awaiting_launch: { label: "Väntar start", cls: "text-cyan-400 bg-cyan-400/10 border-cyan-400/40" },
    on_mission: { label: "På uppdrag", cls: "text-status-blue bg-status-blue/10 border-status-blue/40" },
    returning: { label: "Retur", cls: "text-purple-400 bg-purple-400/10 border-purple-400/40" },
    recovering: { label: "Mottagning", cls: "text-orange-400 bg-orange-400/10 border-orange-400/40" },
    under_maintenance: { label: "Underhåll pågår", cls: "text-status-yellow bg-status-yellow/10 border-status-yellow/40" },
    unavailable: { label: "Ej operativ (NMC)", cls: "text-status-red bg-status-red/10 border-status-red/40" },
  };
  const s = statusMap[aircraft.status] ?? statusMap.unavailable;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <button
        onClick={onBack}
        className="text-[10px] font-mono text-primary flex items-center gap-1 hover:underline"
      >
        ← Tillbaka till basen
      </button>

      {/* Status */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold font-mono ${s.cls}`}>
        <AircraftIcon type={aircraft.type} size={16} />
        {s.label}
      </div>

      {/* Details grid */}
      <div className="space-y-2">
        <Row label="Typ" value={aircraft.type.replace("_", "/")} />
        <Row label="Svans #" value={aircraft.tailNumber} />
        <Row label="Bas" value={aircraft.currentBase} />
        <Row label="Flygtid" value={`${aircraft.flightHours} h`} />
        <Row label="Till service" value={`${aircraft.hoursToService} h kvar`} highlight={aircraft.hoursToService < 20} />
        {aircraft.currentMission && (
          <Row label="Aktuellt uppdrag" value={aircraft.currentMission} />
        )}
        {aircraft.payload && (
          <Row label="Lastning" value={aircraft.payload} />
        )}
        {aircraft.maintenanceType && (
          <Row label="Underhållstyp" value={aircraft.maintenanceType.replace(/_/g, " ")} />
        )}
        {aircraft.maintenanceTimeRemaining && (
          <Row
            label="Kvar i underhåll"
            value={`${aircraft.maintenanceTimeRemaining} h`}
            highlight
          />
        )}
      </div>

      {/* Service bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono text-muted-foreground">Service-intervall</span>
          <span className="text-[10px] font-mono text-foreground">{aircraft.hoursToService}h kvar</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, (aircraft.hoursToService / 100) * 100)}%`,
              backgroundColor: aircraft.hoursToService < 20 ? "#ef4444" : aircraft.hoursToService < 40 ? "#eab308" : "#22c55e",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────
function StatBox({
  icon,
  label,
  value,
  total,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  total: number;
  color: "green" | "blue" | "yellow" | "purple";
}) {
  const colorMap = {
    green: "text-status-green border-status-green/20 bg-status-green/5",
    blue: "text-status-blue border-status-blue/20 bg-status-blue/5",
    yellow: "text-status-yellow border-status-yellow/20 bg-status-yellow/5",
    purple: "text-purple-400 border-purple-400/20 bg-purple-400/5",
  };
  return (
    <div className={`rounded-lg border p-2.5 ${colorMap[color]}`}>
      <div className="flex items-center gap-1.5 mb-1 opacity-70">{icon}<span className="text-[9px] font-mono">{label}</span></div>
      <div className="text-lg font-bold font-mono leading-none">
        {value}<span className="text-[10px] font-normal opacity-60">/{total}</span>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-border/40">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={`text-[10px] font-mono ${highlight ? "text-status-red font-bold" : "text-foreground"}`}>{value}</span>
    </div>
  );
}
