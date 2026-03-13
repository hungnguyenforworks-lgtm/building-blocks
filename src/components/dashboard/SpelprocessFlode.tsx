import { Base } from "@/types/game";
import { motion } from "framer-motion";
import {
  RadioTower, PlaneTakeoff, PlaneLanding, Hammer,
  ChevronRight, Crosshair, Fuel, Package, Users, Wrench,
} from "lucide-react";

interface SpelprocessFlodeProps {
  base: Base;
}

// SAAB palette steps
const NAVY   = "#0C234C";
const RED    = "#D9192E";
const GOLD   = "#D7AB3A";
const SILVER = "#D7DEE1";

const stepDefs = [
  { id: "ato",      label: "ATO ORDER",  sub: "Uppdragstilldelning",  icon: RadioTower,    stripColor: NAVY,  iconBg: `${NAVY}14` },
  { id: "klarg",    label: "KLARGÖRING", sub: "Tankning · Last · BIT", icon: Wrench,        stripColor: GOLD,  iconBg: `${GOLD}22` },
  { id: "avlamning",label: "AVLÄMNING",  sub: "Start · Tärning",      icon: PlaneTakeoff,  stripColor: NAVY,  iconBg: `${NAVY}14` },
  { id: "mission",  label: "MISSION",    sub: "Aktiv flygning",        icon: Crosshair,     stripColor: RED,   iconBg: `${RED}14`  },
  { id: "mottag",   label: "MOTTAGNING", sub: "Landning · Kontroll",   icon: PlaneLanding,  stripColor: GOLD,  iconBg: `${GOLD}22` },
  { id: "uh",       label: "UNDERHÅLL",  sub: "UH-platser",            icon: Hammer,        stripColor: RED,   iconBg: `${RED}14`  },
];

export function SpelprocessFlode({ base }: SpelprocessFlodeProps) {
  const mc        = base.aircraft.filter((a) => a.status === "mission_capable").length;
  const nmc       = base.aircraft.filter((a) => a.status === "not_mission_capable").length;
  const maint     = base.aircraft.filter((a) => a.status === "maintenance").length;
  const onMission = base.aircraft.filter((a) => a.status === "on_mission").length;
  const fuelOk    = base.fuel > 30;
  const totalPersonnel = base.personnel.reduce((s, p) => s + p.available, 0);

  const counts = [
    mc + onMission,
    mc,
    onMission,
    onMission,
    nmc,
    maint,
  ];

  const units = [
    "fpl tillgängliga",
    "redo för uppdrag",
    "i luften",
    "på uppdrag",
    "post-flight",
    `${base.maintenanceBays.occupied}/${base.maintenanceBays.total} platser`,
  ];

  const resources = [
    { icon: Fuel,    label: "BRÄNSLE",   ok: fuelOk,                                                            val: `${Math.round(base.fuel)}%`              },
    { icon: Package, label: "AMMO",      ok: base.ammunition.every((a) => a.quantity / a.max > 0.3),           val: `${base.ammunition.reduce((s, a) => s + a.quantity, 0)} st` },
    { icon: Users,   label: "PERSONAL",  ok: totalPersonnel > 10,                                               val: `${totalPersonnel}`                       },
    { icon: Wrench,  label: "UH-PLATSER",ok: base.maintenanceBays.occupied < base.maintenanceBays.total,        val: `${base.maintenanceBays.occupied}/${base.maintenanceBays.total}` },
  ];

  return (
    <div className="space-y-4">
      {/* ── Process flow ─────────────────────────────────────────── */}
      <div className="flex items-stretch gap-0">
        {stepDefs.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.id} className="flex items-center flex-1 min-w-0">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex-1 relative overflow-hidden rounded-lg"
                style={{
                  background: "linear-gradient(160deg, #ffffff, #f5f7fa)",
                  border: `1px solid ${step.stripColor}30`,
                  boxShadow: `0 1px 6px ${step.stripColor}10`,
                }}
              >
                {/* Top accent strip */}
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-lg"
                  style={{ background: step.stripColor }} />

                <div className="px-3 pt-4 pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="p-1.5 rounded-lg" style={{ background: step.iconBg }}>
                      <Icon className="h-4 w-4" style={{ color: step.stripColor }} />
                    </div>
                    <span className="text-[22px] font-black font-mono leading-none"
                      style={{ color: step.stripColor }}>
                      {counts[i]}
                    </span>
                  </div>
                  <div className="text-[9px] font-black font-mono tracking-widest truncate"
                    style={{ color: NAVY }}>
                    {step.label}
                  </div>
                  <div className="text-[8px] mt-0.5 truncate"
                    style={{ color: "#6b7280" }}>
                    {step.sub}
                  </div>
                  <div className="text-[8px] font-mono mt-1 truncate"
                    style={{ color: step.stripColor, opacity: 0.75 }}>
                    {units[i]}
                  </div>
                </div>
              </motion.div>

              {i < stepDefs.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 mx-0.5"
                  style={{ color: `${NAVY}40` }} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Resource status strip ─────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <span className="text-[8px] font-mono tracking-widest shrink-0"
          style={{ color: `${NAVY}60` }}>
          RESURSER
        </span>
        <div className="flex-1 h-px" style={{ background: `${NAVY}15` }} />
        {resources.map((r) => {
          const Icon = r.icon;
          return (
            <div
              key={r.label}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-mono"
              style={{
                background: r.ok ? `${NAVY}09` : `${RED}10`,
                border: `1px solid ${r.ok ? `${NAVY}22` : `${RED}35`}`,
                color: r.ok ? NAVY : RED,
              }}
            >
              <Icon className="h-3 w-3" />
              <span className="hidden sm:inline opacity-60">{r.label}</span>
              <span className="font-bold">{r.val}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
