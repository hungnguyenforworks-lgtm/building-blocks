import { Base } from "@/types/game";
import { AircraftStatusBadge } from "./StatusBadge";
import { Fuel, Users, Wrench, Package } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

interface BaseOverviewProps {
  base: Base;
  onSelectAircraft: (baseId: string, aircraftId: string) => void;
  onStartMaintenance: (baseId: string, aircraftId: string) => void;
  onSendMission: (baseId: string, aircraftId: string) => void;
}

export function BaseOverview({ base, onSelectAircraft, onStartMaintenance, onSendMission }: BaseOverviewProps) {
  const [draggedAircraft, setDraggedAircraft] = useState<string | null>(null);
  
  const mc = base.aircraft.filter((a) => a.status === "mission_capable").length;
  const nmc = base.aircraft.filter((a) => a.status === "not_mission_capable").length;
  const maint = base.aircraft.filter((a) => a.status === "maintenance").length;
  const onMission = base.aircraft.filter((a) => a.status === "on_mission").length;

  const typeColor = base.type === "huvudbas" ? "border-status-green" : base.type === "sidobas" ? "border-status-amber" : "border-status-red";

  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, aircraftId: string) => {
    setDraggedAircraft(aircraftId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("aircraftId", aircraftId);
    e.dataTransfer.setData("sourceBase", base.id);
  };

  const handleDragEnd = () => {
    setDraggedAircraft(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card border ${typeColor} rounded-lg overflow-hidden`}
    >
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-sans font-bold text-foreground">{base.name}</h3>
          <span className="text-xs text-muted-foreground uppercase">{base.type}</span>
        </div>
        <div className="flex gap-3 text-xs font-mono">
          <span className="text-status-green">{mc} MC</span>
          <span className="text-status-red">{nmc} NMC</span>
          <span className="text-status-amber">{maint} UH</span>
          <span className="text-status-blue">{onMission} UPP</span>
        </div>
      </div>

      {/* Resource bars */}
      <div className="px-4 py-3 grid grid-cols-2 gap-3 text-xs border-b border-border">
        <div className="flex items-center gap-2">
          <Fuel className="h-3.5 w-3.5 text-status-amber" />
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-muted-foreground">Bränsle</span>
              <span className={base.fuel < 30 ? "text-status-red" : "text-foreground"}>{base.fuel.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${base.fuel < 30 ? "bg-status-red" : base.fuel < 60 ? "bg-status-amber" : "bg-status-green"}`}
                style={{ width: `${base.fuel}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">UH-platser:</span>
          <span className="text-foreground">{base.maintenanceBays.occupied}/{base.maintenanceBays.total}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Personal:</span>
          <span className="text-foreground">{base.personnel.reduce((s, p) => s + p.available, 0)}/{base.personnel.reduce((s, p) => s + p.total, 0)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Package className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Ammunition:</span>
          <span className="text-foreground">{base.ammunition.reduce((s, a) => s + a.quantity, 0)} enheter</span>
        </div>
      </div>

      {/* Aircraft grid */}
      <div className="px-4 py-4">
        <p className="text-[11px] text-muted-foreground mb-3 font-semibold">💡 Drag aircraft to maintenance bay to send for service</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
          {base.aircraft.map((ac) => (
            <button
              key={ac.id}
              draggable
              onDragStart={(e) => handleDragStart(e, ac.id)}
              onDragEnd={handleDragEnd}
              onClick={() => {
                if (ac.status === "not_mission_capable") onStartMaintenance(base.id, ac.id);
                else if (ac.status === "mission_capable") onSendMission(base.id, ac.id);
              }}
              className={`px-3 py-3 rounded-lg text-[12px] font-mono text-center border-2 transition-all hover:shadow-lg font-semibold ${draggedAircraft === ac.id ? "cursor-grabbing opacity-40 scale-110" : "cursor-move hover:scale-105"} ${
                ac.status === "mission_capable"
                  ? "border-status-green/60 bg-status-green/20 hover:bg-status-green/30"
                  : ac.status === "not_mission_capable"
                  ? "border-status-red/60 bg-status-red/20 hover:bg-status-red/30"
                  : ac.status === "maintenance"
                  ? "border-status-amber/60 bg-status-amber/20 hover:bg-status-amber/30"
                  : "border-status-blue/60 bg-status-blue/20 hover:bg-status-blue/30"
              }`}
              title={`${ac.tailNumber} - ${ac.type} - ${ac.status}${ac.maintenanceTimeRemaining ? ` (${ac.maintenanceTimeRemaining}h)` : ""}\n\nDrag to maintenance bay or mission `}
            >
              <div className="truncate font-bold text-base leading-tight">{ac.tailNumber}</div>
              <AircraftStatusBadge status={ac.status} />
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
