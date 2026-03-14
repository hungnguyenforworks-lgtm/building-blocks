import { useState } from "react";
import { useGame } from "@/context/GameContext";
import { TopBar } from "@/components/game/TopBar";
import { MissionSchedule } from "@/components/game/MissionSchedule";
import { MaintenanceBays } from "@/components/game/MaintenanceBays";
import { TurnPhaseTracker } from "@/components/game/TurnPhaseTracker";
import { PhasePanel } from "@/components/game/PhasePanel";
import { RecommendationFeed } from "@/components/game/RecommendationFeed";
import { StatusKort } from "@/components/dashboard/StatusKort";
import { LarmPanel } from "@/components/dashboard/LarmPanel";
import { DagensMissioner } from "@/components/dashboard/DagensMissioner";
import { FlygschemaTidslinje } from "@/components/dashboard/FlygschemaTidslinje";
import { ResursPanel } from "@/components/dashboard/ResursPanel";
import { RemainingLifeGraf } from "@/components/dashboard/RemainingLifeGraf";
import { BaseMap, DropZone } from "@/components/game/BaseMap";
import { LandingReceptionModal } from "@/components/game/LandingReceptionModal";
import { RunwayCheckModal } from "@/components/game/RunwayCheckModal";
import { MaintenanceConfirmModal } from "@/components/game/MaintenanceConfirmModal";
import { HangarFullModal } from "@/components/game/HangarFullModal";
import { LastBayWarningModal } from "@/components/game/LastBayWarningModal";
import { SparePartsPickerModal } from "@/components/game/SparePartsPickerModal";
import { toast } from "sonner";
import { BaseType } from "@/types/game";
import { ShieldCheck, Crosshair, Hammer, Users, Siren, Clock, MapPin, PlaneTakeoff } from "lucide-react";

