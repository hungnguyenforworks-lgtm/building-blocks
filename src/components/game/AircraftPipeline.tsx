import { Base, Aircraft } from "@/types/game";
import { AircraftStatusBadge } from "./StatusBadge";
import { motion } from "framer-motion";
import { ArrowRight, Wrench, CheckCircle, AlertTriangle, RotateCcw } from "lucide-react";
import React from "react";
import { AircraftIcon } from "./AircraftIcons";

interface AircraftPipelineProps {
  base: Base;
  onStartMaintenance: (aircraftId: string) => void;
  onSendMission: (aircraftId: string) => void;
}

function StageCard({
  title,
  icon,
  count,
  color,
  aircraft,
  action,
  actionLabel,
  onAction,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  color: string;
  aircraft: Aircraft[];
  action?: boolean;
  actionLabel?: string;
  onAction?: (id: string) => void;
}) {
  const [dragOver, setDragOver] = React.useState(false);

  const getStatusColor = (status: Aircraft["status"]) => {
    switch (status) {
      case "ready": return "text-status-green";
      case "on_mission": return "text-status-blue";
      case "under_maintenance": return "text-status-amber";
      case "unavailable": return "text-status-red";
      default: return "text-muted-foreground";
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`bg-card border rounded-lg overflow-hidden flex flex-col ${color} ${dragOver ? "ring-2 ring-primary/50" : ""} transition-all`}
    >
      <div className={`px-4 py-3 border-b border-border flex items-center justify-between ${dragOver ? "bg-primary/10" : "bg-muted/30"}`}>
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-bold text-foreground uppercase">{title}</span>
        </div>
        <span className="text-xl font-mono font-bold text-foreground">{count}</span>
      </div>
      <div className="p-2 flex-1 overflow-y-auto max-h-48 space-y-1.5">
        {aircraft.length === 0 ? (
          <div className="text-[11px] text-muted-foreground text-center py-6">Inga flygplan</div>
        ) : (
          aircraft.map((ac) => (
            <motion.div
              key={ac.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 text-xs font-mono border border-border/50 hover:bg-muted/70 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <AircraftIcon type={ac.type} size={18} className={`${getStatusColor(ac.status)} shrink-0`} />
                <span className="font-bold text-foreground text-sm">{ac.tailNumber}</span>
                <span className="text-[10px] text-muted-foreground truncate">{ac.type.replace("_", "/")}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {ac.maintenanceTimeRemaining != null && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-status-amber/20 text-status-amber">{ac.maintenanceTimeRemaining}h</span>
                )}
                {ac.maintenanceType && (
                  <span className="text-[10px] text-muted-foreground">{ac.maintenanceType}</span>
                )}
                {ac.currentMission && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-status-blue/20 text-status-blue">{ac.currentMission}</span>
                )}
                {action && onAction && (
                  <button
                    onClick={() => onAction(ac.id)}
                    className="px-2 py-1 rounded text-[10px] bg-primary/30 text-primary hover:bg-primary/50 transition-colors font-semibold border border-primary/40"
                  >
                    {actionLabel}
                  </button>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

export function AircraftPipeline({ base, onStartMaintenance, onSendMission }: AircraftPipelineProps) {
  const mc = base.aircraft.filter((a) => a.status === "ready");
  const onMission = base.aircraft.filter((a) => a.status === "on_mission");
  const nmc = base.aircraft.filter((a) => a.status === "unavailable");
  const inMaint = base.aircraft.filter((a) => a.status === "under_maintenance");

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="font-sans font-bold text-sm text-foreground">FLYGPLANSFLÖDE</h3>
        <div className="text-[10px] font-mono text-muted-foreground">
          Totalt: {base.aircraft.length} fpl
        </div>
      </div>

      {/* Flow visualization */}
      <div className="p-4">
        {/* Info banner */}
        <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30">
          <div className="text-[11px] font-semibold text-primary">💡 Tips: Drag aircraft from Basöversikt below to move them between statuses</div>
        </div>

        {/* Flow arrows diagram */}
        <div className="flex items-center justify-center gap-2 mb-4 text-[10px] font-mono text-muted-foreground">
          <span className="px-2 py-1 rounded bg-status-green/10 text-status-green border border-status-green/30">Klargöring</span>
          <ArrowRight className="h-3 w-3" />
          <span className="px-2 py-1 rounded bg-status-blue/10 text-status-blue border border-status-blue/30">Uppdrag</span>
          <ArrowRight className="h-3 w-3" />
          <span className="px-2 py-1 rounded bg-muted text-muted-foreground border border-border">Mottagning</span>
          <ArrowRight className="h-3 w-3" />
          <span className="px-2 py-1 rounded bg-status-amber/10 text-status-amber border border-status-amber/30">Underhåll</span>
          <RotateCcw className="h-3 w-3 text-primary" />
        </div>

        {/* Stage cards in 2x2 grid */}
        <div className="grid grid-cols-2 gap-3">
          <StageCard
            title="Operativa / Klargöring"
            icon={<CheckCircle className="h-4 w-4 text-status-green" />}
            count={mc.length}
            color="border-status-green/30"
            aircraft={mc}
            action
            actionLabel="→ Uppdrag"
            onAction={onSendMission}
          />
          <StageCard
            title="På uppdrag"
            icon={<AircraftIcon type="GripenE" size={16} className="text-status-blue" />}
            count={onMission.length}
            color="border-status-blue/30"
            aircraft={onMission}
          />
          <StageCard
            title="Fel — Kräver åtgärd"
            icon={<AlertTriangle className="h-4 w-4 text-status-red" />}
            count={nmc.length}
            color="border-status-red/30"
            aircraft={nmc}
            action
            actionLabel="→ UH"
            onAction={onStartMaintenance}
          />
          <StageCard
            title="Under underhåll"
            icon={<Wrench className="h-4 w-4 text-status-amber" />}
            count={inMaint.length}
            color="border-status-amber/30"
            aircraft={inMaint}
          />
        </div>
      </div>
    </div>
  );
}
