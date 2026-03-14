import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Aircraft, BaseType } from "@/types/game";

interface LandingResult {
  roll1: number;
  ok: boolean;
  roll2?: number;
  repairTime: number;
  maintenanceTypeKey: string;
  weaponLoss: number;
  actionLabel: string;
  description: string;
}

// Reception dice table (Mottagningskontroll)
function rollReception(): LandingResult {
  const r1 = Math.floor(Math.random() * 6) + 1;
  if (r1 <= 4) {
    return {
      roll1: r1,
      ok: true,
      repairTime: 0,
      maintenanceTypeKey: "",
      weaponLoss: 0,
      actionLabel: "Mottagning OK",
      description: "Flygplanet godkänt vid mottagning — ingen åtgärd krävs.",
    };
  }
  // 5–6: maintenance needed
  const r2 = Math.floor(Math.random() * 6) + 1;
  const table: Record<number, Omit<LandingResult, "roll1" | "roll2" | "ok">> = {
    1: { repairTime: 2,  maintenanceTypeKey: "quick_lru",      weaponLoss: 10, actionLabel: "Hjulbyte (2h)",              description: "Hjulbyte krävs efter landning." },
    2: { repairTime: 2,  maintenanceTypeKey: "quick_lru",      weaponLoss: 10, actionLabel: "Quick LRU replacement (2h)", description: "LRU-enhet kräver byte." },
    3: { repairTime: 2,  maintenanceTypeKey: "quick_lru",      weaponLoss: 30, actionLabel: "Quick LRU replacement (2h)", description: "LRU-enhet kräver byte." },
    4: { repairTime: 6,  maintenanceTypeKey: "complex_lru",    weaponLoss: 50, actionLabel: "Complex LRU replacement (6h)", description: "Komplex LRU-byte, workshoparbete." },
    5: { repairTime: 16, maintenanceTypeKey: "direct_repair",  weaponLoss: 90, actionLabel: "Direct repair (16h)",         description: "Direkt reparation, störning i stridssystem." },
    6: { repairTime: 4,  maintenanceTypeKey: "troubleshooting", weaponLoss: 50, actionLabel: "Felsökning (4h)",            description: "Felsökning inleds, fel ej omedelbart identifierat." },
  };
  return { roll1: r1, roll2: r2, ok: false, ...table[r2] };
}

interface Props {
  aircraft: Aircraft;
  baseId: BaseType;
  onComplete: (aircraftId: string, baseId: BaseType, sendToMaintenance: boolean, repairTime?: number, maintenanceTypeKey?: string, weaponLoss?: number, actionLabel?: string) => void;
  remaining: number; // how many more checks are queued after this one
}

