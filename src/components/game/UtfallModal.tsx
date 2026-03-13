import { useState, useEffect } from "react";
import { Aircraft } from "@/types/game";
import { motion, AnimatePresence } from "framer-motion";
import { Dice6, CheckCircle, AlertTriangle, RefreshCw, Wrench, X, Zap, Plane } from "lucide-react";

// ── Utfall table data ─────────────────────────────────────────────────────
export interface UtfallOutcome {
  roll: number;
  bitCheck: "ok" | "fel";
  actionType: string;
  maintenanceTypeKey: "quick_lru" | "complex_lru" | "direct_repair" | "troubleshooting" | "scheduled_service";
  repairTime: number; // hours
  capability: string;
  facility: string;
  reception: "OK" | "Avhj";
  weaponLoss: number; // percent
  serviceType: "A" | "B" | "C";
  serviceDays: number;
  uhTilläggPct: number; // % addition to nominal UH time
  isNegative: boolean;
}

export const UTFALL_TABLE: UtfallOutcome[] = [
  {
    roll: 1,
    bitCheck: "ok",
    actionType: "Quick LRU replacement",
    maintenanceTypeKey: "quick_lru",
    repairTime: 2,
    capability: "AU Steg 1",
    facility: "Service Bay (flight line)",
    reception: "OK",
    weaponLoss: 10,
    serviceType: "A",
    serviceDays: 5,
    uhTilläggPct: 0,
    isNegative: false,
  },
  {
    roll: 2,
    bitCheck: "ok",
    actionType: "Quick LRU replacement",
    maintenanceTypeKey: "quick_lru",
    repairTime: 2,
    capability: "AU Steg 2/3",
    facility: "Minor Maint Workshop",
    reception: "OK",
    weaponLoss: 30,
    serviceType: "A",
    serviceDays: 5,
    uhTilläggPct: 0,
    isNegative: false,
  },
  {
    roll: 3,
    bitCheck: "ok",
    actionType: "Complex LRU replacement",
    maintenanceTypeKey: "complex_lru",
    repairTime: 6,
    capability: "AU Steg 4",
    facility: "Major Maint Workshop",
    reception: "OK",
    weaponLoss: 50,
    serviceType: "B",
    serviceDays: 8,
    uhTilläggPct: 0,
    isNegative: false,
  },
  {
    roll: 4,
    bitCheck: "ok",
    actionType: "Direct repair",
    maintenanceTypeKey: "direct_repair",
    repairTime: 16,
    capability: "Kompositrep",
    facility: "Major Maint Workshop",
    reception: "OK",
    weaponLoss: 70,
    serviceType: "B",
    serviceDays: 8,
    uhTilläggPct: 10,
    isNegative: false,
  },
  {
    roll: 5,
    bitCheck: "fel",
    actionType: "Felsökning liten",
    maintenanceTypeKey: "troubleshooting",
    repairTime: 4,
    capability: "FK steg 1-3",
    facility: "Service Bay",
    reception: "Avhj",
    weaponLoss: 90,
    serviceType: "C",
    serviceDays: 20,
    uhTilläggPct: 20,
    isNegative: true,
  },
  {
    roll: 6,
    bitCheck: "fel",
    actionType: "Felsökning liten",
    maintenanceTypeKey: "troubleshooting",
    repairTime: 4,
    capability: "FK steg 1-3",
    facility: "Service Bay",
    reception: "Avhj",
    weaponLoss: 100,
    serviceType: "C",
    serviceDays: 20,
    uhTilläggPct: 50,
    isNegative: true,
  },
];

// Alternative scenarios for negative outcomes
const NEGATIVE_ALTERNATIVES = [
  {
    id: "accept",
    label: "Acceptera & sätt i underhåll",
    description: "Genomför ordinarie underhåll per utfallet",
    icon: Wrench,
    color: "#dc2626",
    bgColor: "#fef2f2",
    borderColor: "#fca5a5",
  },
  {
    id: "reroll",
    label: "Begär omprövning",
    description: "Slå om tärningen — ny inspektion",
    icon: RefreshCw,
    color: "#d97706",
    bgColor: "#fffbeb",
    borderColor: "#fcd34d",
  },
  {
    id: "quickfix",
    label: "Snabbfix 2h",
    description: "Prioritera minimal åtgärd, quick LRU, 2h",
    icon: Zap,
    color: "#2563eb",
    bgColor: "#eff6ff",
    borderColor: "#93c5fd",
  },
  {
    id: "groundall",
    label: "Markera som NMC & vänta",
    description: "Parkera — väntar på förstärkt personal",
    icon: AlertTriangle,
    color: "#7c3aed",
    bgColor: "#faf5ff",
    borderColor: "#c4b5fd",
  },
];

