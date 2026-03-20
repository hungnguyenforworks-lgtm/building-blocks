import type { GameState, GameAction, AircraftStatus } from "@/types/game";
import { isMissionCapable } from "@/types/game";

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

// Actions that are always allowed regardless of current phase
const ALWAYS_ALLOWED: GameAction["type"][] = [
  "ADVANCE_PHASE",
  "RESET_GAME",
  "SEND_MISSION_DROP",
  "APPLY_UTFALL_OUTCOME",
  "START_MAINTENANCE",
  "MOVE_AIRCRAFT",
  "ASSIGN_AIRCRAFT",
  "DISPATCH_ORDER",
  "APPLY_RECOMMENDATION",
  "DISMISS_RECOMMENDATION",
];

/** Validate whether an action is allowed in the current game state */
export function validateAction(state: GameState, action: GameAction): ValidationResult {
  // Phase-independent actions are always valid (subject to state checks below)
  // Phase-gated actions (CREATE/EDIT/DELETE ATO) checked below

  switch (action.type) {
    case "ASSIGN_AIRCRAFT": {
      const order = state.atoOrders.find((o) => o.id === action.orderId);
      if (!order) return { valid: false, reason: "ATO order not found" };
      if (order.status === "dispatched" || order.status === "completed") {
        return { valid: false, reason: "Order already dispatched or completed" };
      }
      const base = state.bases.find((b) => b.id === order.launchBase);
      if (!base) return { valid: false, reason: "Launch base not found" };
      for (const acId of action.aircraftIds) {
        const ac = base.aircraft.find((a) => a.id === acId);
        if (!ac) return { valid: false, reason: `Aircraft ${acId} not found at ${order.launchBase}` };
        if (!isMissionCapable(ac.status)) {
          return { valid: false, reason: `Aircraft ${acId} is not mission capable (${ac.status})` };
        }
      }
      return { valid: true };
    }

    case "DISPATCH_ORDER": {
      const order = state.atoOrders.find((o) => o.id === action.orderId);
      if (!order) return { valid: false, reason: "ATO order not found" };
      if (order.assignedAircraft.length === 0) {
        return { valid: false, reason: "No aircraft assigned to order" };
      }
      return { valid: true };
    }

    case "START_MAINTENANCE": {
      const base = state.bases.find((b) => b.id === action.baseId);
      if (!base) return { valid: false, reason: "Base not found" };
      const ac = base.aircraft.find((a) => a.id === action.aircraftId);
      if (!ac) return { valid: false, reason: "Aircraft not found" };
      if (ac.status !== "unavailable") {
        return { valid: false, reason: "Aircraft is not in unavailable state" };
      }
      if (base.maintenanceBays.occupied >= base.maintenanceBays.total) {
        return { valid: false, reason: "All maintenance bays are occupied" };
      }
      return { valid: true };
    }

    case "SEND_MISSION_DROP": {
      const base = state.bases.find((b) => b.id === action.baseId);
      if (!base) return { valid: false, reason: "Base not found" };
      const ac = base.aircraft.find((a) => a.id === action.aircraftId);
      if (!ac) return { valid: false, reason: "Aircraft not found" };
      if (!isMissionCapable(ac.status)) {
        return { valid: false, reason: "Aircraft is not mission capable" };
      }
      return { valid: true };
    }

    case "DELETE_ATO_ORDER": {
      const order = state.atoOrders.find((o) => o.id === action.orderId);
      if (!order) return { valid: false, reason: "ATO order not found" };
      if (order.status === "dispatched") {
        return { valid: false, reason: "Cannot delete a dispatched order" };
      }
      return { valid: true };
    }

    case "CREATE_ATO_ORDER":
    case "EDIT_ATO_ORDER":
    case "MOVE_AIRCRAFT":
    case "APPLY_RECOMMENDATION":
    case "DISMISS_RECOMMENDATION":
    case "APPLY_UTFALL_OUTCOME":
    case "COMPLETE_LANDING_CHECK":
    case "HANGAR_DROP_CONFIRM":
    case "PAUSE_MAINTENANCE":
    case "MARK_FAULT_NMC":
    case "CONSUME_SPARE_PART":
    case "ADVANCE_PHASE":
    case "RESET_GAME":
      return { valid: true };

    case "REBASE_AIRCRAFT": {
      const fromBase = state.bases.find((b) => b.id === action.fromBase);
      if (!fromBase) return { valid: false, reason: "Avsändarbas ej hittad" };
      const ac = fromBase.aircraft.find((a) => a.id === action.aircraftId);
      if (!ac) return { valid: false, reason: "Flygplan ej hittat vid angiven bas" };
      const blocked: AircraftStatus[] = ["on_mission", "in_preparation", "awaiting_launch", "returning", "recovering", "allocated"];
      if (blocked.includes(ac.status)) {
        return { valid: false, reason: `Kan ej ombasera ${ac.tailNumber} — status: ${ac.status}` };
      }
      if (action.fromBase === action.toBase) return { valid: false, reason: "Samma bas" };
      if (!state.bases.find((b) => b.id === action.toBase)) return { valid: false, reason: "Destinationsbas ej hittad" };
      return { valid: true };
    }

    default:
      return { valid: false, reason: "Unknown action type" };
  }
}
