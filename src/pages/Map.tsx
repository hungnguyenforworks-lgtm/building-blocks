import { useState, useCallback, useRef, useEffect } from "react";
import MapGL, { NavigationControl, MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useGame } from "@/context/GameContext";
import { TopBar } from "@/components/game/TopBar";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin } from "lucide-react";

import { BASE_COORDS, SWEDEN_CENTER, INITIAL_ZOOM, MAP_STYLE } from "./map/constants";
import { SelectedEntity } from "./map/helpers";
import { BaseMarker } from "./map/BaseMarker";
import { SupplyLinesLayer } from "./map/SupplyLinesLayer";
import { AircraftLayer } from "./map/AircraftLayer";
import { BaseDetailPanel } from "./map/BaseDetailPanel";
import { AircraftDetailPanel } from "./map/AircraftDetailPanel";
import { Base, AircraftStatus } from "@/types/game";

export default function MapPage() {
  const { state, advanceTurn, resetGame, dispatch } = useGame();
  const [selected, setSelected] = useState<SelectedEntity>(null);
  const mapRef = useRef<MapRef>(null);
  const isFollowing = useRef(false);
  const followStartTime = useRef<number | null>(null);

  const selectedBase =
    selected?.kind === "base" || selected?.kind === "aircraft"
      ? state.bases.find((b) => b.id === selected.baseId)
      : undefined;

  const selectedAircraft =
    selected?.kind === "aircraft"
      ? selectedBase?.aircraft.find((a) => a.id === selected.aircraftId)
      : undefined;

  const selectedAircraftId = selected?.kind === "aircraft" ? selected.aircraftId : undefined;

  // Reset follow state when selection changes
  useEffect(() => {
    isFollowing.current = false;
    followStartTime.current = null;
  }, [selectedAircraftId]);

  const handlePositionUpdate = useCallback((lng: number, lat: number) => {
    const map = mapRef.current;
    if (!map) return;
    const now = performance.now();
    if (!followStartTime.current) {
      followStartTime.current = now;
      isFollowing.current = true;
      map.flyTo({ center: [lng, lat], zoom: 12, duration: 900, pitch: 30 });
      return;
    }
    // Wait for initial flyTo to complete before smooth-following
    if (now - followStartTime.current < 1000) return;
    map.easeTo({ center: [lng, lat], duration: 150 });
  }, []);

  const handleRecall = useCallback(() => {
    if (selected?.kind !== "aircraft") return;
    dispatch({
      type: "COMPLETE_LANDING_CHECK",
      baseId: selected.baseId as import("@/types/game").BaseType,
      aircraftId: selected.aircraftId,
      sendToMaintenance: false,
    });
  }, [selected, dispatch]);

  const handleMapClick = useCallback(() => setSelected(null), []);

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

        {/* Map area */}
        <div className="flex-1 relative overflow-hidden">
          <MapGL
            ref={mapRef}
            initialViewState={{
              longitude: BASE_COORDS.MOB.lng,
              latitude: BASE_COORDS.MOB.lat,
              zoom: 9,
              pitch: 30,
            }}
            mapStyle={MAP_STYLE}
            onClick={handleMapClick}
            onDragStart={() => { isFollowing.current = false; followStartTime.current = null; }}
            style={{ width: "100%", height: "100%" }}
          >
            <NavigationControl position="top-right" />

            <SupplyLinesLayer bases={state.bases} />
            <AircraftLayer
              bases={state.bases}
              onSelectAircraft={(baseId, aircraftId) =>
                setSelected({ kind: "aircraft", baseId, aircraftId })
              }
              selectedAircraftId={selectedAircraftId}
              onPositionUpdate={selectedAircraftId ? handlePositionUpdate : undefined}
            />

            {Object.keys(BASE_COORDS).map((id) => (
              <BaseMarker
                key={id}
                id={id}
                base={state.bases.find((b) => b.id === id)}
                isSelected={selected?.baseId === id}
                onClick={() => setSelected({ kind: "base", baseId: id })}
              />
            ))}
          </MapGL>

          {/* Scanline CRT overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,100,0.01) 2px, rgba(0,255,100,0.01) 4px)",
            }}
          />

          {/* Active aircraft bar */}
          <ActiveAircraftBar
            bases={state.bases}
            selectedAircraftId={selectedAircraftId}
            onSelect={(baseId, aircraftId) => setSelected({ kind: "aircraft", baseId, aircraftId })}
          />
        </div>

        {/* Detail panel */}
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
                <AircraftDetailPanel
                  aircraft={selectedAircraft}
                  onBack={() => setSelected({ kind: "base", baseId: selected.baseId })}
                  onRecall={handleRecall}
                  currentHour={state.hour}
                />
              ) : selectedBase ? (
                <BaseDetailPanel
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

// ── Active aircraft bar ────────────────────────────────────────────────────

const ACTIVE_STATUSES: AircraftStatus[] = ["on_mission", "returning", "in_preparation", "awaiting_launch", "allocated"];

const STATUS_LABEL: Record<string, string> = {
  on_mission:      "UPP",
  returning:       "RET",
  in_preparation:  "KLAR",
  awaiting_launch: "VÄNT",
  allocated:       "TILL",
};

const STATUS_COLOR: Record<string, string> = {
  on_mission:      "#22c55e",
  returning:       "#a78bfa",
  in_preparation:  "#eab308",
  awaiting_launch: "#22d3ee",
  allocated:       "#3b82f6",
};

function ActiveAircraftBar({
  bases,
  selectedAircraftId,
  onSelect,
}: {
  bases: Base[];
  selectedAircraftId: string | undefined;
  onSelect: (baseId: string, aircraftId: string) => void;
}) {
  const activeAircraft = bases.flatMap((base) =>
    base.aircraft
      .filter((ac) => ACTIVE_STATUSES.includes(ac.status))
      .map((ac) => ({ ac, baseId: base.id, baseName: base.name }))
  );

  if (activeAircraft.length === 0) return null;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-10"
      style={{ pointerEvents: "auto" }}
    >
      {/* Fade-up gradient so the bar blends into the map */}
      <div
        className="h-6 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, transparent, rgba(5,10,20,0.85))" }}
      />

      <div
        className="flex items-center gap-0 overflow-x-auto"
        style={{
          background: "rgba(5,10,20,0.92)",
          borderTop: "1px solid rgba(215,171,58,0.25)",
          backdropFilter: "blur(6px)",
          scrollbarWidth: "none",
        }}
      >
        {/* Label */}
        <div
          className="shrink-0 px-3 py-2 border-r flex items-center gap-1.5"
          style={{ borderColor: "rgba(215,171,58,0.2)" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: "#22c55e" }}
          />
          <span className="text-[9px] font-mono font-bold tracking-widest" style={{ color: "#D7AB3A" }}>
            AKTIVA
          </span>
        </div>

        {/* Aircraft chips */}
        <div className="flex items-center gap-1.5 px-2 py-1.5 flex-nowrap">
          {activeAircraft.map(({ ac, baseId, baseName }) => {
            const isSelected = ac.id === selectedAircraftId;
            const color = STATUS_COLOR[ac.status] ?? "#94a3b8";
            const label = STATUS_LABEL[ac.status] ?? ac.status;

            return (
              <button
                key={ac.id}
                onClick={(e) => { e.stopPropagation(); onSelect(baseId, ac.id); }}
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded font-mono text-[10px] transition-all"
                style={{
                  background: isSelected ? `${color}22` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isSelected ? color : "rgba(255,255,255,0.08)"}`,
                  boxShadow: isSelected ? `0 0 8px ${color}55` : "none",
                  color: isSelected ? color : "#94a3b8",
                  transform: isSelected ? "scale(1.05)" : "scale(1)",
                }}
              >
                {/* Status dot */}
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }}
                />
                {/* Tail number */}
                <span className="font-bold" style={{ color: isSelected ? color : "#e2e8f0" }}>
                  {ac.tailNumber}
                </span>
                {/* Mission */}
                {ac.currentMission && (
                  <span style={{ color, opacity: 0.85 }}>{ac.currentMission}</span>
                )}
                {/* Status badge */}
                <span
                  className="text-[8px] px-1 py-0.5 rounded"
                  style={{
                    background: `${color}20`,
                    color,
                    border: `1px solid ${color}40`,
                  }}
                >
                  {label}
                </span>
                {/* Base */}
                <span className="text-[8px] opacity-50">{baseName}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
