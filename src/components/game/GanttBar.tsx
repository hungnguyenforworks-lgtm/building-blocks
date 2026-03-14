interface GanttBarProps {
  startHour: number;
  endHour: number;
  label: string;
  color: string;
  timelineStart?: number;
  timelineEnd?: number;
  isActive?: boolean;
  hasDeviation?: boolean;
  onClick?: () => void;
}

export function GanttBar({
  startHour,
  endHour,
  label,
  color,
  timelineStart = 6,
  timelineEnd = 23,
  isActive = false,
  hasDeviation = false,
  onClick,
}: GanttBarProps) {
  const totalSlots = timelineEnd - timelineStart;
  const leftPct = ((Math.max(startHour, timelineStart) - timelineStart) / totalSlots) * 100;
  const widthPct = ((Math.min(endHour, timelineEnd) - Math.max(startHour, timelineStart)) / totalSlots) * 100;

  if (widthPct <= 0) return null;

  return (
    <div
      className="absolute top-0.5 bottom-0.5 rounded flex items-center overflow-hidden cursor-pointer transition-all hover:brightness-110"
      style={{
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        background: `${color}20`,
        border: `1px solid ${color}50`,
        borderLeft: isActive ? `3px solid ${color}` : `1px solid ${color}50`,
        minWidth: "20px",
      }}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      title={`${label} (${String(startHour).padStart(2, "0")}:00–${String(endHour).padStart(2, "0")}:00)`}
    >
      <span
        className="px-1.5 text-[8px] font-mono font-bold truncate"
        style={{ color }}
      >
        {label}
      </span>
      {hasDeviation && (
        <span
          className="absolute right-0.5 top-0.5 w-2 h-2 rounded-full"
          style={{ background: "hsl(353 74% 47%)" }}
          title="Avvikelse"
        />
      )}
    </div>
  );
}
