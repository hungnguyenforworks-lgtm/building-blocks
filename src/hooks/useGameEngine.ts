import { useReducer, useCallback, useMemo } from "react";
import type { GameState, GameAction, BaseType, MissionType, ATOOrder } from "@/types/game";
import { isMissionCapable } from "@/types/game";
import { gameReducer } from "@/core/engine";
import { initialGameState } from "@/data/initialGameState";

export interface GameEngine {
  state: GameState;
  dispatch: (action: GameAction) => void;
  importATOBatch: (orders: Omit<ATOOrder, "id" | "status" | "assignedAircraft">[], sourceFile: string, riskCount: number) => void;

  // Convenience dispatchers matching old useGameState API
  advanceTurn: () => void;
  startMaintenance: (baseId: string, aircraftId: string) => void;
  sendOnMission: (baseId: string, aircraftId: string, mission: string) => void;
  assignAircraftToOrder: (orderId: string, aircraftIds: string[]) => void;
  dispatchOrder: (orderId: string) => void;
  moveAircraftToMaintenance: (baseId: string, aircraftId: string) => void;
  sendMissionDrop: (baseId: string, aircraftId: string, missionType?: string, durationHours?: number) => void;
  applyUtfallOutcome: (baseId: string, aircraftId: string, repairTime: number, maintenanceTypeKey: string, weaponLoss: number, actionLabel: string, requiredSparePart?: string) => void;
  completeLandingCheck: (baseId: string, aircraftId: string, sendToMaintenance: boolean, repairTime?: number, maintenanceTypeKey?: string, weaponLoss?: number, actionLabel?: string) => void;
  resetGame: () => void;
  getResourceSummary: () => string;

  // New dispatchers
  createATOOrder: (order: Omit<GameAction & { type: "CREATE_ATO_ORDER" }, "type">["order"]) => void;
  editATOOrder: (orderId: string, updates: Partial<GameState["atoOrders"][0]>) => void;
  deleteATOOrder: (orderId: string) => void;
  applyRecommendation: (recommendationId: string) => void;
  dismissRecommendation: (recommendationId: string) => void;
  hangarDropConfirm: (baseId: string, aircraftId: string, repairTime: number, maintenanceTypeKey: string, restoreHealth: boolean) => void;
  pauseMaintenance: (baseId: string, aircraftId: string) => void;
  markFaultNMC: (baseId: string, aircraftId: string, repairTime: number, maintenanceTypeKey: string, actionLabel: string, requiredSparePart?: string) => void;
  consumeSparePart: (baseId: string, sparePartId: string, quantity?: number) => void;
  rebaseAircraft: (aircraftId: string, fromBase: BaseType, toBase: BaseType) => void;
}

