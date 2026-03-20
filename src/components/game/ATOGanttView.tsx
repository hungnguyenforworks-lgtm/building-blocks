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
  conflictIds?: Set<string>;
  darkTheme?: boolean;
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

function getBarColor(order: ATOOrder, isSelected: boolean, isConflict: boolean): string {
  if (isConflict) return "#D9192E";
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
  conflictIds = new Set<string>(),
  darkTheme = false,
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
              className="flex-1 text-center text-[8px] font-mono leading-none"
              style={darkTheme
                ? { color: h === currentHour ? "#D7AB3A" : "rgba(215,222,225,0.35)", fontWeight: h === currentHour ? "bold" : undefined }
                : undefined}
            >
              <span className={!darkTheme ? (h === currentHour ? "text-primary font-bold" : "text-muted-foreground") : ""}>
                {String(h).padStart(2, "0")}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Current hour tick */}
      <div className="flex px-3 mb-2">
        <div className="w-28 shrink-0" />
        <div className="flex-1 relative h-3">
          <div
            className={darkTheme ? undefined : "absolute inset-x-0 top-1.5 h-px bg-border"}
            style={darkTheme ? { position: "absolute", insetInline: 0, top: "6px", height: "1px", background: "rgba(215,222,225,0.1)" } : undefined}
          />
          {currentHour >= timelineStart && currentHour <= timelineEnd && (
            <div
              className={darkTheme ? undefined : "absolute top-0 w-0.5 h-3 bg-primary rounded"}
              style={{
                left: `${currentHourPct}%`,
                ...(darkTheme ? { position: "absolute", top: 0, width: "2px", height: "12px", background: "#D9192E", borderRadius: "2px" } : {}),
              }}
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
          const isConflict = conflictIds.has(order.id);
          const color = getBarColor(order, isSelected, isConflict);
          const labelColor = darkTheme ? color : color;
          const subLabelColor = darkTheme ? "rgba(215,222,225,0.45)" : undefined;
          return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center rounded transition-colors ${
                !darkTheme
                  ? isSelected
                    ? "bg-primary/5 ring-1 ring-primary/30"
                    : "hover:bg-muted/20"
                  : ""
              }`}
              style={darkTheme
                ? {
                    background: isSelected ? "rgba(217,25,46,0.06)" : undefined,
                    boxShadow: isSelected ? "inset 0 0 0 1px rgba(217,25,46,0.25)" : undefined,
                  }
                : undefined}
            >
              {/* Row label */}
              <div className="w-28 shrink-0 flex items-center gap-1.5 pr-2 py-1 pl-1">
                <span style={{ color }}>
                  {missionIcons[order.missionType] ?? <Plane className="h-3 w-3" />}
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold truncate" style={{ color: labelColor }}>
                    {order.missionType}
                  </div>
                  <div
                    className={darkTheme ? undefined : "text-[9px] text-muted-foreground truncate"}
                    style={darkTheme ? { fontSize: "9px", color: subLabelColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } : undefined}
                  >
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
                <div
                  className={darkTheme ? undefined : "absolute inset-0 bg-muted/20 rounded group-hover:bg-muted/30 transition-colors"}
                  style={darkTheme
                    ? { position: "absolute", inset: 0, background: "rgba(215,222,225,0.04)", borderRadius: "4px", transition: "background 0.15s" }
                    : undefined}
                  onMouseEnter={darkTheme ? (e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; } : undefined}
                  onMouseLeave={darkTheme ? (e) => { (e.currentTarget as HTMLElement).style.background = "rgba(215,222,225,0.04)"; } : undefined}
                />
                {onClickEmpty && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span
                      className={darkTheme ? undefined : "text-[8px] font-mono text-muted-foreground"}
                      style={darkTheme ? { fontSize: "8px", fontFamily: "monospace", color: "rgba(215,222,225,0.4)" } : undefined}
                    >
                      + ny order
                    </span>
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
      <div
        className={darkTheme ? undefined : "border-t border-border px-3 py-2 flex items-center gap-2 text-[10px] font-mono text-muted-foreground shrink-0"}
        style={darkTheme
          ? { borderTop: "1px solid rgba(215,222,225,0.08)", padding: "6px 12px", display: "flex", alignItems: "center", gap: "8px", fontSize: "10px", fontFamily: "monospace", color: "rgba(215,222,225,0.4)", flexShrink: 0 }
          : undefined}
      >
        <Clock className="h-3 w-3" style={darkTheme ? { color: "#D9192E" } : undefined} />
        <span>Aktuell tid: {String(currentHour).padStart(2, "0")}:00</span>
        <span className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: "rgba(34,160,90,0.4)", border: "1px solid rgba(34,160,90,0.6)" }} />
            Skickad
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: "rgba(215,171,58,0.4)", border: "1px solid rgba(215,171,58,0.6)" }} />
            Tilldelad
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: "rgba(59,130,246,0.3)", border: "1px solid rgba(59,130,246,0.5)" }} />
            Väntande
          </span>
          {darkTheme && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ background: "rgba(217,25,46,0.4)", border: "1px solid rgba(217,25,46,0.6)" }} />
              Konflikt
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
