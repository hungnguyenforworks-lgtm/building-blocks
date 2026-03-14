import { useState } from "react";
import { motion } from "framer-motion";
import { Aircraft, BaseType } from "@/types/game";

interface Props {
  incomingAircraft: Aircraft;
  maintenanceAircraft: Aircraft[]; // currently in bays
  baseId: BaseType;
  onPause: (pauseAircraftId: string) => void; // pause one, then incoming enters pendingMaintenanceCheck
  onIgnore: () => void;
}

export function HangarFullModal({ incomingAircraft, maintenanceAircraft, baseId, onPause, onIgnore }: Props) {
  const [pickingPlane, setPickingPlane] = useState(false);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)" }}>
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className="w-[520px] rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "#0C234C", border: "2px solid #D7AB3A" }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center gap-3" style={{ background: "#0a1d3e", borderBottom: "1px solid #D7AB3A44" }}>
          <span className="text-2xl">⚠️</span>
          <div>
            <div className="text-xs font-mono font-bold" style={{ color: "#D7AB3A" }}>VARNING — ALLA HANGARPLATSER FULLA</div>
            <div className="text-base font-mono font-black text-white">
              {incomingAircraft.tailNumber} väntar på plats
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {!pickingPlane ? (
            <>
              {/* Info */}
              <div className="rounded-xl p-4" style={{ background: "#1a3a6a", border: "1px solid #2a5a9a" }}>
                <div className="text-xs font-mono" style={{ color: "#ccd4e8" }}>
                  Alla 4 underhållsplatser är upptagna. Vill du pausa arbetet på ett av de nuvarande flygplanen
                  för att göra plats, eller ignorera <span style={{ color: "#D7AB3A" }}>{incomingAircraft.tailNumber}</span> tills vidare?
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setPickingPlane(true)}
                  className="flex-1 py-3 rounded-xl font-mono font-bold text-sm transition-all hover:brightness-110 active:scale-95"
                  style={{ background: "#4a3a1a", border: "1px solid #D7AB3A", color: "#D7AB3A" }}
                >
                  ⏸ Pausa ett plan — ge plats
                </button>
                <button
                  onClick={onIgnore}
                  className="px-5 py-3 rounded-xl font-mono font-bold text-sm transition-all hover:brightness-110 active:scale-95"
                  style={{ background: "#2a2a3a", border: "1px solid #5566aa", color: "#8899cc" }}
                >
                  Ignorera
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Pick which plane to pause */}
              <div className="text-xs font-mono mb-2" style={{ color: "#D7AB3A" }}>
                Välj vilket plan som ska pausas (arbetet pausas, felet kvarstår):
              </div>
              <div className="space-y-2">
                {maintenanceAircraft.map((ac) => (
                  <button
                    key={ac.id}
                    onClick={() => onPause(ac.id)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl font-mono text-sm transition-all hover:brightness-125 active:scale-95"
                    style={{ background: "#1a2a4a", border: "1px solid #3a5a8a", color: "white" }}
                  >
                    <span className="font-bold" style={{ color: "#D7AB3A" }}>{ac.tailNumber}</span>
                    <span className="text-xs" style={{ color: "#8899bb" }}>{ac.maintenanceType ?? "okänt fel"}</span>
                    <span className="text-xs font-mono" style={{ color: "#D9192E" }}>
                      {ac.maintenanceTimeRemaining != null ? `${ac.maintenanceTimeRemaining}h kvar` : "—"}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#5a2a1a", color: "#ff9966" }}>
                      Pausa ⏸
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPickingPlane(false)}
                className="w-full py-2 rounded-xl font-mono text-xs transition-all hover:brightness-110"
                style={{ background: "#1a1a2a", border: "1px solid #3a3a5a", color: "#8899cc" }}
              >
                ← Tillbaka
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
