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
} from "lucide-react";
import { UtfallModal } from "./UtfallModal";
import { MAINTENANCE_CREW_PER_AIRCRAFT } from "@/data/config/capacities";

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
  /** Aircraft IDs whose ATO mission window is active NOW (pulsing orange) */
  overdueAircraftIds?: string[];
  /** Mission label per urgent aircraft ID */
  overdueMissionLabels?: Record<string, string>;
  /** Aircraft IDs assigned to a future ATO mission (steady blue) */
  upcomingAircraftIds?: string[];
  /** "MISSIONTYPE HH:00" label per upcoming aircraft ID */
  upcomingMissionLabels?: Record<string, string>;
}

// Drop zones in SVG coordinate space (viewBox 900×500)
const SVG_ZONES: {
  id: DropZone;
  x: number; y: number; w: number; h: number;
  label: string;
  colorFill: string;
  colorBorder: string;
}[] = [
  { id: "runway",     x: 60,  y: 148, w: 780, h: 62,  label: "STARTA UPPDRAG",    colorFill: "rgba(215,171,58,0.30)",  colorBorder: "#D7AB3A" },
  { id: "hangar",     x: 55,  y: 313, w: 343, h: 125, label: "UNDERHALL / SERVICE", colorFill: "rgba(12,35,76,0.30)",    colorBorder: "#0C234C" },
  { id: "spareparts", x: 200, y: 40,  w: 130, h: 70,  label: "BYTA KOMPONENT",      colorFill: "rgba(217,25,46,0.25)",   colorBorder: "#D9192E" },
  { id: "fuel",       x: 432, y: 372, w: 110, h: 72,  label: "TANKNING",            colorFill: "rgba(12,35,76,0.25)",    colorBorder: "#0C234C" },
  { id: "ammo",       x: 430, y: 318, w: 130, h: 40,  label: "BEVÄPNING",           colorFill: "rgba(217,25,46,0.25)",   colorBorder: "#D9192E" },
];

function getZoneAt(x: number, y: number): DropZone | null {
  for (const z of SVG_ZONES) {
    if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return z.id;
  }
  return null;
}

// Aircraft status colours — SAAB palette
const AC_COLOR: Record<string, string> = {
  ready: "#0C234C",
  allocated: "#1a5a7a",
  in_preparation: "#8a6a1a",
  awaiting_launch: "#2a7a5a",
  on_mission: "#1a4a8a",
  returning: "#5a3a8a",
  recovering: "#8a5a2a",
  under_maintenance: "#D7AB3A",
  unavailable: "#6B7280",
};

const AC_LABEL: Record<string, string> = {
  ready: "MC",
  allocated: "TILL",
  in_preparation: "KLAR",
  awaiting_launch: "VÄNT",
  on_mission: "UPP",
  returning: "RET",
  recovering: "MOTT",
  under_maintenance: "UH",
  unavailable: "NMC",
};

// Plane silhouette color — status + health for ready/allocated aircraft
function getAircraftColor(ac: Aircraft): string {
  const hp = ac.health ?? 100;
  if (ac.status === "ready" || ac.status === "allocated") {
    if (hp < 30) return "#CC2222";   // critical
    if (hp < 60) return "#B06000";   // degraded
  }
  return AC_COLOR[ac.status] ?? "#0C234C";
}

// Aircraft image using Jase_transparent.png, tinted by status color, centered at (cx,cy)
function AircraftImage({ cx, cy, color = "#0C234C", opacity = 1 }: { cx: number; cy: number; color?: string; opacity?: number }) {
  const filterId = `tint-${color.replace('#', '')}`;
  return (
    <image
      href="/Jase_transparent.png"
      x={cx - 26} y={cy - 20}
      width="52" height="40"
      opacity={opacity}
      filter={`url(#${filterId})`}
    />
  );
}

