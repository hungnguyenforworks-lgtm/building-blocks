// ── Base enums ────────────────────────────────────────────────────────────
export type BaseType = "MOB" | "FOB_N" | "FOB_S" | "ROB_N" | "ROB_S" | "ROB_E";
export type AircraftType = "GripenE" | "GripenF_EA" | "GlobalEye" | "VLO_UCAV" | "LOTUS";
export type MissionType = "DCA" | "QRA" | "RECCE" | "AEW" | "AI_DT" | "AI_ST" | "ESCORT" | "TRANSPORT";
export type ScenarioPhase = "FRED" | "KRIS" | "KRIG";
export type MaintenanceType = "quick_lru" | "complex_lru" | "direct_repair" | "troubleshooting" | "scheduled_service";

// ── Extended aircraft status (9 states) ───────────────────────────────────
export type AircraftStatus =
  | "ready"
  | "allocated"
  | "in_preparation"
  | "awaiting_launch"
  | "on_mission"
  | "returning"
  | "recovering"
  | "under_maintenance"
  | "unavailable";

/** Backward-compat mapping from old 4-state to new 9-state */
export function mapLegacyStatus(legacy: string): AircraftStatus {
  switch (legacy) {
    case "mission_capable": return "ready";
    case "not_mission_capable": return "unavailable";
    case "on_mission": return "on_mission";
    case "maintenance": return "under_maintenance";
    default: return "ready";
  }
}

/** Map new 9-state to display category for existing UI components */
export function displayStatusCategory(status: AircraftStatus): "mc" | "on_mission" | "nmc" | "maintenance" {
  switch (status) {
    case "ready":
    case "allocated":
      return "mc";
    case "in_preparation":
    case "awaiting_launch":
      return "mc"; // still counts as available for display
    case "on_mission":
    case "returning":
      return "on_mission";
    case "recovering":
    case "under_maintenance":
      return "maintenance";
    case "unavailable":
      return "nmc";
  }
}

/** Check if an aircraft is mission-capable (can be assigned/dispatched) */
export function isMissionCapable(status: AircraftStatus): boolean {
  return status === "ready";
}

/** Check if an aircraft is in a maintenance/broken state */
export function isInMaintenance(status: AircraftStatus): boolean {
  return status === "under_maintenance" || status === "unavailable";
}

// ── 14-phase turn sequence ────────────────────────────────────────────────
export type TurnPhase =
  | "InitializeState"
  | "InterpretATO"
  | "ReviewResources"
  | "ChooseGroupingStrategy"
  | "SetManningSchedule"
  | "EstimateNeeds"
  | "BuildTimetable"
  | "AllocateAircraft"
  | "OrderPreparation"
  | "PrepareStatusCards"
  | "ExecutePreparation"
  | "ReportOutcome"
  | "UpdateMaintenancePlan"
  | "IncrementTime";

// ── Base zones ────────────────────────────────────────────────────────────
export type BaseZoneType =
  | "runway"
  | "prep_slot"
  | "front_maintenance"
  | "rear_maintenance"
  | "parking"
  | "fuel_zone"
  | "ammo_zone"
  | "spare_parts_zone"
  | "logistics_area";

export interface BaseZone {
  id: string;
  type: BaseZoneType;
  capacity: number;
  currentQueue: string[]; // aircraft IDs
  assignedWork: string[];
  resourceStock: Record<string, number>;
}

// ── Maintenance task ──────────────────────────────────────────────────────
export type FacilityType = "service_bay" | "minor_workshop" | "major_workshop";
export type CapabilityLevel =
  | "AU_steg_1"
  | "AU_steg_2_3"
  | "AU_steg_4"
  | "FK_steg_1_3"
  | "kompositrep"
  | "hjulbyte";

export interface MaintenanceTask {
  id: string;
  aircraftId: string;
  faultType: MaintenanceType;
  facilityNeeded: FacilityType;
  capabilityNeeded: CapabilityLevel;
  nominalTime: number; // hours
  stochasticDelay: number; // extra hours from dice
  requiredResources: { resourceId: string; quantity: number }[];
  startedAt?: { day: number; hour: number };
  remainingTime: number;
}

// ── Recommendation engine ─────────────────────────────────────────────────
export type RecommendationType =
  | "reassign"
  | "maintenance"
  | "resupply"
  | "rebalance"
  | "schedule"
  | "warning";

export type RecommendationPriority = "critical" | "high" | "medium" | "low";

export interface Recommendation {
  id: string;
  title: string;
  explanation: string;
  affectedAssets: string[];
  affectedMissions: string[];
  expectedBenefit: string;
  tradeoff: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  applyAction: GameAction;
  dismissed: boolean;
}

// ── Scenario day ──────────────────────────────────────────────────────────
export interface ScenarioDay {
  dayNumber: number;
  phase: ScenarioPhase;
  threats: ("CM" | "TBM")[];
  policyRestrictions: string[];
}

