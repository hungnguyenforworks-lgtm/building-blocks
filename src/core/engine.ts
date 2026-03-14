import type { GameState, GameAction, GameEvent, AircraftStatus, MissionType } from "@/types/game";
import { isMissionCapable } from "@/types/game";
import { initialGameState } from "@/data/initialGameState";
import { PHASE_ORDER, getNextPhase, isLastPhase, getPhaseDefinition } from "@/data/config/phases";
import { handlePhase } from "./phases";
import { validateAction } from "./validators";

function addEvent(state: GameState, event: Omit<GameEvent, "id" | "timestamp">): GameState {
  return {
    ...state,
    events: [
      {
        ...event,
        id: crypto.randomUUID(),
        timestamp: `Dag ${state.day} ${String(state.hour).padStart(2, "0")}:00`,
      },
      ...state.events,
    ].slice(0, 50),
  };
}

/** Pure reducer: gameReducer(state, action) => newState */
export function gameReducer(state: GameState, action: GameAction): GameState {
  // Reset is always valid
  if (action.type === "RESET_GAME") {
    return initialGameState;
  }

  // Validate action
  const validation = validateAction(state, action);
  if (!validation.valid) {
    return addEvent(state, {
      type: "warning",
      message: `Ogiltigt: ${validation.reason}`,
    });
  }

  switch (action.type) {
    case "ADVANCE_PHASE":
      return handleAdvancePhase(state);

    case "ASSIGN_AIRCRAFT":
      return handleAssignAircraft(state, action.orderId, action.aircraftIds);

    case "DISPATCH_ORDER":
      return handleDispatchOrder(state, action.orderId);

    case "START_MAINTENANCE":
      return handleStartMaintenance(state, action.baseId, action.aircraftId);

    case "SEND_MISSION_DROP":
      return handleSendMissionDrop(state, action.baseId, action.aircraftId, action.missionType, action.durationHours);

    case "APPLY_UTFALL_OUTCOME":
      return handleApplyUtfall(state, action.baseId, action.aircraftId, action.repairTime, action.maintenanceTypeKey, action.weaponLoss, action.actionLabel);

    case "COMPLETE_LANDING_CHECK":
      return handleCompleteLandingCheck(state, action.baseId, action.aircraftId, action.sendToMaintenance, action.repairTime, action.maintenanceTypeKey, action.weaponLoss, action.actionLabel);

    case "HANGAR_DROP_CONFIRM":
      return handleHangarDropConfirm(state, action.baseId, action.aircraftId, action.repairTime, action.maintenanceTypeKey, action.restoreHealth);

    case "PAUSE_MAINTENANCE":
      return handlePauseMaintenance(state, action.baseId, action.aircraftId);

    case "MARK_FAULT_NMC":
      return handleMarkFaultNMC(state, action.baseId, action.aircraftId, action.repairTime, action.maintenanceTypeKey, action.actionLabel);

    case "MOVE_AIRCRAFT":
      return state; // TODO: implement zone-based movement

    case "CREATE_ATO_ORDER":
      return {
        ...state,
        atoOrders: [
          ...state.atoOrders,
          {
            ...action.order,
            id: `ato-custom-${crypto.randomUUID().slice(0, 8)}`,
            status: "pending",
            assignedAircraft: [],
          },
        ],
      };

    case "EDIT_ATO_ORDER":
      return {
        ...state,
        atoOrders: state.atoOrders.map((o) =>
          o.id === action.orderId ? { ...o, ...action.updates } : o
        ),
      };

    case "DELETE_ATO_ORDER":
      return {
        ...state,
        atoOrders: state.atoOrders.filter((o) => o.id !== action.orderId),
      };

    case "APPLY_RECOMMENDATION": {
      const rec = state.recommendations.find((r) => r.id === action.recommendationId);
      if (!rec) return state;
      // Apply the recommendation's action, then dismiss
      const afterApply = gameReducer(state, rec.applyAction);
      return {
        ...afterApply,
        recommendations: afterApply.recommendations.map((r) =>
          r.id === action.recommendationId ? { ...r, dismissed: true } : r
        ),
      };
    }

    case "DISMISS_RECOMMENDATION":
      return {
        ...state,
        recommendations: state.recommendations.map((r) =>
          r.id === action.recommendationId ? { ...r, dismissed: true } : r
        ),
      };

    default:
      return state;
  }
}