export function BaseMap({ base, onDropAircraft, onUtfallOutcome, overdueAircraftIds = [], overdueMissionLabels = {}, upcomingAircraftIds = [], upcomingMissionLabels = {} }: BaseMapProps) {
  const [selected, setSelected] = useState<BuildingId>(null);
  const [hoveredAc, setHoveredAc] = useState<string | null>(null);
  const [selectedAcId, setSelectedAcId] = useState<string | null>(null);
  const [utfallAcId, setUtfallAcId] = useState<string | null>(null);

  // Pointer-event drag state (SVG-native, no HTML drag API)
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingAcId, setDraggingAcId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [dropZoneHover, setDropZoneHover] = useState<DropZone | null>(null);

  const mc = base.aircraft.filter((a) => a.status === "ready");
  const nmc = base.aircraft.filter((a) => a.status === "unavailable");
  const maint = base.aircraft.filter((a) => a.status === "under_maintenance");
  const onMission = base.aircraft.filter((a) => a.status === "on_mission" || a.status === "returning");

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
  const apronX = 60;
  const apronWidth = 780;
  const apronCols = 12;
  const apronColWidth = apronWidth / apronCols;
  const apronAircraft = base.aircraft
    .filter((a) => a.status === "ready" || a.status === "unavailable")
    .slice(0, apronCols);

  return (
    <div>
      {/* ── SVG MAP ───────────────────────────────────────────────── */}
      <div className="relative w-full overflow-x-auto select-none" style={{ background: "#D7DEE1" }}>

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
          {/* ── Silver terrain background */}
          <rect width="900" height="500" fill="#D7DEE1" />

          {/* Subtle tactical grid */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0C234C" strokeWidth="0.3" opacity="0.15" />
            </pattern>
            {["0C234C","D7AB3A","D9192E","6B7280","1a4a8a","5a3a8a","8a6a1a","2a7a5a","1a5a7a","8a5a2a","B06000","CC2222"].map((hex) => (
              <filter key={hex} id={`tint-${hex}`}>
                <feFlood floodColor={`#${hex}`} result="c" />
                <feComposite in="c" in2="SourceAlpha" operator="in" />
              </filter>
            ))}
          </defs>
          <rect width="900" height="500" fill="url(#grid)" />

          {/* Drag-drop instructions banner */}
          <rect x="20" y="8" width="860" height="22" rx="3" fill="#0C234C" opacity="0.92" />
          <text x="30" y="22" fontSize="9" fill="#D7AB3A" fontFamily="monospace" fontWeight="bold">
            Dra flygplan → Bana (uppdrag) · Hangar (underhall) · Reservdel (byta komponent) · Bränsle · Ammo
          </text>

          {/* ── Perimeter fence */}
          <rect x="20" y="36" width="860" height="446" fill="none" stroke="#0C234C" strokeWidth="1" strokeDasharray="8 4" opacity="0.18" rx="2" />

          {/* ── Taxiway (thin connector strip, no roads) ── */}
          <rect x="60" y="238" width="780" height="10" rx="2" fill="#b0b8c8" opacity="0.7" />
          {/* Taxiway centre-line dashes */}
          <line x1="60" y1="243" x2="840" y2="243" stroke="#D7AB3A" strokeWidth="0.8" strokeDasharray="12 10" opacity="0.45" />

          {/* ── Runway ── */}
          {/* Asphalt base */}
          <rect x="60" y="148" width="780" height="62" rx="3" fill="#5a6070" />
          {/* Centre-line */}
          <line x1="60" y1="179" x2="840" y2="179" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="22 12" opacity="0.9" />
          {/* Threshold marks - left */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={`tl-${i}`} x={72 + i * 14} y={152} width={7} height={16} rx="1" fill="#ffffff" opacity="0.55" />
          ))}
          {/* Threshold marks - right */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={`tr-${i}`} x={810 - i * 14} y={192} width={7} height={16} rx="1" fill="#ffffff" opacity="0.55" />
          ))}
          {/* Runway designation text */}
          <text x="100" y="178" textAnchor="middle" fontSize="10" fill="#D7AB3A" fontFamily="monospace" fontWeight="bold" opacity="0.9">09</text>
          <text x="800" y="200" textAnchor="middle" fontSize="10" fill="#D7AB3A" fontFamily="monospace" fontWeight="bold" opacity="0.9">27</text>
          <text x="450" y="183" textAnchor="middle" fontSize="9" fill="#ffffff" fontFamily="monospace" letterSpacing="4" opacity="0.85">
            LANDNINGSBANA 09/27
          </text>
          {/* PAPI lights at both ends */}
          {[0, 1, 2, 3].map((i) => (
            <rect key={`papi-${i}`} x={62 + i * 6} y={210} width={4} height={5} rx="1"
              fill={i < 2 ? "#D9192E" : "#ffffff"} opacity="0.9" />
          ))}

          {/* (on-mission aircraft shown in PÅ UPPDRAG box below, not on runway) */}

          {/* ── Apron / Parking ── */}
          <rect
            x="60" y="218" width="780" height="90"
            fill={selected === "apron" ? "#c8d4e8" : "#b8c8de"}
            stroke={selected === "apron" ? "#0C234C" : "#8099bb"}
            strokeWidth={selected === "apron" ? 2 : 0.8}
            rx="4"
            style={{ cursor: "pointer" }}
            onClick={(e) => { e.stopPropagation(); toggle("apron"); }}
          />
          {/* Parking bay lines */}
          {Array.from({ length: apronCols + 1 }, (_, i) => (
            <line key={`bay-${i}`} x1={apronX + i * apronColWidth} y1={218} x2={apronX + i * apronColWidth} y2={308}
              stroke="#0C234C" strokeWidth="0.4" opacity="0.25" />
          ))}
          <text x="75" y="230" fontSize="8" fill="#0C234C" fontFamily="monospace" fontWeight="bold" opacity="0.6">UPPSTÄLLNINGSPLATS</text>

          {/* Aircraft icons on apron */}
          {apronAircraft.map((ac, i) => {
            const col = i % apronCols;
            const cx = apronX + (col + 0.5) * apronColWidth;
            const cy = 270; // lowered slightly to align inside the parking bay
            const color = getAircraftColor(ac);
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
                  svgRef.current?.setPointerCapture(e.pointerId);
                  setDraggingAcId(ac.id);
                  setSelectedAcId(null);
                  const pos = screenToSVG(e.clientX, e.clientY);
                  setDragPos(pos);
                  setDropZoneHover(null);
                }}
              >
                {isSelAc && (
                  <ellipse cx={cx} cy={cy} rx="20" ry="15" fill="none" stroke="#D7AB3A" strokeWidth="1.5" strokeDasharray="3 2" />
                )}
                {/* Urgent: mission active NOW — pulsing orange ring + badge */}
                {overdueAircraftIds.includes(ac.id) && (
                  <g>
                    <ellipse cx={cx} cy={cy} rx="22" ry="17" fill="none" stroke="#FF6B00" strokeWidth="2" strokeDasharray="4 2" opacity="0.9">
                      <animate attributeName="stroke-opacity" values="0.9;0.2;0.9" dur="1s" repeatCount="indefinite" />
                    </ellipse>
                    {(() => {
                      const label = overdueMissionLabels[ac.id] ?? "NU!";
                      const bw = Math.max(28, label.length * 5 + 8);
                      return (
                        <>
                          <rect x={cx - bw / 2} y={cy + 14} width={bw} height="11" rx="2.5" fill="#FF6B00" />
                          <text x={cx} y={cy + 22} textAnchor="middle" fontSize="6" fill="white" fontFamily="monospace" fontWeight="bold">{label}</text>
                        </>
                      );
                    })()}
                  </g>
                )}
                {/* Upcoming: future ATO assignment — steady blue badge */}
                {!overdueAircraftIds.includes(ac.id) && upcomingAircraftIds.includes(ac.id) && (
                  <g>
                    <ellipse cx={cx} cy={cy} rx="22" ry="17" fill="none" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
                    {(() => {
                      const label = upcomingMissionLabels[ac.id] ?? "SCHD";
                      const bw = Math.max(32, label.length * 4.5 + 8);
                      return (
                        <>
                          <rect x={cx - bw / 2} y={cy + 14} width={bw} height="11" rx="2.5" fill="#1D4ED8" opacity="0.9" />
                          <text x={cx} y={cy + 22} textAnchor="middle" fontSize="5.5" fill="white" fontFamily="monospace" fontWeight="bold">{label}</text>
                        </>
                      );
                    })()}
                  </g>
                )}
                {/* Tail label */}
                <rect x={cx - 22} y={cy - 35} width="44" height="13" rx="2"
                  fill={color === "#0C234C" ? "#0C234C" : "#fff"} fillOpacity="0.92"
                  stroke={overdueAircraftIds.includes(ac.id) ? "#FF6B00" : color} strokeWidth={overdueAircraftIds.includes(ac.id) ? 1.5 : 0.8} />
                <text x={cx} y={cy - 26} textAnchor="middle" fontSize="6.5"
                  fill={color === "#0C234C" ? "#D7AB3A" : color} fontFamily="monospace" fontWeight="bold">
                  {ac.tailNumber}
                </text>
                <AircraftImage cx={cx} cy={cy} color={color} />
              </g>
            );
          })}

          {/* ── Maintenance Hangars (8, 4×2 grid) ── */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const col = i % 4;
            const row = Math.floor(i / 4);
            const hx = 60 + col * 84;
            const hy = 318 + row * 60;
            const occupied = i < base.maintenanceBays.occupied;
            const isSel = selected === "hangar";
            const isHangarHot = dropZoneHover === "hangar";
            return (
              <g key={i} style={{ cursor: "pointer" }}
                onClick={(e) => { if (!draggingAcId) { e.stopPropagation(); toggle("hangar"); } }}>
                {/* Hangar body */}
                <rect x={hx} y={hy} width="78" height="52" rx="3"
                  fill={isHangarHot ? "#D7AB3A22" : occupied ? "#D7AB3A15" : "#0C234C0a"}
                  stroke={isHangarHot ? "#D7AB3A" : isSel ? "#0C234C" : occupied ? "#D7AB3A" : "#0C234C55"}
                  strokeWidth={isHangarHot || isSel ? 2 : 1} />
                {/* Roof ridge */}
                <line x1={hx + 39} y1={hy} x2={hx + 39} y2={hy + 24} stroke="#0C234C" strokeWidth="0.5" opacity="0.3" />
                {/* Door */}
                <rect x={hx + 16} y={hy + 26} width="46" height="24" rx="1"
                  fill={occupied ? "#D7AB3A20" : "#0C234C08"}
                  stroke={occupied ? "#D7AB3A80" : "#0C234C30"} strokeWidth="0.8" />
                <text x={hx + 39} y={hy + 12} textAnchor="middle" fontSize="7"
                  fill={occupied ? "#0C234C" : "#0C234C80"} fontFamily="monospace" fontWeight="bold">
                  H{i + 1}
                </text>
                {occupied && (
                  <circle cx={hx + 66} cy={hy + 8} r="4" fill="#D7AB3A" opacity="0.9">
                    <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}
          <text x="228" y="314" textAnchor="middle" fontSize="7" fill="#0C234C" fontFamily="monospace" fontWeight="bold" opacity="0.7">UNDERHÅLLSHALLAR</text>

          {/* ── Maintenance aircraft inside hangars ── */}
          {maint.slice(0, 8).map((ac, i) => {
            const col = i % 4;
            const row = Math.floor(i / 4);
            const hx = 60 + col * 84;
            const hy = 318 + row * 60;
            const mx = hx + 39, my = hy + 38;
            return (
              <g key={`maint-${ac.id}`}
                onMouseEnter={() => setHoveredAc(ac.id)}
                onMouseLeave={() => setHoveredAc(null)}>
                <AircraftImage cx={mx} cy={my} color="#D7AB3A" opacity={0.75} />
              </g>
            );
          })}

          {/* ── Fuel Depot ── */}
          {(() => {
            const isSel = selected === "fuel";
            const fuelPct = base.fuel / 100;
            const fuelColor = base.fuel > 60 ? "#0C234C" : base.fuel > 30 ? "#D7AB3A" : "#D9192E";
            const fuelX = 432;
            const fuelY = 372;
            return (
              <g style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); toggle("fuel"); }}>
                <rect x={fuelX} y={fuelY} width="110" height="72" rx="3"
                  fill={isSel ? "#D7AB3A10" : "#0C234C08"}
                  stroke={isSel ? "#D7AB3A" : fuelColor + "60"}
                  strokeWidth={isSel ? 2 : 1} />
                {/* Tanks */}
                {(() => {
                  const tank1Cx = fuelX + 36;
                  const tank2Cx = fuelX + 74;
                  const tankCy = fuelY + 27;
                  const fillW = 34;
                  const fillX = (cx: number) => cx - fillW / 2;
                  return (
                    <>
                      <circle cx={tank1Cx} cy={tankCy} r="18" fill="#D7DEE1" stroke={fuelColor} strokeWidth="1" opacity="0.85" />
                      <circle cx={tank2Cx} cy={tankCy} r="18" fill="#D7DEE1" stroke={fuelColor} strokeWidth="1" opacity="0.85" />
                      <clipPath id="fuelClip1"><circle cx={tank1Cx} cy={tankCy} r="17" /></clipPath>
                      <rect x={fillX(tank1Cx)} y={tankCy + 17 - 34 * fuelPct} width={fillW} height={34 * fuelPct} fill={fuelColor} opacity="0.45" clipPath="url(#fuelClip1)" />
                      <clipPath id="fuelClip2"><circle cx={tank2Cx} cy={tankCy} r="17" /></clipPath>
                      <rect x={fillX(tank2Cx)} y={tankCy + 17 - 34 * fuelPct} width={fillW} height={34 * fuelPct} fill={fuelColor} opacity="0.45" clipPath="url(#fuelClip2)" />
                    </>
                  );
                })()}
                <text x={fuelX + 36} y={fuelY + 29} textAnchor="middle" fontSize="6.5" fill={fuelColor} fontFamily="monospace" fontWeight="bold">{Math.round(base.fuel)}%</text>
                <text x={fuelX + 74} y={fuelY + 29} textAnchor="middle" fontSize="6.5" fill={fuelColor} fontFamily="monospace" fontWeight="bold">{Math.round(base.fuel)}%</text>
                <text x={fuelX + 55} y={fuelY + 56} textAnchor="middle" fontSize="7" fill="#0C234C" fontFamily="monospace" fontWeight="bold">BRÄNSLE DEPÅ</text>
              </g>
            );
          })()}

          {/* ── Ammo Depot ── */}
          {(() => {
            const isSel = selected === "ammo";
            const totalAmmo = base.ammunition.reduce((s, a) => s + a.quantity, 0);
            const maxAmmo   = base.ammunition.reduce((s, a) => s + a.max, 0);
            const critical  = totalAmmo / maxAmmo < 0.3;
            return (
              <g style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); toggle("ammo"); }}>
                {[0, 1, 2].map((j) => (
                  <polygon key={j}
                    points={`${430 + j * 40},320 ${464 + j * 40},320 ${456 + j * 40},350 ${438 + j * 40},350`}
                    fill={isSel ? "#D9192E10" : "#0C234C08"}
                    stroke={critical ? "#D9192E" : isSel ? "#D9192E" : "#0C234C55"}
                    strokeWidth={isSel ? 2 : 1} />
                ))}
                {[0, 1, 2].map((j) => (
                  <rect key={j} x={441 + j * 40} y={335} width="12" height="15" rx="1"
                    fill="#D7DEE1" stroke="#0C234C55" strokeWidth="0.5" />
                ))}
                {critical && (
                  <circle cx="550" cy="325" r="5" fill="#D9192E">
                    <animate attributeName="opacity" values="1;0.2;1" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
                <text x="487" y="362" textAnchor="middle" fontSize="7" fill="#0C234C" fontFamily="monospace" fontWeight="bold">AMMUNITION DEPÅ</text>
              </g>
            );
          })()}

          {/* ── På Uppdrag Box ── */}
          {(() => {
            const boxX = 585, boxY = 333, boxW = 255, boxH = 135;
            const cols = 4;
            return (
              <g>
                <rect x={boxX} y={boxY} width={boxW} height={boxH} rx="4"
                  fill="#0a1d3e" stroke="#1a4a8a" strokeWidth="1.5" opacity="0.95" />
                <rect x={boxX} y={boxY} width={boxW} height={16} rx="4"
                  fill="#1a3a6a" />
                <text x={boxX + boxW / 2} y={boxY + 11} textAnchor="middle" fontSize="8"
                  fill="#D7AB3A" fontFamily="monospace" fontWeight="bold" letterSpacing="2">
                  PÅ UPPDRAG ({onMission.length})
                </text>
                {onMission.length === 0 && (
                  <text x={boxX + boxW / 2} y={boxY + 90} textAnchor="middle" fontSize="8"
                    fill="#5566aa" fontFamily="monospace">— inga aktiva uppdrag —</text>
                )}
                {onMission.slice(0, 16).map((ac, i) => {
                  const col = i % cols;
                  const row = Math.floor(i / cols);
                  const cx = boxX + 32 + col * 60;
                  const cy = boxY + 42 + row * 50;
                  const isRet = ac.status === "returning";
                  const color = isRet ? "#5a3a8a" : "#1a4a8a";
                  return (
                    <g key={`uppdrag-${ac.id}`}
                      onMouseEnter={() => setHoveredAc(ac.id)}
                      onMouseLeave={() => setHoveredAc(null)}
                    >
                      <AircraftImage cx={cx} cy={cy} color={color} opacity={isRet ? 0.7 : 1} />
                      {/* Returning indicator */}
                      {isRet && (
                        <text x={cx} y={cy - 18} textAnchor="middle" fontSize="7" fill="#aa88ff" fontFamily="monospace">↩</text>
                      )}
                      {/* Tail number label */}
                      <rect x={cx-17} y={cy+8} width="34" height="11" rx="2"
                        fill={color} fillOpacity="0.9" />
                      <text x={cx} y={cy+16} textAnchor="middle" fontSize="6"
                        fill="#D7AB3A" fontFamily="monospace" fontWeight="bold">{ac.tailNumber}</text>
                      {/* Hover tooltip */}
                      {hoveredAc === ac.id && (
                        <g>
                          <rect x={cx-20} y={cy-34} width="40" height="13" rx="2" fill="#0C234C" opacity="0.95" />
                          <text x={cx} y={cy-24} textAnchor="middle" fontSize="7" fill="#D7AB3A" fontFamily="monospace">
                            {isRet ? "Återvänder" : ac.currentMission ?? "UPP"}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })()}

          {/* ── Command HQ ── */}
          {(() => {
            const isSel = selected === "command";
            return (
              <g style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); toggle("command"); }}>
                <rect x="60" y="40" width="110" height="70" rx="4"
                  fill={isSel ? "#D7AB3A15" : "#0C234C0e"}
                  stroke={isSel ? "#D7AB3A" : "#0C234C60"}
                  strokeWidth={isSel ? 2 : 1} />
                {/* Antenna */}
                <line x1="115" y1="40" x2="115" y2="24" stroke="#D7AB3A" strokeWidth="1.5" />
                <line x1="106" y1="28" x2="124" y2="28" stroke="#D7AB3A" strokeWidth="1" />
                <circle cx="115" cy="24" r="2.5" fill="#D7AB3A" opacity="0.9">
                  <animate attributeName="opacity" values="0.9;0.3;0.9" dur="3s" repeatCount="indefinite" />
                </circle>
                {[0, 1, 2, 3].map((j) => (
                  <rect key={j} x={70 + j * 24} y={58} width="14" height="10" rx="1"
                    fill="#D7AB3A22" stroke="#0C234C40" strokeWidth="0.5" />
                ))}
                <rect x="103" y="80" width="24" height="28" rx="1" fill="#0C234C15" stroke="#0C234C40" strokeWidth="0.6" />
                <text x="115" y="52" textAnchor="middle" fontSize="7" fill="#0C234C" fontFamily="monospace" fontWeight="bold">BAS-HQ</text>
              </g>
            );
          })()}

          {/* ── Spare Parts Store ── */}
          {(() => {
            const isSel = selected === "spareparts";
            const critical = base.spareParts.some((p) => p.quantity / p.maxQuantity < 0.3);
            return (
              <g style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); toggle("spareparts"); }}>
                <rect x="200" y="40" width="130" height="70" rx="3"
                  fill={isSel ? "#D7AB3A12" : "#0C234C08"}
                  stroke={critical ? "#D9192E" : isSel ? "#D7AB3A" : "#0C234C50"}
                  strokeWidth={isSel ? 2 : 1} />
                {[0, 1, 2].map((j) => (
                  <line key={j} x1="212" y1={55 + j * 14} x2="318" y2={55 + j * 14}
                    stroke="#0C234C" strokeWidth="0.5" opacity="0.2" />
                ))}
                <rect x="245" y="95" width="40" height="15" rx="1" fill="#D7DEE1" stroke="#0C234C30" strokeWidth="0.5" />
                {critical && (
                  <circle cx="320" cy="47" r="5" fill="#D9192E">
                    <animate attributeName="opacity" values="1;0.2;1" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
                <text x="265" y="52" textAnchor="middle" fontSize="7" fill="#0C234C" fontFamily="monospace" fontWeight="bold">RESERVDELS-</text>
                <text x="265" y="62" textAnchor="middle" fontSize="7" fill="#0C234C" fontFamily="monospace" fontWeight="bold">FÖRRÅD</text>
              </g>
            );
          })()}

          {/* ── Personnel barracks ── */}
          <g>
            <rect x="370" y="40" width="110" height="70" rx="3"
              fill="#0C234C0a" stroke="#0C234C45" strokeWidth="1" />
            {[0, 1, 2].map((row) =>
              [0, 1, 2, 3].map((col) => (
                <rect key={`${row}-${col}`}
                  x={380 + col * 22} y={50 + row * 16}
                  width="14" height="9" rx="1"
                  fill="#D7DEE1" stroke="#0C234C25" strokeWidth="0.5" />
              ))
            )}
            <text x="425" y="120" textAnchor="middle" fontSize="7" fill="#0C234C" fontFamily="monospace" fontWeight="bold" opacity="0.7">FÖRLÄGGNING</text>
          </g>

          {/* NO ROADS — only taxiway strip drawn above */}

          {/* ── Legend (SAAB styled) ── */}
          <g>
            <rect x="656" y="38" width="184" height="105" rx="4"
              fill="#0C234C" opacity="0.92" />
            <rect x="656" y="38" width="184" height="5" rx="2"
              fill="#D7AB3A" />
            <text x="748" y="53" textAnchor="middle" fontSize="8" fill="#D7AB3A"
              fontFamily="monospace" fontWeight="bold" letterSpacing="2">LEGEND</text>
            {[
              { color: "#0C234C", label: "Operativ" },
              { color: "#B06000", label: "Degraderad (< 60%)" },
              { color: "#CC2222", label: "Kritisk (< 30%)" },
              { color: "#D7AB3A", label: "Underhåll" },
              { color: "#6B7280", label: "Ej operativ" },
            ].map((item, i) => (
              <g key={i}>
                <circle cx="675" cy={62 + i * 17} r="4.5" fill={item.color} />
                <text x="688" y={66 + i * 17} fontSize="8" fill="#D7DEE1"
                  fontFamily="monospace">{item.label}</text>
              </g>
            ))}
          </g>

          {/* ── Status bar (bottom) ── */}
          <rect x="20" y="470" width="860" height="20" rx="3" fill="#0C234C" opacity="0.88" />
          <rect x="20" y="470" width="860" height="2" rx="1" fill="#D7AB3A" opacity="0.7" />
          <text x="40" y="483" fontSize="8" fill="#D7AB3A" fontFamily="monospace" fontWeight="bold">MC: {mc.length}</text>
          <text x="105" y="483" fontSize="8" fill="#7aaef0" fontFamily="monospace">UPP: {onMission.length}</text>
          <text x="175" y="483" fontSize="8" fill="#D7AB3A" fontFamily="monospace">UH: {maint.length}</text>
          <text x="235" y="483" fontSize="8" fill="#D9192E" fontFamily="monospace">NMC: {nmc.length}</text>
          <text x="330" y="483" fontSize="8" fill="#D7DEE1" fontFamily="monospace">
            BRÄNSLE: {Math.round(base.fuel)}% · UH-PLATSER: {base.maintenanceBays.occupied}/{base.maintenanceBays.total}
          </text>
          <text x="840" y="483" textAnchor="end" fontSize="8" fill="#D7AB3A" fontFamily="monospace" fontWeight="bold">
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
                <AircraftImage cx={gx} cy={gy} color={gc} />
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
            const cx = 60 + (col + 0.5) * (780 / cols);
            const cy = 263;

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
                          <span style={{ color: "#64748b", fontWeight: "700", fontSize: "8px" }}>ÅTERSTÅENDE LIVSLÄNGD</span>
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
                        <span style={{ fontWeight: "700", color: ac.status === "under_maintenance" || ac.status === "unavailable" ? "#d97706" : "#16a34a" }}>
                          {ac.status === "under_maintenance" ? "UNDERHÅLL" : ac.status === "unavailable" ? "EJ KLAR" : "OPERATIV"}
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
                          background: ac.status === "unavailable" ? "#dc2626" : "#005AA0",
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

          {/* ── Apron hover panel — rendered LAST so it floats above everything ── */}
          {hoveredAc && (() => {
            const acIdx = apronAircraft.findIndex((a) => a.id === hoveredAc);
            if (acIdx < 0) return null;
            const ac = apronAircraft[acIdx];
            const col = acIdx % apronCols;
            const cx = apronX + (col + 0.5) * apronColWidth;
            const cy = 270;
            const color = getAircraftColor(ac);
            const hp = ac.health ?? 100;
            const hColor = hp > 70 ? "#1F5C2A" : hp > 30 ? "#B06000" : "#CC2222";
            const hpTextColor = hp > 70 ? "#ffffff" : "#000000";
            const panelW = 110, panelH = 68;
            const px = cx + panelW + 6 > 870 ? cx - panelW - 6 : cx + 6;
            const py = cy - panelH - 4;
            const statusText =
              ac.status === "ready" ? "Operativ" :
              ac.status === "unavailable" ? "Ej operativ (NMC)" :
              ac.status === "under_maintenance" ? `Service – ${ac.maintenanceTimeRemaining ?? "?"}h kvar` :
              ac.status === "on_mission" ? "På uppdrag" :
              ac.status === "returning" ? "Återvänder" : ac.status;
            return (
              <g style={{ pointerEvents: "none" }}>
                <rect x={px} y={py} width={panelW} height={panelH} rx="4"
                  fill="#0C234C" opacity="0.96" stroke="#D7AB3A" strokeWidth="0.8" />
                <text x={px + 5} y={py + 11} fontSize="6.5" fill="#D7AB3A" fontFamily="monospace" fontWeight="bold">HÄLSA</text>
                <rect x={px + 5} y={py + 14} width={panelW - 10} height={6} rx="1.5" fill="rgba(0,0,0,0.5)" />
                <rect x={px + 5} y={py + 14} width={Math.max(0, (panelW - 10) * (hp / 100))} height={6} rx="1.5" fill={hColor} />
                <text x={px + panelW - 5} y={py + 20} textAnchor="end" fontSize="6" fill={hpTextColor} fontFamily="monospace" fontWeight="bold">{hp}</text>
                <text x={px + 5} y={py + 33} fontSize="6.5" fill="#8899bb" fontFamily="monospace">BRÄNSLE: <tspan fill="#D7DEE1" fontWeight="bold">{Math.round(base.fuel)}%</tspan></text>
                <text x={px + 5} y={py + 45} fontSize="6" fill="#8899bb" fontFamily="monospace">LAST: <tspan fill="#D7DEE1">{ac.payload ?? "–"}</tspan></text>
                <text x={px + 5} y={py + 57} fontSize="6" fill="#8899bb" fontFamily="monospace">
                  <tspan fill={color === "#D9192E" ? "#ff6655" : color === "#D7AB3A" ? "#D7AB3A" : "#aaccff"}>{statusText}</tspan>
                </text>
              </g>
            );
          })()}

          {/* ── Maintenance hover panel — rendered LAST so it floats above everything ── */}
          {hoveredAc && (() => {
            const ac = maint.find((a) => a.id === hoveredAc);
            if (!ac) return null;
            const idx = maint.findIndex((a) => a.id === hoveredAc);
            const col = idx % 4;
            const row = Math.floor(idx / 4);
            const hx = 60 + col * 84;
            const hy = 318 + row * 60;
            const mx = hx + 39, my = hy + 38;
            const pW = 138, pH = 110;
            const px = mx + 14 + pW > 870 ? mx - pW - 6 : mx + 14;
            const py = my - pH - 6;
            const hp = ac.health ?? 0;
            const hColor = hp > 70 ? "#1F5C2A" : hp > 30 ? "#B06000" : "#CC2222";
            const maintLabels: Record<string, string> = {
              quick_lru:         "Snabb LRU-byte",
              complex_lru:       "Komplex LRU-byte",
              direct_repair:     "Direktreparation",
              troubleshooting:   "Felsökning",
              scheduled_service: "Periodisk service",
            };
            const faultLabel = ac.maintenanceType ? (maintLabels[ac.maintenanceType] ?? ac.maintenanceType) : "–";
            const hoursLeft = ac.maintenanceTimeRemaining ?? "?";
            const crew: { role: string; count: number }[] = [
              { role: "Mekaniker",  count: MAINTENANCE_CREW_PER_AIRCRAFT["mech"] ?? 0 },
              { role: "Tekniker",   count: MAINTENANCE_CREW_PER_AIRCRAFT["tech"] ?? 0 },
              { role: "Vapensmed",  count: MAINTENANCE_CREW_PER_AIRCRAFT["arms"] ?? 0 },
            ].filter((c) => c.count > 0);
            return (
              <g style={{ pointerEvents: "none" }}>
                <rect x={px} y={py} width={pW} height={pH} rx="4"
                  fill="#0C234C" opacity="0.97" stroke="#D7AB3A" strokeWidth="0.8" />
                <text x={px + pW / 2} y={py + 10} textAnchor="middle" fontSize="7.5" fill="#D7AB3A" fontFamily="monospace" fontWeight="bold">{ac.tailNumber} — SERVICE</text>
                <line x1={px + 4} y1={py + 14} x2={px + pW - 4} y2={py + 14} stroke="#D7AB3A" strokeWidth="0.4" opacity="0.5" />
                <text x={px + 5} y={py + 24} fontSize="6" fill="#8899bb" fontFamily="monospace">FELTYP:</text>
                <text x={px + 38} y={py + 24} fontSize="6" fill="#D7DEE1" fontFamily="monospace" fontWeight="bold">{faultLabel}</text>
                <text x={px + 5} y={py + 35} fontSize="6" fill="#8899bb" fontFamily="monospace">TIMMAR KVAR:</text>
                <text x={px + 68} y={py + 35} fontSize="6" fill={typeof hoursLeft === "number" && hoursLeft <= 2 ? "#D9192E" : "#D7AB3A"} fontFamily="monospace" fontWeight="bold">{hoursLeft}h</text>
                <text x={px + 5} y={py + 46} fontSize="6" fill="#8899bb" fontFamily="monospace">HÄLSA:</text>
                <rect x={px + 36} y={py + 40} width={pW - 41} height={5} rx="1.5" fill="rgba(0,0,0,0.5)" />
                <rect x={px + 36} y={py + 40} width={Math.max(0, (pW - 41) * (hp / 100))} height={5} rx="1.5" fill={hColor} />
                <text x={px + pW - 4} y={py + 46} textAnchor="end" fontSize="5.5" fill="#aaa" fontFamily="monospace">{hp}</text>
                <line x1={px + 4} y1={py + 52} x2={px + pW - 4} y2={py + 52} stroke="#D7AB3A" strokeWidth="0.3" opacity="0.4" />
                <text x={px + 5} y={py + 62} fontSize="6.5" fill="#D7AB3A" fontFamily="monospace" fontWeight="bold">PERSONAL I TJÄNST</text>
                {crew.map((c, ci) => (
                  <g key={c.role}>
                    <text x={px + 10} y={py + 73 + ci * 12} fontSize="6" fill="#8899bb" fontFamily="monospace">• {c.role}:</text>
                    <text x={px + pW - 5} y={py + 73 + ci * 12} textAnchor="end" fontSize="6" fill="#D7DEE1" fontFamily="monospace" fontWeight="bold">{c.count} st</text>
                  </g>
                ))}
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
            onAccept={(outcome) => {
              setUtfallAcId(null);
              setSelectedAcId(null);
              onUtfallOutcome?.(
                utfallAc.id,
                outcome.repairTime,
                outcome.maintenanceTypeKey,
                outcome.weaponLoss,
                outcome.actionLabel,
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
                  {selected === "ammo" && "AMMUNITION DEPÅ"}
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
  const groups: Record<string, Aircraft[]> = {};
  base.aircraft.forEach((ac) => {
    if (!groups[ac.status]) groups[ac.status] = [];
    groups[ac.status].push(ac);
  });

  return (
    <div className="space-y-3">
      {(["ready", "allocated", "in_preparation", "awaiting_launch", "on_mission", "returning", "recovering", "under_maintenance", "unavailable"] as const).map((status) => {
        const list = groups[status] ?? [];
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
    (a) => a.status === "under_maintenance" || a.status === "unavailable"
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

