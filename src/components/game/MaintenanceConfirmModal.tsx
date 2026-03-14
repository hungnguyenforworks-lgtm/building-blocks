import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Aircraft, BaseType } from "@/types/game";

// Fault table for red aircraft troubleshooting: roll d6 → repair time
const RED_FAULT_TABLE: Record<number, { time: number; typeKey: string; label: string }> = {
  1: { time: 2,  typeKey: "quick_lru",      label: "Quick LRU (2h)" },
  2: { time: 2,  typeKey: "quick_lru",      label: "Quick LRU (2h)" },
  3: { time: 6,  typeKey: "complex_lru",    label: "Complex LRU (6h)" },
  4: { time: 16, typeKey: "direct_repair",  label: "Direct repair (16h)" },
  5: { time: 4,  typeKey: "troubleshooting", label: "Felsökning (4h) — rulla igen" },
  6: { time: 4,  typeKey: "troubleshooting", label: "Felsökning (4h) — rulla igen" },
};

// Preventive hidden-fault table: roll d6 → 1-4 = OK (2h), 5-6 = hidden fault (roll again)
const HIDDEN_FAULT_TABLE: Record<number, { time: number; typeKey: string; label: string }> = {
  1: { time: 2,  typeKey: "quick_lru",     label: "Quick LRU (2h)" },
  2: { time: 2,  typeKey: "quick_lru",     label: "Quick LRU (2h)" },
  3: { time: 6,  typeKey: "complex_lru",   label: "Complex LRU (6h)" },
  4: { time: 16, typeKey: "direct_repair", label: "Direct repair (16h)" },
};

function rollD6() { return Math.floor(Math.random() * 6) + 1; }

interface Props {
  aircraft: Aircraft;
  baseId: BaseType;
  onConfirm: (repairTime: number, typeKey: string, restoreHealth: boolean) => void;
  onCancel: () => void;
}

type Phase = "confirm" | "rolling" | "preventive_ok" | "hidden_fault" | "red_result" | "red_loop";

