import { useState, useRef } from "react";
import { Base, Aircraft } from "@/types/game";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Fuel,
  Package,
  Users,
  Wrench,
  AlertTriangle,
  Plane,
  Dice6,
} from "lucide-react";
import { UtfallModal, UtfallOutcome } from "./UtfallModal";

type BuildingId =
  | "apron"
  | "hangar"
  | "fuel"
  | "ammo"
  | "command"
  | "spareparts"
  | null;

export type DropZone = "runway" | "hangar" | "spareparts" | "fuel" | "ammo";

interface BaseMapProps {
  base: Base;
  onDropAircraft: (aircraftId: string, zone: DropZone) => void;
  onUtfallOutcome?: (aircraftId: string, repairTime: number, maintenanceTypeKey: string, weaponLoss: number, actionLabel: string) => void;
}

// Drop zones in SVG coordinate space (viewBox 900×500)
const SVG_ZONES: {
  id: DropZone;
  x: number; y: number; w: number; h: number;
  label: string;
  colorFill: string;
  colorBorder: string;
}[] = [
  { id: "runway",     x: 60,  y: 148, w: 780, h: 62,  label: "✈️  STARTA UPPDRAG",    colorFill: "rgba(215,171,58,0.30)",  colorBorder: "#D7AB3A" },
  { id: "hangar",     x: 60,  y: 318, w: 195, h: 128, label: "🔧  UNDERHÅLL / SERVICE", colorFill: "rgba(12,35,76,0.30)",    colorBorder: "#0C234C" },
  { id: "spareparts", x: 200, y: 40,  w: 130, h: 70,  label: "📦  SNABB LRU-REP",      colorFill: "rgba(217,25,46,0.25)",   colorBorder: "#D9192E" },
  { id: "fuel",       x: 280, y: 318, w: 110, h: 72,  label: "⛽  TANKNING",            colorFill: "rgba(12,35,76,0.25)",    colorBorder: "#0C234C" },
  { id: "ammo",       x: 430, y: 318, w: 130, h: 40,  label: "💣  BEVÄPNING",           colorFill: "rgba(217,25,46,0.25)",   colorBorder: "#D9192E" },
];

function getZoneAt(x: number, y: number): DropZone | null {
  for (const z of SVG_ZONES) {
    if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return z.id;
  }
  return null;
}

// Aircraft status colours — SAAB palette
const AC_COLOR: Record<Aircraft["status"], string> = {
  mission_capable: "#0C234C",
  on_mission: "#1a4a8a",
  maintenance: "#D7AB3A",
  not_mission_capable: "#D9192E",
};

const AC_LABEL: Record<Aircraft["status"], string> = {
  mission_capable: "MC",
  on_mission: "UPP",
  maintenance: "UH",
  not_mission_capable: "NMC",
};

// Plane silhouette color = remaining-life battery indicator
function getAircraftColor(ac: Aircraft): string {
  if (ac.status === "maintenance") return "#D7AB3A";
  if (ac.status === "not_mission_capable") return "#D9192E";
  if (ac.hoursToService <= 20) return "#D9192E";
  if (ac.hoursToService < 50) return "#D7AB3A";
  return "#0C234C";
}

// Reusable Gripen top-down silhouette, facing LEFT (nose at cx-x), centered at (cx,cy)
function GripenShape({ cx, cy, color, opacity = 1 }: { cx: number; cy: number; color: string; opacity?: number }) {
  return (
    <g opacity={opacity}>
      {/* Main fuselage — long needle shape */}
      <path
        d={`M ${cx-15},${cy}
            L ${cx-11},${cy-2}
            L ${cx-6},${cy-2.5}
            L ${cx+1},${cy-2}
            L ${cx+11},${cy-1.5}
            L ${cx+14},${cy}
            L ${cx+11},${cy+1.5}
            L ${cx+1},${cy+2}
            L ${cx-6},${cy+2.5}
            L ${cx-11},${cy+2} Z`}
        fill={color}
      />
      {/* Left main delta wing — sweeps back from mid-fuselage */}
      <polygon
        points={`${cx-4},${cy-2} ${cx-1},${cy-14} ${cx+8},${cy-13} ${cx+10},${cy-2}`}
        fill={color} opacity="0.9"
      />
      {/* Right main delta wing */}
      <polygon
        points={`${cx-4},${cy+2} ${cx-1},${cy+14} ${cx+8},${cy+13} ${cx+10},${cy+2}`}
        fill={color} opacity="0.9"
      />
      {/* Left forward canard — sweeps forward */}
      <polygon
        points={`${cx-9},${cy-2} ${cx-13},${cy-6} ${cx-8},${cy-5} ${cx-7},${cy-2}`}
        fill={color} opacity="0.85"
      />
      {/* Right forward canard */}
      <polygon
        points={`${cx-9},${cy+2} ${cx-13},${cy+6} ${cx-8},${cy+5} ${cx-7},${cy+2}`}
        fill={color} opacity="0.85"
      />
      {/* Engine nozzle circle at tail */}
      <circle cx={cx+14} cy={cy} r="2.5" fill={color} opacity="0.65" />
    </g>
  );
}