function handleAdvancePhase(state: GameState): GameState {
  let nextState = state;
  const MAX_AUTO = 14; // safety limit to prevent infinite loops

  for (let i = 0; i < MAX_AUTO; i++) {
    // Run current phase logic
    nextState = handlePhase(nextState);

    // Move to next phase
    if (isLastPhase(nextState.turnPhase)) {
      nextState = {
        ...nextState,
        turnPhase: PHASE_ORDER[0],
        turnNumber: nextState.turnNumber + 1,
      };
    } else {
      const next = getNextPhase(nextState.turnPhase);
      if (next) {
        nextState = { ...nextState, turnPhase: next };
      }
    }

    // Stop if the new phase requires player interaction (not auto-advance)
    const nextPhaseDef = getPhaseDefinition(nextState.turnPhase);
    if (!nextPhaseDef.autoAdvance) {
      break;
    }
  }

  return nextState;
}

function handleAssignAircraft(state: GameState, orderId: string, aircraftIds: string[]): GameState {
  return {
    ...state,
    atoOrders: state.atoOrders.map((o) =>
      o.id === orderId
        ? { ...o, assignedAircraft: aircraftIds, status: "assigned" as const }
        : o
    ),
  };
}

function handleDispatchOrder(state: GameState, orderId: string): GameState {
  const order = state.atoOrders.find((o) => o.id === orderId);
  if (!order || order.assignedAircraft.length === 0) return state;

  const updatedBases = state.bases.map((base) => {
    if (base.id !== order.launchBase) return base;
    return {
      ...base,
      aircraft: base.aircraft.map((ac) =>
        order.assignedAircraft.includes(ac.id) && isMissionCapable(ac.status)
          ? { ...ac, status: "on_mission" as AircraftStatus, currentMission: order.missionType }
          : ac
      ),
    };
  });

  const newEvent: GameEvent = {
    id: crypto.randomUUID(),
    timestamp: `Dag ${state.day} ${String(state.hour).padStart(2, "0")}:00`,
    type: "success",
    message: `ATO-order ${order.missionType} (${order.label}): ${order.assignedAircraft.length} fpl skickade från ${order.launchBase}`,
    base: order.launchBase,
  };

  return {
    ...state,
    bases: updatedBases,
    successfulMissions: state.successfulMissions + 1,
    atoOrders: state.atoOrders.map((o) =>
      o.id === orderId ? { ...o, status: "dispatched" as const } : o
    ),
    events: [newEvent, ...state.events].slice(0, 50),
  };
}

function handleStartMaintenance(state: GameState, baseId: string, aircraftId: string): GameState {
  const updatedBases = state.bases.map((base) => {
    if (base.id !== baseId) return base;
    const aircraft = base.aircraft.map((ac) => {
      if (ac.id !== aircraftId || ac.status !== "unavailable") return ac;
      return { ...ac, status: "under_maintenance" as AircraftStatus };
    });
    const maintenanceCount = aircraft.filter((a) => a.status === "under_maintenance").length;
    return {
      ...base,
      aircraft,
      maintenanceBays: { ...base.maintenanceBays, occupied: Math.min(maintenanceCount, base.maintenanceBays.total) },
    };
  });

  return addEvent({ ...state, bases: updatedBases }, {
    type: "info",
    message: `Underhåll påbörjat på ${aircraftId}`,
    base: baseId,
  });
}

function handleSendMissionDrop(state: GameState, baseId: string, aircraftId: string, missionType: MissionType, durationHours?: number): GameState {
  const endHour = durationHours ? state.hour + durationHours : undefined;
  const updatedBases = state.bases.map((base) => {
    if (base.id !== baseId) return base;
    const aircraft = base.aircraft.map((ac) => {
      if (ac.id !== aircraftId || !isMissionCapable(ac.status)) return ac;
      return { ...ac, status: "on_mission" as AircraftStatus, currentMission: missionType, missionEndHour: endHour };
    });
    return { ...base, aircraft };
  });

  return addEvent({ ...state, bases: updatedBases }, {
    type: "success",
    message: `${aircraftId} skickad på ${missionType}-uppdrag via drag-drop`,
    base: baseId,
  });
}

function handleCompleteLandingCheck(
  state: GameState,
  baseId: string,
  aircraftId: string,
  sendToMaintenance: boolean,
  repairTime?: number,
  maintenanceTypeKey?: string,
  weaponLoss?: number,
  actionLabel?: string,
): GameState {
  const updatedLandingChecks = (state.pendingLandingChecks ?? []).filter(
    (c) => !(c.aircraftId === aircraftId && c.baseId === baseId)
  );

  if (sendToMaintenance && repairTime && maintenanceTypeKey) {
    const afterMaint = handleApplyUtfall(state, baseId, aircraftId, repairTime, maintenanceTypeKey, weaponLoss ?? 0, actionLabel ?? "Underhåll efter landning");
    return { ...afterMaint, pendingLandingChecks: updatedLandingChecks };
  }

  // Clear returning status → ready, remove currentMission
  const updatedBases = state.bases.map((base) => {
    if (base.id !== baseId) return base;
    return {
      ...base,
      aircraft: base.aircraft.map((ac) =>
        ac.id === aircraftId
          ? { ...ac, status: "ready" as AircraftStatus, currentMission: undefined }
          : ac
      ),
    };
  });

  return addEvent({ ...state, bases: updatedBases, pendingLandingChecks: updatedLandingChecks }, {
    type: "success",
    message: `${aircraftId} landad och godkänd — återvänder till uppställningsplats`,
    base: baseId as any,
  });
}

