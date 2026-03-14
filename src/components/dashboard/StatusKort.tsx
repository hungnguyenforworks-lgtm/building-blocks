import { motion } from "framer-motion";

interface StatusKortProps {
  titel: string;
  varde: number | string;
  subtitel?: string;
  ikon: React.ReactNode;
  farg: "green" | "blue" | "yellow" | "purple" | "red";
  max?: number;
}

const accentMap: Record<StatusKortProps["farg"], {
  border: string; glow: string; iconBg: string; iconColor: string;
  valueColor: string; strip: string; badge: string;
}> = {
  green: {
    border: "hsl(152 60% 32% / 0.35)",
    glow: "0 2px 16px hsl(152 60% 32% / 0.15)",
    iconBg: "hsl(152 60% 32% / 0.12)",
    iconColor: "hsl(152 60% 38%)",
    valueColor: "hsl(152 60% 30%)",
    strip: "hsl(152 60% 38%)",
    badge: "hsl(152 60% 32% / 0.1)",
  },
  blue: {
    border: "hsl(220 63% 38% / 0.35)",
    glow: "0 2px 16px hsl(220 63% 38% / 0.15)",
    iconBg: "hsl(220 63% 18% / 0.10)",
    iconColor: "hsl(220 63% 40%)",
    valueColor: "hsl(220 63% 32%)",
    strip: "hsl(220 63% 38%)",
    badge: "hsl(220 63% 18% / 0.08)",
  },
  yellow: {
    border: "hsl(42 64% 53% / 0.4)",
    glow: "0 2px 16px hsl(42 64% 53% / 0.18)",
    iconBg: "hsl(42 64% 53% / 0.12)",
    iconColor: "hsl(42 64% 40%)",
    valueColor: "hsl(42 64% 38%)",
    strip: "hsl(42 64% 53%)",
    badge: "hsl(42 64% 53% / 0.08)",
  },
  purple: {
    border: "hsl(220 63% 18% / 0.30)",
    glow: "0 2px 16px hsl(220 63% 18% / 0.12)",
    iconBg: "hsl(220 63% 18% / 0.10)",
    iconColor: "hsl(220 63% 30%)",
    valueColor: "hsl(220 63% 22%)",
    strip: "hsl(220 63% 28%)",
    badge: "hsl(220 63% 18% / 0.07)",
  },
  red: {
    border: "hsl(353 74% 47% / 0.40)",
    glow: "0 2px 16px hsl(353 74% 47% / 0.18)",
    iconBg: "hsl(353 74% 47% / 0.10)",
    iconColor: "hsl(353 74% 47%)",
    valueColor: "hsl(353 74% 42%)",
    strip: "hsl(353 74% 47%)",
    badge: "hsl(353 74% 47% / 0.07)",
  },
};

export function StatusKort({ titel, varde, subtitel, ikon, farg, max }: StatusKortProps) {
  const c = accentMap[farg];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="relative rounded-xl overflow-hidden cursor-default select-none"
      style={{
        background: "linear-gradient(160deg, hsl(0 0% 100%), hsl(216 18% 98%))",
        border: `1px solid ${c.border}`,
        boxShadow: c.glow,
      }}
    >
      {/* Left accent strip */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ background: c.strip }} />

      {/* Top-right label */}
      <div className="absolute top-3 right-3">
        <span className="text-[9px] font-mono uppercase tracking-widest"
          style={{ color: "hsl(218 15% 55%)" }}>
          {titel}
        </span>
      </div>

      <div className="pl-5 pr-4 pt-4 pb-3">
        {/* Icon + value row */}
        <div className="flex items-end justify-between mt-1">
          <div className="flex flex-col gap-2">
            <div className="p-2 rounded-lg inline-flex" style={{ background: c.iconBg }}>
              <span style={{ color: c.iconColor }}>{ikon}</span>
            </div>
            <div className="font-black font-mono text-3xl leading-none tracking-tight"
              style={{ color: c.valueColor }}>
              {varde}
            </div>
          </div>
          {/* Mini donut / circle indicator */}
          {typeof varde === "number" && (
            <svg width="44" height="44" className="opacity-60">
              <circle cx="22" cy="22" r="18" fill="none"
                stroke="hsl(216 18% 90%)" strokeWidth="3" />
              <circle cx="22" cy="22" r="18" fill="none"
                stroke={c.strip} strokeWidth="3"
                strokeDasharray={`${(Math.min(varde as number, max ?? 20) / (max ?? 20)) * 113} 113`}
                strokeLinecap="round"
                transform="rotate(-90 22 22)"
              />
            </svg>
          )}
        </div>

        {subtitel && (
          <div className="text-[10px] font-mono mt-1.5" style={{ color: "hsl(218 15% 55%)" }}>
            {subtitel}
          </div>
        )}
      </div>
    </motion.div>
  );
}
