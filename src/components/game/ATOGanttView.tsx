import { ATOOrder, MissionType } from "@/types/game";
import { GanttBar } from "./GanttBar";
import { motion } from "framer-motion";
import { Clock, Shield, Target, Eye, Radio, Zap, Plane } from "lucide-react";

interface ATOGanttViewProps {
  orders: ATOOrder[];
  currentHour: number;
  selectedOrderId: string;
  onSelectOrder: (id: string) => void;
  onClickEmpty?: (startHour: number) => void;
  timelineStart?: number;
  timelineEnd?: number;
}

const missionIcons: Partial<Record<MissionType, React.ReactNode>> = {
  DCA: <Shield className="h-3 w-3" />,
  QRA: <Target className="h-3 w-3" />,
  RECCE: <Eye className="h-3 w-3" />,
  AEW: <Radio className="h-3 w-3" />,
  AI_DT: <Zap className="h-3 w-3" />,
  AI_ST: <Zap className="h-3 w-3" />,
  ESCORT: <Shield className="h-3 w-3" />,
  TRANSPORT: <Plane className="h-3 w-3" />,
};

function getBarColor(order: ATOOrder, isSelected: boolean): string {
  if (isSelected) return "hsl(220 63% 62%)";
  switch (order.status) {
    case "dispatched": return "hsl(152 60% 38%)";
    case "completed":  return "hsl(215 14% 60%)";
    case "assigned":   return "hsl(42 64% 53%)";
    default:           return "hsl(220 63% 38%)";
  }
}

export function ATOGanttView({
  orders,
  currentHour,
  selectedOrderId,
  onSelectOrder,
  onClickEmpty,
  timelineStart = 6,
  timelineEnd = 24,
}: ATOGanttViewProps) {
  const totalSlots = timelineEnd - timelineStart;
  const timeSlots = Array.from({ length: totalSlots }, (_, i) => i + timelineStart);
  const currentHourPct = ((currentHour - timelineStart) / totalSlots) * 100;

  return (
    <div className="flex flex-col h-full">
      {/* Hour labels */}
      <div className="flex px-3 pt-3 pb-1">
        <div className="w-28 shrink-0" />
        <div className="flex-1 flex">
          {timeSlots.map((h) => (
            <div
              key={h}
              className={`flex-1 text-center text-[8px] font-mono leading-none ${
                h === currentHour ? "text-primary font-bold" : "text-muted-foreground"
              }`}
            >
              {String(h).padStart(2, "0")}
            </div>
          ))}
        </div>
      </div>

      {/* Current hour tick */}
      <div className="flex px-3 mb-2">
        <div className="w-28 shrink-0" />
        <div className="flex-1 relative h-3">
          <div className="absolute inset-x-0 top-1.5 h-px bg-border" />
          {currentHour >= timelineStart && currentHour <= timelineEnd && (
            <div
              className="absolute top-0 w-0.5 h-3 bg-primary rounded"
              style={{ left: `${currentHourPct}%` }}
            />
          )}
        </div>
      </div>

      {/* Order rows */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
        {orders.length === 0 && (
          <div
            className="flex items-center rounded group cursor-pointer"
            onClick={(e) => {
              if (!onClickEmpty) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const relX = e.clientX - rect.left - 112; // subtract label width
              const trackW = rect.width - 112;
              const hour = Math.floor(timelineStart + (relX / trackW) * totalSlots);
              onClickEmpty(Math.max(timelineStart, Math.min(timelineEnd - 1, hour)));
            }}
          >
            <div className="w-28 shrink-0 text-[10px] font-mono text-muted-foreground pl-1">Klicka för att lägga till</div>
            <div className="flex-1 relative h-8">
              <div className="absolute inset-0 border border-dashed border-border/60 rounded bg-muted/10 group-hover:bg-muted/20 transition-colors flex items-center justify-center">
                <span className="text-[9px] font-mono text-muted-foreground">+ ny order</span>
              </div>
            </div>
          </div>
        )}
        {orders.map((order) => {
          const isSelected = order.id === selectedOrderId;
          const color = getBarColor(order, isSelected);
          return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center rounded transition-colors ${
                isSelected
                  ? "bg-primary/5 ring-1 ring-primary/30"
                  : "hover:bg-muted/20"
              }`}
            >
              {/* Row label */}
              <div className="w-28 shrink-0 flex items-center gap-1.5 pr-2 py-1 pl-1">
                <span style={{ color }}>
                  {missionIcons[order.missionType] ?? <Plane className="h-3 w-3" />}
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold truncate" style={{ color }}>
                    {order.missionType}
                  </div>
                  <div className="text-[9px] text-muted-foreground truncate">
                    {order.label}
                  </div>
                </div>
              </div>

              {/* Gantt bar track */}
              <div
                className="flex-1 relative h-8 group"
                onClick={(e) => {
                  if (!onClickEmpty) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const relX = e.clientX - rect.left;
                  const hour = Math.floor(timelineStart + (relX / rect.width) * totalSlots);
                  onClickEmpty(Math.max(timelineStart, Math.min(timelineEnd - 1, hour)));
                }}
              >
                <div className="absolute inset-0 bg-muted/20 rounded group-hover:bg-muted/30 transition-colors" />
                {onClickEmpty && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span className="text-[8px] font-mono text-muted-foreground">+ ny order</span>
                  </div>
                )}
                <GanttBar
                  startHour={order.startHour}
                  endHour={order.endHour}
                  label={`${order.requiredCount}×${order.aircraftType ?? "fpl"}`}
                  color={color}
                  timelineStart={timelineStart}
                  timelineEnd={timelineEnd}
                  isActive={order.status === "dispatched"}
                  hasDeviation={order.status === "dispatched" && currentHour > order.endHour}
                  onClick={() => onSelectOrder(order.id)}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer: current time + legend */}
      <div className="border-t border-border px-3 py-2 flex items-center gap-2 text-[10px] font-mono text-muted-foreground shrink-0">
        <Clock className="h-3 w-3 text-primary" />
        <span>Aktuell tid: {String(currentHour).padStart(2, "0")}:00</span>
        <span className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-status-green/40 border border-status-green/60 inline-block" />
            Skickad
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-status-yellow/40 border border-status-yellow/60 inline-block" />
            Tilldelad
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-primary/30 border border-primary/50 inline-block" />
            Väntande
          </span>
        </span>
      </div>
    </div>
  );
}
