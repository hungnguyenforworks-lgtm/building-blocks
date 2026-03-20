import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, AreaChart, Area,
  ResponsiveContainer, Tooltip as ReTooltip,
  ReferenceLine, YAxis,
} from "recharts";
import {
  Activity, Radio, Layers, User, Wrench, ArrowLeft,
  AlertTriangle, CheckCircle2, Shield, Zap, Compass,
  Droplets, Power, Target, TrendingUp, X, Star, Clock3,
  Phone, Award, ChevronRight,
} from "lucide-react";
import grippenSilhouette from "@/assets/gripen-silhouette.png";
import { useGame } from "@/context/GameContext";
import type { Aircraft } from "@/types/game";
import { PILOT_ROSTER } from "@/data/pilotRoster";

// ─── Static rosters (deterministic per tail number) ──────────────────────────

const CREW_ROSTER: Record<string, { name: string; id: string; cert: string; employeeId: string; shift: string; ext: string; years: number; aircraft: string[] }> = {
  GE01: { name: "Sgt. Marcus Andersson",  id: "Tekniker 04", cert: "RM12 / PS-05A / MFS-EW", employeeId: "FM-8821-A", shift: "Dag 06:00–18:00", ext: "4821", years: 12, aircraft: ["GE01", "GE02"] },
  GE02: { name: "Sgt. Marcus Andersson",  id: "Tekniker 04", cert: "RM12 / PS-05A / MFS-EW", employeeId: "FM-8821-A", shift: "Dag 06:00–18:00", ext: "4821", years: 12, aircraft: ["GE01", "GE02"] },
  GE03: { name: "Cpl. Hanna Nilsson",     id: "Tekniker 07", cert: "RM12 / Hydraul / ECS",   employeeId: "FM-3312-B", shift: "Dag 07:00–19:00", ext: "5034", years: 7,  aircraft: ["GE03", "GE04"] },
  GE04: { name: "Cpl. Hanna Nilsson",     id: "Tekniker 07", cert: "RM12 / Hydraul / ECS",   employeeId: "FM-3312-B", shift: "Dag 07:00–19:00", ext: "5034", years: 7,  aircraft: ["GE03", "GE04"] },
  GE05: { name: "Sgt. Per Berg",          id: "Tekniker 11", cert: "Avionik / PS-05A / IFF",  employeeId: "FM-6610-C", shift: "Natt 18:00–06:00", ext: "6112", years: 9,  aircraft: ["GE05", "GE06"] },
  GE06: { name: "Sgt. Per Berg",          id: "Tekniker 11", cert: "Avionik / PS-05A / IFF",  employeeId: "FM-6610-C", shift: "Natt 18:00–06:00", ext: "6112", years: 9,  aircraft: ["GE05", "GE06"] },
  GE07: { name: "Cpl. Lars Holm",         id: "Tekniker 15", cert: "RM12 / EW / Katapult",    employeeId: "FM-2234-D", shift: "Dag 06:00–18:00", ext: "4904", years: 5,  aircraft: ["GE07", "GE08"] },
  GE08: { name: "Cpl. Lars Holm",         id: "Tekniker 15", cert: "RM12 / EW / Katapult",    employeeId: "FM-2234-D", shift: "Dag 06:00–18:00", ext: "4904", years: 5,  aircraft: ["GE07", "GE08"] },
  GE09: { name: "Sgt. Maja Sjögren",      id: "Tekniker 02", cert: "RM12 / PS-05A / APU",     employeeId: "FM-9900-E", shift: "Dag 07:00–19:00", ext: "4714", years: 15, aircraft: ["GE09", "GE10"] },
  GE10: { name: "Sgt. Maja Sjögren",      id: "Tekniker 02", cert: "RM12 / PS-05A / APU",     employeeId: "FM-9900-E", shift: "Dag 07:00–19:00", ext: "4714", years: 15, aircraft: ["GE09", "GE10"] },
  GE11: { name: "Cpl. Erik Strand",       id: "Tekniker 19", cert: "Hydraul / ECS / Landst.", employeeId: "FM-1145-F", shift: "Natt 18:00–06:00", ext: "6330", years: 6,  aircraft: ["GE11", "GE12"] },
  GE12: { name: "Cpl. Erik Strand",       id: "Tekniker 19", cert: "Hydraul / ECS / Landst.", employeeId: "FM-1145-F", shift: "Natt 18:00–06:00", ext: "6330", years: 6,  aircraft: ["GE11", "GE12"] },
  GF01: { name: "Sgt. Karin Molin",       id: "Tekniker 21", cert: "EW-EXPERT / PS-05A / RM12", employeeId: "FM-7701-G", shift: "Dag 06:00–18:00", ext: "5511", years: 11, aircraft: ["GF01", "GF02"] },
  GF02: { name: "Sgt. Karin Molin",       id: "Tekniker 21", cert: "EW-EXPERT / PS-05A / RM12", employeeId: "FM-7701-G", shift: "Dag 06:00–18:00", ext: "5511", years: 11, aircraft: ["GF01", "GF02"] },
  GF03: { name: "Cpl. Jonas Björk",       id: "Tekniker 23", cert: "Avionik / ECS / Katapult", employeeId: "FM-4490-H", shift: "Dag 07:00–19:00", ext: "5622", years: 4,  aircraft: ["GF03", "GF04"] },
  GF04: { name: "Cpl. Jonas Björk",       id: "Tekniker 23", cert: "Avionik / ECS / Katapult", employeeId: "FM-4490-H", shift: "Dag 07:00–19:00", ext: "5622", years: 4,  aircraft: ["GF03", "GF04"] },
  GF05: { name: "Sgt. Elin Dahl",         id: "Tekniker 27", cert: "RM12 / Hydraul / IFF",    employeeId: "FM-3388-I", shift: "Natt 18:00–06:00", ext: "6780", years: 8,  aircraft: ["GF05", "GF06"] },
  GF06: { name: "Sgt. Elin Dahl",         id: "Tekniker 27", cert: "RM12 / Hydraul / IFF",    employeeId: "FM-3388-I", shift: "Natt 18:00–06:00", ext: "6780", years: 8,  aircraft: ["GF05", "GF06"] },
};

const CALLSIGN_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(PILOT_ROSTER).map(([k, v]) => [k, v.callsign])
);

// ─── Derive live data from game Aircraft ─────────────────────────────────────

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

/** Map any aircraft status to status-badge display */
const STATUS_META: Record<string, { label: string; cls: string; silFilter: string }> = {
  ready:            { label: "MISSION CAPABLE",   cls: "text-status-green bg-status-green/10 border-status-green/40",  silFilter: "brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(190deg)" },
  allocated:        { label: "TILLDELAD – ATO",   cls: "text-status-blue bg-status-blue/10 border-status-blue/40",    silFilter: "brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(190deg)" },
  in_preparation:   { label: "KLARGÖRING",        cls: "text-status-amber bg-status-amber/10 border-status-amber/40", silFilter: "brightness(0) invert(1) sepia(1) saturate(4) hue-rotate(5deg)" },
  awaiting_launch:  { label: "VÄNTAR START",      cls: "text-cyan-400 bg-cyan-400/10 border-cyan-400/40",             silFilter: "brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(190deg)" },
  on_mission:       { label: "PÅ UPPDRAG",        cls: "text-status-blue bg-status-blue/10 border-status-blue/40",    silFilter: "brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(190deg)" },
  returning:        { label: "RETUR INKOMMANDE",  cls: "text-purple-400 bg-purple-400/10 border-purple-400/40",       silFilter: "brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(190deg)" },
  recovering:       { label: "MOTTAGNING",        cls: "text-orange-400 bg-orange-400/10 border-orange-400/40",       silFilter: "brightness(0) invert(1) sepia(1) saturate(4) hue-rotate(5deg)" },
  under_maintenance:{ label: "UNDER SERVICE",     cls: "text-status-amber bg-status-amber/10 border-status-amber/40", silFilter: "brightness(0) invert(1) sepia(1) saturate(4) hue-rotate(5deg)" },
  unavailable:      { label: "NMC – GROUNDED",    cls: "text-status-red bg-status-red/10 border-status-red/40",       silFilter: "brightness(0) invert(1) sepia(1) saturate(10) hue-rotate(310deg)" },
};

function deriveComponents(ac: Aircraft) {
  const h  = ac.health;
  const fh = ac.flightHours;
  const ts = ac.hoursToService;
  const engineH = clamp(h, 0, 100);
  const radarH  = clamp(
    (ac.maintenanceType === "complex_lru" || ac.requiredSparePart === "radar") ? h - 20 : h + 8,
    0, 100
  );
  const airframeH = clamp(Math.round(100 - fh * 0.12), 0, 100);
  const landings  = Math.round(fh / 1.2);
  const gMax      = (5.5 + (fh % 30) * 0.1).toFixed(1);

  return [
    {
      id: "engine", label: "Engine", sublabel: "RM12", icon: Activity, health: engineH,
      stats: [
        { label: "Time to Service", value: `${ts.toFixed(1)} h kvar` },
        { label: "Drifttemp",       value: `${Math.round(580 + (100 - engineH) * 0.5)} °C` },
        { label: "Vibration",       value: engineH < 50 ? "1.1 g (nära tröskel: 1.2 g)" : "0.8 g (tröskel: 1.2 g)" },
        { label: "Cykler totalt",   value: String(Math.round(fh * 2.4)) },
      ],
      degradation: buildDeg(engineH, fh),
    },
    {
      id: "radar", label: "Radar", sublabel: "PS-05/A", icon: Radio, health: radarH,
      stats: [
        { label: "Systemintegritet", value: `${radarH} %` },
        { label: "SW-version",       value: "v4.5-Alpha" },
        { label: "Senaste BIT",      value: radarH < 70 ? "VARNING – spurious returns zon 2B" : "OK" },
        { label: "Scan-cykler",      value: String(Math.round(fh * 177)) },
      ],
      degradation: buildDeg(radarH, fh),
    },
    {
      id: "airframe", label: "Airframe", sublabel: "Strukturintegritet", icon: Layers, health: airframeH,
      stats: [
        { label: "Fatigue Index",       value: `${airframeH} %` },
        { label: "Landings totalt",     value: String(landings) },
        { label: "G-max loggad",        value: `${gMax} g` },
        { label: "Nästa DP-inspektion", value: `${Math.round(ts * 7)} flygtimmar` },
      ],
      degradation: buildDeg(airframeH, fh),
    },
  ];
}

