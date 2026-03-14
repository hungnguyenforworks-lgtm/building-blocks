import { ATOOrder, GameState } from "@/types/game";

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationWarning {
  id: string;
  severity: ValidationSeverity;
  message: string;
}

export function validateATOOrder(order: ATOOrder, state: GameState): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  const base = state.bases.find((b) => b.id === order.launchBase);

  // 1. MC aircraft availability
  const availableCount =
    base?.aircraft.filter(
      (ac) =>
        ac.status === "ready" &&
        (!order.aircraftType || ac.type === order.aircraftType)
    ).length ?? 0;

  if (availableCount < order.requiredCount) {
    warnings.push({
      id: "mc-insufficient",
      severity: "error",
      message: `Otillräckliga MC-flygplan vid ${order.launchBase}: ${availableCount} tillgängliga, ${order.requiredCount} krävda`,
    });
  } else if (availableCount < order.requiredCount * 1.25) {
    warnings.push({
      id: "mc-low-margin",
      severity: "warning",
      message: `Låg marginal: endast ${availableCount - order.requiredCount} reservflygplan vid ${order.launchBase}`,
    });
  }

  // 2. Time window validity
  if (order.endHour <= order.startHour) {
    warnings.push({
      id: "time-invalid",
      severity: "error",
      message: "Ogiltig tidsperiod: sluttid måste vara efter starttid",
    });
  } else if (order.startHour < 6 || order.endHour > 24) {
    warnings.push({
      id: "time-range",
      severity: "warning",
      message: "Tidsperiod utanför normal operationsdag (06:00–24:00)",
    });
  }

  // 3. Scheduling conflicts with same-day same-base orders
  const overlapping = state.atoOrders.filter(
    (o) =>
      o.id !== order.id &&
      o.day === order.day &&
      o.launchBase === order.launchBase &&
      o.startHour < order.endHour &&
      o.endHour > order.startHour &&
      o.status !== "completed"
  );

  if (overlapping.length > 0) {
    const totalOverlapRequired = overlapping.reduce((s, o) => s + o.requiredCount, 0);
    if (totalOverlapRequired + order.requiredCount > availableCount) {
      warnings.push({
        id: "schedule-conflict",
        severity: "warning",
        message: `Tidsöverlapp med ${overlapping.map((o) => o.missionType).join(", ")} — resurskonfliktrisk`,
      });
    }
  }

  // 4. Fuel check
  if (base) {
    const fuelPct = (base.fuel / base.maxFuel) * 100;
    if (fuelPct < 30) {
      warnings.push({
        id: "fuel-critical",
        severity: "error",
        message: `Kritiskt lågt bränsle vid ${order.launchBase} (${fuelPct.toFixed(0)}%)`,
      });
    } else if (fuelPct < 60) {
      warnings.push({
        id: "fuel-low",
        severity: "warning",
        message: `Bränslenivå låg vid ${order.launchBase} (${fuelPct.toFixed(0)}%)`,
      });
    }
  }

  // 5. High-priority order still pending
  if (order.priority === "high" && order.status === "pending") {
    warnings.push({
      id: "priority-unassigned",
      severity: "warning",
      message: "Högprioritetsorder saknar tilldelning",
    });
  }

  // 6. Starttid passerad men ej skickat
  if (
    order.day === state.day &&
    order.status === "assigned" &&
    state.hour > order.startHour
  ) {
    warnings.push({
      id: "overdue-dispatch",
      severity: "error",
      message: "Starttid passerad — uppdraget är tilldelat men ej skickat",
    });
  }

  // Sort: errors first, then warnings, then info
  const order_: Record<ValidationSeverity, number> = { error: 0, warning: 1, info: 2 };
  return warnings.sort((a, b) => order_[a.severity] - order_[b.severity]);
}
