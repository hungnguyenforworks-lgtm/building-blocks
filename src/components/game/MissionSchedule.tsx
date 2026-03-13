import { ATOOrder, MissionType } from "@/types/game";
import { motion } from "framer-motion";
import { Target, Eye, Shield, Radio, Zap } from "lucide-react";
import { AircraftIcon } from "./AircraftIcons";

interface MissionScheduleProps {
  atoOrders: ATOOrder[];
  day: number;
  hour: number;
}

const missionIcons: Partial<Record<MissionType, React.ReactNode>> = {
  DCA: <Shield className="h-3.5 w-3.5" />,
  QRA: <Target className="h-3.5 w-3.5" />,
  RECCE: <AircraftIcon type="LOTUS" size={14} />,
  AEW: <AircraftIcon type="GlobalEye" size={14} />,
  AI_DT: <Zap className="h-3.5 w-3.5" />,
  AI_ST: <Zap className="h-3.5 w-3.5" />,
  ESCORT: <Shield className="h-3.5 w-3.5" />,
  TRANSPORT: <AircraftIcon type="GripenE" size={14} />,
};

function getOrderDisplayStatus(order: ATOOrder, hour: number): "planned" | "active" | "completed" {
  if (order.status === "completed") return "completed";
  if (order.status === "dispatched") {
    if (hour >= order.endHour) return "completed";
    return "active";
  }
  if (hour >= order.startHour && hour < order.endHour) return "active";
  if (hour >= order.endHour) return "completed";
  return "planned";
}

export function MissionSchedule({ atoOrders, day, hour }: MissionScheduleProps) {
  const todaysOrders = atoOrders.filter((o) => o.day === day);
  const timeSlots = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 to 23:00

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AircraftIcon type="GripenE" size={16} className="text-primary" />
          <h3 className="font-sans font-bold text-sm text-foreground">UPPDRAGSSCHEMA — DAG {day}</h3>
        </div>
        <div className="flex gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-status-green" /> Aktiv
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary/30" /> Planerad
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-muted-foreground/30" /> Klar
          </span>
        </div>
      </div>

      <div className="p-4">
        {/* Timeline header */}
        <div className="flex mb-1">
          <div className="w-32 shrink-0" />
          <div className="flex-1 flex">
            {timeSlots.map((t) => (
              <div
                key={t}
                className={`flex-1 text-center text-[9px] font-mono ${t === hour ? "text-primary font-bold" : "text-muted-foreground"}`}
              >
                {String(t).padStart(2, "0")}
              </div>
            ))}
          </div>
        </div>

        {/* Current time indicator */}
        <div className="flex mb-2">
          <div className="w-32 shrink-0" />
          <div className="flex-1 relative h-px bg-border">
            {hour >= 6 && hour <= 23 && (
              <div
                className="absolute top-0 w-px h-3 bg-primary"
                style={{ left: `${((hour - 6) / 18) * 100}%` }}
              />
            )}
          </div>
        </div>

        {/* Mission rows */}
        <div className="space-y-2">
          {todaysOrders.length === 0 ? (
            <div className="text-center text-muted-foreground text-xs py-6 font-mono">
              Inga ATO-order för dag {day}
            </div>
          ) : (
            todaysOrders.map((order) => {
              const displayStatus = getOrderDisplayStatus(order, hour);
              const startOffset = Math.max(0, ((Math.max(order.startHour, 6) - 6) / 18) * 100);
              const width = ((Math.min(order.endHour, 24) - Math.max(order.startHour, 6)) / 18) * 100;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center"
                >
                  {/* Mission label */}
                  <div className="w-32 shrink-0 flex items-center gap-2 pr-2">
                    <span className={displayStatus === "active" ? "text-status-green" : "text-muted-foreground"}>
                      {missionIcons[order.missionType] || <Target className="h-3.5 w-3.5" />}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-foreground">{order.missionType}</div>
                      <div className="text-[9px] text-muted-foreground">
                        {order.requiredCount} fpl · {order.launchBase}
                      </div>
                    </div>
                  </div>

                  {/* Timeline bar */}
                  <div className="flex-1 relative h-8">
                    <div className="absolute inset-0 bg-muted/30 rounded" />
                    <div
                      className={`absolute top-0.5 bottom-0.5 rounded flex items-center px-2 text-[9px] font-mono ${
                        displayStatus === "active"
                          ? "bg-status-green/20 border border-status-green/40 text-status-green"
                          : displayStatus === "completed"
                          ? "bg-muted-foreground/10 border border-muted-foreground/20 text-muted-foreground"
                          : "bg-primary/10 border border-primary/30 text-primary/80"
                      }`}
                      style={{ left: `${startOffset}%`, width: `${Math.max(width, 2)}%` }}
                    >
                      <span className="truncate">
                        {order.assignedAircraft.length > 0
                          ? <>
                              {order.assignedAircraft.slice(0, 3).join(", ")}
                              {order.assignedAircraft.length > 3 && ` +${order.assignedAircraft.length - 3}`}
                            </>
                          : order.label
                        }
                      </span>
                    </div>

                    {/* Deviation marker if order is dispatched but time has passed endHour */}
                    {order.status === "dispatched" && hour > order.endHour && (
                      <div
                        className="absolute top-0 w-2 h-2 rounded-full bg-status-red"
                        style={{ left: `${((order.endHour - 6) / 18) * 100}%`, top: "-2px" }}
                        title="Avvikelse — överskriden tid"
                      />
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