function deriveSubComponents(ac: Aircraft) {
  const h = ac.health;
  const ewH  = clamp(h + 15, 0, 100);
  const navH = clamp(h + 20, 0, 100);
  const hydH = clamp(
    (ac.maintenanceType === "complex_lru" && ac.requiredSparePart === "hydraulic") ? h - 25 : h + 10,
    0, 100
  );
  const apuH = clamp(h + 5, 0, 100);

  return [
    {
      id: "ew", label: "EW Suite", sublabel: "MFS Electronic Warfare", icon: Zap, health: ewH,
      stats: [
        { label: "Status",              value: ewH > 80 ? "NOMINAL – Active Jamming Ready" : "DEGRADED – begränsad kapacitet" },
        { label: "Sensorkänslighet",    value: `${ewH} %` },
        { label: "Facklor / Motmedel",  value: "48 / 60 enheter" },
        { label: "Störsändare ERP",     value: `${Math.round(70 + ewH * 0.12)} dBm` },
      ],
      degradation: buildDeg(ewH, ac.flightHours),
    },
    {
      id: "nav", label: "Comms & Nav", sublabel: "TIDLS / GPS / IFF", icon: Compass, health: navH,
      stats: [
        { label: "Data Link", value: navH > 85 ? "Stabil – FOB_N ansluten" : "Intermittent – kontrollera antenn" },
        { label: "IFF",       value: navH > 70 ? "Mode 5 godkänd" : "Mode 5 – fördröjning noterad" },
        { label: "INS/GPS-drift", value: navH > 90 ? "0.002 nm/h" : "0.008 nm/h (försämrad)" },
        { label: "COMM 2",    value: "Brus vid hög höjd (nominell)" },
      ],
      degradation: buildDeg(navH, ac.flightHours),
    },
    {
      id: "hyd", label: "Hydraulik & ECS", sublabel: "Sys A/B + Avionikkylning", icon: Droplets, health: hydH,
      stats: [
        { label: "Tryck Sys A", value: "3 000 PSI (nominal)" },
        { label: "Tryck Sys B", value: hydH < 60 ? `${Math.round(2200 + hydH * 5)} PSI (lågt!)` : "2 950 PSI (nominal)" },
        { label: "Avionikkylning", value: `${Math.round(16 + (100 - hydH) * 0.05)} °C` },
        { label: "Bromsslitage", value: `${Math.round((100 - hydH) * 0.25)} % (byt vid 80 %)` },
      ],
      degradation: buildDeg(hydH, ac.flightHours),
    },
    {
      id: "apu", label: "APU", sublabel: "Auxiliary Power Unit", icon: Power, health: apuH,
      stats: [
        { label: "Starttid",         value: apuH > 70 ? "4.2 s (gräns: 6.0 s)" : "5.4 s (nära gräns: 6.0 s)" },
        { label: "EGT vid start",    value: `${Math.round(300 + (100 - apuH) * 1.2)} °C (gräns: 420 °C)` },
        { label: "Driftcykler",      value: String(Math.round(ac.flightHours * 8.9)) },
        { label: "Nästa 500h-service", value: `${Math.round(ac.hoursToService * 6)} cykler kvar` },
      ],
      degradation: buildDeg(apuH, ac.flightHours),
    },
  ];
}

function buildDeg(endHealth: number, flightHours: number) {
  const ageFactor = Math.min(flightHours / 2000, 0.3);
  return [0, 100, 200, 300, 400, 500].map((h) => ({
    h,
    v: Math.round(100 - ((100 - endHealth) * (h / 500)) - ageFactor * (h / 500) * 5),
  }));
}

function deriveMissionCount(ac: Aircraft) {
  return Math.max(1, Math.round(ac.flightHours / 1.9));
}

function deriveSnagReports(ac: Aircraft, pilotCallsign: string) {
  const reports: Array<{ id: string; severity: "green" | "yellow" | "red"; label: string; pilot: string; date: string; text: string; action: string }> = [];
  const pilot = `${PILOT_ROSTER[ac.tailNumber]?.name ?? "Okänd pilot"} / ${pilotCallsign}`;

  if (ac.status === "unavailable") {
    reports.push({
      id: "live-nmc", severity: "red", label: "RÖD – MARKVISTELSE", pilot, date: "2026-03-19  04:17Z",
      text: ac.maintenanceType
        ? `Flygplan deklarerat NMC. Pågående underhåll: ${ac.maintenanceType.replace(/_/g, " ")}. Alla flygtillstånd återkallade tills teknisk godkänning erhållits.`
        : `Hälsovärde ${ac.health}% — under operativ minimigräns (30%). Felsökning krävs. Inga flygningar tillåtna.`,
      action: `${ac.tailNumber} GROUNDED – Tekniker tillkallad. Åtgärd pågår.`,
    });
  }

  if (ac.status === "under_maintenance") {
    const mType = ac.maintenanceType?.replace(/_/g, " ") ?? "okänd åtgärd";
    const mTime = ac.maintenanceTimeRemaining != null ? `Beräknad klar: ${ac.maintenanceTimeRemaining}h.` : "";
    reports.push({
      id: "live-maint", severity: "yellow", label: "GUL – FLYGTILLSTÅND", pilot, date: "2026-03-18  14:00Z",
      text: `Flygplan under schemalagd underhållsåtgärd: ${mType}. ${mTime} Begränsat flygtillstånd — godkänns av teknisk chef vid slutkontroll.`,
      action: `Underhåll pågår. Pilot informerad. Flygtillstånd ges vid godkänd BIT-kontroll.`,
    });
  }

  if (ac.hoursToService < 20 && ac.status !== "unavailable") {
    reports.push({
      id: "live-svc", severity: "yellow", label: "GUL – SERVICEVARNING", pilot, date: "2026-03-18  08:30Z",
      text: `100h-service förfaller inom ${ac.hoursToService.toFixed(1)} flygtimmar. Schemalägg underhållsavdelning. Flygplanet kan fortsätta flyga men prioriteras för service.`,
      action: `Loggad – underhållsplanering informerad. Nästa tillgängliga underhållsfönster bokas.`,
    });
  }

  if (ac.health < 60 && ac.health >= 30 && ac.status !== "unavailable" && ac.status !== "under_maintenance") {
    reports.push({
      id: "live-deg", severity: "yellow", label: "GUL – FÖRSÄMRAD PRESTANDA", pilot, date: "2026-03-17  11:15Z",
      text: `Komponenthälsa ${ac.health}% — under nominellt intervall (70%). Prestandabegränsningar kan förekomma vid extrema rörelser.`,
      action: `Loggad – fortsatt flygtillstånd med restriktioner. Max G begränsat till 7.0.`,
    });
  }

  if (ac.status === "on_mission" && ac.currentMission) {
    reports.push({
      id: "live-mission", severity: "yellow", label: "GUL – PÅ UPPDRAG", pilot, date: "2026-03-19  06:00Z",
      text: `Flygplanet utför aktivt uppdrag: ${ac.currentMission}. Statusövervakning aktiv via TIDLS-länk. Inga tekniska larm hittills.`,
      action: `Nominell. Avvaktar retur för post-missions BIT-kontroll.`,
    });
  }

  reports.push({
    id: "s3", severity: "green", label: "GRÖN – NOMINELL", pilot, date: "2026-03-16  08:18Z",
    text: "Radio noise on COMM 2 during high altitude cruise (FL380). Signal-to-noise within published tolerance. No communication loss.",
    action: "Ingen åtgärd krävs. Loggad för trendanalys.",
  });

  reports.push({
    id: "s4", severity: "green", label: "GRÖN – NOMINELL", pilot, date: "2026-03-14  15:44Z",
    text: "Left main gear tire showing uneven wear pattern on outer edge — within dimensional limits. No vibration noted on landing.",
    action: "Ingen åtgärd krävs. Kontrolleras vid nästa tyre-check.",
  });

  if (ac.health < 85) {
    reports.push({
      id: "s5", severity: "green", label: "GRÖN – NOMINELL", pilot, date: "2026-03-11  06:33Z",
      text: "Minor oil seepage noted on accessory gearbox forward face — staining only, quantity <0.1 ml. Within limits.",
      action: "Daglig övervakning. Tekniker informerad.",
    });
  }

  if (ac.health < 40) {
    reports.push({
      id: "s6", severity: "red", label: "RÖD – MARKVISTELSE", pilot, date: "2026-03-17  09:55Z",
      text: `Hydraulic pressure drop Sys B under high-g maneuver. Hälsovärde nu ${ac.health}% — systemet bedömt som ej flytsäkert.`,
      action: "Sys B offline – hydraulenhet byts. Teknisk chef har bekräftat markvistelse.",
    });
  } else {
    reports.push({
      id: "s1", severity: "yellow", label: "GUL – FLYGTILLSTÅND", pilot, date: "2026-03-18  06:42Z",
      text: "Slight pitch oscillation during high-alpha maneuvers — observed above 25° AoA. Response manageable within flight envelope.",
      action: "Logged – fortsatt flygtillstånd. Inspektion innan nästa pass.",
    });
  }

  return reports;
}

