import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Aircraft } from "@/types/game";
import { UTFALL_TABLE_A, WEAPON_LOSS_BY_ROLL, EXTRA_MAINTENANCE_TIME_BY_ROLL } from "@/data/config/probabilities";
import { Dice6, CheckCircle, AlertTriangle, X, Plane } from "lucide-react";

type Phase = "roll1" | "missionTime" | "faultRolling" | "faultFound";

interface Props {
  aircraft: Aircraft;
  onMission: (durationHours: number) => void;
  onMaintenance: (repairTime: number, typeKey: string, weaponLoss: number, label: string) => void;
  onIgnoreFault: (repairTime: number, typeKey: string, actionLabel: string) => void;
  onClose: () => void;
}

function animatedRoll(
  setDisplay: (n: number) => void,
  onDone: (result: number) => void,
  fixedResult?: number
) {
  let count = 0;
  const result = fixedResult ?? (Math.floor(Math.random() * 6) + 1);
  const interval = setInterval(() => {
    setDisplay(Math.floor(Math.random() * 6) + 1);
    count++;
    if (count >= 12) {
      clearInterval(interval);
      setDisplay(result);
      onDone(result);
    }
  }, 70);
}

export function RunwayCheckModal({ aircraft, onMission, onMaintenance, onIgnoreFault, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("roll1");
  const [rolling, setRolling] = useState(false);

  const [roll1Display, setRoll1Display] = useState<number | null>(null);
  const [roll1Result, setRoll1Result] = useState<number | null>(null);
  const [missionDuration, setMissionDuration] = useState<number | null>(null);

  const [faultRollDisplay, setFaultRollDisplay] = useState<number | null>(null);
  const [faultRollResult, setFaultRollResult] = useState<number | null>(null);

  // Computed fault outcome (only when faultRollResult is 1–4)
  const faultOutcome = faultRollResult !== null && faultRollResult <= 4
    ? UTFALL_TABLE_A[faultRollResult - 1]
    : null;
  const faultWeaponLoss = faultRollResult !== null && faultRollResult <= 4
    ? WEAPON_LOSS_BY_ROLL[faultRollResult - 1]
    : 0;
  const faultExtraPct = faultRollResult !== null && faultRollResult <= 4
    ? EXTRA_MAINTENANCE_TIME_BY_ROLL[faultRollResult - 1]
    : 0;
  const faultEffectiveTime = faultOutcome
    ? faultOutcome.repairTime + Math.ceil(faultOutcome.repairTime * (faultExtraPct / 100))
    : 0;

  // Auto-roll on mount
  useEffect(() => {
    handleRoll1();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Phase 1: Klargöringsroll ──────────────────────────────────
  const handleRoll1 = () => {
    if (rolling) return;
    setRolling(true);
    setRoll1Display(null);
    animatedRoll(setRoll1Display, (result) => {
      setRoll1Result(result);
      setRolling(false);
      if (result <= 4) {
        // OK — auto-roll d3 for mission duration
        const d3 = Math.floor(Math.random() * 3) + 1;
        setMissionDuration(d3);
        setPhase("missionTime");
      } else {
        // Fault — immediately auto-roll fault type
        setPhase("faultRolling");
        autoRollFault();
      }
    });
  };

  // Auto-roll fault type immediately (no user interaction needed)
  const autoRollFault = () => {
    // Roll until we get 1–4 (same loop logic but automated)
    let r = Math.floor(Math.random() * 6) + 1;
    // Re-roll 5–6 automatically (like faultSearch did, but silently)
    while (r > 4) {
      r = Math.floor(Math.random() * 6) + 1;
    }
    setTimeout(() => {
      animatedRoll(setFaultRollDisplay, (result) => {
        setFaultRollResult(result <= 4 ? result : 1); // fallback to 1 (shouldn't happen)
        setPhase("faultFound");
      }, r); // force the pre-computed result
    }, 400); // short delay so roll1 result is visible first
  };

  const handleSendToService = () => {
    if (!faultOutcome) return;
    onMaintenance(faultEffectiveTime, faultOutcome.faultType, faultWeaponLoss, faultOutcome.description);
  };

  const canClose = phase === "missionTime";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)" }}>
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="w-[520px] rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "#0C234C", border: "2px solid #D7AB3A" }}
      >
        {/* ── Header ── */}
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ background: "#081830", borderBottom: "1px solid #D7AB3A55" }}>
          <div className="flex items-center gap-3">
            <Dice6 className="h-5 w-5" style={{ color: "#D7AB3A" }} />
            <div>
              <div className="text-[10px] font-mono font-bold tracking-widest" style={{ color: "#D7AB3A" }}>
                KLARGÖRING — UPPSTARTS-BIT
              </div>
              <div className="text-base font-mono font-black text-white">
                {aircraft.tailNumber} · {aircraft.type}
              </div>
            </div>
          </div>
          {canClose && (
            <button onClick={onClose} className="text-white/50 hover:text-white transition-colors p-1 rounded-lg">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* ── Klargöringsroll result ── */}
          <div className="flex items-center gap-5">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-5xl font-black border-4 shadow-inner transition-colors ${
                roll1Display === null
                  ? "border-gray-600 bg-gray-800 text-gray-600"
                  : roll1Result! <= 4
                  ? "border-green-500 bg-green-950 text-green-400"
                  : "border-red-500 bg-red-950 text-red-400"
              }`}>
                {rolling && phase === "roll1" ? "⟳" : (roll1Display ?? "?")}
              </div>
              <span className="text-[9px] font-mono" style={{ color: "#8899bb" }}>Klargöringsroll</span>
            </div>

            <div className="flex-1">
              {phase === "roll1" && roll1Display === null && (
                <div>
                  <div className="text-sm font-mono font-bold text-white mb-1">Slår för klargöring…</div>
                  <div className="text-[10px] font-mono" style={{ color: "#8899bb" }}>
                    1–4 = OK att flyga · 5–6 = Fel uppstår
                  </div>
                </div>
              )}
              {phase === "missionTime" && (
                <div className="rounded-xl p-3" style={{ background: "#0a2a1a", border: "1px solid #2a6a4a" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-mono font-black text-green-400">KLARGÖRING OK — {roll1Result}</span>
                  </div>
                  <div className="text-[10px] font-mono" style={{ color: "#88cc99" }}>
                    Uppdraget beräknas ta <span className="font-bold text-white">{missionDuration} timme{missionDuration !== 1 ? "r" : ""}</span>
                  </div>
                </div>
              )}
              {(phase === "faultRolling" || phase === "faultFound") && roll1Result !== null && (
                <div className="rounded-xl p-3" style={{ background: "#2a0a0a", border: "1px solid #6a2a2a" }}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-sm font-mono font-black text-red-400">FEL VID UPPSTART — {roll1Result}</span>
                  </div>
                  <div className="text-[10px] font-mono mt-1" style={{ color: "#cc8888" }}>
                    Felidentifiering pågår…
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Fault identification (auto-rolled) ── */}
          {(phase === "faultRolling" || phase === "faultFound") && (
            <div>
              <div className="text-[9px] font-mono mb-2 font-bold tracking-wider" style={{ color: "#D7AB3A" }}>
                FELIDENTIFIERING — AUTOMATISK
              </div>
              <div className="flex items-center gap-5">
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-4xl font-black shadow-inner transition-colors ${
                    faultRollDisplay === null
                      ? "border-gray-600 bg-gray-800 text-gray-600"
                      : "border-amber-500 bg-amber-950 text-amber-400"
                  }`} style={{ borderWidth: 3, border: `3px solid ${faultRollDisplay !== null ? "#f59e0b" : "#4b5563"}` }}>
                    {phase === "faultRolling" && faultRollDisplay === null ? "⟳" : (faultRollDisplay ?? "?")}
                  </div>
                  <span className="text-[9px] font-mono" style={{ color: "#8899bb" }}>Feltypsroll</span>
                </div>

                <div className="flex-1">
                  {phase === "faultRolling" && (
                    <div className="text-[10px] font-mono" style={{ color: "#aa88cc" }}>
                      Identifierar feltyp…
                    </div>
                  )}
                  {phase === "faultFound" && faultOutcome && (
                    <div className="rounded-xl p-3" style={{ background: "#2a1a0a", border: "1px solid #6a4a1a" }}>
                      <div className="text-[10px] font-mono font-black text-amber-400 mb-1">
                        ⚠ FEL IDENTIFIERAT — Roll {faultRollResult}
                      </div>
                      <div className="text-[10px] font-mono font-bold text-white">{faultOutcome.description}</div>
                      <div className="mt-1.5 space-y-0.5 text-[9px] font-mono" style={{ color: "#bbaa88" }}>
                        <div>⏱ Tid: <span className="text-white font-bold">{faultEffectiveTime}h</span>
                          {faultExtraPct > 0 && <span className="text-amber-400"> (+{faultExtraPct}%)</span>}
                        </div>
                        <div>💣 Vapensystemsförlust: <span className="text-white font-bold">{faultWeaponLoss}%</span></div>
                        <div>🔧 {faultOutcome.faultType.replace(/_/g, " ")} · {faultOutcome.facility.replace(/_/g, " ")}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Action buttons ── */}
          <AnimatePresence mode="wait">

            {phase === "roll1" && rolling && (
              <motion.div key="btn-rolling" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="w-full py-3 rounded-xl font-mono font-black text-sm flex items-center justify-center gap-2"
                  style={{ background: "#1a2a3a", border: "1px solid #3a4a5a", color: "#D7AB3A" }}>
                  <Dice6 className="h-4 w-4 animate-spin" />
                  KLARGÖRING PÅGÅR…
                </div>
              </motion.div>
            )}

            {phase === "faultRolling" && (
              <motion.div key="btn-fault-rolling" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="w-full py-3 rounded-xl font-mono font-black text-sm flex items-center justify-center gap-2"
                  style={{ background: "#2a1a1a", border: "1px solid #6a2a2a", color: "#ff9988" }}>
                  <Dice6 className="h-4 w-4 animate-spin" />
                  IDENTIFIERAR FEL…
                </div>
              </motion.div>
            )}

            {phase === "missionTime" && (
              <motion.div key="btn-mission" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-3 rounded-xl font-mono font-bold text-sm transition-all hover:brightness-110 active:scale-95"
                  style={{ background: "#1a2a3a", border: "1px solid #3a4a5a", color: "#8899bb" }}
                >
                  ✕ Avbryt
                </button>
                <button
                  onClick={() => onMission(missionDuration!)}
                  className="flex-1 py-3 rounded-xl font-mono font-black text-sm transition-all hover:brightness-110 active:scale-95 flex items-center justify-center gap-2"
                  style={{ background: "#1a5a2a", border: "1px solid #4aD7AA", color: "#4aD7AA" }}
                >
                  <Plane className="h-4 w-4" />
                  KÖR! — Uppdrag {missionDuration}h
                </button>
              </motion.div>
            )}

            {phase === "faultFound" && faultOutcome && (
              <motion.div key="btn-fault-found" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                <button
                  onClick={() => onIgnoreFault(faultEffectiveTime, faultOutcome.faultType, faultOutcome.description)}
                  className="px-5 py-3 rounded-xl font-mono font-bold text-sm transition-all hover:brightness-110 active:scale-95"
                  style={{ background: "#2a1a1a", border: "1px solid #5566aa", color: "#8899cc" }}
                >
                  Ignorera — NMC
                </button>
                <button
                  onClick={handleSendToService}
                  className="flex-1 py-3 rounded-xl font-mono font-black text-sm transition-all hover:brightness-110 active:scale-95 flex items-center justify-center gap-2"
                  style={{ background: "#5a2a1a", border: "1px solid #D9192E", color: "#ff6655" }}
                >
                  ⛔ Bekräfta — skicka till service ({faultEffectiveTime}h)
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
