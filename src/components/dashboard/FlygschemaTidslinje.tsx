import { useState } from "react";
import { ATOOrder, Base, Aircraft } from "@/types/game";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";

interface FlygschemaTidslinjeProps {
  base: Base;
  hour: number;
  atoOrders?: ATOOrder[];
}

interface Slot {
  label: string;
  start: number;
  end: number;
  color: string;
}

const MISSION_TYPES = ["QRA", "DCA", "RECCE", "AI_DT", "ESCORT", "AEW"];

function getSlots(ac: Aircraft, hour: number, atoOrders?: ATOOrder[]): Slot[] {
  const hash = parseInt(ac.id.replace(/\D/g, "")) || 1;

  const assignedOrder = atoOrders?.find(
    (o) => o.assignedAircraft.includes(ac.id) && (o.status === "assigned" || o.status === "dispatched")
  );

  if (assignedOrder && (ac.status === "ready" || ac.status === "on_mission")) {
    return [
      { label: "Pre", start: Math.max(6, assignedOrder.startHour - 1), end: assignedOrder.startHour, color: "#7c3aed" },
      { label: assignedOrder.missionType, start: assignedOrder.startHour, end: assignedOrder.endHour, color: "#2563eb" },
      { label: "Post-flt", start: assignedOrder.endHour, end: Math.min(22, assignedOrder.endHour + 1), color: "#ea580c" },
    ];
  }

  if (ac.status === "on_mission") {
    const mStart = Math.max(6, hour - 2);
    const mEnd = Math.min(22, hour + 3);
    return [
      { label: "Pre", start: Math.max(6, mStart - 1), end: mStart, color: "#7c3aed" },
      { label: ac.currentMission || "MISSION", start: mStart, end: mEnd, color: "#2563eb" },
      { label: "Post-flt", start: mEnd, end: Math.min(22, mEnd + 1), color: "#ea580c" },
    ];
  }

  if (ac.status === "ready") {
    const mStart = 6 + (hash % 9);
    const mLen = 2 + (hash % 3);
    const mEnd = Math.min(21, mStart + mLen);
    if (mStart >= 20) return [];
    const preStart = Math.max(6, mStart - 1);
    const postEnd = Math.min(22, mEnd + 1);
    return [
      { label: "Pre", start: preStart, end: mStart, color: "#7c3aed" },
      { label: MISSION_TYPES[hash % MISSION_TYPES.length], start: mStart, end: mEnd, color: "#2563eb" },
      { label: "Post-flt", start: mEnd, end: postEnd, color: "#ea580c" },
    ];
  }

  if (ac.status === "under_maintenance") {
    const isCorrective = (ac.maintenanceType || "").includes("corrective") || ac.hoursToService < 15;
    return [{
      label: isCorrective ? "avhjalpande" : "forebyggande",
      start: 6, end: 22,
      color: isCorrective ? "#dc2626" : "#d97706",
    }];
  }

  if (ac.status === "unavailable") {
    return [{ label: "NMC", start: 6, end: 22, color: "#dc2626" }];
  }

  return [];
}