function handleApplyUtfall(
  state: GameState,
  baseId: string,
  aircraftId: string,
  repairTime: number,
  maintenanceTypeKey: string,
  weaponLoss: number,
  actionLabel: string,
): GameState {
  const updatedBases = state.bases.map((base) => {
    if (base.id !== baseId) return base;
    const aircraft = base.aircraft.map((ac) => {
      if (ac.id !== aircraftId) return ac;
      if (repairTime === 0) {
        return { ...ac, status: "unavailable" as AircraftStatus };
      }
      return {
        ...ac,
        status: "under_maintenance" as AircraftStatus,
        maintenanceType: maintenanceTypeKey as any,
        maintenanceTimeRemaining: repairTime,
      };
    });
    const maintCount = aircraft.filter((a) => a.status === "under_maintenance").length;
    return {
      ...base,
      aircraft,
      maintenanceBays: { ...base.maintenanceBays, occupied: Math.min(maintCount, base.maintenanceBays.total) },
    };
  });

  return addEvent({ ...state, bases: updatedBases }, {
    type: "warning",
    message: `UTFALL: ${aircraftId} — ${actionLabel} — ${repairTime}h underhåll (Vapensystemsförlust ${weaponLoss}%)`,
    base: baseId,
  });
}

function handleHangarDropConfirm(
  state: GameState,
  baseId: string,
  aircraftId: string,
  repairTime: number,
  maintenanceTypeKey: string,
  restoreHealth: boolean,
): GameState {
  const updatedBases = state.bases.map((base) => {
    if (base.id !== baseId) return base;
    const aircraft = base.aircraft.map((ac) => {
      if (ac.id !== aircraftId) return ac;
      return {
        ...ac,
        status: "under_maintenance" as AircraftStatus,
        maintenanceType: maintenanceTypeKey as any,
        maintenanceTimeRemaining: repairTime,
        // health restored to 100 on maintenance completion (handled in phases.ts)
      };
    });
    const maintCount = aircraft.filter((a) => a.status === "under_maintenance").length;
    return {
      ...base,
      aircraft,
      maintenanceBays: { ...base.maintenanceBays, occupied: Math.min(maintCount, base.maintenanceBays.total) },
    };
  });

  const label = restoreHealth ? "Förebyggande underhåll" : "Felsökning/Reparation";
  return addEvent({ ...state, bases: updatedBases }, {
    type: "info",
    message: `🔧 ${aircraftId} — ${label} (${repairTime}h) påbörjat`,
    base: baseId,
  });
}

function handleMarkFaultNMC(
  state: GameState,
  baseId: string,
  aircraftId: string,
  repairTime: number,
  maintenanceTypeKey: string,
  actionLabel: string,
): GameState {
  // Mark aircraft as unavailable (NMC) with fault data stored — NOT placed in a bay yet
  const updatedBases = state.bases.map((base) => {
    if (base.id !== baseId) return base;
    return {
      ...base,
      aircraft: base.aircraft.map((ac) => {
        if (ac.id !== aircraftId) return ac;
        return {
          ...ac,
          status: "unavailable" as AircraftStatus,
          maintenanceType: maintenanceTypeKey as any,
          maintenanceTimeRemaining: repairTime,
        };
      }),
    };
  });

  return addEvent({ ...state, bases: updatedBases }, {
    type: "warning",
    message: `🔴 ${aircraftId} NMC — ${actionLabel} (${repairTime}h) — ej i hangar`,
    base: baseId,
  });
}

function handlePauseMaintenance(state: GameState, baseId: string, aircraftId: string): GameState {
  const updatedBases = state.bases.map((base) => {
    if (base.id !== baseId) return base;
    const aircraft = base.aircraft.map((ac) => {
      if (ac.id !== aircraftId || ac.status !== "under_maintenance") return ac;
      // Pause: work stops, aircraft returns to unavailable (fault still present)
      return { ...ac, status: "unavailable" as AircraftStatus };
    });
    const maintCount = aircraft.filter((a) => a.status === "under_maintenance").length;
    return {
      ...base,
      aircraft,
      maintenanceBays: { ...base.maintenanceBays, occupied: Math.min(maintCount, base.maintenanceBays.total) },
    };
  });

  return addEvent({ ...state, bases: updatedBases }, {
    type: "warning",
    message: `⏸ Underhåll pausat på ${aircraftId} — arbetet återupptas manuellt`,
    base: baseId,
  });
}