export function LandingReceptionModal({ aircraft, baseId, onComplete, remaining }: Props) {
  const [result, setResult] = useState<LandingResult | null>(null);
  const [rolling, setRolling] = useState(false);
  const [displayRoll, setDisplayRoll] = useState<number | null>(null);

  // Auto-roll on mount
  useEffect(() => { handleRoll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRoll = () => {
    if (rolling || result) return; // hold result if already rolled
    setRolling(true);
    let count = 0;
    const interval = setInterval(() => {
      setDisplayRoll(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count >= 10) {
        clearInterval(interval);
        const r = rollReception();
        setResult(r);
        setDisplayRoll(r.roll1);
        setRolling(false);
      }
    }, 80);
  };

  const handleIgnore = () => {
    onComplete(aircraft.id, baseId, false);
  };

  const handleSendToMaintenance = () => {
    if (!result) return;
    onComplete(aircraft.id, baseId, true, result.repairTime, result.maintenanceTypeKey, result.weaponLoss, result.actionLabel);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          className="w-[480px] rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: "#0C234C", border: "2px solid #D7AB3A" }}
        >
          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between" style={{ background: "#0a1d3e", borderBottom: "1px solid #D7AB3A44" }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🛬</span>
              <div>
                <div className="text-xs font-mono font-bold" style={{ color: "#D7AB3A" }}>MOTTAGNINGSKONTROLL</div>
                <div className="text-base font-mono font-black text-white">{aircraft.tailNumber}</div>
              </div>
            </div>
            {remaining > 0 && (
              <span className="text-[10px] font-mono px-2 py-1 rounded-full" style={{ background: "#D7AB3A22", color: "#D7AB3A", border: "1px solid #D7AB3A44" }}>
                +{remaining} kvar
              </span>
            )}
          </div>

          {/* Dice */}
          <div className="px-6 py-5 flex items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center text-4xl font-black font-mono shadow-lg"
                style={{ background: rolling ? "#1a3a6a" : result?.ok ? "#1a5a2a" : "#6a1a1a", border: `2px solid ${rolling ? "#D7AB3A" : result?.ok ? "#4aD7AA" : "#D9192E"}`, color: "white", transition: "background 0.3s" }}>
                {displayRoll ?? "?"}
              </div>
              <span className="text-[10px] font-mono" style={{ color: "#8899bb" }}>Tärning 1</span>
            </div>

            {result?.roll2 !== undefined && (
              <>
                <div className="text-2xl" style={{ color: "#D7AB3A" }}>→</div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center text-4xl font-black font-mono shadow-lg"
                    style={{ background: "#6a1a1a", border: "2px solid #D9192E", color: "white" }}>
                    {result.roll2}
                  </div>
                  <span className="text-[10px] font-mono" style={{ color: "#8899bb" }}>Tärning 2</span>
                </div>
              </>
            )}

            {result && (
              <div className="flex-1 rounded-xl p-3" style={{ background: result.ok ? "#1a3a2a" : "#3a1a1a", border: `1px solid ${result.ok ? "#2a6a4a" : "#6a2a2a"}` }}>
                <div className="text-sm font-mono font-bold mb-1" style={{ color: result.ok ? "#4aD7AA" : "#D9192E" }}>
                  {result.ok ? "✅ MOTTAGNING OK" : "⚠️ UNDERHÅLLSBEHOV"}
                </div>
                <div className="text-[11px] font-mono" style={{ color: "#ccd4e8" }}>{result.description}</div>
                {!result.ok && (
                  <div className="mt-2 space-y-0.5">
                    <div className="text-[10px] font-mono" style={{ color: "#D7AB3A" }}>🔧 {result.actionLabel}</div>
                    <div className="text-[10px] font-mono" style={{ color: "#aab4cc" }}>⏱ Tid: {result.repairTime}h · 💣 Vapensystemsförlust: {result.weaponLoss}%</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Decision buttons */}
          {result && !rolling && (
            <div className="px-6 pb-6 flex gap-3">
              {result.ok ? (
                <>
                  <button
                    onClick={handleIgnore}
                    className="flex-1 py-3 rounded-xl font-mono font-bold text-sm transition-all hover:brightness-110 active:scale-95"
                    style={{ background: "#1a5a2a", border: "1px solid #4aD7AA", color: "#4aD7AA" }}
                  >
                    ✅ MC — Tillbaka till uppställning
                  </button>
                  <button
                    onClick={handleSendToMaintenance}
                    className="px-4 py-3 rounded-xl font-mono font-bold text-sm transition-all hover:brightness-110 active:scale-95"
                    style={{ background: "#2a2a3a", border: "1px solid #5566aa", color: "#8899cc" }}
                  >
                    🔧 Sätt i UH ändå
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSendToMaintenance}
                    className="flex-1 py-3 rounded-xl font-mono font-bold text-sm transition-all hover:brightness-110 active:scale-95"
                    style={{ background: "#5a2a1a", border: "1px solid #D9192E", color: "#ff6655" }}
                  >
                    🔧 Skicka till underhåll ({result.repairTime}h)
                  </button>
                  <button
                    onClick={handleIgnore}
                    className="px-4 py-3 rounded-xl font-mono font-bold text-sm transition-all hover:brightness-110 active:scale-95"
                    style={{ background: "#2a2a3a", border: "1px solid #5566aa", color: "#8899cc" }}
                  >
                    Ignorera
                  </button>
                </>
              )}
            </div>
          )}

          {rolling && (
            <div className="px-6 pb-6 text-center text-xs font-mono" style={{ color: "#D7AB3A" }}>
              Genomför mottagningskontroll…
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
