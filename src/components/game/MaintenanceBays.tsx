import { Base, Aircraft } from "@/types/game";
import { motion } from "framer-motion";
import { Wrench, Clock, CheckCircle } from "lucide-react";
import { useState } from "react";

import { DropZone } from "@/components/game/BaseMap";

interface MaintenanceBaysProps {
  base: Base;
  onDropAircraft?: (aircraftId: string, zone: DropZone) => void;
}

interface BayInfo {
  id: number;
  label: string;
  type: string;
  aircraft: Aircraft | null;
}

export function MaintenanceBays({ base, onDropAircraft }: MaintenanceBaysProps) {
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  const maintAircraft = base.aircraft.filter((a) => a.status === "maintenance");
  const bayLabels = [
    { label: "UHplats 1", type: "Bakre underhåll — Stol, motor" },
    { label: "UHplats 2", type: "Främre underhåll" },
    { label: "UHplats 3", type: "Främre underhåll" },
    { label: "UHplats 4", type: "Främre underhåll" },
  ];

  const bays: BayInfo[] = Array.from({ length: base.maintenanceBays.total }, (_, i) => ({
    id: i + 1,
    label: bayLabels[i]?.label || `UHplats ${i + 1}`,
    type: bayLabels[i]?.type || "Underhåll",
    aircraft: maintAircraft[i] || null,
  }));

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, bayId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(bayId);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, bayId: number) => {
    e.preventDefault();
    setDragOverId(null);
    
    const aircraftId = e.dataTransfer.getData("aircraftId");
    if (aircraftId && onDropAircraft) {
      onDropAircraft(aircraftId);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-status-amber" />
          <h3 className="font-sans font-bold text-sm text-foreground">UNDERHÅLLSPLATSER</h3>
        </div>
        <span className="text-xs font-mono">
          <span className={base.maintenanceBays.occupied >= base.maintenanceBays.total ? "text-status-red" : "text-status-amber"}>
            {base.maintenanceBays.occupied}
          </span>
          <span className="text-muted-foreground">/{base.maintenanceBays.total} upptagna</span>
        </span>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3">
        {bays.map((bay) => (
          <div
            key={bay.id}
            onDragOver={(e) => handleDragOver(e, bay.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, bay.id)}
            className={`relative rounded-lg border-2 p-4 transition-all min-h-[150px] flex flex-col ${
              dragOverId === bay.id
                ? "border-status-green/80 bg-status-green/20 ring-2 ring-status-green/50"
                : bay.aircraft
                ? "border-status-amber/40 bg-status-amber/5"
                : "border-border bg-muted/20 border-dashed"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold text-foreground uppercase">{bay.label}</span>
              {bay.aircraft ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-status-amber/20 text-status-amber">AKTIV</span>
              ) : dragOverId === bay.id ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-status-green/20 text-status-green">DROP HERE</span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">LEDIG</span>
              )}
            </div>
            <div className="text-[9px] text-muted-foreground mb-2">{bay.type}</div>

            {bay.aircraft ? (
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground font-mono">{bay.aircraft.tailNumber}</span>
                  <span className="text-[10px] text-muted-foreground">{bay.aircraft.type.replace("_", "/")}</span>
                </div>
                {bay.aircraft.maintenanceType && (
                  <div className="text-[10px] text-status-amber">{bay.aircraft.maintenanceType}</div>
                )}
                {bay.aircraft.maintenanceTimeRemaining != null && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-status-amber" />
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-status-amber"
                        animate={{ width: `${Math.max(10, (1 - bay.aircraft.maintenanceTimeRemaining / 16) * 100)}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-status-amber">{bay.aircraft.maintenanceTimeRemaining}h</span>
                  </div>
                )}
              </div>
            ) : dragOverId === bay.id ? (
              <div className="flex items-center justify-center flex-1">
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 text-status-green/70 mx-auto mb-1" />
                  <span className="text-[10px] font-mono text-status-green">Release to assign</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-2 flex-1">
                <CheckCircle className="h-5 w-5 text-muted-foreground/30" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