function deriveMaintenanceLog(ac: Aircraft) {
  const log: Array<{ date: string; action: string; serial: string; manHours: number; tech: string; live?: boolean }> = [];

  if (ac.status === "under_maintenance" && ac.maintenanceType) {
    const typeLabel = ac.maintenanceType.replace(/_/g, " ");
    log.push({
      date: "2026-03-19",
      action: `PÅGÅENDE: ${typeLabel}`,
      serial: ac.requiredSparePart ? `DEL-${ac.requiredSparePart.toUpperCase()}-REQ` : "INTERN",
      manHours: ac.maintenanceTimeRemaining ?? 2,
      tech: CREW_ROSTER[ac.tailNumber]?.name ?? "Tekniker",
      live: true,
    });
  }

  log.push(
    { date: "2026-03-17", action: "Byte av APU-filter",             serial: "APU-F-8821A",  manHours: 1.5, tech: "Tekniker Andersson" },
    { date: "2026-03-14", action: "Kalibrering av IRST-sensor",     serial: "IRST-CAL-004", manHours: 0.8, tech: "Tekniker Holm" },
    { date: "2026-03-10", action: "Inspektion hydraulsystem",       serial: "HYD-SEAL-772", manHours: 3.0, tech: "Tekniker Berg" },
    { date: "2026-03-05", action: "Byte RM12 turbinblad",           serial: "99821-B",      manHours: 8.5, tech: "Tekniker Nilsson" },
    { date: "2026-02-28", action: "EW-suite firmware uppgradering", serial: "MFS-FW-2.3.1", manHours: 2.0, tech: "Tekniker Holm" },
  );

  return log;
}