export function MaintenanceConfirmModal({ aircraft, baseId, onConfirm, onCancel }: Props) {
  const isRed = (aircraft.health ?? 100) === 0;
  const [phase, setPhase] = useState<Phase>(isRed ? "rolling" : "confirm");
  const [rolls, setRolls] = useState<number[]>([]);
  const [displayRoll, setDisplayRoll] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const [finalResult, setFinalResult] = useState<{ time: number; typeKey: string; label: string; restoreHealth: boolean } | null>(null);

  function animateRoll(onDone: (roll: number) => void) {
    setAnimating(true);
    let count = 0;
    const interval = setInterval(() => {
      setDisplayRoll(rollD6());
      count++;
      if (count >= 10) {
        clearInterval(interval);
        const r = rollD6();
        setDisplayRoll(r);
        setAnimating(false);
        onDone(r);
      }
    }, 80);
  }

  // Auto-roll for red aircraft on mount
  useEffect(() => {
    if (isRed) {
      setTimeout(() => performRedRoll([]), 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function performRedRoll(previousRolls: number[]) {
    setPhase("rolling");
    animateRoll((r) => {
      const newRolls = [...previousRolls, r];
      setRolls(newRolls);
      if (r === 5 || r === 6) {
        setPhase("red_loop");
        // Loop — user sees result and must roll again
        setFinalResult({ time: 4, typeKey: "troubleshooting", label: "Felsökning (4h) — rulla igen", restoreHealth: false });
      } else {
        const result = RED_FAULT_TABLE[r];
        setFinalResult({ ...result, restoreHealth: false });
        setPhase("red_result");
      }
    });
  }

  function handleConfirmMaintenance() {
    setPhase("rolling");
    animateRoll((r) => {
      const newRolls = [r];
      setRolls(newRolls);
      if (r <= 4) {
        // Preventive OK — 2h, health restored
        setFinalResult({ time: 2, typeKey: "quick_lru", label: "Förebyggande underhåll lyckat (2h)", restoreHealth: true });
        setPhase("preventive_ok");
      } else {
        // Hidden fault — roll fault type
        animateRoll((r2) => {
          setRolls([r, r2]);
          const result = HIDDEN_FAULT_TABLE[Math.min(r2, 4)]; // 1-4 for fault
          setFinalResult({ ...result, restoreHealth: false });
          setPhase("hidden_fault");
        });
      }
    });
  }

  function handleAccept() {
    if (finalResult) {
      onConfirm(finalResult.time, finalResult.typeKey, finalResult.restoreHealth);
    }
  }

  const healthColor = (aircraft.health ?? 100) > 50 ? "#4aD7AA" : (aircraft.health ?? 100) > 20 ? "#D7AB3A" : "#D9192E";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)" }}>
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className="w-[500px] rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "#0C234C", border: "2px solid #D7AB3A" }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center gap-3" style={{ background: "#0a1d3e", borderBottom: "1px solid #D7AB3A44" }}>
          <span className="text-2xl">🔧</span>
          <div>
            <div className="text-xs font-mono font-bold" style={{ color: "#D7AB3A" }}>
              {isRed ? "FELSÖKNING — NMC FLYGPLAN" : "UNDERHÅLL / SERVICE"}
            </div>
            <div className="text-base font-mono font-black text-white">{aircraft.tailNumber}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs font-mono" style={{ color: "#8899bb" }}>Hälsa</div>
            <div className="text-lg font-black font-mono" style={{ color: healthColor }}>{aircraft.health ?? 100}%</div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Confirmation phase */}
          {phase === "confirm" && (
            <>
              <div className="rounded-xl p-4" style={{ background: "#1a3a6a", border: "1px solid #2a5a9a" }}>
                <div className="text-sm font-mono font-bold text-white mb-1">Flygplanet är fortfarande operativt</div>
                <div className="text-xs font-mono" style={{ color: "#ccd4e8" }}>
                  Är du säker på att du vill placera <span style={{ color: "#D7AB3A" }}>{aircraft.tailNumber}</span> i service?
                  Det finns en risk att tekniker hittar ett dolt fel.
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleConfirmMaintenance}
                  className="flex-1 py-3 rounded-xl font-mono font-bold text-sm transition-all hover:brightness-110 active:scale-95"
                  style={{ background: "#1a4a2a", border: "1px solid #4aD7AA", color: "#4aD7AA" }}
                >
                  ✅ Ja, skicka till service
                </button>
                <button
                  onClick={onCancel}
                  className="px-5 py-3 rounded-xl font-mono font-bold text-sm transition-all hover:brightness-110 active:scale-95"
                  style={{ background: "#2a2a3a", border: "1px solid #5566aa", color: "#8899cc" }}
                >
                  Avbryt
                </button>
              </div>
            </>
          )}

          {/* Rolling animation */}
          {(phase === "rolling" || animating) && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-20 h-20 rounded-xl flex items-center justify-center text-5xl font-black font-mono shadow-lg"
                style={{ background: "#1a3a6a", border: "2px solid #D7AB3A", color: "white" }}>
                {displayRoll ?? "?"}
              </div>
              <div className="text-xs font-mono" style={{ color: "#D7AB3A" }}>Slår tärning…</div>
            </div>
          )}

          {/* Dice result display (non-animating phases) */}
          {!animating && rolls.length > 0 && phase !== "confirm" && (
            <div className="flex items-center gap-3">
              {rolls.map((r, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl font-black font-mono"
                    style={{ background: "#0a1d3e", border: "2px solid #D7AB3A", color: "white" }}>
                    {r}
                  </div>
                  <span className="text-[10px] font-mono" style={{ color: "#8899bb" }}>T{idx + 1}</span>
                </div>
              ))}
            </div>
          )}

          {/* Preventive OK */}
          {phase === "preventive_ok" && finalResult && !animating && (
            <>
              <div className="rounded-xl p-4" style={{ background: "#1a3a2a", border: "1px solid #2a6a4a" }}>
                <div className="text-sm font-mono font-bold mb-1" style={{ color: "#4aD7AA" }}>✅ Förebyggande underhåll lyckat</div>
                <div className="text-xs font-mono" style={{ color: "#ccd4e8" }}>
                  Inga fel hittades. Planet serviceats och återgår till 100% på {finalResult.time}h.
                </div>
              </div>
              <button onClick={handleAccept}
                className="w-full py-3 rounded-xl font-mono font-bold text-sm transition-all hover:brightness-110 active:scale-95"
                style={{ background: "#1a4a2a", border: "1px solid #4aD7AA", color: "#4aD7AA" }}>
                ✅ Påbörja service ({finalResult.time}h) → 100% hälsa
              </button>
            </>
          )}

          {/* Hidden fault discovered */}
          {phase === "hidden_fault" && finalResult && !animating && (
            <>
              <div className="rounded-xl p-4" style={{ background: "#3a1a1a", border: "1px solid #6a2a2a" }}>
                <div className="text-sm font-mono font-bold mb-1" style={{ color: "#D9192E" }}>⚠️ Dolt fel upptäckt!</div>
                <div className="text-xs font-mono" style={{ color: "#ccd4e8" }}>
                  {finalResult.label}
                </div>
              </div>
              <button onClick={handleAccept}
                className="w-full py-3 rounded-xl font-mono font-bold text-sm transition-all hover:brightness-110 active:scale-95"
                style={{ background: "#5a2a1a", border: "1px solid #D9192E", color: "#ff6655" }}>
                🔧 Reparera ({finalResult.time}h)
              </button>
            </>
          )}

          {/* Red aircraft — result found */}
          {phase === "red_result" && finalResult && !animating && (
            <>
              <div className="rounded-xl p-4" style={{ background: "#3a1a1a", border: "1px solid #6a2a2a" }}>
                <div className="text-sm font-mono font-bold mb-1" style={{ color: "#D9192E" }}>🔴 Fel identifierat</div>
                <div className="text-xs font-mono" style={{ color: "#ccd4e8" }}>{finalResult.label}</div>
              </div>
              <button onClick={handleAccept}
                className="w-full py-3 rounded-xl font-mono font-bold text-sm transition-all hover:brightness-110 active:scale-95"
                style={{ background: "#5a2a1a", border: "1px solid #D9192E", color: "#ff6655" }}>
                🔧 Starta reparation ({finalResult.time}h)
              </button>
            </>
          )}

          {/* Red aircraft — 5/6 loop */}
          {phase === "red_loop" && !animating && (
            <>
              <div className="rounded-xl p-4" style={{ background: "#3a2a1a", border: "1px solid #8a5a1a" }}>
                <div className="text-sm font-mono font-bold mb-1" style={{ color: "#D7AB3A" }}>🔄 Felsökning pågår (4h)</div>
                <div className="text-xs font-mono" style={{ color: "#ccd4e8" }}>
                  Felet kunde inte identifieras. Felsökning tar 4h, slå sedan tärning igen.
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => performRedRoll(rolls)}
                  className="flex-1 py-3 rounded-xl font-mono font-bold text-sm transition-all hover:brightness-110 active:scale-95"
                  style={{ background: "#4a3a1a", border: "1px solid #D7AB3A", color: "#D7AB3A" }}>
                  🎲 Slå tärning igen
                </button>
                <button onClick={() => onConfirm(4, "troubleshooting", false)}
                  className="px-4 py-3 rounded-xl font-mono font-bold text-sm transition-all hover:brightness-110 active:scale-95"
                  style={{ background: "#2a2a3a", border: "1px solid #5566aa", color: "#8899cc" }}>
                  Acceptera 4h
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
