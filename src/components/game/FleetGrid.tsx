import { Base, Aircraft } from "@/types/game";
import { AircraftStatusBadge } from "./StatusBadge";
import { motion } from "framer-motion";
import { Wrench, Send, Clock } from "lucide-react";
import { AircraftIcon } from "./AircraftIcons";

interface FleetGridProps {
  base: Base;
  onStartMaintenance: (aircraftId: string) => void;
  onSendMission: (aircraftId: string) => void;
}

export function FleetGrid({ base, onStartMaintenance, onSendMission }: FleetGridProps) {
  const grouped = {
    ready: base.aircraft.filter((a) => a.status === "ready"),
    on_mission: base.aircraft.filter((a) => a.status === "on_mission"),
    under_maintenance: base.aircraft.filter((a) => a.status === "under_maintenance"),
    unavailable: base.aircraft.filter((a) => a.status === "unavailable"),
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="font-sans font-bold text-sm text-foreground">FLYGPLANSFLOTTA</h3>
        <div className="flex gap-4 text-xs font-mono">
          <span className="text-status-green">{grouped.ready.length} MC</span>
          <span className="text-status-blue">{grouped.on_mission.length} UPPDRAG</span>
          <span className="text-status-amber">{grouped.under_maintenance.length} UH</span>
          <span className="text-status-red">{grouped.unavailable.length} NMC</span>
        </div>
      </div>

      <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto">
        {/* NMC - needs attention */}
        {grouped.unavailable.length > 0 && (
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-status-red mb-2 font-mono">⚠ Kräver åtgärd</h4>
            <div className="space-y-1.5">
              {grouped.unavailable.map((ac) => (
                <AircraftRow key={ac.id} ac={ac} action="maintain" onAction={() => onStartMaintenance(ac.id)} />
              ))}
            </div>
          </div>
        )}

        {/* In maintenance */}
        {grouped.under_maintenance.length > 0 && (
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-status-amber mb-2 font-mono">Under underhåll</h4>
            <div className="space-y-1.5">
              {grouped.under_maintenance.map((ac) => (
                <AircraftRow key={ac.id} ac={ac} />
              ))}
            </div>
          </div>
        )}

        {/* On mission */}
        {grouped.on_mission.length > 0 && (
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-status-blue mb-2 font-mono">På uppdrag</h4>
            <div className="space-y-1.5">
              {grouped.on_mission.map((ac) => (
                <AircraftRow key={ac.id} ac={ac} />
              ))}
            </div>
          </div>
        )}

        {/* Mission capable */}
        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-status-green mb-2 font-mono">Operativa</h4>
          <div className="space-y-1.5">
            {grouped.ready.map((ac) => (
              <AircraftRow key={ac.id} ac={ac} action="mission" onAction={() => onSendMission(ac.id)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AircraftRow({ ac, action, onAction }: { ac: Aircraft; action?: "maintain" | "mission"; onAction?: () => void }) {
  const serviceWarning = ac.hoursToService < 20;

  const getStatusColor = (status: Aircraft["status"]) => {
    switch (status) {
      case "ready": return "text-status-green";
      case "on_mission": return "text-status-blue";
      case "under_maintenance": return "text-status-amber";
      case "unavailable": return "text-status-red";
      default: return "text-muted-foreground";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 px-3 py-2 rounded border border-border/50 bg-muted/30 text-xs font-mono"
    >
      <AircraftIcon type={ac.type} size={18} className={`${getStatusColor(ac.status)} shrink-0`} />
      <span className="font-bold text-foreground w-12">{ac.tailNumber}</span>
      <span className="text-muted-foreground w-20 truncate">{ac.type.replace("_", "/")}</span>
      <AircraftStatusBadge status={ac.status} />

      {ac.maintenanceType && (
        <span className="text-status-amber text-[10px]">{ac.maintenanceType}</span>
      )}
      {ac.maintenanceTimeRemaining != null && (
        <span className="flex items-center gap-1 text-status-amber text-[10px]">
          <Clock className="h-3 w-3" />
          {ac.maintenanceTimeRemaining}h
        </span>
      )}

      <span className={`ml-auto text-[10px] ${serviceWarning ? "text-status-red" : "text-muted-foreground"}`}>
        {ac.flightHours}h / service om {ac.hoursToService}h
      </span>

      {action === "maintain" && onAction && (
        <button onClick={onAction} className="p-1 rounded bg-status-amber/20 text-status-amber hover:bg-status-amber/30 transition-colors" title="Starta underhåll">
          <Wrench className="h-3.5 w-3.5" />
        </button>
      )}
      {action === "mission" && onAction && (
        <button onClick={onAction} className="p-1 rounded bg-status-blue/20 text-status-blue hover:bg-status-blue/30 transition-colors" title="Skicka på uppdrag">
          <Send className="h-3.5 w-3.5" />
        </button>
      )}
    </motion.div>
  );
}