// ── Game actions (discriminated union) ────────────────────────────────────
export type GameAction =
  | { type: "ADVANCE_PHASE" }
  | { type: "ASSIGN_AIRCRAFT"; orderId: string; aircraftIds: string[] }
  | { type: "MOVE_AIRCRAFT"; aircraftId: string; fromZone: string; toZone: string; baseId: BaseType }
  | { type: "CREATE_ATO_ORDER"; order: Omit<ATOOrder, "id" | "status" | "assignedAircraft"> }
  | { type: "EDIT_ATO_ORDER"; orderId: string; updates: Partial<ATOOrder> }
  | { type: "DELETE_ATO_ORDER"; orderId: string }
  | { type: "START_MAINTENANCE"; baseId: BaseType; aircraftId: string; task?: Partial<MaintenanceTask> }
  | { type: "DISPATCH_ORDER"; orderId: string }
  | { type: "APPLY_RECOMMENDATION"; recommendationId: string }
  | { type: "DISMISS_RECOMMENDATION"; recommendationId: string }
  | { type: "SEND_MISSION_DROP"; baseId: BaseType; aircraftId: string; missionType: MissionType; durationHours?: number }
  | { type: "APPLY_UTFALL_OUTCOME"; baseId: BaseType; aircraftId: string; repairTime: number; maintenanceTypeKey: string; weaponLoss: number; actionLabel: string }
  | { type: "COMPLETE_LANDING_CHECK"; baseId: BaseType; aircraftId: string; sendToMaintenance: boolean; repairTime?: number; maintenanceTypeKey?: string; weaponLoss?: number; actionLabel?: string }
  | { type: "HANGAR_DROP_CONFIRM"; baseId: BaseType; aircraftId: string; repairTime: number; maintenanceTypeKey: string; restoreHealth: boolean }
  | { type: "PAUSE_MAINTENANCE"; baseId: BaseType; aircraftId: string }
  | { type: "MARK_FAULT_NMC"; baseId: BaseType; aircraftId: string; repairTime: number; maintenanceTypeKey: string; actionLabel: string }
  | { type: "RESET_GAME" };

// ── Core interfaces ───────────────────────────────────────────────────────
export interface Aircraft {
  id: string;
  type: AircraftType;
  tailNumber: string;
  status: AircraftStatus;
  currentBase: BaseType;
  flightHours: number;
  hoursToService: number;
  health: number; // 0–100%; 0 = NMC (red), >30 = flyable (blue)
  currentMission?: MissionType;
  missionEndHour?: number; // hour at which drag-drop mission completes
  payload?: string;
  maintenanceTimeRemaining?: number;
  maintenanceType?: MaintenanceType;
  maintenanceTask?: MaintenanceTask;
}

export interface SparePartStock {
  id: string;
  name: string;
  category: string;
  quantity: number;
  maxQuantity: number;
  reservedQuantity: number;
  resupplyDays: number;
  onOrder: number;
  leadTime: number;
  source: "base_stock" | "central_stock" | "mro";
  turnaround: number; // days for full cycle
  isReusable: boolean;
}

export interface PersonnelGroup {
  id: string;
  role: string;
  available: number;
  total: number;
  onDuty: boolean;
}

export interface Base {
  id: BaseType;
  name: string;
  type: "huvudbas" | "sidobas" | "reservbas";
  aircraft: Aircraft[];
  spareParts: SparePartStock[];
  personnel: PersonnelGroup[];
  fuel: number;
  maxFuel: number;
  ammunition: { type: string; quantity: number; max: number }[];
  maintenanceBays: { total: number; occupied: number };
  zones: BaseZone[];
}

export interface GameState {
  day: number;
  hour: number;
  phase: ScenarioPhase;
  bases: Base[];
  successfulMissions: number;
  failedMissions: number;
  events: GameEvent[];
  atoOrders: ATOOrder[];
  turnPhase: TurnPhase;
  turnNumber: number;
  recommendations: Recommendation[];
  maintenanceTasks: MaintenanceTask[];
  pendingLandingChecks: { aircraftId: string; baseId: BaseType }[];
}

export interface GameEvent {
  id: string;
  timestamp: string;
  type: "info" | "warning" | "critical" | "success";
  message: string;
  base?: BaseType;
}

export interface ATOOrder {
  id: string;
  day: number;
  missionType: MissionType;
  label: string;
  startHour: number;
  endHour: number;
  requiredCount: number;
  aircraftType?: AircraftType;
  payload?: string;
  launchBase: BaseType;
  priority: "high" | "medium" | "low";
  status: "pending" | "assigned" | "dispatched" | "completed";
  assignedAircraft: string[];
  sortiesPerDay?: number;
}