export function BaseMap({ base, onDropAircraft, onUtfallOutcome }: BaseMapProps) {
  const [selected, setSelected] = useState<BuildingId>(null);
  const [hoveredAc, setHoveredAc] = useState<string | null>(null);
  const [selectedAcId, setSelectedAcId] = useState<string | null>(null);
  const [utfallAcId, setUtfallAcId] = useState<string | null>(null);

  // Pointer-event drag state (SVG-native, no HTML drag API)
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingAcId, setDraggingAcId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [dropZoneHover, setDropZoneHover] = useState<DropZone | null>(null);

  const mc = base.aircraft.filter((a) => a.status === "mission_capable");
  const nmc = base.aircraft.filter((a) => a.status === "not_mission_capable");
  const maint = base.aircraft.filter((a) => a.status === "maintenance");
  const onMission = base.aircraft.filter((a) => a.status === "on_mission");

  function toggle(id: BuildingId) {
    setSelected((prev) => (prev === id ? null : id));
    setSelectedAcId(null);
  }

  function selectAircraft(id: string) {
    setSelectedAcId((prev) => (prev === id ? null : id));
    setSelected(null);
  }

  function screenToSVG(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 900,
      y: ((clientY - rect.top) / rect.height) * 500,
    };
  }

  function handleSVGPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!draggingAcId) return;
    const pos = screenToSVG(e.clientX, e.clientY);
    setDragPos(pos);
    setDropZoneHover(getZoneAt(pos.x, pos.y));
  }

  function handleSVGPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    if (!draggingAcId) return;
    const pos = screenToSVG(e.clientX, e.clientY);
    const zone = getZoneAt(pos.x, pos.y);
    if (zone) onDropAircraft(draggingAcId, zone);
    setDraggingAcId(null);
    setDragPos(null);
    setDropZoneHover(null);
  }

  function cancelDrag() {
    setDraggingAcId(null);
    setDragPos(null);
    setDropZoneHover(null);
  }

  // Apron shows only parked planes (MC and NMC). On-mission → runway. Maintenance → hangars.
  const apronAircraft = base.aircraft
    .filter((a) => a.status === "mission_capable" || a.status === "not_mission_capable")
    .slice(0, 32);
  const cols = 16;

  return (
    <div>
      {/* ── SVG MAP ───────────────────────────────────────────────── */}
      <div className="relative w-full bg-[#e8f0e8] overflow-x-auto select-none">
  
        <svg
          ref={svgRef}
          viewBox="0 0 900 500"
          className="w-full relative z-0"
          style={{ minWidth: 600, cursor: draggingAcId ? "grabbing" : "default", touchAction: "none" }}
          onClick={() => { if (!draggingAcId) { setSelected(null); setSelectedAcId(null); } }}
          onPointerMove={handleSVGPointerMove}
          onPointerUp={handleSVGPointerUp}
          onPointerLeave={cancelDrag}
        >
          {/* Grass background */}
          <rect width="900" height="500" fill="#dceadc" />

          {/* Drag-drop instructions banner */}
          <rect x="20" y="8" width="860" height="24" rx="3" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1.5" opacity="0.85" />
          <text x="30" y="24" fontSize="9" fill="#0c4a6e" fontFamily="monospace" fontWeight="bold">
            💡 Dra flygplan → Bana (✈️ uppdrag) · Hangar (🔧 underhåll) · Reservdel (📦 LRU 2h) · Bränsle (⛽) · Ammo (💣)
          </text>

          {/* ── Perimeter fence (disabled) ── */}
          <rect x="20" y="20" width="860" height="460" fill="none" stroke="none" strokeWidth="0" />

          {/* ── Taxiway (south of runway) ── */}
          <rect x="60" y="238" width="780" height="14" fill="#b0b8c8" />

          {/* ── Runway drop zone ── */}
          <rect x="60" y="150" width="780" height="60" rx="2" fill="#9aa4b8" />
          {/* Runway centre-line */}
          <line x1="60" y1="180" x2="840" y2="180" stroke="#f8fafc" strokeWidth="1.5" strokeDasharray="20 14" />
          {/* Runway threshold marks */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={75 + i * 14} y={154} width={8} height={18} fill="#c8d0dc" />
          ))}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={807 - i * 14} y={188} width={8} height={18} fill="#c8d0dc" />
          ))}
          <text x="450" y="183" textAnchor="middle" fontSize="9" fill="#fff" fontFamily="monospace" letterSpacing="3">
            LANDNINGSBANA 09/27
          </text>

          {/* ── On-mission aircraft rendered ON the runway ── */}
          {onMission.slice(0, 10).map((ac, i) => {
            const rx = 95 + i * 75;
            const ry = 192;
            const color = "#2563eb";
            return (
              <g key={`mission-${ac.id}`}
                onMouseEnter={() => setHoveredAc(ac.id)}
                onMouseLeave={() => setHoveredAc(null)}
              >
                <GripenShape cx={rx} cy={ry} color={color} />
                {/* Speed lines */}
                <line x1={rx+15} y1={ry-1} x2={rx+22} y2={ry-1} stroke="#93c5fd" strokeWidth="0.7" opacity="0.6" />
                <line x1={rx+15} y1={ry+1} x2={rx+22} y2={ry+1} stroke="#93c5fd" strokeWidth="0.7" opacity="0.6" />
                {hoveredAc === ac.id && (
                  <g>
                    <rect x={rx-18} y={ry-22} width="36" height="11" rx="2" fill="#1e3a8a" opacity="0.9" />
                    <text x={rx} y={ry-14} textAnchor="middle" fontSize="7" fill="#fff" fontFamily="monospace" fontWeight="bold">{ac.tailNumber}</text>
                  </g>
                )}
              </g>
            );
          })}

          {/* ── Apron / Parking ── */}
          <rect
            x="60" y="208" width="780" height="100"
            fill={selected === "apron" ? "#dbeafe" : "#c8d4e8"}
            stroke={selected === "apron" ? "#005AA0" : "#8099bb"}
            strokeWidth={selected === "apron" ? 2 : 1}
            rx="4"
            style={{ cursor: "pointer" }}
            onClick={(e) => { e.stopPropagation(); toggle("apron"); }}
          />
          <text x="75" y="220" fontSize="8" fill="#374e70" fontFamily="monospace">UPPSTÄLLNINGSPLATS</text>

          {/* Aircraft icons on apron — Gripen silhouette, facing left (nose at -x) */}
          {apronAircraft.map((ac, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const cx = 80 + col * 46;
            const cy = 248 + row * 44;
            const color = getAircraftColor(ac);
            const isHovered = hoveredAc === ac.id;
            const isSelAc = selectedAcId === ac.id;
            return (
              <g
                key={ac.id}
                style={{ cursor: draggingAcId === ac.id ? "grabbing" : isSelAc ? "pointer" : "grab" }}
                onMouseEnter={() => { if (!draggingAcId) setHoveredAc(ac.id); }}
                onMouseLeave={() => setHoveredAc(null)}
                onClick={(e) => { if (!draggingAcId) { e.stopPropagation(); selectAircraft(ac.id); } }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Capture pointer on the SVG so move/up fire on SVG even when cursor leaves aircraft
                  svgRef.current?.setPointerCapture(e.pointerId);
                  setDraggingAcId(ac.id);
                  setSelectedAcId(null);
                  const pos = screenToSVG(e.clientX, e.clientY);
                  setDragPos(pos);
                  setDropZoneHover(null);
                }}
              >
                {/* Selection ring */}
                {isSelAc && (
                  <ellipse cx={cx} cy={cy} rx="16" ry="12" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
                )}
                {/* Drop shadow */}
                <ellipse cx={cx} cy={cy + 1.5} rx="13" ry="5" fill="rgba(0,0,0,0.12)" />
                {/* Gripen silhouette */}
                <GripenShape cx={cx} cy={cy} color={color} />

                {/* ── Battery indicator ── */}
                {(() => {
                  const battPct = Math.min(1, ac.hoursToService / 100);
                  const battColor = ac.hoursToService <= 20 ? "#dc2626" : ac.hoursToService < 50 ? "#d97706" : "#16a34a";
                  const bX = cx - 11, bY = cy + 15, bW = 22, bH = 6;
                  return (
                    <g>
                      {/* Outer casing */}
                      <rect x={bX} y={bY} width={bW} height={bH} rx={1.5} fill="rgba(0,0,0,0.25)" stroke="white" strokeWidth={1} />
                      {/* Terminal nub */}
                      <rect x={bX + bW + 0.5} y={bY + 1.5} width={2} height={bH - 3} rx={0.5} fill="white" opacity={0.75} />
                      {/* Fill level */}
                      <rect x={bX + 1.5} y={bY + 1.5} width={Math.max(0, (bW - 3) * battPct)} height={bH - 3} rx={1} fill={battColor} />
                    </g>
                  );
                })()}

                {/* Label (always visible) */}
                <g>
                  <rect x={cx - 18} y={cy - 28} width="36" height="14" rx="2" fill="#fff" stroke={color} strokeWidth="0.8" />
                  <text x={cx} y={cy - 20} textAnchor="middle" fontSize="7" fill={color} fontFamily="monospace" fontWeight="bold">
                    {ac.tailNumber}
                  </text>
                  <text x={cx} y={cy - 16} textAnchor="middle" fontSize="5.5" fill="#64748b" fontFamily="monospace">
                    {AC_LABEL[ac.status]}
                  </text>
                </g>
              </g>
            );
          })}

          {/* ── Maintenance Hangars (4) ── */}
          {[0, 1, 2, 3].map((i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const hx = 60 + col * 100;
            const hy = 318 + row * 65;
            const occupied = i < base.maintenanceBays.occupied;
            const isSel = selected === "hangar";
            const isHangarHot = dropZoneHover === "hangar";
            return (
              <g
                key={i}
                style={{ cursor: "pointer" }}
                onClick={(e) => { if (!draggingAcId) { e.stopPropagation(); toggle("hangar"); } }}
              >
                {/* Roof */}
                <rect
                  x={hx} y={hy} width="86" height="58"
                  fill={isHangarHot ? "#c7d2e8" : occupied ? "#fefce8" : "#eff6ff"}
                  stroke={isHangarHot ? "#d97706" : isSel ? "#005AA0" : occupied ? "#d97706" : "#93b4d8"}
                  strokeWidth={isHangarHot || isSel ? 2 : 1.2}
                  rx="2"
                />
                
                {/* Door */}
                <rect x={hx + 18} y={hy + 30} width="50" height="28" rx="1"
                  fill={occupied ? "#fde68a40" : "#bfdbfe40"} stroke={occupied ? "#d9770640" : "#93b4d8"} strokeWidth="0.8" />
                {/* Roof lines */}
                <line x1={hx + 43} y1={hy} x2={hx + 43} y2={hy + 30} stroke="#93b4d8" strokeWidth="0.6" />
                {/* Label */}
                <text x={hx + 43} y={hy + 12} textAnchor="middle" fontSize="7" fill={occupied ? "#92400e" : "#1e3a5f"} fontFamily="monospace">
                  HANGAR {i + 1}
                </text>
                
                {occupied && (
                  <circle cx={hx + 72} cy={hy + 8} r="5" fill="#d97706" opacity="0.8">
                    <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}
          {/* Hangar label */}
          <text x="146" y="314" textAnchor="middle" fontSize="7" fill="#1e3a5f" fontFamily="monospace">UNDERHÅLLSHALLAR</text>

          {/* ── Maintenance aircraft inside hangars ── */}
          {maint.slice(0, 4).map((ac, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const hx = 60 + col * 100;
            const hy = 318 + row * 65;
            const mx = hx + 43, my = hy + 42;
            return (
              <g key={`maint-${ac.id}`}
                onMouseEnter={() => setHoveredAc(ac.id)}
                onMouseLeave={() => setHoveredAc(null)}
              >
                <GripenShape cx={mx} cy={my} color="#d97706" opacity={0.7} />
                {hoveredAc === ac.id && (
                  <g>
                    <rect x={mx-18} y={my-20} width="36" height="11" rx="2" fill="#92400e" opacity="0.95" />
                    <text x={mx} y={my-12} textAnchor="middle" fontSize="7" fill="#fff" fontFamily="monospace" fontWeight="bold">{ac.tailNumber}</text>
                  </g>
                )}
              </g>
            );
          })}

          {/* ── Fuel Depot ── */}
          {(() => {
            const isSel = selected === "fuel";
            const fuelPct = base.fuel / 100;
            const fuelColor = base.fuel > 60 ? "#15803d" : base.fuel > 30 ? "#d97706" : "#dc2626";
            return (
              <g style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); toggle("fuel"); }}>
                {/* Main building */}
                <rect x="280" y="318" width="110" height="72" rx="2"
                  fill={isSel ? "#f0fdf4" : "#ecfdf5"}
                  stroke={isSel ? fuelColor : "#6ee7b7"}
                  strokeWidth={isSel ? 2 : 1.2} />
                {/* Tanks (circles) */}
                <circle cx="316" cy="345" r="18" fill="#d1fae5" stroke={fuelColor} strokeWidth="1" opacity="0.9" />
                <circle cx="354" cy="345" r="18" fill="#d1fae5" stroke={fuelColor} strokeWidth="1" opacity="0.9" />
                {/* Fuel fill level visual */}
                <clipPath id="fuelClip1"><circle cx="316" cy="345" r="17" /></clipPath>
                <rect x="299" y={345 + 17 - 34 * fuelPct} width="34" height={34 * fuelPct} fill={fuelColor} opacity="0.4" clipPath="url(#fuelClip1)" />
                <clipPath id="fuelClip2"><circle cx="354" cy="345" r="17" /></clipPath>
                <rect x="337" y={345 + 17 - 34 * fuelPct} width="34" height={34 * fuelPct} fill={fuelColor} opacity="0.4" clipPath="url(#fuelClip2)" />
                {/* Labels */}
                <text x="316" y="347" textAnchor="middle" fontSize="7" fill={fuelColor} fontFamily="monospace">{Math.round(base.fuel)}%</text>
                <text x="354" y="347" textAnchor="middle" fontSize="7" fill={fuelColor} fontFamily="monospace">{Math.round(base.fuel)}%</text>
                <text x="335" y="374" textAnchor="middle" fontSize="7" fill="#166534" fontFamily="monospace">BRÄNSLE</text>
                <text x="335" y="382" textAnchor="middle" fontSize="7" fill="#166534" fontFamily="monospace">DEPÅ</text>
              </g>
            );
          })()}

          {/* ── Ammo Depot ── */}
          {(() => {
            const isSel = selected === "ammo";
            const totalAmmo = base.ammunition.reduce((s, a) => s + a.quantity, 0);
            const maxAmmo = base.ammunition.reduce((s, a) => s + a.max, 0);
            const critical = totalAmmo / maxAmmo < 0.3;
            return (
              <g style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); toggle("ammo"); }}>
                {/* Earth revetments (trapezoids) */}
                {[0, 1, 2].map((j) => (
                  <polygon
                    key={j}
                    points={`${430 + j * 40},320 ${464 + j * 40},320 ${458 + j * 40},350 ${436 + j * 40},350`}
                    fill={isSel ? "#fff7ed" : "#fef3c7"}
                    stroke={critical ? "#dc2626" : isSel ? "#dc2626" : "#d97706"}
                    strokeWidth={isSel ? 2 : 1}
                  />
                ))}
                {/* Bunker doors */}
                {[0, 1, 2].map((j) => (
                  <rect key={j} x={442 + j * 40} y={335} width="12" height="15" rx="1"
                    fill="#fde68a" stroke="#d97706" strokeWidth="0.6" />
                ))}
                {/* Warning marker */}
                {critical && (
                  <circle cx="550" cy="325" r="6" fill="#dc2626" opacity="0.8">
                    <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
                <text x="494" y="368" textAnchor="middle" fontSize="7" fill="#92400e" fontFamily="monospace">AMMO DEPOT</text>
                {/* connecting taxiway to ammo */}
                <line x1="494" y1="320" x2="494" y2="308" stroke="#b0b8c8" strokeWidth="8" />
              </g>
            );
          })()}

          {/* ── Command HQ ── */}
          {(() => {
            const isSel = selected === "command";
            return (
              <g style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); toggle("command"); }}>
                <rect x="60" y="40" width="110" height="70" rx="3"
                  fill={isSel ? "#eff6ff" : "#dbeafe"}
                  stroke={isSel ? "#005AA0" : "#3b82f6"}
                  strokeWidth={isSel ? 2 : 1.2} />
                {/* Antenna */}
                <line x1="115" y1="40" x2="115" y2="25" stroke="#005AA0" strokeWidth="1.5" />
                <line x1="108" y1="28" x2="122" y2="28" stroke="#005AA0" strokeWidth="1" />
                {/* Windows */}
                {[0, 1, 2, 3].map((j) => (
                  <rect key={j} x={70 + j * 24} y={60} width="14" height="10" rx="1"
                    fill="#bfdbfe" stroke="#3b82f6" strokeWidth="0.5" opacity="0.8" />
                ))}
                {/* Door */}
                <rect x="103" y="82" width="24" height="28" rx="1" fill="#93c5fd" stroke="#3b82f6" strokeWidth="0.6" />
                <text x="115" y="52" textAnchor="middle" fontSize="7" fill="#1e3a8a" fontFamily="monospace">BAS-HQ</text>
              </g>
            );
          })()}

          {/* ── Spare Parts Store ── */}
          {(() => {
            const isSel = selected === "spareparts";
            const critical = base.spareParts.some((p) => p.quantity / p.maxQuantity < 0.3);
            return (
              <g style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); toggle("spareparts"); }}>
                <rect x="200" y="40" width="130" height="70" rx="2"
                  fill={isSel ? "#fff7ed" : "#ffedd5"}
                  stroke={critical ? "#dc2626" : isSel ? "#ea580c" : "#f97316"}
                  strokeWidth={isSel ? 2 : 1.2} />
                {/* Shelving lines */}
                {[0, 1, 2].map((j) => (
                  <line key={j} x1="210" y1={55 + j * 14} x2="320" y2={55 + j * 14}
                    stroke="#fdba74" strokeWidth="0.6" />
                ))}
                {/* Loading dock */}
                <rect x="245" y="95" width="40" height="15" rx="1" fill="#fed7aa" stroke="#f97316" strokeWidth="0.6" />
                {critical && (
                  <circle cx="320" cy="48" r="6" fill="#dc2626" opacity="0.8">
                    <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
                <text x="265" y="52" textAnchor="middle" fontSize="7" fill="#c2410c" fontFamily="monospace">RESERVDELS-</text>
                <text x="265" y="62" textAnchor="middle" fontSize="7" fill="#c2410c" fontFamily="monospace">FÖRRÅD</text>
              </g>
            );
          })()}

          {/* ── Personnel barracks ── */}
          <g>
            <rect x="360" y="40" width="100" height="70" rx="2"
              fill="#f0fdfa" stroke="#6ee7b7" strokeWidth="1" />
            {[0, 1, 2].map((row) =>
              [0, 1, 2, 3].map((col) => (
                <rect key={`${row}-${col}`}
                  x={370 + col * 20} y={50 + row * 16}
                  width="12" height="9" rx="1"
                  fill="#ccfbf1" stroke="#6ee7b7" strokeWidth="0.5" opacity="0.7" />
              ))
            )}
            <text x="410" y="120" textAnchor="middle" fontSize="7" fill="#0f766e" fontFamily="monospace">FÖRLÄGGNING</text>
          </g>

          {/* ── Road network ── */}
          {/* Main road along north edge */}
          <rect x="20" y="130" width="860" height="10" fill="#9ca3af" opacity="0.6" />
          {/* Road to HQ */}
          <rect x="110" y="110" width="10" height="60" fill="#9ca3af" opacity="0.5" />
          {/* Road to spare parts */}
          <rect x="255" y="110" width="10" height="60" fill="#9ca3af" opacity="0.5" />
          {/* Service road south */}
          <rect x="20" y="310" width="860" height="8" fill="#9ca3af" opacity="0.5" />
          {/* Cross roads */}
          <rect x="420" y="130" width="10" height="125" fill="#9ca3af" opacity="0.4" />
          <rect x="270" y="130" width="10" height="125" fill="#9ca3af" opacity="0.4" />

          {/* ── Legend ── */}
          <g>
            <rect x="680" y="40" width="180" height="90" rx="3" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" opacity="0.95" />
            <text x="770" y="52" textAnchor="middle" fontSize="8" fill="#475569" fontFamily="monospace">LEGENDARIUM</text>
            {[
              { color: "#005AA0", label: "Mission Capable" },
              { color: "#2563eb", label: "På uppdrag" },
              { color: "#d97706", label: "Underhåll" },
              { color: "#dc2626", label: "Ej operativ" },
            ].map((item, i) => (
              <g key={i}>
                <circle cx="700" cy={70 + i * 18} r="5" fill={item.color} opacity="0.85" />
                <text x="713" y={74 + i * 18} fontSize="8" fill="#475569" fontFamily="monospace">{item.label}</text>
              </g>
            ))}
          </g>

          {/* ── Status summary bar (bottom) ── */}
          <rect x="20" y="470" width="860" height="18" rx="2" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.8" />
          <text x="40" y="482" fontSize="8" fill="#16a34a" fontFamily="monospace">MC: {mc.length}</text>
          <text x="100" y="482" fontSize="8" fill="#2563eb" fontFamily="monospace">UPP: {onMission.length}</text>
          <text x="160" y="482" fontSize="8" fill="#d97706" fontFamily="monospace">UH: {maint.length}</text>
          <text x="220" y="482" fontSize="8" fill="#dc2626" fontFamily="monospace">NMC: {nmc.length}</text>
          <text x="320" y="482" fontSize="8" fill="#475569" fontFamily="monospace">
            BRÄNSLE: {Math.round(base.fuel)}% · UH-PLATSER: {base.maintenanceBays.occupied}/{base.maintenanceBays.total}
          </text>
          <text x="820" y="482" textAnchor="end" fontSize="8" fill="#005AA0" fontFamily="monospace">
            {base.name.toUpperCase()}
          </text>

          {/* ── Drop zone highlights — shown during pointer drag, in SVG space ── */}
          {draggingAcId && SVG_ZONES.map((zone) => {
            const isHot = dropZoneHover === zone.id;
            return (
              <g key={`dz-${zone.id}`} style={{ pointerEvents: "none" }}>
                <rect
                  x={zone.x} y={zone.y} width={zone.w} height={zone.h}
                  fill={isHot ? zone.colorFill : "rgba(255,255,255,0.10)"}
                  stroke={zone.colorBorder}
                  strokeWidth={isHot ? 3 : 1.5}
                  strokeDasharray={isHot ? "none" : "8 4"}
                  rx="4"
                />
                <text
                  x={zone.x + zone.w / 2}
                  y={zone.y + zone.h / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={isHot ? 12 : 9}
                  fontWeight="bold"
                  fill={zone.colorBorder}
                  fontFamily="monospace"
                  style={{ pointerEvents: "none" }}
                >
                  {zone.label}
                </text>
              </g>
            );
          })}

          {/* ── Ghost aircraft follows cursor during drag ── */}
          {draggingAcId && dragPos && (() => {
            const dragAc = base.aircraft.find((a) => a.id === draggingAcId);
            if (!dragAc) return null;
            const gc = getAircraftColor(dragAc);
            const gx = dragPos.x, gy = dragPos.y;
            return (
              <g opacity="0.8" style={{ pointerEvents: "none" }}>
                <ellipse cx={gx} cy={gy + 1.5} rx="14" ry="6" fill="rgba(0,0,0,0.2)" />
                <GripenShape cx={gx} cy={gy} color={gc} />
                {/* Tail number label on ghost */}
                <rect x={gx-16} y={gy-28} width="32" height="10" rx="2" fill={gc} opacity="0.9" />
                <text x={gx} y={gy-21} textAnchor="middle" fontSize="7" fill="white" fontFamily="monospace" fontWeight="bold">
                  {dragAc.tailNumber}
                </text>
              </g>
            );
          })()}

          {/* ── Aircraft detail popup — rendered LAST so it paints above all buildings ── */}
          {selectedAcId && (() => {
            const acIdx = apronAircraft.findIndex((a) => a.id === selectedAcId);
            if (acIdx < 0) return null;
            const ac = apronAircraft[acIdx];
            const col = acIdx % cols;
            const row = Math.floor(acIdx / cols);
            const cx = 80 + col * 46;
            const cy = 248 + row * 44;

            const pw = 195, ph = 225;
            const acColor = getAircraftColor(ac);
            const pct = Math.min(100, ac.hoursToService);
            const barColor = ac.hoursToService <= 20 ? "#dc2626" : ac.hoursToService < 50 ? "#d97706" : "#16a34a";
            const fuelColor = base.fuel > 60 ? "#16a34a" : base.fuel > 30 ? "#d97706" : "#dc2626";

            const px = cx > 500 ? cx - pw - 12 : cx + 22;
            const py = Math.max(15, Math.min(200 - ph, cy - ph / 2));

            const pilots = base.personnel.find(
              (p) => p.role.toLowerCase().includes("flyg") || p.role.toLowerCase().includes("pilot")
            );
            const availPilots = pilots?.available ?? 0;
            const totalPilots = pilots?.total ?? 0;

            const lineX2 = cx > 500 ? px + pw : px;
            const lineY2 = py + ph / 2;

            return (
              <g key={`popup-${ac.id}`}>
                {/* Connector line */}
                <line x1={cx} y1={cy} x2={lineX2} y2={lineY2} stroke={acColor} strokeWidth="1" strokeDasharray="3 2" opacity="0.5" />
                <circle cx={cx} cy={cy} r="2.5" fill={acColor} opacity="0.7" />

                <foreignObject x={px} y={py} width={pw} height={ph} style={{ overflow: "visible", zIndex: 999 }}>
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "9px",
                      background: "#ffffff",
                      border: `2px solid ${acColor}`,
                      borderRadius: "8px",
                      overflow: "hidden",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.28)",
                      width: `${pw}px`,
                    }}
                  >
                    {/* Header */}
                    <div style={{ background: acColor, color: "#fff", padding: "5px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: "900", fontSize: "13px", letterSpacing: "1px" }}>{ac.tailNumber}</span>
                      <div style={{ textAlign: "right", fontSize: "8px", opacity: 0.9 }}>
                        <div>{ac.type}</div>
                        <div style={{ fontWeight: "700" }}>{AC_LABEL[ac.status]}</div>
                      </div>
                    </div>

                    {/* Body */}
                    <div style={{ padding: "7px 9px", display: "flex", flexDirection: "column", gap: "5px" }}>

                      {/* Remaining life bar */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                          <span style={{ color: "#64748b", fontWeight: "700", fontSize: "8px" }}>REMAINING LIFE</span>
                          <span style={{ color: barColor, fontWeight: "900", fontSize: "10px" }}>{pct}%</span>
                        </div>
                        <div style={{ height: "7px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: "4px" }} />
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: "7px", marginTop: "1px" }}>{ac.hoursToService}h kvar till 100h-service</div>
                      </div>

                      <div style={{ borderTop: "1px solid #e2e8f0" }} />

                      {/* Pilot */}
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#64748b" }}>Flygförare</span>
                        <span style={{ fontWeight: "700", color: availPilots > 0 ? "#16a34a" : "#dc2626" }}>
                          {availPilots}/{totalPilots} tillg.
                        </span>
                      </div>

                      {/* Fuel */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                          <span style={{ color: "#64748b" }}>Bränsle (bas)</span>
                          <span style={{ fontWeight: "700", color: fuelColor }}>{Math.round(base.fuel)}%</span>
                        </div>
                        <div style={{ height: "4px", background: "#e2e8f0", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${base.fuel}%`, background: fuelColor, borderRadius: "2px" }} />
                        </div>
                      </div>

                      {/* Engine */}
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#64748b" }}>Motor</span>
                        <span style={{ fontWeight: "700", color: ac.status === "maintenance" || ac.status === "not_mission_capable" ? "#d97706" : "#16a34a" }}>
                          {ac.status === "maintenance" ? "UNDERHÅLL" : ac.status === "not_mission_capable" ? "EJ KLAR" : "OPERATIV"}
                        </span>
                      </div>

                      {/* Flight hours */}
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#64748b" }}>Total flygtid</span>
                        <span style={{ fontWeight: "700" }}>{ac.flightHours}h</span>
                      </div>

                      {/* Mission */}
                      {ac.currentMission && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "#64748b" }}>Aktuellt uppdrag</span>
                          <span style={{ fontWeight: "700", color: "#2563eb" }}>{ac.currentMission}</span>
                        </div>
                      )}
                      {ac.payload && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "#64748b" }}>Beväpning</span>
                          <span style={{ fontWeight: "700" }}>{ac.payload}</span>
                        </div>
                      )}

                      {/* Maintenance */}
                      {ac.maintenanceType && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "#64748b" }}>UH-typ</span>
                          <span style={{ fontWeight: "700", color: "#d97706" }}>{ac.maintenanceType.replace(/_/g, " ")}</span>
                        </div>
                      )}
                      {ac.maintenanceTimeRemaining !== undefined && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "#64748b" }}>UH kvar</span>
                          <span style={{ fontWeight: "700", color: "#d97706" }}>{ac.maintenanceTimeRemaining}h</span>
                        </div>
                      )}

                      <div style={{ borderTop: "1px solid #e2e8f0" }} />

                      {/* Ammo summary */}
                      <div>
                        <div style={{ color: "#64748b", marginBottom: "2px", fontWeight: "700", fontSize: "8px" }}>AMMUNITION (BAS)</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {base.ammunition.map((a) => {
                            const apct = Math.round((a.quantity / a.max) * 100);
                            const aColor = apct < 30 ? "#dc2626" : apct < 60 ? "#d97706" : "#16a34a";
                            return (
                              <span key={a.type} style={{ fontSize: "7px", color: aColor, fontWeight: "700", background: `${aColor}15`, border: `1px solid ${aColor}40`, borderRadius: "3px", padding: "1px 4px" }}>
                                {a.type} {apct}%
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div style={{ borderTop: "1px solid #e2e8f0" }} />

                      {/* UTFALL-CHECK button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setUtfallAcId(ac.id); }}
                        style={{
                          width: "100%",
                          padding: "5px 8px",
                          background: ac.status === "not_mission_capable" ? "#dc2626" : "#005AA0",
                          color: "#fff",
                          border: "none",
                          borderRadius: "5px",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "8px",
                          fontWeight: "900",
                          cursor: "pointer",
                          letterSpacing: "1px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                        }}
                      >
                        🎲 UTFALL-CHECK
                      </button>

                    </div>
                  </div>
                </foreignObject>
              </g>
            );
          })()}
        </svg>
      </div>

      {/* ── UTFALL MODAL ─────────────────────────────────────────── */}
      {utfallAcId && (() => {
        const utfallAc = base.aircraft.find((a) => a.id === utfallAcId);
        if (!utfallAc) return null;
        return (
          <UtfallModal
            aircraft={utfallAc}
            onClose={() => setUtfallAcId(null)}
            onAccept={(outcome: UtfallOutcome) => {
              setUtfallAcId(null);
              setSelectedAcId(null);
              onUtfallOutcome?.(
                utfallAc.id,
                outcome.repairTime,
                outcome.maintenanceTypeKey,
                outcome.weaponLoss,
                outcome.actionType,
              );
            }}
          />
        );
      })()}

      {/* ── BUILDING DETAIL PANEL ────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key={selected}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold font-mono text-foreground">
                  {selected === "apron" && "UPPSTÄLLNINGSPLATS — FLYGPLAN"}
                  {selected === "hangar" && "UNDERHÅLLSHALLAR"}
                  {selected === "fuel" && "BRÄNSLE DEPÅ"}
                  {selected === "ammo" && "AMMUNITION DEPOT"}
                  {selected === "command" && "BASBEFÄL / KOMMANDO HQ"}
                  {selected === "spareparts" && "RESERVDELSFÖRRÅD"}
                </h4>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {selected === "apron" && <ApronDetail base={base} />}
              {selected === "hangar" && <HangarDetail base={base} />}
              {selected === "fuel" && <FuelDetail base={base} />}
              {selected === "ammo" && <AmmoDetail base={base} />}
              {selected === "command" && <CommandDetail base={base} />}
              {selected === "spareparts" && <SparePartsDetail base={base} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Detail sub-panels ─────────────────────────────────────────────────────

function ApronDetail({ base }: { base: Base }) {
  const groups: Record<Aircraft["status"], Aircraft[]> = {
    mission_capable: [],
    on_mission: [],
    maintenance: [],
    not_mission_capable: [],
  };
  base.aircraft.forEach((ac) => groups[ac.status].push(ac));

  return (
    <div className="space-y-3">
      {(["mission_capable", "on_mission", "maintenance", "not_mission_capable"] as const).map((status) => {
        const list = groups[status];
        if (list.length === 0) return null;
        return (
          <div key={status}>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: AC_COLOR[status] }}
              />
              <span className="text-[10px] font-mono text-muted-foreground">
                {AC_LABEL[status]} — {list.length} st
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {list.map((ac) => (
                <span
                  key={ac.id}
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded border"
                  style={{
                    color: AC_COLOR[status],
                    borderColor: `${AC_COLOR[status]}40`,
                    backgroundColor: `${AC_COLOR[status]}10`,
                  }}
                >
                  {ac.tailNumber}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HangarDetail({ base }: { base: Base }) {
  const inMaint = base.aircraft.filter(
    (a) => a.status === "maintenance" || a.status === "not_mission_capable"
  );
  const { total, occupied } = base.maintenanceBays;

  return (
    <div className="space-y-3">
      {/* Bay grid */}
      <div className="flex gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 rounded border p-2 text-center text-[10px] font-mono ${
              i < occupied
                ? "bg-status-yellow/10 border-status-yellow/40 text-status-yellow"
                : "bg-muted border-border text-muted-foreground"
            }`}
          >
            <div className="text-[8px] mb-0.5">BAY {i + 1}</div>
            {i < occupied ? <Wrench className="h-3 w-3 mx-auto" /> : "FRI"}
          </div>
        ))}
      </div>

      {/* Aircraft needing attention */}
      {inMaint.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-mono text-muted-foreground">Flygplan i/behöver underhåll:</p>
          {inMaint.map((ac) => (
            <div key={ac.id} className="flex items-center gap-2 text-[10px] font-mono">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: AC_COLOR[ac.status] }}
              />
              <span className="text-foreground font-bold">{ac.tailNumber}</span>
              <span className="text-muted-foreground">{ac.type}</span>
              {ac.maintenanceType && (
                <span className="text-status-yellow ml-auto">{ac.maintenanceType.replace(/_/g, " ")}</span>
              )}
              {ac.maintenanceTimeRemaining && (
                <span className="text-muted-foreground">{ac.maintenanceTimeRemaining}h kvar</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-status-green font-mono">Alla underhållshallar lediga.</p>
      )}
    </div>
  );
}

function FuelDetail({ base }: { base: Base }) {
  const pct = base.fuel;
  const color = pct > 60 ? "#22c55e" : pct > 30 ? "#eab308" : "#ef4444";
  return (
    <div className="flex items-center gap-6">
      <Fuel className="h-8 w-8 shrink-0" style={{ color }} />
      <div className="flex-1">
        <div className="flex justify-between mb-1.5 text-xs font-mono">
          <span className="text-muted-foreground">Aktuell nivå</span>
          <span style={{ color }} className="font-bold">{pct.toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">
          {pct < 30 && "⚠ KRITISK NIVÅ — Begär påfyllning omedelbart"}
          {pct >= 30 && pct < 60 && "Reducerad kapacitet — planera påfyllning"}
          {pct >= 60 && "Nominell nivå"}
        </p>
      </div>
    </div>
  );
}

function AmmoDetail({ base }: { base: Base }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {base.ammunition.map((a) => {
        const pct = (a.quantity / a.max) * 100;
        const color = pct < 30 ? "#ef4444" : pct < 60 ? "#eab308" : "#22c55e";
        return (
          <div key={a.type} className="bg-muted/30 rounded-lg border border-border p-2.5">
            <div className="flex items-center gap-1.5 mb-2">
              <Package className="h-3.5 w-3.5" style={{ color }} />
              <span className="text-[10px] font-mono font-bold text-foreground">{a.type}</span>
              {pct < 30 && <AlertTriangle className="h-3 w-3 text-status-red ml-auto" />}
            </div>
            <div className="text-lg font-bold font-mono" style={{ color }}>
              {a.quantity}
              <span className="text-[10px] font-normal text-muted-foreground">/{a.max}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1.5">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CommandDetail({ base }: { base: Base }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
      {base.personnel.map((p) => {
        const pct = (p.available / p.total) * 100;
        const color = pct < 50 ? "#ef4444" : pct < 75 ? "#eab308" : "#22c55e";
        return (
          <div key={p.id} className="bg-muted/30 rounded-lg border border-border p-2.5">
            <div className="flex items-center gap-1 mb-1.5">
              <Users className="h-3 w-3 text-muted-foreground" />
              {pct < 50 && <AlertTriangle className="h-3 w-3 text-status-red" />}
            </div>
            <div className="text-[9px] text-muted-foreground font-mono mb-1">{p.role}</div>
            <div className="text-base font-bold font-mono" style={{ color }}>
              {p.available}
              <span className="text-[10px] font-normal text-muted-foreground">/{p.total}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SparePartsDetail({ base }: { base: Base }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {base.spareParts.map((p) => {
        const pct = (p.quantity / p.maxQuantity) * 100;
        const color = pct < 30 ? "#ef4444" : pct < 60 ? "#eab308" : "#22c55e";
        return (
          <div key={p.id} className="bg-muted/30 rounded-lg border border-border p-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-mono text-muted-foreground">{p.category}</span>
              {pct < 30 && <AlertTriangle className="h-3 w-3 text-status-red" />}
            </div>
            <div className="text-[10px] font-bold text-foreground font-mono mb-1.5">{p.name}</div>
            <div className="text-base font-bold font-mono" style={{ color }}>
              {p.quantity}
              <span className="text-[10px] font-normal text-muted-foreground">/{p.maxQuantity}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            {p.resupplyDays > 0 && (
              <div className="text-[9px] text-muted-foreground font-mono mt-1">
                Ledtid: {p.resupplyDays} dagar
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AircraftDetail({ ac }: { ac: Aircraft }) {
  const color = AC_COLOR[ac.status];
  const pct = Math.min(100, (ac.hoursToService / 100) * 100);
  const isCritical = ac.hoursToService < 20;
  const isLow = ac.hoursToService < 40;
  const barColor = isCritical ? "#dc2626" : isLow ? "#d97706" : "#16a34a";

  const statusLabels: Record<Aircraft["status"], string> = {
    mission_capable: "Mission Capable",
    on_mission: "På Uppdrag",
    maintenance: "Underhåll",
    not_mission_capable: "Ej Operativ",
  };

  return (
    <div className="space-y-4">
      {/* Status header */}
      <div className="flex items-center gap-4">
        {/* Aircraft silhouette icon */}
        <svg width="80" height="40" viewBox="-20 -20 80 40">
          <path
            d={`M -15,0 L -12,-2.5 L 10,-1 L 14,0 L 10,1 L -12,2.5 Z`}
            fill={color}
          />
          <polygon points="2,-2 -8,-13 -12,-3 -3,-2" fill={color} opacity="0.88" />
          <polygon points="2,2 -8,13 -12,3 -3,2" fill={color} opacity="0.88" />
          <polygon points="-8,-2 -10,-7 -5,-6 -5,-2" fill={color} opacity="0.82" />
          <polygon points="-8,2 -10,7 -5,6 -5,2" fill={color} opacity="0.82" />
          <rect x="11" y="-2.5" width="4" height="5" rx="2" fill={color} opacity="0.7" />
        </svg>

        <div>
          <div className="text-lg font-black font-mono" style={{ color }}>
            {ac.tailNumber}
          </div>
          <div className="text-xs text-muted-foreground font-mono">{ac.type}</div>
          <div
            className="text-[10px] font-mono font-bold mt-0.5 px-2 py-0.5 rounded-full inline-block border"
            style={{ color, borderColor: `${color}40`, backgroundColor: `${color}10` }}
          >
            {statusLabels[ac.status]}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "TOTAL FLYGTID", value: `${ac.flightHours}h` },
          { label: "TILL SERVICE", value: `${ac.hoursToService}h`, urgent: isCritical || isLow },
          { label: "UPPDRAG", value: ac.currentMission || "—" },
          { label: "UH-TYP", value: ac.maintenanceType ? ac.maintenanceType.replace(/_/g, " ") : "—" },
        ].map((item) => (
          <div key={item.label} className="bg-muted/30 border border-border rounded-lg p-2.5">
            <div className="text-[8px] text-muted-foreground font-mono mb-1">{item.label}</div>
            <div
              className={`text-sm font-black font-mono ${item.urgent ? "" : "text-foreground"}`}
              style={item.urgent ? { color: barColor } : {}}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Remaining life bar */}
      <div>
        <div className="flex justify-between text-[9px] font-mono text-muted-foreground mb-1">
          <span>REMAINING LIFE (till 100h-service)</span>
          <span style={{ color: barColor }} className="font-bold">{ac.hoursToService}h kvar</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: barColor }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        {isCritical && (
          <div className="text-[9px] text-red-600 font-mono mt-1 font-bold">
            ⚠ KRITISK NIVÅ — Ta in för service omedelbart
          </div>
        )}
        {isLow && !isCritical && (
          <div className="text-[9px] text-amber-600 font-mono mt-1">
            Planera service inom kort
          </div>
        )}
      </div>

      {/* Maintenance details if applicable */}
      {(ac.maintenanceType || ac.maintenanceTimeRemaining !== undefined) && (
        <div className="flex gap-4 text-[10px] font-mono bg-amber-50 border border-amber-200/60 rounded-lg p-2.5">
          <Wrench className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            {ac.maintenanceType && (
              <div><span className="text-muted-foreground">Typ: </span><span className="font-bold">{ac.maintenanceType.replace(/_/g, " ")}</span></div>
            )}
            {ac.maintenanceTimeRemaining !== undefined && (
              <div><span className="text-muted-foreground">Tid kvar: </span><span className="font-bold text-amber-700">{ac.maintenanceTimeRemaining}h</span></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
