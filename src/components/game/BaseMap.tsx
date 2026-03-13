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
  { id: "hangar",     x: 55,  y: 358, w: 240, h: 200, label: "🔧  UNDERHÅLL / SERVICE", colorFill: "rgba(12,35,76,0.30)",    colorBorder: "#0C234C" },
  { id: "spareparts", x: 200, y: 40,  w: 130, h: 70,  label: "📦  SNABB LRU-REP",      colorFill: "rgba(217,25,46,0.25)",   colorBorder: "#D9192E" },
  { id: "fuel",       x: 285, y: 358, w: 145, h: 115, label: "⛽  TANKNING",            colorFill: "rgba(12,35,76,0.25)",    colorBorder: "#0C234C" },
  { id: "ammo",       x: 440, y: 358, w: 160, h: 95,  label: "💣  BEVÄPNING",           colorFill: "rgba(217,25,46,0.25)",   colorBorder: "#D9192E" },
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
  // Runway drop → auto Utfall roll
  const [pendingRunwayAcId, setPendingRunwayAcId] = useState<string | null>(null);
  // Hangar capacity warning
  const [hangarFullWarning, setHangarFullWarning] = useState(false);

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
      y: ((clientY - rect.top) / rect.height) * 600,
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
    const acId = draggingAcId;

    setDraggingAcId(null);
    setDragPos(null);
    setDropZoneHover(null);

    if (!zone) return;

    if (zone === "runway") {
      // Intercept: show Utfall roll before confirming mission
      setPendingRunwayAcId(acId);
      return;
    }

    if (zone === "hangar") {
      // Enforce max-4 limit (only planes not already in maintenance count)
      if (maint.length >= 4) {
        setHangarFullWarning(true);
        return;
      }
    }

    onDropAircraft(acId, zone);
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
      <div className="relative w-full overflow-x-auto select-none" style={{ background: "#D7DEE1" }}>

        <svg
          ref={svgRef}
          viewBox="0 0 900 600"
          className="w-full relative z-0"
          style={{ minWidth: 600, cursor: draggingAcId ? "grabbing" : "default", touchAction: "none" }}
          onClick={() => { if (!draggingAcId) { setSelected(null); setSelectedAcId(null); } }}
          onPointerMove={handleSVGPointerMove}
          onPointerUp={handleSVGPointerUp}
          onPointerLeave={cancelDrag}
        >
          {/* ── Silver terrain background */}
          <rect width="900" height="600" fill="#D7DEE1" />

          {/* Subtle tactical grid */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0C234C" strokeWidth="0.3" opacity="0.15" />
            </pattern>
          </defs>
          <rect width="900" height="600" fill="url(#grid)" />

          {/* Drag-drop instructions banner */}
          <rect x="20" y="8" width="860" height="22" rx="3" fill="#0C234C" opacity="0.92" />
          <text x="30" y="22" fontSize="9" fill="#D7AB3A" fontFamily="monospace" fontWeight="bold">
            💡 Dra flygplan → Bana (✈️ uppdrag) · Hangar (🔧 underhåll) · Reservdel (📦 LRU 2h) · Bränsle (⛽) · Ammo (💣)
          </text>

          {/* ── Perimeter fence */}
          <rect x="20" y="36" width="860" height="546" fill="none" stroke="#0C234C" strokeWidth="1" strokeDasharray="8 4" opacity="0.18" rx="2" />

          {/* ── Taxiway (thin connector strip, no roads) ── */}
          <rect x="60" y="238" width="780" height="10" rx="2" fill="#b0b8c8" opacity="0.7" />
          {/* Taxiway centre-line dashes */}
          <line x1="60" y1="243" x2="840" y2="243" stroke="#D7AB3A" strokeWidth="0.8" strokeDasharray="12 10" opacity="0.45" />

          {/* ── Runway ── */}
          {/* Asphalt base */}
          <rect x="60" y="148" width="780" height="62" rx="3" fill="#5a6070" />
          {/* Runway edge stripes */}
          <rect x="60" y="148" width="780" height="4" rx="2" fill="#D7AB3A" opacity="0.6" />
          <rect x="60" y="206" width="780" height="4" rx="2" fill="#D7AB3A" opacity="0.6" />
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

          {/* ── On-mission aircraft rendered ON the runway ── */}
          {onMission.map((ac, i) => {
            const spacing = onMission.length <= 10 ? 75 : Math.floor(700 / onMission.length);
            const rx = 95 + i * spacing;
            const ry = 192;
            const color = "#1a4a8a";
            return (
              <g key={`mission-${ac.id}`}
                onMouseEnter={() => setHoveredAc(ac.id)}
                onMouseLeave={() => setHoveredAc(null)}
              >
                <GripenShape cx={rx} cy={ry} color={color} />
                {/* Speed lines */}
                <line x1={rx+15} y1={ry-1} x2={rx+24} y2={ry-1} stroke="#D7AB3A" strokeWidth="0.8" opacity="0.7" />
                <line x1={rx+15} y1={ry+1} x2={rx+24} y2={ry+1} stroke="#D7AB3A" strokeWidth="0.8" opacity="0.7" />
                {hoveredAc === ac.id && (
                  <g>
                    <rect x={rx-18} y={ry-22} width="36" height="11" rx="2" fill="#0C234C" opacity="0.9" />
                    <text x={rx} y={ry-14} textAnchor="middle" fontSize="7" fill="#D7AB3A" fontFamily="monospace" fontWeight="bold">{ac.tailNumber}</text>
                  </g>
                )}
              </g>
            );
          })}

          {/* ── Apron / Parking ── */}
          <rect
            x="60" y="218" width="780" height="130"
            fill={selected === "apron" ? "#c8d4e8" : "#b8c8de"}
            stroke={selected === "apron" ? "#0C234C" : "#8099bb"}
            strokeWidth={selected === "apron" ? 2 : 0.8}
            rx="4"
            style={{ cursor: "pointer" }}
            onClick={(e) => { e.stopPropagation(); toggle("apron"); }}
          />
          {/* Parking bay lines */}
          {[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map((i) => (
            <line key={`bay-${i}`} x1={80 + i * 46} y1={218} x2={80 + i * 46} y2={348}
              stroke="#0C234C" strokeWidth="0.4" opacity="0.25" />
          ))}
          <text x="75" y="230" fontSize="8" fill="#0C234C" fontFamily="monospace" fontWeight="bold" opacity="0.7">UPPSTÄLLNINGSPLATS</text>
          {/* Row separator */}
          <line x1="65" y1="281" x2="835" y2="281" stroke="#0C234C" strokeWidth="0.5" strokeDasharray="6 4" opacity="0.20" />

          {/* Aircraft icons on apron */}
          {apronAircraft.map((ac, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const cx = 80 + col * 46;
            const cy = 252 + row * 60;
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
                  <ellipse cx={cx} cy={cy} rx="16" ry="12" fill="none" stroke="#D7AB3A" strokeWidth="1.5" strokeDasharray="3 2" />
                )}
                <ellipse cx={cx} cy={cy + 1.5} rx="13" ry="5" fill="rgba(0,0,0,0.10)" />
                <GripenShape cx={cx} cy={cy} color={color} />
                {/* Battery bar */}
                {(() => {
                  const battPct = Math.min(1, ac.hoursToService / 100);
                  const battColor = ac.hoursToService <= 20 ? "#D9192E" : ac.hoursToService < 50 ? "#D7AB3A" : "#0C234C";
                  const bX = cx - 11, bY = cy + 15, bW = 22, bH = 5;
                  return (
                    <g>
                      <rect x={bX} y={bY} width={bW} height={bH} rx={1.5} fill="rgba(255,255,255,0.5)" stroke="#0C234C" strokeWidth={0.6} opacity={0.7} />
                      <rect x={bX + bW} y={bY + 1.2} width={2} height={bH - 2.4} rx={0.5} fill="#0C234C" opacity={0.5} />
                      <rect x={bX + 1} y={bY + 1} width={Math.max(0, (bW - 2) * battPct)} height={bH - 2} rx={1} fill={battColor} />
                    </g>
                  );
                })()}
                {/* Label */}
                <g>
                  <rect x={cx - 18} y={cy - 28} width="36" height="13" rx="2"
                    fill={color === "#0C234C" ? "#0C234C" : "#fff"} fillOpacity="0.92"
                    stroke={color} strokeWidth="0.8" />
                  <text x={cx} y={cy - 19} textAnchor="middle" fontSize="6.5"
                    fill={color === "#0C234C" ? "#D7AB3A" : color} fontFamily="monospace" fontWeight="bold">
                    {ac.tailNumber}
                  </text>
                </g>
              </g>
            );
          })}

          {/* ── Maintenance Hangars section ── */}
          {/* Section background + header band */}
          <rect x="55" y="358" width="240" height="202" rx="5"
            fill="rgba(12,35,76,0.07)" stroke="#0C234C" strokeWidth="1.5" strokeDasharray="5 3" />
          <rect x="55" y="358" width="240" height="20" rx="4"
            fill="#0C234C" opacity="0.90" />
          <text x="175" y="371" textAnchor="middle" fontSize="9" fill="#D7AB3A"
            fontFamily="monospace" fontWeight="bold" letterSpacing="1.5">UNDERHÅLLSHALLAR</text>

          {[0, 1, 2, 3].map((i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const hx = 62 + col * 117;
            const hy = 382 + row * 90;
            const occupied = i < base.maintenanceBays.occupied;
            const isSel = selected === "hangar";
            const isHangarHot = dropZoneHover === "hangar";
            return (
              <g key={i} style={{ cursor: "pointer" }}
                onClick={(e) => { if (!draggingAcId) { e.stopPropagation(); toggle("hangar"); } }}>
                {/* Hangar body */}
                <rect x={hx} y={hy} width="108" height="82" rx="4"
                  fill={isHangarHot ? "rgba(215,171,58,0.22)" : occupied ? "rgba(215,171,58,0.14)" : "rgba(12,35,76,0.08)"}
                  stroke={isHangarHot ? "#D7AB3A" : isSel ? "#0C234C" : occupied ? "#D7AB3A" : "#0C234C"}
                  strokeWidth={isHangarHot ? 3 : isSel ? 2.5 : occupied ? 2 : 1.5} />
                {/* Roof ridge line */}
                <line x1={hx + 54} y1={hy} x2={hx + 54} y2={hy + 38} stroke="#0C234C" strokeWidth="0.8" opacity="0.4" />
                {/* Horizontal eave */}
                <line x1={hx} y1={hy + 12} x2={hx + 108} y2={hy + 12} stroke="#0C234C" strokeWidth="0.5" opacity="0.3" />
                {/* Door opening */}
                <rect x={hx + 16} y={hy + 40} width="76" height="42" rx="2"
                  fill={occupied ? "rgba(215,171,58,0.18)" : "rgba(12,35,76,0.05)"}
                  stroke={occupied ? "#D7AB3A" : "#0C234C"} strokeWidth={occupied ? 1.5 : 1} />
                {/* Hangar ID label */}
                <text x={hx + 54} y={hy + 28} textAnchor="middle" fontSize="12"
                  fill={occupied ? "#0C234C" : "#0C234C"} fontFamily="monospace" fontWeight="bold"
                  opacity={occupied ? 1 : 0.45}>
                  H{i + 1}
                </text>
                {occupied && (
                  <>
                    <circle cx={hx + 96} cy={hy + 13} r="6" fill="#D7AB3A" opacity="0.9">
                      <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <text x={hx + 54} y={hy + 37} textAnchor="middle" fontSize="7"
                      fill="#D7AB3A" fontFamily="monospace" fontWeight="bold">AKTIV UH</text>
                  </>
                )}
              </g>
            );
          })}

          {/* ── Maintenance aircraft inside hangars ── */}
          {maint.slice(0, 4).map((ac, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const hx = 62 + col * 117;
            const hy = 382 + row * 90;
            const mx = hx + 54, my = hy + 60;
            return (
              <g key={`maint-${ac.id}`}
                onMouseEnter={() => setHoveredAc(ac.id)}
                onMouseLeave={() => setHoveredAc(null)}>
                <GripenShape cx={mx} cy={my} color="#D7AB3A" opacity={0.75} />
                {hoveredAc === ac.id && (
                  <g>
                    <rect x={mx-18} y={my-20} width="36" height="11" rx="2" fill="#0C234C" opacity="0.95" />
                    <text x={mx} y={my-12} textAnchor="middle" fontSize="7" fill="#D7AB3A" fontFamily="monospace" fontWeight="bold">{ac.tailNumber}</text>
                  </g>
                )}
              </g>
            );
          })}

          {/* ── Fuel Depot ── */}
          {(() => {
            const isSel = selected === "fuel";
            const fuelPct = base.fuel / 100;
            const fuelColor = base.fuel > 60 ? "#0C234C" : base.fuel > 30 ? "#D7AB3A" : "#D9192E";
            return (
              <g style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); toggle("fuel"); }}>
                <rect x="330" y="380" width="110" height="80" rx="4"
                  fill={isSel ? "#D7AB3A10" : "#0C234C08"}
                  stroke={isSel ? "#D7AB3A" : fuelColor + "60"}
                  strokeWidth={isSel ? 2 : 1} />
                {/* Tanks */}
                <circle cx="356" cy="410" r="22" fill="#D7DEE1" stroke={fuelColor} strokeWidth="1.5" opacity="0.85" />
                <circle cx="404" cy="410" r="22" fill="#D7DEE1" stroke={fuelColor} strokeWidth="1.5" opacity="0.85" />
                <clipPath id="fuelClip1"><circle cx="356" cy="410" r="21" /></clipPath>
                <rect x="335" y={410 + 21 - 42 * fuelPct} width="42" height={42 * fuelPct} fill={fuelColor} opacity="0.45" clipPath="url(#fuelClip1)" />
                <clipPath id="fuelClip2"><circle cx="404" cy="410" r="21" /></clipPath>
                <rect x="383" y={410 + 21 - 42 * fuelPct} width="42" height={42 * fuelPct} fill={fuelColor} opacity="0.45" clipPath="url(#fuelClip2)" />
                <text x="356" y="413" textAnchor="middle" fontSize="7" fill={fuelColor} fontFamily="monospace" fontWeight="bold">{Math.round(base.fuel)}%</text>
                <text x="404" y="413" textAnchor="middle" fontSize="7" fill={fuelColor} fontFamily="monospace" fontWeight="bold">{Math.round(base.fuel)}%</text>
                <text x="385" y="453" textAnchor="middle" fontSize="8" fill="#0C234C" fontFamily="monospace" fontWeight="bold">BRÄNSLE DEPÅ</text>
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
                    points={`${475 + j * 50},372 ${517 + j * 50},372 ${509 + j * 50},410 ${483 + j * 50},410`}
                    fill={isSel ? "#D9192E10" : "#0C234C08"}
                    stroke={critical ? "#D9192E" : isSel ? "#D9192E" : "#0C234C55"}
                    strokeWidth={isSel ? 2 : 1} />
                ))}
                {[0, 1, 2].map((j) => (
                  <rect key={j} x={488 + j * 50} y={388} width="14" height="18" rx="1"
                    fill="#D7DEE1" stroke="#0C234C55" strokeWidth="0.5" />
                ))}
                {critical && (
                  <circle cx="620" cy="378" r="6" fill="#D9192E">
                    <animate attributeName="opacity" values="1;0.2;1" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
                <text x="542" y="428" textAnchor="middle" fontSize="8" fill="#0C234C" fontFamily="monospace" fontWeight="bold">AMMO DEPOT</text>
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
            <rect x="360" y="40" width="100" height="70" rx="3"
              fill="#0C234C0a" stroke="#0C234C45" strokeWidth="1" />
            {[0, 1, 2].map((row) =>
              [0, 1, 2, 3].map((col) => (
                <rect key={`${row}-${col}`}
                  x={370 + col * 20} y={50 + row * 16}
                  width="12" height="9" rx="1"
                  fill="#D7DEE1" stroke="#0C234C25" strokeWidth="0.5" />
              ))
            )}
            <text x="410" y="120" textAnchor="middle" fontSize="7" fill="#0C234C" fontFamily="monospace" fontWeight="bold" opacity="0.7">FÖRLÄGGNING</text>
          </g>

          {/* NO ROADS — only taxiway strip drawn above */}

          {/* ── Legend (SAAB styled) ── */}
          <g>
            <rect x="678" y="38" width="184" height="88" rx="4"
              fill="#0C234C" opacity="0.92" />
            <rect x="678" y="38" width="184" height="5" rx="2"
              fill="#D7AB3A" />
            <text x="770" y="53" textAnchor="middle" fontSize="8" fill="#D7AB3A"
              fontFamily="monospace" fontWeight="bold" letterSpacing="2">LEGEND</text>
            {[
              { color: "#0C234C", label: "Mission Capable" },
              { color: "#1a4a8a", label: "På uppdrag" },
              { color: "#D7AB3A", label: "Underhåll" },
              { color: "#D9192E", label: "Ej operativ" },
            ].map((item, i) => (
              <g key={i}>
                <circle cx="697" cy={68 + i * 17} r="4.5" fill={item.color} />
                <text x="710" y={72 + i * 17} fontSize="8" fill="#D7DEE1"
                  fontFamily="monospace">{item.label}</text>
              </g>
            ))}
          </g>

          {/* ── Status bar (bottom) ── */}
          <rect x="20" y="570" width="860" height="20" rx="3" fill="#0C234C" opacity="0.88" />
          <rect x="20" y="570" width="860" height="2" rx="1" fill="#D7AB3A" opacity="0.7" />
          <text x="40" y="583" fontSize="8" fill="#D7AB3A" fontFamily="monospace" fontWeight="bold">MC: {mc.length}</text>
          <text x="105" y="583" fontSize="8" fill="#7aaef0" fontFamily="monospace">UPP: {onMission.length}</text>
          <text x="175" y="583" fontSize="8" fill="#D7AB3A" fontFamily="monospace">UH: {maint.length}</text>
          <text x="235" y="583" fontSize="8" fill="#D9192E" fontFamily="monospace">NMC: {nmc.length}</text>
          <text x="330" y="583" fontSize="8" fill="#D7DEE1" fontFamily="monospace">
            BRÄNSLE: {Math.round(base.fuel)}% · UH-PLATSER: {base.maintenanceBays.occupied}/{base.maintenanceBays.total}
          </text>
          <text x="840" y="583" textAnchor="end" fontSize="8" fill="#D7AB3A" fontFamily="monospace" fontWeight="bold">
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
            const cy = 252 + row * 60;

            const pw = 195, ph = 225;
            const acColor = getAircraftColor(ac);
            const pct = Math.min(100, ac.hoursToService);
            const barColor = ac.hoursToService <= 20 ? "#dc2626" : ac.hoursToService < 50 ? "#d97706" : "#16a34a";
            const fuelColor = base.fuel > 60 ? "#16a34a" : base.fuel > 30 ? "#d97706" : "#dc2626";

            const px = cx > 500 ? cx - pw - 12 : cx + 22;
            const py = Math.max(15, Math.min(330 - ph, cy - ph / 2));

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

      {/* ── UTFALL MODAL (manual, from aircraft popup) ───────────── */}
      {utfallAcId && (() => {
        const utfallAc = base.aircraft.find((a) => a.id === utfallAcId);
        if (!utfallAc) return null;
        return (
          <UtfallModal
            aircraft={utfallAc}
            context="manual"
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

      {/* ── RUNWAY UTFALL MODAL (auto-roll on runway drop) ───────── */}
      {pendingRunwayAcId && (() => {
        const runwayAc = base.aircraft.find((a) => a.id === pendingRunwayAcId);
        if (!runwayAc) return null;
        return (
          <UtfallModal
            aircraft={runwayAc}
            context="runway"
            onClose={() => setPendingRunwayAcId(null)}
            onAccept={(outcome: UtfallOutcome) => {
              // Negative outcome accepted → send to maintenance
              setPendingRunwayAcId(null);
              if (maint.length >= 4) {
                setHangarFullWarning(true);
                return;
              }
              onDropAircraft(runwayAc.id, "hangar");
              onUtfallOutcome?.(
                runwayAc.id,
                outcome.repairTime,
                outcome.maintenanceTypeKey,
                outcome.weaponLoss,
                outcome.actionType,
              );
            }}
            onProceedMission={() => {
              // Proceed with mission (ok or override)
              setPendingRunwayAcId(null);
              onDropAircraft(runwayAc.id, "runway");
            }}
          />
        );
      })()}

      {/* ── HANGAR FULL WARNING ───────────────────────────────────── */}
      {hangarFullWarning && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
            style={{ border: "2px solid #D9192E" }}
          >
            <div className="bg-[#D9192E] text-white px-5 py-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div>
                <div className="font-black font-mono tracking-widest text-sm">UNDERHÅLLSHALLAR FULLA</div>
                <div className="text-xs opacity-80 font-mono">Kapacitetsgräns nådd</div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm font-mono text-gray-700">
                Alla <strong>4 underhållsplatser</strong> är upptagna. Ta bort ett flygplan från underhåll innan du lägger till ett nytt.
              </p>
              <div className="bg-red-50 rounded-xl border border-red-200 p-3">
                <div className="text-xs font-mono text-red-700 font-bold mb-1">Flygplan i underhåll ({maint.length}/4):</div>
                {maint.map((ac) => (
                  <div key={ac.id} className="text-xs font-mono text-red-600">
                    · {ac.tailNumber} — {ac.maintenanceType?.replace(/_/g, " ") ?? "underhåll"}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setHangarFullWarning(false)}
                className="w-full py-2.5 bg-[#0C234C] text-white font-mono font-bold text-sm rounded-xl hover:bg-blue-900 transition-colors active:scale-95"
              >
                Förstått
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
