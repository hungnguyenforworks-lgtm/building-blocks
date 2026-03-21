import { useMemo, useState, useEffect, useRef } from "react";
import { Marker, useMap } from "react-map-gl/maplibre";
import { Base } from "@/types/game";
import { BASE_COORDS } from "./constants";
import gripenSilhouette from "@/assets/gripen-silhouette.png";

const REBASE_TRANSIT_HOURS = 2;
const TRAIL_POINTS = 80;
const TRAIL_SPAN = 8;
const REBASE_TRAIL_SPAN = 3;
const REBASE_VISUAL_PERIOD = 200;

interface AircraftPosition {
  id: string;
  baseId: string;
  lng: number;
  lat: number;
  angle: number;
  isRebase?: boolean;
}

interface TrailPoint {
  lng: number;
  lat: number;
}


export function AircraftLayer({
  bases,
  currentHour,
  onSelectAircraft,
  selectedAircraftId,
  onPositionUpdate,
}: {
  bases: Base[];
  currentHour?: number;
  onSelectAircraft?: (baseId: string, aircraftId: string) => void;
  selectedAircraftId?: string;
  onPositionUpdate?: (lng: number, lat: number) => void;
}) {
  const { current: mapRef } = useMap();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [phase, setPhase] = useState(0);
  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      setPhase(((now - start) / 1000) % 360);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const { aircraftPositions, orbitTrails, rebaseTrails } = useMemo(() => {
    const positions: AircraftPosition[] = [];
    const allOrbitTrails: TrailPoint[][] = [];
    const allRebaseTrails: TrailPoint[][] = [];

    for (const base of bases) {
      const coords = BASE_COORDS[base.id];
      if (!coords) continue;

      const onMission = base.aircraft.filter((ac) => ac.status === "on_mission");

      let orbitIdx = 0;
      for (const ac of onMission) {
        const isRebase = ac.currentMission === "REBASE" && !!ac.rebaseTarget;

        if (isRebase && ac.rebaseTarget) {
          const destCoords = BASE_COORDS[ac.rebaseTarget];
          if (!destCoords) continue;

          // Animate continuously using phase (same as orbit planes)
          const progress = (phase % REBASE_VISUAL_PERIOD) / REBASE_VISUAL_PERIOD;

          const lng = coords.lng + (destCoords.lng - coords.lng) * progress;
          const lat = coords.lat + (destCoords.lat - coords.lat) * progress;

          // Flight vector and heading (screen y inverted vs lat, Mercator scale correction)
          const dLng = destCoords.lng - coords.lng;
          const dLat = destCoords.lat - coords.lat;
          const midLat = (coords.lat + destCoords.lat) / 2;
          const mercatorScale = 1 / Math.cos(midLat * Math.PI / 180);
          const headingDeg = Math.atan2(-dLat * mercatorScale, dLng) * (180 / Math.PI);

          positions.push({ id: ac.id, baseId: base.id, lng, lat, angle: headingDeg, isRebase: true });

          // Trail: identical approach to orbit — step back in phase-time.
          // i=0 = current position (bright), i increases = past positions (dim).
          const points: TrailPoint[] = [];
          for (let i = 0; i < TRAIL_POINTS; i++) {
            const t = (i / (TRAIL_POINTS - 1)) * REBASE_TRAIL_SPAN;
            const trailProgress = progress - t / REBASE_VISUAL_PERIOD;
            if (trailProgress <= 0) break;
            points.push({
              lng: coords.lng + (destCoords.lng - coords.lng) * trailProgress,
              lat: coords.lat + (destCoords.lat - coords.lat) * trailProgress,
            });
          }
          allRebaseTrails.push(points);
        } else {
          // Normal orbit
          const idx = orbitIdx;
          const baseAngle = (idx * 137.5) % 360;
          const orbitRadius = 0.35 + (idx % 3) * 0.15;
          const orbitSpeed = 4.32 + (idx % 4) * 1.62;
          const currentAngle = baseAngle + phase * orbitSpeed;
          const rad = (currentAngle * Math.PI) / 180;

          const destLng = coords.lng + Math.cos(rad) * orbitRadius;
          const destLat = coords.lat + Math.sin(rad) * orbitRadius * 0.6;

          const vx = -Math.sin(rad);
          const vy = -Math.cos(rad) * 0.6;
          const headingDeg = Math.atan2(vy, vx) * (180 / Math.PI);

          positions.push({ id: ac.id, baseId: base.id, lng: destLng, lat: destLat, angle: headingDeg });

          const points: TrailPoint[] = [];
          for (let i = 0; i < TRAIL_POINTS; i++) {
            const t = (i / (TRAIL_POINTS - 1)) * TRAIL_SPAN;
            const trailPhase = phase - t;
            const trailAngle = baseAngle + trailPhase * orbitSpeed;
            const trailRad = (trailAngle * Math.PI) / 180;
            points.push({
              lng: coords.lng + Math.cos(trailRad) * orbitRadius,
              lat: coords.lat + Math.sin(trailRad) * orbitRadius * 0.6,
            });
          }
          allOrbitTrails.push(points);
          orbitIdx++;
        }
      }
    }

    return { aircraftPositions: positions, orbitTrails: allOrbitTrails, rebaseTrails: allRebaseTrails };
  }, [bases, phase, currentHour]);

  useEffect(() => {
    if (!selectedAircraftId || !onPositionUpdate) return;
    const pos = aircraftPositions.find((p) => p.id === selectedAircraftId);
    if (pos) onPositionUpdate(pos.lng, pos.lat);
  }, [aircraftPositions, selectedAircraftId, onPositionUpdate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const map = mapRef?.getMap();
    if (!canvas || !map) return;

    const mapCanvas = map.getCanvas();
    const dpr = window.devicePixelRatio || 1;
    const w = mapCanvas.clientWidth;
    const h = mapCanvas.clientHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round";
    ctx.lineWidth = 2.5;

    // Orbit trails — green
    for (const trail of orbitTrails) {
      const projected = trail.map((p) => map.project([p.lng, p.lat]));
      for (let i = 0; i < projected.length - 1; i++) {
        const frac = i / (projected.length - 1);
        const opacity = 0.7 * (1 - frac);
        if (opacity < 0.01) break;
        ctx.beginPath();
        ctx.moveTo(projected[i].x, projected[i].y);
        ctx.lineTo(projected[i + 1].x, projected[i + 1].y);
        ctx.strokeStyle = `rgba(34, 197, 94, ${opacity})`;
        ctx.stroke();
      }
    }

    // Rebase trails — cyan, same rendering as orbit trails
    for (const trail of rebaseTrails) {
      const projected = trail.map((p) => map.project([p.lng, p.lat]));
      for (let i = 0; i < projected.length - 1; i++) {
        const frac = i / (projected.length - 1);
        const opacity = 0.7 * (1 - frac);
        if (opacity < 0.01) break;
        ctx.beginPath();
        ctx.moveTo(projected[i].x, projected[i].y);
        ctx.lineTo(projected[i + 1].x, projected[i + 1].y);
        ctx.strokeStyle = `rgba(34, 197, 94, ${opacity})`;
        ctx.stroke();
      }
    }
  }, [orbitTrails, rebaseTrails, mapRef, phase]);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      {aircraftPositions.map((ac) => (
        <Marker key={ac.id} longitude={ac.lng} latitude={ac.lat} anchor="center" style={{ zIndex: 1 }}>
          <img
            src={gripenSilhouette}
            alt=""
            width={20}
            style={{
              cursor: onSelectAircraft ? "pointer" : "default",
              transform: `rotate(${ac.angle}deg)`,
              filter: ac.isRebase
                ? "brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(160deg) drop-shadow(0 0 5px #22d3ee88)"
                : "brightness(0) invert(1) sepia(1) saturate(3) hue-rotate(90deg) drop-shadow(0 0 4px #22c55e88)",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectAircraft?.(ac.baseId, ac.id);
            }}
          />
        </Marker>
      ))}
    </>
  );
}