interface UtfallModalProps {
  aircraft: Aircraft;
  onClose: () => void;
  onAccept: (outcome: UtfallOutcome) => void;
  /** "runway" = auto-roll + mission/service choice; "manual" = existing manual roll */
  context?: "manual" | "runway";
  /** Called when user chooses to proceed with the mission (runway context) */
  onProceedMission?: () => void;
}

export function UtfallModal({ aircraft, onClose, onAccept, context = "manual", onProceedMission }: UtfallModalProps) {
  const [rolled, setRolled] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [decision, setDecision] = useState<string | null>(null);
  const [rollCount, setRollCount] = useState(0);

  const outcome = rolled !== null ? UTFALL_TABLE[rolled - 1] : null;

  // Auto-roll when opened from runway drop
  useEffect(() => {
    if (context === "runway") {
      rollDice();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rollDice = () => {
    setRolling(true);
    setDecision(null);
    let count = 0;
    const interval = setInterval(() => {
      setRolled(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count >= 10) {
        clearInterval(interval);
        setRolling(false);
        setRollCount((c) => c + 1);
      }
    }, 80);
  };

  const handleDecision = (decisionId: string) => {
    if (!outcome) return;
    setDecision(decisionId);

    if (decisionId === "reroll") {
      setTimeout(() => rollDice(), 300);
      return;
    }

    let appliedOutcome = outcome;
    if (decisionId === "quickfix") {
      appliedOutcome = UTFALL_TABLE[0]; // Quick LRU 2h
    } else if (decisionId === "groundall") {
      // Keep as NMC, don't change maintenance time, just accept current state
      appliedOutcome = { ...outcome, repairTime: 0 };
    }

    setTimeout(() => onAccept(appliedOutcome), 400);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 20 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
        style={{ border: "2px solid #005AA0" }}
      >
        {/* ── Header ── */}
        <div className="bg-[#005AA0] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-black font-mono tracking-widest flex items-center gap-2">
              <Dice6 className="h-5 w-5" />
              {context === "runway" ? "UTFALL — UPPDRAGSFÖRBEREDELSE" : "UTFALL-CHECK"}
            </div>
            <div className="text-sm opacity-80 font-mono">
              {aircraft.tailNumber} · {aircraft.type} ·{" "}
              <span className="text-yellow-300 font-bold">
                {context === "runway" ? "STARTKONTROLL BIT" : aircraft.status.replace(/_/g, " ").toUpperCase()}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white rounded-lg p-1 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* ── Dice + outcome grid ── */}
          <div className="flex gap-5 items-start">
            {/* Dice */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <motion.div
                key={rolled}
                initial={rolling ? { rotate: -15, scale: 0.9 } : false}
                animate={{ rotate: 0, scale: 1 }}
                className={`w-24 h-24 rounded-2xl flex items-center justify-center text-6xl font-black border-4 shadow-inner transition-colors ${
                  rolled === null
                    ? "border-gray-300 bg-gray-50 text-gray-300"
                    : outcome?.isNegative
                    ? "border-red-500 bg-red-50 text-red-600"
                    : "border-green-500 bg-green-50 text-green-600"
                }`}
              >
                {rolling ? "⟳" : (rolled ?? "?")}
              </motion.div>
              <button
                onClick={rollDice}
                disabled={rolling}
                className="px-5 py-2.5 bg-[#005AA0] text-white rounded-xl font-mono text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-md active:scale-95"
              >
                <Dice6 className="h-4 w-4" />
                {rolling ? "RULLAR..." : rolled === null ? "SLÅ TÄRNING" : "SLÅOM"}
              </button>
              {rollCount > 0 && (
                <div className="text-[10px] font-mono text-gray-400">Roll #{rollCount}</div>
              )}
            </div>

            {/* Outcome cards 1-6 */}
            <div className="flex-1">
              <div className="text-[9px] font-mono text-gray-400 mb-2 uppercase tracking-wider">Möjliga utfall</div>
              <div className="grid grid-cols-6 gap-1.5">
                {UTFALL_TABLE.map((row) => (
                  <div
                    key={row.roll}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      rolled === row.roll
                        ? row.isNegative
                          ? "bg-red-100 border-red-400 shadow-md scale-105"
                          : "bg-green-100 border-green-400 shadow-md scale-105"
                        : "bg-gray-50 border-gray-200 opacity-50"
                    }`}
                  >
                    <div className="font-black text-xl text-gray-800">{row.roll}</div>
                    <div
                      className={`text-[8px] font-bold uppercase ${
                        row.isNegative ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {row.isNegative ? "FEL" : "OK"}
                    </div>
                    <div className="text-[7px] text-gray-500 font-mono mt-0.5">
                      {row.repairTime}h
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[9px] font-mono text-gray-400">
                Utfall 1–4 = BIT OK · 5–6 = BIT-FEL (negativt resultat)
              </div>
            </div>
          </div>

          {/* ── Result details ── */}
          <AnimatePresence mode="wait">
            {outcome && !rolling && (
              <motion.div
                key={`result-${rolled}-${rollCount}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`rounded-xl border-2 p-4 ${
                  outcome.isNegative
                    ? "border-red-400 bg-red-50"
                    : "border-green-400 bg-green-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  {outcome.isNegative ? (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                  <span
                    className={`font-black font-mono text-sm ${
                      outcome.isNegative ? "text-red-700" : "text-green-700"
                    }`}
                  >
                    UTFALL {outcome.roll} —{" "}
                    {outcome.isNegative ? "⚠ NEGATIVT RESULTAT" : "✓ ACCEPTABELT RESULTAT"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[11px] font-mono">
                  <div>
                    <span className="text-gray-500">BIT-kontroll:</span>
                    <span
                      className={`ml-2 font-bold uppercase ${
                        outcome.bitCheck === "ok" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {outcome.bitCheck}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Facilitet:</span>
                    <span className="ml-2 font-bold text-gray-800">{outcome.facility}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Åtgärd:</span>
                    <span className="ml-2 font-bold text-gray-800">{outcome.actionType}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Mottagning:</span>
                    <span
                      className={`ml-2 font-bold ${
                        outcome.reception === "OK" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {outcome.reception}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Avhjälpningstid:</span>
                    <span className="ml-2 font-bold text-[#005AA0]">{outcome.repairTime}h</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Vapensystemsförlust:</span>
                    <span
                      className={`ml-2 font-bold ${
                        outcome.weaponLoss >= 70
                          ? "text-red-600"
                          : outcome.weaponLoss >= 30
                          ? "text-amber-600"
                          : "text-green-600"
                      }`}
                    >
                      {outcome.weaponLoss}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Förmåga:</span>
                    <span className="ml-2 font-bold text-gray-800">{outcome.capability}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Servicetype:</span>
                    <span className="ml-2 font-bold text-[#005AA0]">
                      Typ {outcome.serviceType} ({outcome.serviceDays} dygn)
                    </span>
                  </div>
                </div>

                {outcome.uhTilläggPct > 0 && (
                  <div className="mt-3 text-[10px] font-mono text-amber-700 bg-amber-100 rounded-lg px-3 py-2 border border-amber-300 flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Tillägg till nominell UH-tid: +{outcome.uhTilläggPct}%
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── RUNWAY CONTEXT: decision after roll ── */}
          <AnimatePresence>
            {context === "runway" && outcome && !rolling && (
              <motion.div
                key={`runway-decision-${rolled}-${rollCount}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`rounded-xl border-2 p-4 ${outcome.isNegative ? "border-red-400 bg-red-50" : "border-green-400 bg-green-50"}`}
              >
                <div className={`text-sm font-black font-mono mb-4 flex items-center gap-2 ${outcome.isNegative ? "text-red-700" : "text-green-700"}`}>
                  {outcome.isNegative
                    ? <><AlertTriangle className="h-4 w-4" /> BIT-FEL DETEKTERAT — VAD GÖR VI?</>
                    : <><CheckCircle className="h-4 w-4" /> BIT OK — PLANET ÄR REDO</>
                  }
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {/* For positive: primary = proceed, secondary = send to service */}
                  {/* For negative: primary = send to maintenance, secondary = override and fly */}
                  {!outcome.isNegative ? (
                    <>
                      <button
                        onClick={() => { setDecision("proceed"); setTimeout(() => onProceedMission?.(), 300); }}
                        disabled={!!decision}
                        className="p-4 rounded-xl border-2 border-green-400 bg-white hover:bg-green-50 text-left transition-all hover:shadow-md active:scale-95 disabled:opacity-50"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Plane className="h-4 w-4 text-green-600" />
                          <span className="text-[12px] font-black font-mono text-green-700">STARTA UPPDRAG</span>
                        </div>
                        <div className="text-[9px] font-mono text-gray-500">Planet är klart — skicka på uppdrag</div>
                      </button>
                      <button
                        onClick={() => { setDecision("service"); setTimeout(() => onAccept(outcome), 300); }}
                        disabled={!!decision}
                        className="p-4 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 text-left transition-all hover:shadow-md active:scale-95 disabled:opacity-50"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Wrench className="h-4 w-4 text-gray-500" />
                          <span className="text-[12px] font-black font-mono text-gray-600">SKICKA TILL SERVICE</span>
                        </div>
                        <div className="text-[9px] font-mono text-gray-500">Planera service istället för uppdrag</div>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setDecision("maintenance"); setTimeout(() => onAccept(outcome), 300); }}
                        disabled={!!decision}
                        className="p-4 rounded-xl border-2 border-red-400 bg-white hover:bg-red-50 text-left transition-all hover:shadow-md active:scale-95 disabled:opacity-50"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Wrench className="h-4 w-4 text-red-600" />
                          <span className="text-[12px] font-black font-mono text-red-700">SÄTT I UNDERHÅLL</span>
                        </div>
                        <div className="text-[9px] font-mono text-gray-500">Rekommenderat — {outcome.repairTime}h åtgärd ({outcome.actionType})</div>
                      </button>
                      <button
                        onClick={() => { setDecision("override"); setTimeout(() => onProceedMission?.(), 300); }}
                        disabled={!!decision}
                        className="p-4 rounded-xl border-2 border-orange-300 bg-white hover:bg-orange-50 text-left transition-all hover:shadow-md active:scale-95 disabled:opacity-50"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          <span className="text-[12px] font-black font-mono text-orange-600">KÖR ÄNDÅ</span>
                        </div>
                        <div className="text-[9px] font-mono text-gray-500">Riskarbete — skicka trots fel ({outcome.weaponLoss}% vapensystemsförlust)</div>
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={rollDice}
                  disabled={rolling || !!decision}
                  className="mt-3 w-full py-2 text-[10px] font-mono text-gray-400 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-30"
                >
                  <RefreshCw className="h-3 w-3" /> Slå om tärningen
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── MANUAL CONTEXT: decision panel for negative outcomes ── */}
          <AnimatePresence>
            {context === "manual" && outcome?.isNegative && !rolling && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border-2 border-red-400 bg-red-50 p-4"
              >
                <div className="text-sm font-black font-mono text-red-700 mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  NEGATIVT UTFALL — VÄLJ SCENARIO
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {NEGATIVE_ALTERNATIVES.map((alt) => {
                    const Icon = alt.icon;
                    const isSelected = decision === alt.id;
                    return (
                      <button
                        key={alt.id}
                        onClick={() => handleDecision(alt.id)}
                        disabled={!!decision && decision !== "reroll"}
                        className={`p-3 rounded-xl border-2 text-left transition-all active:scale-95 ${
                          isSelected
                            ? "scale-[0.97] shadow-inner"
                            : "hover:shadow-md hover:-translate-y-0.5"
                        }`}
                        style={{
                          borderColor: isSelected ? alt.color : "#e5e7eb",
                          backgroundColor: isSelected ? alt.bgColor : "#ffffff",
                          opacity: !!decision && decision !== alt.id && decision !== "reroll" ? 0.4 : 1,
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <Icon
                            className="h-4 w-4 mt-0.5 shrink-0"
                            style={{ color: alt.color }}
                          />
                          <div>
                            <div
                              className="text-[11px] font-black font-mono"
                              style={{ color: alt.color }}
                            >
                              {alt.label}
                            </div>
                            <div className="text-[9px] font-mono text-gray-500 mt-0.5">
                              {alt.description}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── MANUAL CONTEXT: Accept button for positive outcomes ── */}
          <AnimatePresence>
            {context === "manual" && outcome && !outcome.isNegative && !rolling && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-end gap-3"
              >
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-mono text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Avbryt
                </button>
                <button
                  onClick={() => onAccept(outcome)}
                  className="px-6 py-2 bg-[#005AA0] text-white text-sm font-mono font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md active:scale-95"
                >
                  <CheckCircle className="h-4 w-4" />
                  Acceptera & planera underhåll
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