export function FlygschemaTidslinje({ base, hour, atoOrders }: FlygschemaTidslinjeProps) {
  const [selectedAc, setSelectedAc] = useState<string | null>(null);

  const START = 6, END = 22, SPAN = 16;
  const hourMarks = [6, 8, 10, 12, 14, 16, 18, 20, 22];

  const pct = (h: number) => `${((Math.max(START, Math.min(END, h)) - START) / SPAN) * 100}%`;
  const wPct = (s: number, e: number) =>
    `${((Math.min(e, END) - Math.max(s, START)) / SPAN) * 100}%`;

  const freeSlots = base.maintenanceBays.total - base.maintenanceBays.occupied;

  return (
    <div className="space-y-2">
      {/* Service capacity banner */}
      <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-blue-50 border border-blue-200/70 rounded-lg text-[10px] font-mono">
        <span className="text-blue-800 font-bold">Servicekapacitet:</span>
        <span className="text-blue-700">
          {base.maintenanceBays.occupied}/{base.maintenanceBays.total} platser upptagna
        </span>
        <span className={`flex items-center gap-1 font-bold ${freeSlots > 0 ? "text-green-700" : "text-red-700"}`}>
          {freeSlots > 0
            ? `✓ ${freeSlots} ledig serviceplats – kan ta in fler!`
            : "⚠ Alla serviceplatser fulla"}
        </span>
        <span className="ml-auto text-muted-foreground">Nästa föreslagna: —</span>
      </div>

      {/* Hour-axis header */}
      <div className="flex items-end">
        <div className="w-[100px] shrink-0" />
        <div className="flex-1 relative h-5">
          {hourMarks.map((h) => (
            <div
              key={h}
              className={`absolute text-[8px] font-mono -translate-x-1/2 ${
                h === hour ? "text-primary font-bold" : "text-muted-foreground"
              }`}
              style={{ left: pct(h) }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        <div className="w-14 shrink-0 text-[8px] font-mono text-right text-muted-foreground pr-1">
          Till 100h
        </div>
      </div>

      {/* Aircraft rows */}
      <div className="space-y-0.5">
        {base.aircraft.map((ac, i) => {
          const slots = getSlots(ac, hour, atoOrders);
          const isCritical = ac.hoursToService < 20;
          const isLow = ac.hoursToService < 40;
          const isSelected = selectedAc === ac.id;

          return (
            <motion.div
              key={ac.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
            >
              {/* Row */}
              <div
                className={`flex items-center rounded cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-blue-50 ring-1 ring-primary/30"
                    : "hover:bg-muted/40"
                }`}
                onClick={() => setSelectedAc(isSelected ? null : ac.id)}
              >
                {/* Aircraft label */}
                <div className="w-[100px] shrink-0 px-1.5 py-0.5 flex items-center gap-1">
                  {isCritical || ac.status === "unavailable" ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 animate-pulse" />
                  ) : isLow ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-transparent shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono font-bold text-foreground leading-tight truncate">
                      {ac.tailNumber}
                    </div>
                    <div className="text-[7px] text-muted-foreground truncate">{ac.type}</div>
                  </div>
                  {isSelected ? (
                    <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-muted-foreground/30 ml-auto shrink-0" />
                  )}
                </div>

                {/* Timeline track */}
                <div className="flex-1 relative h-6">
                  <div className="absolute inset-0 bg-muted/30 rounded" />

                  {/* Hour grid lines */}
                  {hourMarks.slice(1, -1).map((h) => (
                    <div
                      key={h}
                      className="absolute top-0 bottom-0 w-px bg-border/50"
                      style={{ left: pct(h) }}
                    />
                  ))}

                  {/* Current-time marker */}
                  {hour >= START && hour <= END && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-primary/50 z-10"
                      style={{ left: pct(hour) }}
                    />
                  )}

                  {/* Mission slots */}
                  {slots.map((slot, j) => (
                    <div
                      key={j}
                      className="absolute top-0.5 bottom-0.5 rounded flex items-center justify-center overflow-hidden"
                      style={{
                        left: pct(slot.start),
                        width: wPct(slot.start, slot.end),
                        backgroundColor: slot.color,
                        minWidth: 4,
                      }}
                    >
                      <span className="text-[7px] font-bold text-white truncate px-1">
                        {slot.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Hours to service */}
                <div className="w-14 shrink-0 text-right px-1">
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      isCritical
                        ? "text-red-600"
                        : isLow
                        ? "text-amber-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {ac.hoursToService}h
                  </span>
                </div>
              </div>

              {/* Expanded detail row */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-[100px] mr-14 bg-blue-50 border border-blue-200/60 rounded p-2.5 mb-0.5 space-y-2">
                      {/* Status row */}
                      <div className="flex flex-wrap gap-3 text-[9px] font-mono">
                        <span>
                          <span className="text-muted-foreground">Status: </span>
                          <span className="font-bold uppercase">
                            {ac.status.replace(/_/g, " ")}
                          </span>
                        </span>
                        {ac.currentMission && (
                          <span>
                            <span className="text-muted-foreground">Uppdrag: </span>
                            <span className="font-bold text-blue-700">{ac.currentMission}</span>
                          </span>
                        )}
                        {ac.maintenanceType && (
                          <span>
                            <span className="text-muted-foreground">Underhåll: </span>
                            <span className="font-bold">{ac.maintenanceType.replace(/_/g, " ")}</span>
                          </span>
                        )}
                        {ac.maintenanceTimeRemaining !== undefined && (
                          <span>
                            <span className="text-muted-foreground">Kvar: </span>
                            <span className="font-bold">{ac.maintenanceTimeRemaining}h</span>
                          </span>
                        )}
                        <span>
                          <span className="text-muted-foreground">Total flygtid: </span>
                          <span className="font-bold">{ac.flightHours}h</span>
                        </span>
                      </div>

                      {/* Remaining life bar */}
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] text-muted-foreground font-mono w-20 shrink-0">
                          Remaining life
                        </span>
                        <div className="flex-1 h-2 bg-white border border-border rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${
                              isCritical
                                ? "bg-red-500"
                                : isLow
                                ? "bg-amber-500"
                                : "bg-green-500"
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (ac.hoursToService / 100) * 100)}%` }}
                            transition={{ duration: 0.4 }}
                          />
                        </div>
                        <span
                          className={`text-[9px] font-mono font-bold w-8 text-right ${
                            isCritical
                              ? "text-red-600"
                              : isLow
                              ? "text-amber-600"
                              : "text-foreground"
                          }`}
                        >
                          {ac.hoursToService}h
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 border-t border-border">
        {[
          { color: "#2563eb", label: "Uppdrag" },
          { color: "#16a34a", label: "Standby" },
          { color: "#d97706", label: "Underhåll" },
          { color: "#dc2626", label: "NMC" },
          { color: "#7c3aed", label: "Pre-flight" },
          { color: "#ea580c", label: "Post-flight" },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1 text-[8px] font-mono text-muted-foreground">
            <span
              className="w-3 h-2 rounded-sm shrink-0"
              style={{ backgroundColor: item.color, display: "inline-block" }}
            />
            {item.label}
          </span>
        ))}
        <span className="text-[8px] font-mono text-muted-foreground">
          <span className="text-red-500">●</span> &lt;10h till service
          <span className="text-amber-500 ml-2">●</span> &lt;20h till service
        </span>
        <span className="text-[8px] font-mono text-muted-foreground ml-auto">
          Siffra höger = timmar kvar till 100h-service
        </span>
      </div>
    </div>
  );
}