function deriveMTBF(ac: Aircraft) {
  const h = ac.health;
  return [
    { component: "RM12 Motor",    mtbf: 420,  recentFaults: h < 50 ? 1 : 0, probability: +(Math.max(0.5, 2.4 + (100 - h) * 0.05)).toFixed(1) },
    { component: "PS-05/A Radar", mtbf: 680,  recentFaults: 1,               probability: +(Math.max(0.5, 4.1 + (100 - h) * 0.03)).toFixed(1) },
    { component: "Hydraulsystem", mtbf: 1100, recentFaults: 0,               probability: +(Math.max(0.2, 0.9 + (100 - h) * 0.02)).toFixed(1) },
    { component: "MFS EW Suite",  mtbf: 850,  recentFaults: 0,               probability: +(Math.max(0.2, 1.2 + (100 - h) * 0.01)).toFixed(1) },
    { component: "APU",           mtbf: 340,  recentFaults: h < 40 ? 1 : 0,  probability: +(Math.max(0.5, 3.1 + (100 - h) * 0.04)).toFixed(1) },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function healthColor(h: number) {
  if (h >= 70) return "hsl(152 60% 32%)";
  if (h >= 30) return "hsl(42 64% 53%)";
  return "hsl(353 74% 47%)";
}
function healthLabel(h: number) {
  if (h >= 70) return "NOMINAL";
  if (h >= 30) return "DEGRADED";
  return "CRITICAL";
}
function stationColor(type: string) {
  if (type === "missile") return { border: "rgba(217,25,46,0.5)",  bg: "rgba(217,25,46,0.08)",   text: "#ff8090", tag: "#D9192E" };
  if (type === "tank")    return { border: "rgba(59,130,246,0.5)", bg: "rgba(59,130,246,0.08)",  text: "#7eb8ff", tag: "#3b82f6" };
  if (type === "pod")     return { border: "rgba(34,211,238,0.5)", bg: "rgba(34,211,238,0.08)", text: "#67e8f9", tag: "#22d3ee" };
  return { border: "rgba(215,222,225,0.2)", bg: "rgba(215,222,225,0.05)", text: "#D7DEE1", tag: "#888" };
}

// ─── Static flavor data (not game-driven) ────────────────────────────────────

const WEAPONS_STATIONS = [
  { id: 1, pos: "Vingspets L",  load: "IRIS-T",       type: "missile", status: "Bus: OK · Skarpt" },
  { id: 2, pos: "Under vinge L", load: "Meteor",      type: "missile", status: "Rail-power: Stable · Skarpt" },
  { id: 3, pos: "Inre vinge L", load: "1000L Tank",   type: "tank",    status: "Bränsleöverföring: Aktiv" },
  { id: 4, pos: "Center",       load: "LDP Litening", type: "pod",     status: "Sensor-alignment: Godkänd" },
  { id: 5, pos: "Inre vinge R", load: "1000L Tank",   type: "tank",    status: "Bränsleöverföring: Aktiv" },
  { id: 6, pos: "Under vinge R", load: "Meteor",      type: "missile", status: "Rail-power: Stable · Skarpt" },
  { id: 7, pos: "Vingspets R",  load: "IRIS-T",       type: "missile", status: "Bus: OK · Skarpt" },
];

const G_LOAD_PROFILE = [
  { t: 0,   g: 1.0 }, { t: 15,  g: 2.4 }, { t: 30,  g: 4.2 },
  { t: 50,  g: 6.1 }, { t: 60,  g: 6.8 }, { t: 75,  g: 7.9 },
  { t: 90,  g: 8.2 }, { t: 105, g: 5.4 }, { t: 120, g: 3.1 },
  { t: 135, g: 1.8 }, { t: 150, g: 1.0 },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
      <span className="text-[10px] font-mono text-[#D7DEE1]/50 uppercase tracking-widest">{label}</span>
      <span className="text-[11px] font-mono text-[#D7DEE1]">{value}</span>
    </div>
  );
}

function ComponentCard({ comp }: { comp: ReturnType<typeof deriveComponents>[0] }) {
  const [hovered, setHovered] = useState(false);
  const Icon = comp.icon;
  const color = healthColor(comp.health);
  const isCritical = comp.health < 30;
  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className="relative rounded-xl p-4 space-y-3 overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${isCritical ? "#D9192E" : "rgba(215,222,225,0.12)"}`,
        boxShadow: isCritical ? "0 0 18px rgba(217,25,46,0.35)" : "none",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ background: `${color}1A` }}>
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
          <div>
            <div className="text-[11px] font-mono font-bold text-[#D7DEE1]">{comp.label}</div>
            <div className="text-[9px] font-mono text-[#D7DEE1]/50 uppercase tracking-widest">{comp.sublabel}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-black font-mono" style={{ color }}>{comp.health}%</div>
          <div className="text-[9px] font-mono uppercase tracking-widest" style={{ color }}>{healthLabel(comp.health)}</div>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${comp.health}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ background: color }}
        />
      </div>
      <div className="space-y-0">
        {comp.stats.map((s) => <InfoRow key={s.label} label={s.label} value={s.value} />)}
      </div>
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 80 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="text-[9px] font-mono text-[#D7DEE1]/40 uppercase tracking-widest mb-1">
              Degraderingskurva (flygtimmar →)
            </div>
            <ResponsiveContainer width="100%" height={64}>
              <LineChart data={comp.degradation}>
                <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
                <ReTooltip
                  contentStyle={{ background: "#0C234C", border: "1px solid rgba(215,222,225,0.2)", borderRadius: 6, fontSize: 10, fontFamily: "monospace", color: "#D7DEE1" }}
                  formatter={(v: number) => [`${v}%`, "Hälsa"]}
                  labelFormatter={(l) => `${l}h`}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SnagCard({ snag }: { snag: ReturnType<typeof deriveSnagReports>[0] }) {
  const isRed   = snag.severity === "red";
  const isGreen = snag.severity === "green";
  const badgeCls = isRed
    ? "text-status-red bg-status-red/10 border-status-red/40"
    : isGreen
    ? "text-status-green bg-status-green/10 border-status-green/40"
    : "text-status-amber bg-status-amber/10 border-status-amber/40";
  const borderColor = isRed ? "#D9192E" : isGreen ? "hsl(152 60% 32%)" : "hsl(42 64% 53%)";
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-xl p-4 space-y-3"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${isRed ? "rgba(217,25,46,0.35)" : isGreen ? "rgba(34,160,90,0.3)" : "rgba(215,173,58,0.3)"}`,
        boxShadow: isRed ? "0 0 14px rgba(217,25,46,0.18)" : "none",
      }}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${badgeCls}`}>
          {isRed ? <AlertTriangle className="inline h-3 w-3 mr-1" /> : <CheckCircle2 className="inline h-3 w-3 mr-1" />}
          {snag.label}
        </span>
        <span className="text-[9px] font-mono text-[#D7DEE1]/40">{snag.date}</span>
      </div>
      <div className="text-[9px] font-mono text-[#D7DEE1]/50 uppercase tracking-widest">Pilot: {snag.pilot}</div>
      <p className="text-[11px] font-mono text-[#D7DEE1]/80 leading-relaxed italic border-l-2 pl-3" style={{ borderColor }}>
        "{snag.text}"
      </p>
      <div className="text-[10px] font-mono text-[#D7DEE1]/50 pt-1 border-t border-white/5">
        <span className="text-[#D7DEE1]/30 uppercase tracking-widest mr-2">Åtgärd:</span>
        {snag.action}
      </div>
    </motion.div>
  );
}

// ─── Modal helpers ────────────────────────────────────────────────────────────

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between px-6 py-5 border-b border-white/10">
      <div>
        <div className="text-[9px] font-mono uppercase tracking-widest text-[#D7DEE1]/40 mb-1">{subtitle}</div>
        <div className="text-lg font-black text-[#D7DEE1]">{title}</div>
      </div>
      <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-[#D7DEE1]/40 hover:text-[#D7DEE1]">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
function MRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
      <span className="text-[10px] font-mono text-[#D7DEE1]/45 uppercase tracking-widest">{label}</span>
      <span className="text-[11px] font-mono font-semibold" style={{ color: accent ? "hsl(42 64% 53%)" : "#D7DEE1" }}>{value}</span>
    </div>
  );
}

// ─── Pilot Modal ──────────────────────────────────────────────────────────────

function PilotModal({ ac, onClose }: { ac: Aircraft; onClose: () => void }) {
  const p = PILOT_ROSTER[ac.tailNumber] ?? { name: "Okänd pilot", callsign: "N/A", rank: "OF-?", id: "000000-0000", contact: "N/A", awards: [] };
  const missionCount = deriveMissionCount(ac);
  return (
    <div>
      <ModalHeader title={`${p.name} — "${p.callsign}"`} subtitle="Pilotprofil" onClose={onClose} />
      <div className="px-6 py-5 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(215,222,225,0.1)" }}>
            <div className="flex items-center gap-2 mb-3"><User className="h-4 w-4 text-[#D7DEE1]/40" /><span className="text-[9px] uppercase tracking-widest text-[#D7DEE1]/40">Identitet</span></div>
            <MRow label="Grad" value={p.rank} />
            <MRow label="Anropssignal" value={`"${p.callsign}"`} accent />
            <MRow label="ID" value={p.id} />
            <MRow label="Enhet" value="F21 – 2. Divisionen" />
            <MRow label="Bas" value={`${ac.currentBase} – Flygflottilj F21`} />
          </div>
          <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(215,222,225,0.1)" }}>
            <div className="flex items-center gap-2 mb-3"><Star className="h-4 w-4 text-[#D7DEE1]/40" /><span className="text-[9px] uppercase tracking-widest text-[#D7DEE1]/40">Flygtjänst på {ac.tailNumber}</span></div>
            <MRow label="Flygtimmar (plan)" value={`${ac.flightHours} h`} accent />
            <MRow label="Genomförda uppdrag" value={String(missionCount)} />
            <MRow label="Flyghälsa" value="Flygtjänstgörande" />
            <MRow label="Hälsointyg t.o.m." value="2026-09-30" />
            <MRow label="Senaste läkarundersökning" value="2026-02-15" />
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ background: "rgba(217,25,46,0.06)", border: "1px solid rgba(217,25,46,0.2)" }}>
          <div className="flex items-center gap-2 mb-3"><TrendingUp className="h-4 w-4" style={{ color: "#D9192E" }} /><span className="text-[9px] uppercase tracking-widest text-[#D7DEE1]/40">G-belastningsprofil</span></div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Max G (senaste pass)", value: `${(5.5 + (ac.flightHours % 30) * 0.1).toFixed(1)} g` },
              { label: "Snitt senaste 5 pass",  value: "3.7 g" },
              { label: "Exponering >7g",         value: `${Math.max(1, Math.round(ac.flightHours / 12))} tillfällen` },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-lg font-black font-mono" style={{ color: "#D9192E" }}>{s.value}</div>
                <div className="text-[9px] font-mono text-[#D7DEE1]/40 uppercase tracking-widest mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[9px] font-mono uppercase tracking-widest text-[#D7DEE1]/40 mb-3">Kvalifikationer</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "QRA-tjänst", status: "Godkänd" },
              { label: "Nattflygning NVG", status: "Godkänd" },
              { label: "Lufttankning", status: "Godkänd" },
              { label: "BVR-strid", status: "Godkänd" },
              { label: "SERE-utbildning", status: "Godkänd" },
              { label: "NBC-skyddsutb.", status: "Utgått 2026-06" },
            ].map((q) => {
              const ok = q.status === "Godkänd";
              return (
                <div key={q.label} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: ok ? "rgba(34,160,90,0.08)" : "rgba(217,25,46,0.08)", border: `1px solid ${ok ? "rgba(34,160,90,0.25)" : "rgba(217,25,46,0.25)"}` }}>
                  {ok ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "hsl(152 60% 38%)" }} />
                      : <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#D9192E" }} />}
                  <span className="text-[10px] font-mono text-[#D7DEE1]">{q.label}</span>
                  <span className="ml-auto text-[9px] font-mono" style={{ color: ok ? "hsl(152 60% 38%)" : "#D9192E" }}>{q.status}</span>
                </div>
              );
            })}
          </div>
        </div>

        {p.awards.length > 0 && (
          <div>
            <div className="text-[9px] font-mono uppercase tracking-widest text-[#D7DEE1]/40 mb-3">Utmärkelser</div>
            <div className="space-y-1.5">
              {p.awards.map((a) => (
                <div key={a} className="flex items-center gap-2 text-[10px] font-mono text-[#D7DEE1]/70">
                  <Award className="h-3 w-3 flex-shrink-0" style={{ color: "hsl(42 64% 53%)" }} />
                  {a}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(215,222,225,0.08)" }}>
          <Phone className="h-4 w-4 flex-shrink-0 text-[#D7DEE1]/30" />
          <div>
            <div className="text-[9px] font-mono uppercase tracking-widest text-[#D7DEE1]/30">Nödkontakt</div>
            <div className="text-[11px] font-mono text-[#D7DEE1]/70">{p.contact}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Crew Chief Modal ─────────────────────────────────────────────────────────

function CrewModal({ ac, onClose }: { ac: Aircraft; onClose: () => void }) {
  const c = CREW_ROSTER[ac.tailNumber] ?? { name: "Okänd tekniker", id: "N/A", cert: "N/A", employeeId: "N/A", shift: "N/A", ext: "N/A", years: 0, aircraft: [] };
  const log = deriveMaintenanceLog(ac);
  return (
    <div>
      <ModalHeader title={c.name} subtitle="Crew Chief — Teknikerprofil" onClose={onClose} />
      <div className="px-6 py-5 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(215,222,225,0.1)" }}>
            <div className="flex items-center gap-2 mb-3"><User className="h-4 w-4 text-[#D7DEE1]/40" /><span className="text-[9px] uppercase tracking-widest text-[#D7DEE1]/40">Identitet</span></div>
            <MRow label="ID" value={c.id} />
            <MRow label="Anst.nr" value={c.employeeId} />
            <MRow label="Enhet" value="F21 – Underhållsbataljonen" />
            <MRow label="Tjänsteår" value={`${c.years} år`} accent />
          </div>
          <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(215,222,225,0.1)" }}>
            <div className="flex items-center gap-2 mb-3"><Clock3 className="h-4 w-4 text-[#D7DEE1]/40" /><span className="text-[9px] uppercase tracking-widest text-[#D7DEE1]/40">Tjänstgöring</span></div>
            <MRow label="Skift" value={c.shift} />
            <MRow label="Telefon (intern)" value={`ext. ${c.ext}`} />
            <MRow label="Ansvarig för" value={c.aircraft.join(" · ")} accent />
            <MRow label="Nuvarande plan hälsa" value={`${ac.health}%`} />
            <MRow label="Plan status" value={STATUS_META[ac.status]?.label ?? ac.status} />
          </div>
        </div>

        {ac.status === "under_maintenance" && ac.maintenanceType && (
          <div className="rounded-xl p-4" style={{ background: "rgba(215,173,58,0.08)", border: "1px solid rgba(215,173,58,0.4)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="h-4 w-4" style={{ color: "hsl(42 64% 53%)" }} />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: "hsl(42 64% 53%)" }}>PÅGÅENDE UNDERHÅLL</span>
            </div>
            <div className="text-[11px] font-mono text-[#D7DEE1]/80">
              {ac.maintenanceType.replace(/_/g, " ")}
              {ac.maintenanceTimeRemaining != null && ` — ${ac.maintenanceTimeRemaining}h kvar`}
            </div>
          </div>
        )}

        <div>
          <div className="text-[9px] font-mono uppercase tracking-widest text-[#D7DEE1]/40 mb-3">Certifieringar</div>
          <div className="space-y-2">
            {[
              { label: "RM12 Motor",          level: "Nivå 3 – Fullt auktoriserad", expires: "2027-03-01" },
              { label: "PS-05/A Radar",        level: "Nivå 2 – Linjeunderhåll",    expires: "2026-11-15" },
              { label: "MFS EW Suite",         level: "Nivå 2 – Linjeunderhåll",    expires: "2026-08-30" },
              { label: "Hydraulsystem",        level: "Nivå 3 – Fullt auktoriserad", expires: "2027-01-20" },
              { label: "Katapultstol",         level: "Nivå 1 – Grundläggande",     expires: "2026-06-01" },
              { label: "Avionikkylning (ECS)", level: "Nivå 2 – Linjeunderhåll",    expires: "2026-09-10" },
            ].map((cert) => {
              const soon = new Date(cert.expires) <= new Date("2026-09-01");
              return (
                <div key={cert.label} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${soon ? "rgba(215,173,58,0.3)" : "rgba(215,222,225,0.1)"}` }}>
                  <Wrench className="h-3.5 w-3.5 flex-shrink-0 text-[#D7DEE1]/40" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-mono font-semibold text-[#D7DEE1]">{cert.label}</div>
                    <div className="text-[9px] font-mono text-[#D7DEE1]/45">{cert.level}</div>
                  </div>
                  <div className="text-[9px] font-mono flex-shrink-0" style={{ color: soon ? "hsl(42 64% 53%)" : "hsl(152 60% 38%)" }}>
                    {soon ? "⚠ " : ""}t.o.m. {cert.expires}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-[9px] font-mono uppercase tracking-widest text-[#D7DEE1]/40 mb-3">Arbetsorder — {ac.tailNumber}</div>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(215,222,225,0.1)" }}>
            {log.slice(0, 5).map((w, i) => (
              <div key={i} className="grid grid-cols-[auto_1fr_auto] gap-3 px-4 py-2.5 border-b border-white/5 last:border-0 items-center"
                style={{ background: w.live ? "rgba(215,173,58,0.07)" : i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                <span className="text-[9px] font-mono text-[#D7DEE1]/40">{w.date}</span>
                <span className="text-[10px] font-mono text-[#D7DEE1]" style={{ color: w.live ? "hsl(42 64% 53%)" : undefined }}>{w.action}</span>
                <span className="text-[10px] font-mono text-[#D7DEE1]/50">{w.manHours} h</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Missions Modal ───────────────────────────────────────────────────────────

function MissionsModal({ ac, onClose }: { ac: Aircraft; onClose: () => void }) {
  const total       = deriveMissionCount(ac);
  const typeColors: Record<string, string> = {
    CAP: "#3b82f6", QRA: "#D9192E", Recce: "#22d3ee",
    "AI Strike": "hsl(42 64% 53%)", Escort: "#a855f7", Transport: "#6b7280",
  };

  const byType = [
    { type: "CAP",       count: Math.round(total * 0.32), hours: +(total * 0.32 * 2.1).toFixed(1) },
    { type: "QRA",       count: Math.round(total * 0.26), hours: +(total * 0.26 * 1.4).toFixed(1) },
    { type: "Recce",     count: Math.round(total * 0.17), hours: +(total * 0.17 * 1.8).toFixed(1) },
    { type: "AI Strike", count: Math.round(total * 0.13), hours: +(total * 0.13 * 2.6).toFixed(1) },
    { type: "Escort",    count: Math.round(total * 0.08), hours: +(total * 0.08 * 1.9).toFixed(1) },
    { type: "Transport", count: total - Math.round(total * 0.96), hours: +(total * 0.04 * 1.75).toFixed(1) },
  ];

  const callsign = CALLSIGN_MAP[ac.tailNumber] ?? "N/A";

  return (
    <div>
      <ModalHeader title={`${total} Uppdrag — ${ac.tailNumber}`} subtitle="Uppdragshistorik & Statistik" onClose={onClose} />
      <div className="px-6 py-5 space-y-6">

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Totala uppdrag",     value: String(total),                           color: "#D7DEE1" },
            { label: "Flygtimmar (plan)",  value: `${ac.flightHours} h`,                  color: "hsl(42 64% 53%)" },
            { label: "Till nästa service", value: `${ac.hoursToService.toFixed(1)} h`,     color: ac.hoursToService < 20 ? "#D9192E" : "hsl(152 60% 38%)" },
            { label: "Planhälsa",          value: `${ac.health}%`,                         color: healthColor(ac.health) },
          ].map((k) => (
            <div key={k.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(215,222,225,0.1)" }}>
              <div className="text-xl font-black font-mono" style={{ color: k.color }}>{k.value}</div>
              <div className="text-[9px] font-mono uppercase tracking-widest text-[#D7DEE1]/40 mt-1">{k.label}</div>
            </div>
          ))}
        </div>

        {ac.currentMission && (
          <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.3)" }}>
            <Shield className="h-5 w-5 flex-shrink-0 text-blue-400" />
            <div>
              <div className="text-[11px] font-mono font-bold text-blue-400">AKTIVT UPPDRAG: {ac.currentMission}</div>
              <div className="text-[9px] font-mono text-[#D7DEE1]/45 mt-0.5">
                Pilot: {callsign} · Payload: {ac.payload ?? "N/A"}
                {ac.missionEndHour != null && ` · Sluttid: ${String(ac.missionEndHour).padStart(2, "0")}:00`}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl p-4 flex items-center gap-4" style={{
          background: ac.hoursToService < 20 ? "rgba(217,25,46,0.08)" : "rgba(215,173,58,0.08)",
          border: `1px solid ${ac.hoursToService < 20 ? "rgba(217,25,46,0.35)" : "rgba(215,173,58,0.3)"}`,
        }}>
          <Wrench className="h-5 w-5 flex-shrink-0" style={{ color: ac.hoursToService < 20 ? "#D9192E" : "hsl(42 64% 53%)" }} />
          <div>
            <div className="text-[11px] font-mono font-bold" style={{ color: ac.hoursToService < 20 ? "#D9192E" : "hsl(42 64% 53%)" }}>
              {ac.hoursToService < 20 ? "⚠ SERVICEVARNING" : "100h-Kontroll"} om {ac.hoursToService.toFixed(1)} flygtimmar
            </div>
            <div className="text-[9px] font-mono text-[#D7DEE1]/45 mt-0.5">
              Beräknad åtgång: 14 man-timmar · Ansvarig: {CREW_ROSTER[ac.tailNumber]?.name ?? "Tekniker"}
            </div>
          </div>
        </div>

        <div>
          <div className="text-[9px] font-mono uppercase tracking-widest text-[#D7DEE1]/40 mb-3">Fördelning per Uppdragstyp</div>
          <div className="space-y-2">
            {byType.filter((t) => t.count > 0).map((t) => {
              const color = typeColors[t.type] ?? "#888";
              const pct = Math.round((t.count / total) * 100);
              return (
                <div key={t.type} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                      <span className="text-[10px] font-mono text-[#D7DEE1]">{t.type}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-mono">
                      <span className="text-[#D7DEE1]/50">{t.hours} h</span>
                      <span className="font-bold" style={{ color }}>{t.count} st · {pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab type ─────────────────────────────────────────────────────────────────

type DashTab = "oversikt" | "system" | "vapen" | "operationer" | "anmarkningar";

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AircraftDashboard({ embedded = false, aircraftTailNumber }: { embedded?: boolean; aircraftTailNumber?: string } = {}) {
  const { tailNumber: paramTailNumber } = useParams<{ tailNumber: string }>();
  const tailNumber = aircraftTailNumber ?? paramTailNumber;
  const { state } = useGame();
  const navigate = useNavigate();

  const aircraft = state.bases.flatMap((b) => b.aircraft).find((a) => a.tailNumber === tailNumber);

  const [activeTab, setActiveTab]   = useState<DashTab>("oversikt");
  const [modal, setModal]           = useState<"pilot" | "crew" | "missions" | null>(null);
  const [snagFilter, setSnagFilter] = useState<"all" | "green" | "yellow" | "red">("all");

  if (!aircraft) {
    return (
      <div className="min-h-full flex items-center justify-center font-mono" style={{ background: "#0C234C" }}>
        <div className="text-center space-y-3">
          <div className="text-2xl font-black text-[#D7DEE1]">Flygplan ej hittat</div>
          <div className="text-[11px] text-[#D7DEE1]/50">Svansnummer "{tailNumber}" existerar inte i nuvarande speltillstånd.</div>
          {!embedded && (
            <Link to="/" className="inline-flex items-center gap-1.5 text-[10px] text-[#D7DEE1]/50 hover:text-[#D7DEE1] mt-4">
              <ArrowLeft className="h-3 w-3" /> Tillbaka till huvudbas
            </Link>
          )}
        </div>
      </div>
    );
  }

  const ac            = aircraft;
  const sm            = STATUS_META[ac.status] ?? STATUS_META.unavailable;
  const components    = deriveComponents(ac);
  const subComponents = deriveSubComponents(ac);
  const mainLog       = deriveMaintenanceLog(ac);
  const snagReports   = deriveSnagReports(ac, CALLSIGN_MAP[ac.tailNumber] ?? "N/A");
  const mtbf          = deriveMTBF(ac);
  const missionCount  = deriveMissionCount(ac);
  const pilotInfo     = PILOT_ROSTER[ac.tailNumber] ?? { name: "Okänd pilot", callsign: "N/A", rank: "OF-?" };
  const crewInfo      = CREW_ROSTER[ac.tailNumber]  ?? { name: "Okänd tekniker", id: "N/A", cert: "N/A" };
  const anyCritical   = ac.health < 30;
  const filteredSnags = snagReports.filter((s) => snagFilter === "all" ? true : s.severity === snagFilter);
  const redSnagCount  = snagReports.filter((s) => s.severity === "red").length;
  const gMax          = (5.5 + (ac.flightHours % 30) * 0.1).toFixed(1);
  const allComponents = [...components, ...subComponents];

  const tabs: { id: DashTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "oversikt",     label: "Översikt",     icon: <Shield className="h-3.5 w-3.5" /> },
    { id: "system",       label: "System",       icon: <Activity className="h-3.5 w-3.5" /> },
    { id: "vapen",        label: "Vapen & Last", icon: <Target className="h-3.5 w-3.5" /> },
    { id: "operationer",  label: "Operationer",  icon: <Wrench className="h-3.5 w-3.5" /> },
    { id: "anmarkningar", label: "Anmärkningar", icon: <AlertTriangle className="h-3.5 w-3.5" />, badge: redSnagCount || undefined },
  ];

  return (
    <div className="min-h-screen font-mono flex flex-col" style={{ background: "#0C234C" }}>

      {/* ── COMPACT HEADER ── */}
      <header
        className="relative overflow-hidden border-b"
        style={{
          borderColor: anyCritical ? "#D9192E" : "rgba(215,222,225,0.12)",
          boxShadow:   anyCritical ? "0 0 32px rgba(217,25,46,0.45)" : "none",
          background: "linear-gradient(180deg, rgba(10,28,62,1) 0%, rgba(8,20,48,1) 100%)",
        }}
      >
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(215,222,225,1) 1px, transparent 1px), linear-gradient(90deg, rgba(215,222,225,1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between gap-6">
            {/* Left: identity */}
            <div className="flex-1 space-y-2 min-w-0">
              {!embedded && (
                <Link to="/" className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[#D7DEE1]/40 hover:text-[#D7DEE1] transition-colors">
                  <ArrowLeft className="h-3 w-3" /> TILLBAKA TILL HUVUDBAS
                </Link>
              )}
              <div className="flex items-end gap-4 flex-wrap">
                <h1 className="text-5xl font-black tracking-tight text-white leading-none">
                  {ac.tailNumber}
                </h1>
                {pilotInfo.callsign !== "N/A" && (
                  <span className="text-2xl font-bold pb-1" style={{ color: "#D9AB3A" }}>"{pilotInfo.callsign}"</span>
                )}
                <span className="text-[10px] font-mono text-[#D7DEE1]/35 uppercase tracking-widest pb-1">
                  {ac.type.replace(/_/g, "/")} · {ac.currentBase}
                </span>
              </div>
              {/* Status badges */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full border ${sm.cls}`}>
                  <Shield className="h-3 w-3" />
                  {sm.label}
                </span>
                {ac.currentMission && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full border text-blue-400 bg-blue-400/10 border-blue-400/40">
                    UPPDRAG: {ac.currentMission}{ac.payload ? ` · ${ac.payload}` : ""}
                    {ac.missionEndHour != null && ` · ETA ${String(ac.missionEndHour).padStart(2, "0")}:00Z`}
                  </span>
                )}
                {ac.maintenanceType && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full border text-status-amber bg-status-amber/10 border-status-amber/40">
                    UH: {ac.maintenanceType.replace(/_/g, " ")}{ac.maintenanceTimeRemaining != null ? ` · ${ac.maintenanceTimeRemaining}h kvar` : ""}
                  </span>
                )}
              </div>
            </div>
            {/* Silhouette */}
            <div className="flex-shrink-0 hidden sm:block">
              <img src={grippenSilhouette} alt="Gripen" className="h-28 w-auto object-contain opacity-90"
                style={{ filter: sm.silFilter }} />
            </div>
          </div>

          {/* ── QUICK STATS STRIP ── */}
          <div className="grid grid-cols-4 gap-4 mt-5 pt-4 border-t" style={{ borderColor: "rgba(215,222,225,0.08)" }}>
            {[
              { label: "Flygtimmar totalt",  value: `${ac.flightHours} h`,              color: "#D7DEE1" },
              { label: "Till nästa service", value: `${ac.hoursToService.toFixed(1)} h`, color: ac.hoursToService < 20 ? "#D9192E" : "hsl(152 60% 38%)" },
              { label: "Planhälsa",          value: `${ac.health}%`,                    color: healthColor(ac.health) },
              { label: "Genomförda uppdrag", value: String(missionCount),               color: "#D7DEE1" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[9px] font-mono uppercase tracking-widest text-[#D7DEE1]/35 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── STICKY TAB BAR ── */}
      <div
        className="sticky top-0 z-40 border-b"
        style={{ background: "rgba(7,18,44,0.95)", backdropFilter: "blur(20px)", borderColor: "rgba(215,222,225,0.1)" }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-stretch overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {tabs.map(({ id, label, icon, badge }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className="relative flex items-center gap-2 px-5 py-4 text-[11px] font-mono font-bold uppercase tracking-widest transition-all whitespace-nowrap flex-shrink-0 border-b-2"
                  style={{
                    color: isActive ? "#D7DEE1" : "rgba(215,222,225,0.35)",
                    borderColor: isActive ? "#D9192E" : "transparent",
                    background: isActive ? "rgba(217,25,46,0.07)" : "transparent",
                  }}
                >
                  {icon}
                  {label}
                  {badge ? (
                    <span className="ml-0.5 h-4 min-w-[1rem] px-1 rounded-full text-[8px] font-black flex items-center justify-center"
                      style={{ background: "#D9192E", color: "white" }}>
                      {badge}
                    </span>
                  ) : null}
                  {isActive && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: "rgba(217,25,46,0.04)" }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >

            {/* ──── ÖVERSIKT ──── */}
            {activeTab === "oversikt" && (
              <div className="space-y-8">

                {/* Alert banner: critical/maintenance */}
                {(anyCritical || ac.status === "under_maintenance") && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-xl p-4 flex items-center gap-4"
                    style={{
                      background: anyCritical ? "rgba(217,25,46,0.08)" : "rgba(215,173,58,0.07)",
                      border: `1px solid ${anyCritical ? "rgba(217,25,46,0.5)" : "rgba(215,173,58,0.4)"}`,
                      boxShadow: anyCritical ? "0 0 24px rgba(217,25,46,0.2)" : "none",
                    }}
                  >
                    <AlertTriangle className="h-5 w-5 flex-shrink-0"
                      style={{ color: anyCritical ? "#D9192E" : "hsl(42 64% 53%)" }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-mono font-bold"
                        style={{ color: anyCritical ? "#D9192E" : "hsl(42 64% 53%)" }}>
                        {anyCritical
                          ? `${ac.tailNumber} GROUNDED — NMC. Hälsovärde ${ac.health}% under operativ minimigräns (30%).`
                          : `Under service: ${ac.maintenanceType?.replace(/_/g, " ")}${ac.maintenanceTimeRemaining != null ? ` · Klar om ${ac.maintenanceTimeRemaining}h` : ""}`}
                      </div>
                      <div className="text-[9px] font-mono text-[#D7DEE1]/45 mt-0.5">
                        {anyCritical
                          ? "Teknisk chef informerad. Inga flygtillstånd tills godkänd BIT-kontroll."
                          : `Ansvarig tekniker: ${crewInfo.name}`}
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab("anmarkningar")}
                      className="text-[9px] font-mono font-bold px-3 py-1.5 rounded-lg border flex-shrink-0 transition-colors hover:bg-white/5"
                      style={{
                        color: anyCritical ? "#D9192E" : "hsl(42 64% 53%)",
                        borderColor: anyCritical ? "rgba(217,25,46,0.4)" : "rgba(215,173,58,0.4)",
                      }}
                    >
                      SE ANMÄRKNINGAR →
                    </button>
                  </motion.div>
                )}

                {/* Mini health overview — all 7 systems */}
                <section>
                  <SectionLabel label="Systemhälsa — Snabböversikt (klicka för detaljer)" />
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {allComponents.map((c) => {
                      const col = healthColor(c.health);
                      const CompIcon = c.icon;
                      return (
                        <motion.button
                          key={c.id}
                          whileHover={{ y: -3, transition: { duration: 0.15 } }}
                          onClick={() => setActiveTab("system")}
                          className="rounded-xl p-3 text-center space-y-2"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: `1px solid ${c.health < 30 ? "rgba(217,25,46,0.55)" : c.health < 70 ? "rgba(215,173,58,0.3)" : "rgba(215,222,225,0.1)"}`,
                            boxShadow: c.health < 30 ? "0 0 12px rgba(217,25,46,0.25)" : "none",
                          }}
                        >
                          <div className="flex justify-center">
                            <CompIcon className="h-4 w-4" style={{ color: col }} />
                          </div>
                          <div className="text-base font-black font-mono leading-none" style={{ color: col }}>
                            {c.health}%
                          </div>
                          <div className="text-[8px] font-mono text-[#D7DEE1]/40 uppercase tracking-wide leading-tight">
                            {c.label}
                          </div>
                          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${c.health}%`, background: col }} />
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </section>

                {/* Pilot & Crew */}
                <section>
                  <SectionLabel label="Pilot & Crew — Klicka för fullständig profil" />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <CrewCard
                      icon={<User className="h-4 w-4" />}
                      label="Assigned Pilot"
                      primary={pilotInfo.name}
                      secondary={`"${pilotInfo.callsign}" · ${pilotInfo.rank}`}
                      onClick={() => setModal("pilot")}
                    />
                    <CrewCard
                      icon={<Wrench className="h-4 w-4" />}
                      label="Crew Chief"
                      primary={crewInfo.name}
                      secondary={`${crewInfo.id} · ${crewInfo.cert}`}
                      onClick={() => setModal("crew")}
                    />
                    <CrewCard
                      icon={<Activity className="h-4 w-4" />}
                      label="Uppdragsstatistik"
                      primary={`${missionCount} genomförda uppdrag`}
                      secondary={`${ac.flightHours}h flygtid · service om ${ac.hoursToService.toFixed(1)}h`}
                      onClick={() => setModal("missions")}
                    />
                  </div>
                </section>

                {/* Operativ status + Service countdown */}
                <section>
                  <SectionLabel label="Operativ Status" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl p-5 space-y-3"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(215,222,225,0.1)" }}>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" style={{ color: anyCritical ? "#D9192E" : "hsl(152 60% 38%)" }} />
                        <span className="text-[9px] font-mono uppercase tracking-widest text-[#D7DEE1]/40">Nuvarande Status</span>
                      </div>
                      <div className={`text-sm font-black font-mono ${sm.cls.split(" ")[0]}`}>{sm.label}</div>
                      <div className="text-[10px] font-mono text-[#D7DEE1]/50">
                        {ac.currentMission
                          ? `Aktivt uppdrag: ${ac.currentMission}`
                          : ac.status === "ready" ? "Tillgänglig för uppdrag"
                          : ac.status === "under_maintenance" ? "Underhåll pågår"
                          : ac.status === "unavailable" ? "Teknisk markvistelse — ingen flygning"
                          : ac.status === "returning" ? "Återvänder till bas"
                          : ac.status === "allocated" ? "Tilldelad i ATO-plan"
                          : "–"}
                      </div>
                      {ac.missionEndHour != null && (
                        <div className="text-[10px] font-mono" style={{ color: "#3b82f6" }}>
                          Beräknad ankomst: {String(ac.missionEndHour).padStart(2, "0")}:00Z
                        </div>
                      )}
                      <button
                        onClick={() => setActiveTab("operationer")}
                        className="text-[9px] font-mono text-[#D7DEE1]/35 hover:text-[#D7DEE1]/60 transition-colors"
                      >
                        Visa operationslogg →
                      </button>
                    </div>

                    <div className="rounded-xl p-5 space-y-3"
                      style={{
                        background: ac.hoursToService < 20 ? "rgba(217,25,46,0.06)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${ac.hoursToService < 20 ? "rgba(217,25,46,0.4)" : "rgba(215,222,225,0.1)"}`,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4"
                          style={{ color: ac.hoursToService < 20 ? "#D9192E" : "hsl(42 64% 53%)" }} />
                        <span className="text-[9px] font-mono uppercase tracking-widest text-[#D7DEE1]/40">Nästa 100h-Service</span>
                      </div>
                      <div className="text-2xl font-black font-mono"
                        style={{ color: ac.hoursToService < 20 ? "#D9192E" : "hsl(152 60% 38%)" }}>
                        {ac.hoursToService.toFixed(1)} h kvar
                      </div>
                      <div className="text-[10px] font-mono text-[#D7DEE1]/50">
                        {ac.hoursToService < 20
                          ? "⚠ SERVICEVARNING – Schemalägg omgående"
                          : "Inom operativt godkänt intervall"}
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (1 - ac.hoursToService / 100) * 100)}%`,
                            background: ac.hoursToService < 20 ? "#D9192E" : "hsl(152 60% 38%)",
                          }}
                        />
                      </div>
                      <button
                        onClick={() => setActiveTab("operationer")}
                        className="text-[9px] font-mono text-[#D7DEE1]/35 hover:text-[#D7DEE1]/60 transition-colors"
                      >
                        Visa underhållslogg →
                      </button>
                    </div>
                  </div>
                </section>

              </div>
            )}

            {/* ──── SYSTEM ──── */}
            {activeTab === "system" && (
              <div className="space-y-8">
                <section>
                  <SectionLabel label="Component Health Index (CHI) — Primärsystem" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {components.map((c) => <ComponentCard key={c.id} comp={c} />)}
                  </div>
                </section>

                <section>
                  <SectionLabel label="Component Health Index — Delsystem" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {subComponents.map((c) => <ComponentCard key={c.id} comp={c} />)}
                  </div>
                  <p className="text-[9px] font-mono text-[#D7DEE1]/25 mt-3 text-center">
                    Hovra över ett komponentkort för att visa degraderingskurvan
                  </p>
                </section>

                <section>
                  <SectionLabel label="MTBF-Analys — Felriskbedömning per komponent" />
                  <div className="rounded-xl overflow-hidden"
                    style={{ border: "1px solid rgba(215,222,225,0.1)", background: "rgba(255,255,255,0.03)" }}>
                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 px-5 py-2.5 border-b border-white/5">
                      {["Komponent", "MTBF", "Senaste 10h", "Risk/10h"].map((h) => (
                        <span key={h} className="text-[9px] font-mono uppercase tracking-widest text-[#D7DEE1]/30">{h}</span>
                      ))}
                    </div>
                    {mtbf.map((m, i) => {
                      const riskColor = m.probability > 4 ? "#D9192E" : m.probability > 2 ? "hsl(42 64% 53%)" : "hsl(152 60% 32%)";
                      return (
                        <div key={i} className="px-5 py-3 border-b border-white/5 last:border-0 space-y-1.5">
                          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 items-center">
                            <span className="text-[10px] font-mono text-[#D7DEE1]">{m.component}</span>
                            <span className="text-[10px] font-mono text-[#D7DEE1]/50">{m.mtbf} h</span>
                            <span className="text-[10px] font-mono"
                              style={{ color: m.recentFaults > 0 ? "hsl(42 64% 53%)" : "hsl(152 60% 38%)" }}>
                              {m.recentFaults > 0 ? `⚠ ${m.recentFaults} varning` : "OK"}
                            </span>
                            <span className="text-[10px] font-mono font-bold" style={{ color: riskColor }}>
                              {m.probability} %
                            </span>
                          </div>
                          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full"
                              style={{ width: `${Math.min(m.probability * 10, 100)}%`, background: riskColor }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {/* ──── VAPEN & LAST ──── */}
            {activeTab === "vapen" && (
              <div className="space-y-8">
                <section>
                  <SectionLabel label="Vapenstationer & Last (Stores Management)" />
                  <div className="rounded-xl p-6 space-y-6"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(215,222,225,0.1)" }}>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" style={{ color: "hsl(42 64% 53%)" }} />
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#D7DEE1]/50">
                          7 Aktiva Pyloner · Payload: {ac.payload ?? "Standard load"}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${sm.cls}`}>
                        {sm.label}
                      </span>
                    </div>

                    {/* Station grid */}
                    <div className="grid grid-cols-7 gap-3">
                      {WEAPONS_STATIONS.map((st) => {
                        const c = stationColor(st.type);
                        return (
                          <motion.div
                            key={st.id}
                            whileHover={{ scale: 1.05, transition: { duration: 0.15 } }}
                            className="flex flex-col items-center gap-2"
                          >
                            <div className="text-[9px] font-mono text-[#D7DEE1]/30 text-center leading-tight">
                              STA {st.id}<br />{st.pos}
                            </div>
                            <div className="w-full rounded-lg p-3 text-center"
                              style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                              <div className="text-[11px] font-black font-mono" style={{ color: c.text }}>{st.load}</div>
                            </div>
                            <div className="text-[8px] font-mono text-center leading-tight" style={{ color: c.tag }}>
                              {st.status}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-6 pt-4 border-t" style={{ borderColor: "rgba(215,222,225,0.08)" }}>
                      <span className="text-[9px] font-mono uppercase tracking-widest text-[#D7DEE1]/25">Legenda:</span>
                      {[
                        { type: "missile", label: "Missilsystem (skarp)" },
                        { type: "tank",    label: "Bränsletank" },
                        { type: "pod",     label: "Sensor-/pekpod" },
                      ].map(({ type, label }) => {
                        const c = stationColor(type);
                        return (
                          <div key={type} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ background: c.bg, border: `1px solid ${c.border}` }} />
                            <span className="text-[9px] font-mono text-[#D7DEE1]/40">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* ──── OPERATIONER ──── */}
            {activeTab === "operationer" && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <section>
                    <SectionLabel label={`Flight Log — ${ac.tailNumber} (${ac.flightHours}h totalt)`} />
                    <div className="rounded-xl overflow-hidden"
                      style={{ border: "1px solid rgba(215,222,225,0.1)", background: "rgba(255,255,255,0.03)" }}>
                      <div className="grid grid-cols-4 px-4 py-2.5 border-b border-white/5">
                        {["Datum", "Uppdragstyp", "Flygtid", "Bränsle"].map((h) => (
                          <span key={h} className="text-[9px] font-mono uppercase tracking-widest text-[#D7DEE1]/30">{h}</span>
                        ))}
                      </div>
                      {[
                        { date: "2026-03-18", type: "Scramble / QRA", hours: 1.4, fuel: "2 840 kg" },
                        { date: "2026-03-16", type: "CAP",            hours: 2.1, fuel: "4 120 kg" },
                        { date: "2026-03-14", type: "Recce",          hours: 1.8, fuel: "3 560 kg" },
                        { date: "2026-03-11", type: "AI Strike",      hours: 2.6, fuel: "5 200 kg" },
                        { date: "2026-03-09", type: "Escort",         hours: 1.9, fuel: "3 780 kg" },
                      ].map((e, i) => (
                        <div key={i} className="grid grid-cols-4 px-4 py-2.5 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                          <span className="text-[10px] font-mono text-[#D7DEE1]/50">{e.date}</span>
                          <span className="text-[10px] font-mono font-semibold text-[#D7DEE1]">{e.type}</span>
                          <span className="text-[10px] font-mono text-[#D7DEE1]">{e.hours} h</span>
                          <span className="text-[10px] font-mono text-[#D7DEE1]/70">{e.fuel}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <SectionLabel label={`G-Load Profil — Max ${gMax}g (senaste pass 2026-03-18)`} />
                    <div className="rounded-xl p-4"
                      style={{ border: "1px solid rgba(215,222,225,0.1)", background: "rgba(255,255,255,0.03)" }}>
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" style={{ color: "hsl(42 64% 53%)" }} />
                          <span className="text-[10px] font-mono text-[#D7DEE1]/50 uppercase tracking-widest">
                            Airframe: {components[2].health}% {healthLabel(components[2].health)}
                          </span>
                        </div>
                        <div className="flex gap-4 text-[9px] font-mono">
                          <span style={{ color: "#D9192E" }}>MAX {gMax}g</span>
                          <span style={{ color: "rgba(215,222,225,0.4)" }}>LIMIT: 9g</span>
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={140}>
                        <AreaChart data={G_LOAD_PROFILE}>
                          <defs>
                            <linearGradient id="gGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#D9192E" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#D9192E" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <YAxis domain={[0, 10]} tick={{ fontSize: 9, fontFamily: "monospace", fill: "rgba(215,222,225,0.35)" }} width={24} />
                          <ReferenceLine y={9} stroke="#D9192E" strokeDasharray="4 3" strokeWidth={1.5}
                            label={{ value: "9g LIMIT", position: "right", fontSize: 8, fontFamily: "monospace", fill: "#D9192E" }} />
                          <Area type="monotone" dataKey="g" stroke="hsl(42 64% 53%)" strokeWidth={2} fill="url(#gGrad)" dot={false} />
                          <ReTooltip
                            contentStyle={{ background: "#0C234C", border: "1px solid rgba(215,222,225,0.2)", borderRadius: 6, fontSize: 10, fontFamily: "monospace", color: "#D7DEE1" }}
                            formatter={(v: number) => [`${v} g`, "G-last"]}
                            labelFormatter={(l) => `T+${l}s`}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </section>
                </div>

                <section>
                  <SectionLabel label="Maintenance Log — Arbetsorderhistorik" />
                  <div className="rounded-xl overflow-hidden"
                    style={{ border: "1px solid rgba(215,222,225,0.1)", background: "rgba(255,255,255,0.03)" }}>
                    {mainLog.map((entry, i) => (
                      <div key={i} className="flex items-start gap-4 px-5 py-3.5 border-b border-white/5 last:border-0"
                        style={{ background: entry.live ? "rgba(215,173,58,0.06)" : "transparent" }}>
                        <div className="flex-shrink-0 mt-1.5">
                          <div className="w-2 h-2 rounded-full"
                            style={{ background: entry.live ? "hsl(42 64% 53%)" : "hsl(152 60% 32%)" }} />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="text-[11px] font-mono font-semibold"
                            style={{ color: entry.live ? "hsl(42 64% 53%)" : "#D7DEE1" }}>
                            {entry.action}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                              style={{ background: "rgba(215,173,58,0.12)", color: "hsl(42 64% 53%)", border: "1px solid rgba(215,173,58,0.25)" }}>
                              S/N: {entry.serial}
                            </span>
                            <span className="text-[9px] font-mono text-[#D7DEE1]/40">
                              {entry.manHours} man-h · {entry.tech}
                            </span>
                          </div>
                        </div>
                        <div className="text-[9px] font-mono text-[#D7DEE1]/30 flex-shrink-0">{entry.date}</div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* ──── ANMÄRKNINGAR ──── */}
            {activeTab === "anmarkningar" && (
              <div className="space-y-6">
                {/* Filter bar */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <SectionLabel label={`Pilot Snag Reports — ${filteredSnags.length} av ${snagReports.length} visas`} />
                  <div className="flex gap-2 flex-shrink-0 flex-wrap">
                    {(["all", "green", "yellow", "red"] as const).map((f) => {
                      const labels = { all: "ALLA", green: "GRÖN", yellow: "GUL", red: "RÖD" };
                      const colors = {
                        all:    { active: "rgba(215,222,225,0.15)", text: "#D7DEE1",          border: "rgba(215,222,225,0.35)" },
                        green:  { active: "rgba(34,160,90,0.15)",   text: "hsl(152 60% 38%)", border: "rgba(34,160,90,0.4)" },
                        yellow: { active: "rgba(215,173,58,0.15)",  text: "hsl(42 64% 53%)",  border: "rgba(215,173,58,0.4)" },
                        red:    { active: "rgba(217,25,46,0.15)",   text: "#D9192E",           border: "rgba(217,25,46,0.4)" },
                      };
                      const c = colors[f];
                      const isActive = snagFilter === f;
                      const cnt = f === "all"
                        ? snagReports.length
                        : snagReports.filter((s) => s.severity === f).length;
                      return (
                        <motion.button
                          key={f}
                          whileHover={{ scale: 1.04 }}
                          onClick={() => setSnagFilter(f)}
                          className="text-[9px] font-mono font-bold px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5"
                          style={{
                            background: isActive ? c.active : "transparent",
                            color: c.text,
                            border: `1px solid ${isActive ? c.border : "rgba(215,222,225,0.12)"}`,
                            opacity: isActive ? 1 : 0.5,
                          }}
                        >
                          {labels[f]}
                          <span className="opacity-60">({cnt})</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {filteredSnags.map((s) => <SnagCard key={s.id} snag={s} />)}
                  </AnimatePresence>
                  {filteredSnags.length === 0 && (
                    <div className="text-center py-12 text-[11px] font-mono text-[#D7DEE1]/30">
                      Inga rapporter för valt filter.
                    </div>
                  )}
                </div>

                {/* ── HÄNDELSEHISTORIK ── */}
                {(() => {
                  const acEvents = state.events
                    .filter((e) => e.aircraftId === ac.tailNumber)
                    .reverse()
                    .slice(0, 8);

                  const riskDot = (risk?: string) =>
                    risk === "catastrophic" || risk === "high" ? "#D9192E"
                    : risk === "medium" ? "#f59e0b"
                    : "#22c55e";

                  const actionLabel = (type?: string) => {
                    const labels: Record<string, string> = {
                      MISSION_DISPATCH: "UPPDRAG", MAINTENANCE_START: "UNDERHÅLL",
                      MAINTENANCE_PAUSE: "PAUSE", UTFALL_APPLIED: "UTFALL",
                      FAULT_NMC: "NMC", LANDING_RECEIVED: "LANDNING",
                      SPARE_PART_USED: "RESERVDEL", HANGAR_CONFIRM: "HANGAR",
                    };
                    return type ? labels[type] ?? type : "";
                  };

                  return (
                    <div className="space-y-3 mt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D7DEE1]/40">HÄNDELSEHISTORIK</span>
                          <div className="flex-1 h-px" style={{ background: "rgba(215,222,225,0.08)", width: 80 }} />
                        </div>
                        <button
                          onClick={() => navigate("/aar")}
                          className="text-[9px] font-mono text-[#D7DEE1]/40 hover:text-[#D7DEE1]/70 transition-colors"
                        >
                          Visa alla →
                        </button>
                      </div>

                      {acEvents.length === 0 ? (
                        <div className="text-[11px] font-mono text-[#D7DEE1]/30 py-4">
                          Inga registrerade händelser för detta flygplan.
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {acEvents.map((evt) => (
                            <div key={evt.id} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(215,222,225,0.07)" }}>
                              <div className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ background: riskDot(evt.riskLevel) }} />
                              <span className="text-[9px] font-mono flex-shrink-0" style={{ color: "rgba(215,222,225,0.35)", fontFamily: "monospace" }}>
                                {evt.timestamp}
                              </span>
                              {evt.actionType && (
                                <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                                  style={{ background: "rgba(215,222,225,0.08)", color: "rgba(215,222,225,0.5)" }}>
                                  {actionLabel(evt.actionType)}
                                </span>
                              )}
                              <span className="text-[10px] font-mono truncate flex-1" style={{ color: "#D7DEE1" }}>
                                {evt.message}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {modal && (
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
            onClick={() => setModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl font-mono"
              style={{ background: "#0a1d3e", border: "1px solid rgba(215,222,225,0.18)", boxShadow: "0 24px 64px rgba(0,0,0,0.65)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {modal === "pilot"    && <PilotModal    ac={ac} onClose={() => setModal(null)} />}
              {modal === "crew"     && <CrewModal     ac={ac} onClose={() => setModal(null)} />}
              {modal === "missions" && <MissionsModal ac={ac} onClose={() => setModal(null)} />}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D7DEE1]/40 whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px" style={{ background: "rgba(215,222,225,0.08)" }} />
    </div>
  );
}

function CrewCard({ icon, label, primary, secondary, onClick }: {
  icon: React.ReactNode; label: string; primary: string; secondary: string; onClick?: () => void
}) {
  return (
    <motion.div
      whileHover={onClick ? { y: -3, transition: { duration: 0.15 } } : {}}
      onClick={onClick}
      className="rounded-xl p-4 space-y-2"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(215,222,225,0.1)",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#D7DEE1]/40">
          {icon}
          <span className="text-[9px] uppercase tracking-widest">{label}</span>
        </div>
        {onClick && <ChevronRight className="h-3.5 w-3.5 text-[#D7DEE1]/25" />}
      </div>
      <div className="text-[13px] font-bold text-[#D7DEE1]">{primary}</div>
      <div className="text-[10px] text-[#D7DEE1]/50">{secondary}</div>
    </motion.div>
  );
}