const Index = () => {
  const { state, advanceTurn, startMaintenance, sendOnMission, resetGame, moveAircraftToMaintenance, sendMissionDrop, applyUtfallOutcome, completeLandingCheck, applyRecommendation, dismissRecommendation, hangarDropConfirm, pauseMaintenance, markFaultNMC, consumeSparePart } = useGame();
  const [selectedBaseId, setSelectedBaseId] = useState<BaseType>("MOB");
  const [pendingRunwayCheck, setPendingRunwayCheck] = useState<string | null>(null);
  const [pendingMaintenanceCheck, setPendingMaintenanceCheck] = useState<string | null>(null);
  const [redRunwayWarning, setRedRunwayWarning] = useState<string | null>(null);
  const [hangarFullWarning, setHangarFullWarning] = useState<string | null>(null);
  const [lastBayWarning, setLastBayWarning] = useState<string | null>(null);
  const [sparePartsFullWarning, setSparePartsFullWarning] = useState<string | null>(null);
  const [sparePartsPickerAircraftId, setSparePartsPickerAircraftId] = useState<string | null>(null);
  const [pendingUtfallFull, setPendingUtfallFull] = useState<{
    aircraftId: string; repairTime: number; typeKey: string; weaponLoss: number; label: string;
  } | null>(null);

  const selectedBase = state.bases.find((b) => b.id === selectedBaseId)!;

  const mcTotal = selectedBase.aircraft.filter((a) => a.status === "ready").length;
  const onMissionTotal = selectedBase.aircraft.filter((a) => a.status === "on_mission").length;
  const inMaintTotal = selectedBase.aircraft.filter((a) => a.status === "under_maintenance" || a.status === "unavailable").length;
  const personnelAvail = selectedBase.personnel.reduce((s, p) => s + p.available, 0);
  const personnelTotal = selectedBase.personnel.reduce((s, p) => s + p.total, 0);

  const handleDropAircraft = (aircraftId: string, zone: DropZone) => {
    const aircraft = selectedBase.aircraft.find((a) => a.id === aircraftId);
    if (!aircraft) return;
    const tail = aircraft.tailNumber || aircraftId;

    if (zone === "runway") {
      if (aircraft.status !== "ready") {
        toast.error(`${tail} är inte MC — kan ej sändas på uppdrag`);
        return;
      }
      if ((aircraft.health ?? 100) <= 30) {
        setRedRunwayWarning(aircraftId);
        return;
      }
      setPendingRunwayCheck(aircraftId);
      return;

    } else if (zone === "hangar") {
      if (aircraft.status === "on_mission") {
        toast.error(`${tail} är på uppdrag — kan inte gå till hangar`);
        return;
      }
      if (selectedBase.maintenanceBays.occupied >= selectedBase.maintenanceBays.total) {
        setHangarFullWarning(aircraftId);
        return;
      }
      // Warn before filling the last available bay
      if (selectedBase.maintenanceBays.total - selectedBase.maintenanceBays.occupied === 1) {
        setLastBayWarning(aircraftId);
        return;
      }
      // Known fault (from runway ignore or landing check) — skip dice, place directly
      if (aircraft.status === "unavailable" && aircraft.maintenanceTimeRemaining != null && aircraft.maintenanceType != null) {
        hangarDropConfirm(selectedBaseId, aircraftId, aircraft.maintenanceTimeRemaining, aircraft.maintenanceType, false);
        toast.success(`🔧 ${tail} → ${aircraft.maintenanceType} (${aircraft.maintenanceTimeRemaining}h) — direkt till hangar`);
        return;
      }
      setPendingMaintenanceCheck(aircraftId);
      return;

    } else if (zone === "spareparts") {
      if (aircraft.status === "on_mission") {
        toast.error(`${tail} är på uppdrag`);
        return;
      }
      // LRU repair requires a free maintenance bay — block if all occupied
      if (selectedBase.maintenanceBays.occupied >= selectedBase.maintenanceBays.total) {
        setSparePartsFullWarning(aircraftId);
        return;
      }
      // Open part picker — let user choose which component to replace
      setSparePartsPickerAircraftId(aircraftId);

    } else if (zone === "fuel") {
      if (aircraft.status === "on_mission") {
        toast.info(`${tail} är på uppdrag — tankning vid retur`);
        return;
      }
      // Fuel is base-level — just inform
      toast.info(`⛽ ${tail} schemalagd för tankning (bränslenivå: ${Math.round(selectedBase.fuel)}%)`);

    } else if (zone === "ammo") {
      if (aircraft.status === "on_mission") {
        toast.info(`${tail} är på uppdrag — beväpning vid retur`);
        return;
      }
      toast.info(`💣 ${tail} schemalagd för beväpning vid ammodepån`);
    }
  };
  // Aircraft mission markers for Basöversikt:
  //   urgentMap   = assigned to an ATO order whose window is active RIGHT NOW (pulsing orange)
  //   upcomingMap = assigned to an ATO order not yet started (steady blue)
  //   fallback    = hash-based simulated slot active now, no real ATO assignment (pulsing orange)
  const SCHD_MISSIONS = ["DCA", "QRA", "RECCE", "AEW", "AI_DT", "ESCORT"] as const;
  const urgentMap: Record<string, string> = {};
  const upcomingMap: Record<string, string> = {};

  selectedBase.aircraft.forEach((ac) => {
    if (ac.status !== "ready" && ac.status !== "allocated") return;

    // All ATO orders that have this aircraft assigned
    const myOrders = state.atoOrders.filter(
      (o) => o.launchBase === selectedBaseId &&
             o.assignedAircraft.includes(ac.id) &&
             (o.status === "assigned" || o.status === "pending")
    );

    if (myOrders.length > 0) {
      const activeNow = myOrders.find((o) => o.startHour <= state.hour && o.endHour > state.hour);
      const upcoming  = myOrders.find((o) => o.startHour > state.hour);
      if (activeNow) { urgentMap[ac.id] = activeNow.missionType; }
      else if (upcoming) { upcomingMap[ac.id] = `${upcoming.missionType} ${String(upcoming.startHour).padStart(2,"0")}:00`; }
      return; // has real assignment — skip hash fallback
    }

    // Hash-based simulated fallback (same formula as FlygschemaTidslinje)
    const hash = parseInt(ac.id.replace(/\D/g, "")) || 1;
    const mStart = 6 + (hash % 9);
    const mEnd = Math.min(21, mStart + 2 + (hash % 3));
    if (state.hour >= mStart && state.hour < mEnd) {
      urgentMap[ac.id] = SCHD_MISSIONS[hash % SCHD_MISSIONS.length];
    }
  });

  const overdueAircraftIds = Object.keys(urgentMap);
  const overdueMissionLabels = urgentMap;
  const upcomingAircraftIds = Object.keys(upcomingMap);
  const upcomingMissionLabels = upcomingMap;

  const kritiskaResurser = selectedBase.spareParts.filter((p) => p.quantity / p.maxQuantity < 0.3).length +
    selectedBase.ammunition.filter((a) => a.quantity / a.max < 0.3).length;


  const now = new Date();
  const dateStr = now.toLocaleDateString("sv-SE", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // Runway check: aircraft awaiting pre-flight BIT check
  const runwayAircraft = pendingRunwayCheck
    ? selectedBase.aircraft.find((a) => a.id === pendingRunwayCheck)
    : null;

  // Landing check: drive modal from aircraft with status "returning" directly
  let firstReturning: { aircraft: (typeof state.bases)[0]["aircraft"][0]; baseId: BaseType } | null = null;
  for (const base of state.bases) {
    const ac = base.aircraft.find((a) => a.status === "returning");
    if (ac) { firstReturning = { aircraft: ac, baseId: base.id }; break; }
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: "hsl(216 18% 95%)" }}>
      <TopBar state={state} onAdvanceTurn={advanceTurn} onReset={resetGame} />

      {/* Sub-header: datum + base tabs */}
      <div className="px-4 py-2 flex items-center justify-between"
        style={{
          background: "hsl(0 0% 100%)",
          borderBottom: "1px solid hsl(215 14% 86%)",
          boxShadow: "0 1px 4px hsl(220 63% 18% / 0.06)",
        }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-mono" style={{ color: "hsl(218 15% 50%)" }}>
            <Clock className="h-3.5 w-3.5" />
            {dateStr}
          </div>
          {/* Base tabs */}
          <div className="flex items-center gap-1">
            {state.bases.map((base) => {
              const mc = base.aircraft.filter((a) => a.status === "ready").length;
              const total = base.aircraft.length;
              const isSelected = base.id === selectedBaseId;
              const mcPct = total > 0 ? mc / total : 0;
              return (
                <button
                  key={base.id}
                  onClick={() => setSelectedBaseId(base.id)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded-lg transition-all"
                  style={isSelected ? {
                    background: "hsl(220 63% 18%)",
                    color: "hsl(200 12% 92%)",
                    boxShadow: "0 2px 8px hsl(220 63% 18% / 0.25)",
                  } : {
                    background: "hsl(216 18% 96%)",
                    color: "hsl(218 15% 50%)",
                    border: "1px solid hsl(215 14% 86%)",
                  }}
                >
                  <span className="font-black">{base.id}</span>
                  <span className="text-[10px] px-1.5 py-px rounded-full"
                    style={{
                      background: isSelected ? "hsl(42 64% 53% / 0.3)" : "hsl(215 14% 90%)",
                      color: isSelected ? "hsl(42 64% 62%)" : "hsl(218 15% 55%)",
                    }}>
                    {mc}/{total}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {kritiskaResurser > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] font-mono px-3 py-1 rounded-full font-bold"
              style={{
                background: "hsl(353 74% 47% / 0.10)",
                color: "hsl(353 74% 42%)",
                border: "1px solid hsl(353 74% 47% / 0.3)",
              }}>
              <Siren className="h-3 w-3 animate-pulse" />
              {kritiskaResurser} KRITISKA RESURSER
            </span>
          )}
        </div>
      </div>

      {/* Main scrollable content */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-0">
        <div className="overflow-y-auto p-4 space-y-4">

          {/* ROW 1: KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatusKort titel="Mission Capable" varde={mcTotal} subtitel={`av ${selectedBase.aircraft.length} totalt`} ikon={<ShieldCheck className="h-5 w-5" />} farg="green" max={selectedBase.aircraft.length} />
            <StatusKort titel="På uppdrag" varde={onMissionTotal} subtitel="aktiva flygningar" ikon={<Crosshair className="h-5 w-5" />} farg="blue" />
            <StatusKort titel="I underhåll" varde={inMaintTotal} subtitel="NMC + UH" ikon={<Hammer className="h-5 w-5" />} farg="yellow" />
            <StatusKort titel="Personal" varde={`${personnelAvail}/${personnelTotal}`} subtitel="tillgänglig personal" ikon={<Users className="h-5 w-5" />} farg="purple" />
            <StatusKort titel="Resurslarm" varde={kritiskaResurser} subtitel={kritiskaResurser > 0 ? "behöver åtgärd" : "alla nominella"} ikon={<Siren className="h-5 w-5" />} farg={kritiskaResurser > 0 ? "red" : "green"} />
          </div>

          {/* ROW 2: Base Map */}
          <div className="rounded-xl overflow-hidden"
            style={{
              background: "hsl(0 0% 100%)",
              border: "1px solid hsl(215 14% 84%)",
              boxShadow: "0 1px 3px hsl(220 63% 18% / 0.06), 0 4px 12px hsl(220 63% 18% / 0.04)",
            }}>
            <div className="px-4 py-3 flex items-center gap-2"
              style={{ borderBottom: "1px solid hsl(215 14% 88%)",
                background: "linear-gradient(90deg, hsl(220 63% 18% / 0.04), transparent)" }}>
              <MapPin className="h-4 w-4" style={{ color: "hsl(220 63% 30%)" }} />
              <h3 className="font-sans font-bold text-sm" style={{ color: "hsl(220 63% 18%)" }}>
                BASÖVERSIKT — {selectedBase.name}
              </h3>
              <span className="text-[9px] font-mono ml-2" style={{ color: "hsl(218 15% 55%)" }}>
                Klicka på byggnader för detaljer
              </span>
            </div>
            <BaseMap
              base={selectedBase}
              onDropAircraft={handleDropAircraft}
              overdueAircraftIds={overdueAircraftIds}
              overdueMissionLabels={overdueMissionLabels}
              onUtfallOutcome={(aircraftId, repairTime, maintenanceTypeKey, weaponLoss, actionLabel) => {
                if (repairTime > 0 && selectedBase.maintenanceBays.occupied >= selectedBase.maintenanceBays.total) {
                  setPendingUtfallFull({ aircraftId, repairTime, typeKey: maintenanceTypeKey, weaponLoss, label: actionLabel });
                } else {
                  applyUtfallOutcome(selectedBaseId, aircraftId, repairTime, maintenanceTypeKey, weaponLoss, actionLabel);
                }
              }}
            />
          </div>

          {/* ROW 3: Turn Phase Tracker */}
          <TurnPhaseTracker
            currentPhase={state.turnPhase}
            turnNumber={state.turnNumber}
            onAdvancePhase={advanceTurn}
          />

          {/* Phase-specific panel */}
          <PhasePanel state={state} />

          {/* ROW 4: Dagens missioner + Larm */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
            <div className="rounded-xl overflow-hidden"
              style={{
                background: "hsl(0 0% 100%)",
                border: "1px solid hsl(215 14% 84%)",
                boxShadow: "0 1px 3px hsl(220 63% 18% / 0.06)",
              }}>
              <div className="px-4 py-3 flex items-center gap-2"
                style={{ borderBottom: "1px solid hsl(215 14% 88%)",
                  background: "linear-gradient(90deg, hsl(220 63% 18% / 0.04), transparent)" }}>
                <Crosshair className="h-4 w-4" style={{ color: "hsl(220 63% 30%)" }} />
                <h3 className="font-sans font-bold text-sm" style={{ color: "hsl(220 63% 18%)" }}>
                  DAGENS MISSIONER — ATO-UPPDRAG
                </h3>
              </div>
              <div className="p-4">
                <DagensMissioner base={selectedBase} hour={state.hour} phase={state.phase} atoOrders={state.atoOrders} />
              </div>
            </div>
            <LarmPanel events={state.events} />
          </div>

          {/* ROW 5: Flygschema Tidslinje */}
          <div className="rounded-xl overflow-hidden"
            style={{
              background: "hsl(0 0% 100%)",
              border: "1px solid hsl(215 14% 84%)",
              boxShadow: "0 1px 3px hsl(220 63% 18% / 0.06)",
            }}>
            <div className="px-4 py-3"
              style={{ borderBottom: "1px solid hsl(215 14% 88%)",
                background: "linear-gradient(90deg, hsl(220 63% 18% / 0.04), transparent)" }}>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" style={{ color: "hsl(220 63% 38%)" }} />
                <h3 className="font-sans font-bold text-sm" style={{ color: "hsl(220 63% 18%)" }}>
                  FLYGSCHEMA — DAGENS AKTIVITETER
                </h3>
                <span className="text-[9px] font-mono ml-2" style={{ color: "hsl(218 15% 55%)" }}>
                  06:00–22:00 · Timmar kvar till 100h-service visas höger
                </span>
              </div>
            </div>
            <div className="p-4">
              <FlygschemaTidslinje base={selectedBase} hour={state.hour} atoOrders={state.atoOrders} />
            </div>
          </div>

          {/* ROW 6: Uppdragsschema (Gantt) */}
          <MissionSchedule atoOrders={state.atoOrders} day={state.day} hour={state.hour} />

          {/* ROW 7: Maintenance + Remaining Life */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <MaintenanceBays base={selectedBase} onDropAircraft={handleDropAircraft} />
            {/* Remaining Life */}
            <div className="rounded-xl overflow-hidden"
              style={{
                background: "hsl(0 0% 100%)",
                border: "1px solid hsl(215 14% 84%)",
                boxShadow: "0 1px 3px hsl(220 63% 18% / 0.06)",
              }}>
              <div className="px-4 py-3"
                style={{ borderBottom: "1px solid hsl(215 14% 88%)",
                  background: "linear-gradient(90deg, hsl(220 63% 18% / 0.04), transparent)" }}>
                <div className="flex items-center gap-2">
                  <PlaneTakeoff className="h-4 w-4" style={{ color: "hsl(220 63% 30%)" }} />
                  <h3 className="font-sans font-bold text-sm" style={{ color: "hsl(220 63% 18%)" }}>
                    REMAINING LIFE & SERVICE — {selectedBase.name}
                  </h3>
                </div>
              </div>
              <div className="p-4">
                <RemainingLifeGraf bases={[selectedBase]} phase={state.phase} />
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="h-full overflow-y-auto hidden lg:flex flex-col"
          style={{ borderLeft: "1px solid hsl(215 14% 86%)", background: "hsl(0 0% 100%)" }}>
          <div className="p-3" style={{ borderBottom: "1px solid hsl(215 14% 88%)" }}>
            <ResursPanel base={selectedBase} phase={state.phase} />
          </div>
          <div className="flex-1 overflow-y-auto">
            <RecommendationFeed
              recommendations={state.recommendations}
              onApply={applyRecommendation}
              onDismiss={dismissRecommendation}
            />
          </div>
        </div>
      </div>

      {/* Runway Pre-flight Check Modal */}
      {pendingRunwayCheck && runwayAircraft && (
        <RunwayCheckModal
          key={pendingRunwayCheck}
          aircraft={runwayAircraft}
          maintenanceBays={selectedBase.maintenanceBays}
          onMission={(durationHours) => {
            sendMissionDrop(selectedBaseId, pendingRunwayCheck, "DCA", durationHours);
            setPendingRunwayCheck(null);
            toast.success(`✈️ ${runwayAircraft.tailNumber} lyfter! Uppdrag ${durationHours}h`);
          }}
          onMaintenance={(repairTime, typeKey, weaponLoss, label) => {
            setPendingRunwayCheck(null);
            if (selectedBase.maintenanceBays.occupied >= selectedBase.maintenanceBays.total) {
              setPendingUtfallFull({ aircraftId: pendingRunwayCheck, repairTime, typeKey, weaponLoss, label });
            } else {
              applyUtfallOutcome(selectedBaseId, pendingRunwayCheck, repairTime, typeKey, weaponLoss, label);
              toast.error(`${runwayAircraft.tailNumber} → Service: ${label} (${repairTime}h)`);
            }
          }}
          onIgnoreFault={(repairTime, typeKey, actionLabel) => {
            markFaultNMC(selectedBaseId, pendingRunwayCheck, repairTime, typeKey, actionLabel);
            setPendingRunwayCheck(null);
            toast.warning(`🔴 ${runwayAircraft.tailNumber} NMC — fel ignorerat, ej i hangar`);
          }}
          onClose={() => setPendingRunwayCheck(null)}
        />
      )}

      {/* Red aircraft runway warning */}
      {redRunwayWarning && (() => {
        const ac = selectedBase.aircraft.find((a) => a.id === redRunwayWarning);
        if (!ac) return null;
        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)" }}>
            <div className="w-[420px] rounded-2xl overflow-hidden shadow-2xl" style={{ background: "#1a0505", border: "2px solid #D9192E" }}>
              <div className="px-6 py-4 flex items-center gap-3" style={{ background: "#0d0202", borderBottom: "1px solid #D9192E44" }}>
                <span className="text-2xl">🚨</span>
                <div>
                  <div className="text-xs font-mono font-bold" style={{ color: "#D9192E" }}>FLYGPLAN EJ OPERATIVT — NMC</div>
                  <div className="text-base font-mono font-black text-white">{ac.tailNumber}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-xs font-mono" style={{ color: "#8899bb" }}>Hälsa</div>
                  <div className="text-2xl font-black font-mono" style={{ color: "#D9192E" }}>{ac.health ?? 0}%</div>
                </div>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="rounded-xl p-4" style={{ background: "#3a0a0a", border: "1px solid #6a1a1a" }}>
                  <div className="text-sm font-mono font-bold mb-2" style={{ color: "#ff6655" }}>
                    Flygplanet är inte flygtillståndsklarat!
                  </div>
                  <div className="text-xs font-mono" style={{ color: "#ccd4e8" }}>
                    {ac.tailNumber} har {ac.health ?? 0}% hälsa och är röd NMC.
                    Det måste genomgå felsökning och service innan det kan flyga.
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setRedRunwayWarning(null); setPendingMaintenanceCheck(ac.id); }}
                    className="flex-1 py-3 rounded-xl font-mono font-bold text-sm transition-all hover:brightness-110 active:scale-95"
                    style={{ background: "#5a1a1a", border: "1px solid #D9192E", color: "#ff6655" }}
                  >
                    🔧 Skicka till service
                  </button>
                  <button
                    onClick={() => setRedRunwayWarning(null)}
                    className="px-5 py-3 rounded-xl font-mono font-bold text-sm transition-all hover:brightness-110 active:scale-95"
                    style={{ background: "#2a2a3a", border: "1px solid #5566aa", color: "#8899cc" }}
                  >
                    Ignorera
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Last Bay Warning Modal */}
      {lastBayWarning && (() => {
        const ac = selectedBase.aircraft.find((a) => a.id === lastBayWarning);
        if (!ac) return null;
        const proceedWithHangar = () => {
          setLastBayWarning(null);
          if (ac.status === "unavailable" && ac.maintenanceTimeRemaining != null && ac.maintenanceType != null) {
            hangarDropConfirm(selectedBaseId, ac.id, ac.maintenanceTimeRemaining, ac.maintenanceType, false);
          } else {
            setPendingMaintenanceCheck(ac.id);
          }
        };
        return (
          <LastBayWarningModal
            key={lastBayWarning}
            aircraft={ac}
            totalBays={selectedBase.maintenanceBays.total}
            onContinue={proceedWithHangar}
            onReturnToApron={() => setLastBayWarning(null)}
          />
        );
      })()}

      {/* Hangar Full Modal */}
      {hangarFullWarning && (() => {
        const incoming = selectedBase.aircraft.find((a) => a.id === hangarFullWarning);
        const inMaint = selectedBase.aircraft.filter((a) => a.status === "under_maintenance");
        if (!incoming) return null;
        return (
          <HangarFullModal
            key={hangarFullWarning}
            incomingAircraft={incoming}
            maintenanceAircraft={inMaint}
            baseId={selectedBaseId}
            onPause={(pauseId) => {
              pauseMaintenance(selectedBaseId, pauseId);
              setHangarFullWarning(null);
              // If incoming has a known fault, skip dice and place directly
              if (incoming.status === "unavailable" && incoming.maintenanceTimeRemaining != null && incoming.maintenanceType != null) {
                hangarDropConfirm(selectedBaseId, incoming.id, incoming.maintenanceTimeRemaining, incoming.maintenanceType, false);
                toast.success(`🔧 ${incoming.tailNumber} → direkt till hangar (${incoming.maintenanceTimeRemaining}h)`);
              } else {
                setPendingMaintenanceCheck(incoming.id);
              }
              toast.info(`⏸ Underhåll pausat på ${pauseId} — ${incoming.tailNumber} köas`);
            }}
            onIgnore={() => setHangarFullWarning(null)}
          />
        );
      })()}

      {/* Spareparts zone — bays full modal */}
      {sparePartsFullWarning && (() => {
        const incoming = selectedBase.aircraft.find((a) => a.id === sparePartsFullWarning);
        const inMaint = selectedBase.aircraft.filter((a) => a.status === "under_maintenance");
        if (!incoming) return null;
        return (
          <HangarFullModal
            key={`sp-${sparePartsFullWarning}`}
            incomingAircraft={incoming}
            maintenanceAircraft={inMaint}
            baseId={selectedBaseId}
            onPause={(pauseId) => {
              pauseMaintenance(selectedBaseId, pauseId);
              setSparePartsFullWarning(null);
              // Re-run the LRU repair now that a bay is free
              const lruPart = selectedBase.spareParts.find((p) => p.quantity > 0 && p.category === "Avionik")
                ?? selectedBase.spareParts.find((p) => p.quantity > 0);
              if (!lruPart) {
                toast.error(`Inga reservdelar kvar — LRU-rep ej möjlig`);
                return;
              }
              consumeSparePart(selectedBaseId, lruPart.id, 1);
              applyUtfallOutcome(selectedBaseId, incoming.id, 2, "quick_lru", 10, `Quick LRU replacement (${lruPart.name})`);
              toast.success(`${incoming.tailNumber} → LRU-reparation 2h — ${lruPart.name} använd`);
              toast.info(`Underhåll pausat på ${pauseId} — plats frigjord`);
            }}
            onIgnore={() => setSparePartsFullWarning(null)}
          />
        );
      })()}

      {/* Spare Parts Picker Modal */}
      {sparePartsPickerAircraftId && (() => {
        const ac = selectedBase.aircraft.find((a) => a.id === sparePartsPickerAircraftId);
        if (!ac) return null;
        return (
          <SparePartsPickerModal
            key={sparePartsPickerAircraftId}
            aircraft={ac}
            spareParts={selectedBase.spareParts}
            onSelect={(partId, partName) => {
              consumeSparePart(selectedBaseId, partId, 1);
              applyUtfallOutcome(selectedBaseId, ac.id, 2, "quick_lru", 10, `Quick LRU replacement (${partName})`);
              const remaining = (selectedBase.spareParts.find((p) => p.id === partId)?.quantity ?? 1) - 1;
              toast.success(`${ac.tailNumber} → LRU-reparation 2h — ${partName} använd (kvar: ${remaining})`);
              setSparePartsPickerAircraftId(null);
            }}
            onClose={() => setSparePartsPickerAircraftId(null)}
          />
        );
      })()}

      {/* Utfall → bays full: must free a bay before entering service */}
      {pendingUtfallFull && (() => {
        const incoming = selectedBase.aircraft.find((a) => a.id === pendingUtfallFull.aircraftId);
        const inMaint = selectedBase.aircraft.filter((a) => a.status === "under_maintenance");
        if (!incoming) return null;
        return (
          <HangarFullModal
            key={`utfall-full-${pendingUtfallFull.aircraftId}`}
            incomingAircraft={incoming}
            maintenanceAircraft={inMaint}
            baseId={selectedBaseId}
            onPause={(pauseId) => {
              pauseMaintenance(selectedBaseId, pauseId);
              applyUtfallOutcome(selectedBaseId, pendingUtfallFull.aircraftId, pendingUtfallFull.repairTime, pendingUtfallFull.typeKey, pendingUtfallFull.weaponLoss, pendingUtfallFull.label);
              toast.error(`${incoming.tailNumber} → Service: ${pendingUtfallFull.label} (${pendingUtfallFull.repairTime}h)`);
              toast.info(`Underhåll pausat på ${pauseId} — plats frigjord`);
              setPendingUtfallFull(null);
            }}
            onIgnore={() => {
              markFaultNMC(selectedBaseId, pendingUtfallFull.aircraftId, pendingUtfallFull.repairTime, pendingUtfallFull.typeKey, pendingUtfallFull.label);
              toast.warning(`${incoming.tailNumber} NMC — felet registrerat, väntar på hangarplats`);
              setPendingUtfallFull(null);
            }}
          />
        );
      })()}

      {/* Maintenance Confirmation Modal */}
      {pendingMaintenanceCheck && (() => {
        const ac = selectedBase.aircraft.find((a) => a.id === pendingMaintenanceCheck);
        if (!ac) return null;
        return (
          <MaintenanceConfirmModal
            key={pendingMaintenanceCheck}
            aircraft={ac}
            baseId={selectedBaseId}
            onConfirm={(repairTime, typeKey, restoreHealth) => {
              hangarDropConfirm(selectedBaseId, pendingMaintenanceCheck, repairTime, typeKey, restoreHealth);
              setPendingMaintenanceCheck(null);
              const label = restoreHealth ? "Förebyggande service" : "Reparation";
              toast.success(`🔧 ${ac.tailNumber} → ${label} (${repairTime}h)`);
            }}
            onCancel={() => setPendingMaintenanceCheck(null)}
          />
        );
      })()}

      {/* Landing Reception Modal */}
      {firstReturning && (
        <LandingReceptionModal
          key={firstReturning.aircraft.id}
          aircraft={firstReturning.aircraft}
          baseId={firstReturning.baseId}
          remaining={state.bases.flatMap((b) => b.aircraft).filter((a) => a.status === "returning").length - 1}
          onComplete={(aircraftId, baseId, sendToMaintenance, repairTime, maintenanceTypeKey, weaponLoss, actionLabel) => {
            completeLandingCheck(baseId, aircraftId, sendToMaintenance, repairTime, maintenanceTypeKey, weaponLoss, actionLabel);
            if (sendToMaintenance) {
              toast.error(`🔧 ${aircraftId} skickad till underhåll (${repairTime}h)`);
            } else {
              toast.success(`✅ ${aircraftId} godkänd — tillbaka till uppställning`);
            }
          }}
        />
      )}

    </div>
  );
};

export default Index;