export function useGameEngine(): GameEngine {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);

  const advanceTurn = useCallback(() => dispatch({ type: "ADVANCE_PHASE" }), []);
  const resetGame = useCallback(() => dispatch({ type: "RESET_GAME" }), []);

  const startMaintenance = useCallback((baseId: string, aircraftId: string) => {
    dispatch({ type: "START_MAINTENANCE", baseId: baseId as BaseType, aircraftId });
  }, []);

  const sendOnMission = useCallback((baseId: string, aircraftId: string, mission: string) => {
    dispatch({ type: "SEND_MISSION_DROP", baseId: baseId as BaseType, aircraftId, missionType: mission as MissionType });
  }, []);

  const assignAircraftToOrder = useCallback((orderId: string, aircraftIds: string[]) => {
    dispatch({ type: "ASSIGN_AIRCRAFT", orderId, aircraftIds });
  }, []);

  const dispatchOrder = useCallback((orderId: string) => {
    dispatch({ type: "DISPATCH_ORDER", orderId });
  }, []);

  const moveAircraftToMaintenance = useCallback((baseId: string, aircraftId: string) => {
    dispatch({ type: "START_MAINTENANCE", baseId: baseId as BaseType, aircraftId });
  }, []);

  const sendMissionDrop = useCallback((baseId: string, aircraftId: string, missionType = "DCA", durationHours?: number) => {
    dispatch({ type: "SEND_MISSION_DROP", baseId: baseId as BaseType, aircraftId, missionType: missionType as MissionType, durationHours });
  }, []);

  const applyUtfallOutcome = useCallback((
    baseId: string, aircraftId: string, repairTime: number,
    maintenanceTypeKey: string, weaponLoss: number, actionLabel: string,
    requiredSparePart?: string,
  ) => {
    dispatch({
      type: "APPLY_UTFALL_OUTCOME",
      baseId: baseId as BaseType, aircraftId, repairTime, maintenanceTypeKey, weaponLoss, actionLabel, requiredSparePart,
    });
  }, []);

  const completeLandingCheck = useCallback((
    baseId: string, aircraftId: string, sendToMaintenance: boolean,
    repairTime?: number, maintenanceTypeKey?: string, weaponLoss?: number, actionLabel?: string,
  ) => {
    dispatch({
      type: "COMPLETE_LANDING_CHECK",
      baseId: baseId as BaseType, aircraftId, sendToMaintenance,
      repairTime, maintenanceTypeKey, weaponLoss, actionLabel,
    });
  }, []);

  const createATOOrder = useCallback((order: any, assignedAircraft?: string[]) => {
    dispatch({ type: "CREATE_ATO_ORDER", order, assignedAircraft } as any);
  }, []);

  const editATOOrder = useCallback((orderId: string, updates: any) => {
    dispatch({ type: "EDIT_ATO_ORDER", orderId, updates });
  }, []);

  const deleteATOOrder = useCallback((orderId: string) => {
    dispatch({ type: "DELETE_ATO_ORDER", orderId });
  }, []);

  const applyRecommendation = useCallback((recommendationId: string) => {
    dispatch({ type: "APPLY_RECOMMENDATION", recommendationId });
  }, []);

  const dismissRecommendation = useCallback((recommendationId: string) => {
    dispatch({ type: "DISMISS_RECOMMENDATION", recommendationId });
  }, []);

  const hangarDropConfirm = useCallback((baseId: string, aircraftId: string, repairTime: number, maintenanceTypeKey: string, restoreHealth: boolean) => {
    dispatch({ type: "HANGAR_DROP_CONFIRM", baseId: baseId as BaseType, aircraftId, repairTime, maintenanceTypeKey, restoreHealth });
  }, []);

  const pauseMaintenance = useCallback((baseId: string, aircraftId: string) => {
    dispatch({ type: "PAUSE_MAINTENANCE", baseId: baseId as BaseType, aircraftId });
  }, []);

  const markFaultNMC = useCallback((baseId: string, aircraftId: string, repairTime: number, maintenanceTypeKey: string, actionLabel: string, requiredSparePart?: string) => {
    dispatch({ type: "MARK_FAULT_NMC", baseId: baseId as BaseType, aircraftId, repairTime, maintenanceTypeKey, actionLabel, requiredSparePart });
  }, []);

  const consumeSparePart = useCallback((baseId: string, sparePartId: string, quantity = 1) => {
    dispatch({ type: "CONSUME_SPARE_PART", baseId: baseId as BaseType, sparePartId, quantity });
  }, []);

  const rebaseAircraft = useCallback((aircraftId: string, fromBase: BaseType, toBase: BaseType) => {
    dispatch({ type: "REBASE_AIRCRAFT", aircraftId, fromBase, toBase });
  }, []);

  const importATOBatch = useCallback((
    orders: Omit<ATOOrder, "id" | "status" | "assignedAircraft">[],
    sourceFile: string,
    riskCount: number,
  ) => {
    dispatch({ type: "IMPORT_ATO_BATCH", orders, sourceFile, riskCount });
  }, []);

  const getResourceSummary = useCallback((): string => {
    const lines: string[] = [];
    lines.push(`=== RESURSLÄGE DAG ${state.day} ${String(state.hour).padStart(2, "0")}:00 - FAS: ${state.phase} ===\n`);

    state.bases.forEach((base) => {
      const mc = base.aircraft.filter((a) => isMissionCapable(a.status)).length;
      const nmc = base.aircraft.filter((a) => a.status === "unavailable").length;
      const maint = base.aircraft.filter((a) => a.status === "under_maintenance").length;
      const onMission = base.aircraft.filter((a) => a.status === "on_mission").length;

      lines.push(`\n--- ${base.name} (${base.id}) ---`);
      lines.push(`Flygplan: ${base.aircraft.length} totalt | ${mc} MC | ${nmc} NMC | ${maint} i UH | ${onMission} på uppdrag`);
      lines.push(`Bränsle: ${base.fuel.toFixed(0)}%`);
      lines.push(`Underhållsplatser: ${base.maintenanceBays.occupied}/${base.maintenanceBays.total} upptagna`);
      lines.push(`Personal tillgänglig: ${base.personnel.map((p) => `${p.role}: ${p.available}/${p.total}`).join(", ")}`);
      lines.push(`Reservdelar: ${base.spareParts.map((p) => `${p.name}: ${p.quantity}/${p.maxQuantity}`).join(", ")}`);
      lines.push(`Ammunition: ${base.ammunition.map((a) => `${a.type}: ${a.quantity}/${a.max}`).join(", ")}`);

      const nmcAircraft = base.aircraft.filter((a) => a.status === "unavailable" || a.status === "under_maintenance");
      if (nmcAircraft.length > 0) {
        lines.push(`\nFlygplan med problem:`);
        nmcAircraft.forEach((ac) => {
          lines.push(`  ${ac.tailNumber} (${ac.type}): ${ac.status} - ${ac.maintenanceType || "okänt"} - ${ac.maintenanceTimeRemaining || "?"}h kvar`);
        });
      }
    });

    lines.push(`\nUppdrag: ${state.successfulMissions} lyckade, ${state.failedMissions} misslyckade`);
    lines.push(`\nSenaste händelser:`);
    state.events.slice(0, 5).forEach((e) => {
      lines.push(`  [${e.timestamp}] ${e.type.toUpperCase()}: ${e.message}`);
    });

    return lines.join("\n");
  }, [state]);

  return useMemo(() => ({
    state, dispatch,
    advanceTurn, startMaintenance, sendOnMission, assignAircraftToOrder,
    dispatchOrder, moveAircraftToMaintenance, sendMissionDrop,
    applyUtfallOutcome, completeLandingCheck, resetGame, getResourceSummary,
    createATOOrder, editATOOrder, deleteATOOrder,
    applyRecommendation, dismissRecommendation, hangarDropConfirm, pauseMaintenance, markFaultNMC,
    consumeSparePart, importATOBatch, rebaseAircraft,
  }), [
    state, advanceTurn, startMaintenance, sendOnMission, assignAircraftToOrder,
    dispatchOrder, moveAircraftToMaintenance, sendMissionDrop,
    applyUtfallOutcome, completeLandingCheck, resetGame, getResourceSummary,
    createATOOrder, editATOOrder, deleteATOOrder,
    applyRecommendation, dismissRecommendation, hangarDropConfirm, pauseMaintenance, markFaultNMC,
    consumeSparePart, importATOBatch, rebaseAircraft,
  ]);
}
