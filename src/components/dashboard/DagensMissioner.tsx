import { Base, MissionType, ScenarioPhase } from "@/types/game";
import { Shield, Target, Eye, Radio, Zap, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { AircraftIcon } from "../game/AircraftIcons";

interface DagensMissionerProps {
  base: Base;
  hour: number;
  phase: ScenarioPhase;
}

interface MissionSummary {
  type: MissionType;
  label: string;
  status: "active" | "planned" | "completed";
  aircraft: number;
  time: string;
  priority: "high" | "medium" | "low";
}

const missionIcons: Partial<Record<MissionType, React.ReactNode>> = {
  DCA: <Shield className="h-4 w-4" />,
  QRA: <Target className="h-4 w-4" />,
  RECCE: <AircraftIcon type="LOTUS" size={16} />,
  AEW: <AircraftIcon type="GlobalEye" size={16} />,
  AI_DT: <Zap className="h-4 w-4" />,
};

function getMissions(base: Base, hour: number, phase: ScenarioPhase): MissionSummary[] {
  const missions: MissionSummary[] = [
    { type: "QRA", label: "Snabbinsats QRA", status: "active", aircraft: 2, time: "00:00–24:00", priority: "high" },
  ];
  if (phase === "FRED") {
    missions.push({ type: "RECCE", label: "Spaning", status: hour >= 12 ? "completed" : hour >= 8 ? "active" : "planned", aircraft: 2, time: "08:00–12:00", priority: "medium" });
  } else if (phase === "KRIS") {
    missions.push(
      { type: "DCA", label: "Luftförsvar", status: hour >= 14 ? "completed" : hour >= 6 ? "active" : "planned", aircraft: 4, time: "06:00–14:00", priority: "high" },
      { type: "AEW", label: "Luftövervakning", status: hour >= 18 ? "completed" : hour >= 6 ? "active" : "planned", aircraft: 1, time: "06:00–18:00", priority: "high" },
      { type: "RECCE", label: "Spaning", status: hour >= 14 ? "completed" : hour >= 10 ? "active" : "planned", aircraft: 2, time: "10:00–14:00", priority: "medium" },
    );
  } else {
    missions.push(
      { type: "DCA", label: "Luftförsvar Omg 1", status: hour >= 12 ? "completed" : hour >= 6 ? "active" : "planned", aircraft: 6, time: "06:00–12:00", priority: "high" },
      { type: "DCA", label: "Luftförsvar Omg 2", status: hour >= 18 ? "completed" : hour >= 12 ? "active" : "planned", aircraft: 6, time: "12:00–18:00", priority: "high" },
      { type: "AI_DT", label: "Attack dagljus", status: hour >= 11 ? "completed" : hour >= 8 ? "active" : "planned", aircraft: 4, time: "08:00–11:00", priority: "high" },
      { type: "RECCE", label: "Spaning", status: hour >= 15 ? "completed" : hour >= 7 ? "active" : "planned", aircraft: 2, time: "07:00–15:00", priority: "medium" },
    );
  }
  return missions;
}

const statusDef = {
  active: {
    bg: "hsl(152 60% 32% / 0.06)",
    border: "hsl(152 60% 32% / 0.35)",
    strip: "hsl(152 60% 38%)",
    icon: <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "hsl(152 60% 42%)" }} />,
    label: "AKTIV",
    labelBg: "hsl(152 60% 32% / 0.12)",
    labelColor: "hsl(152 60% 28%)",
  },
  planned: {
    bg: "hsl(220 63% 18% / 0.04)",
    border: "hsl(220 63% 18% / 0.20)",
    strip: "hsl(220 63% 38%)",
    icon: <Clock className="w-3.5 h-3.5" style={{ color: "hsl(220 63% 42%)" }} />,
    label: "PLANERAD",
    labelBg: "hsl(220 63% 18% / 0.08)",
    labelColor: "hsl(220 63% 36%)",
  },
  completed: {
    bg: "hsl(216 18% 96%)",
    border: "hsl(215 14% 84%)",
    strip: "hsl(215 14% 74%)",
    icon: <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "hsl(152 60% 50%)" }} />,
    label: "KLAR",
    labelBg: "hsl(215 14% 90%)",
    labelColor: "hsl(218 15% 50%)",
  },
};

export function DagensMissioner({ base, hour, phase }: DagensMissionerProps) {
  const missions = getMissions(base, hour, phase);
  const aktiva = missions.filter((m) => m.status === "active").length;
  const completed = missions.filter((m) => m.status === "completed").length;

  return (
    <div className="space-y-2">
      {/* Summary bar */}
      <div className="flex items-center gap-3 mb-3 pb-3"
        style={{ borderBottom: "1px solid hsl(215 14% 88%)" }}>
        {[
          { label: "AKTIVA", value: aktiva, color: "hsl(152 60% 32%)" },
          { label: "PLANERADE", value: missions.length - aktiva - completed, color: "hsl(220 63% 38%)" },
          { label: "KLARA", value: completed, color: "hsl(218 15% 55%)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="text-xl font-black font-mono" style={{ color }}>{value}</span>
            <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "hsl(218 15% 55%)" }}>{label}</span>
          </div>
        ))}
      </div>

      {missions.map((mission, i) => {
        const s = statusDef[mission.status];
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-center gap-0 rounded-lg overflow-hidden"
            style={{ border: `1px solid ${s.border}`, background: s.bg }}
          >
            {/* Status strip */}
            <div className="w-1 self-stretch shrink-0" style={{ background: s.strip }} />

            <div className="flex items-center gap-3 px-3 py-2.5 flex-1 min-w-0">
              {/* Mission type icon */}
              <div className="shrink-0 p-1.5 rounded-lg"
                style={{ background: "hsl(220 63% 18% / 0.07)", color: "hsl(220 63% 30%)" }}>
                {missionIcons[mission.type] || <AircraftIcon type="GripenE" size={16} />}
              </div>

              {/* Labels */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[11px] font-bold font-sans"
                    style={{ color: mission.status === "completed" ? "hsl(218 15% 55%)" : "hsl(220 63% 18%)" }}>
                    {mission.type}
                  </span>
                  <span className="text-[10px] font-mono" style={{ color: "hsl(218 15% 55%)" }}>
                    {mission.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[9px] font-mono"
                  style={{ color: "hsl(218 15% 58%)" }}>
                  <span>{mission.time}</span>
                  <span>·</span>
                  <span>{mission.aircraft} flygplan</span>
                </div>
              </div>

              {/* Right badges */}
              <div className="flex items-center gap-2 shrink-0">
                {mission.priority === "high" && mission.status !== "completed" && (
                  <AlertCircle className="h-3.5 w-3.5" style={{ color: "hsl(353 74% 47%)" }} />
                )}
                <span className="flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full font-bold"
                  style={{ background: s.labelBg, color: s.labelColor }}>
                  {s.icon}
                  {s.label}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
