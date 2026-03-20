import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ATOOrder,
  Aircraft,
  GameState,
  MissionType,
  AircraftType,
  BaseType,
} from "@/types/game";
import { ATOGanttView } from "./ATOGanttView";
import { validateATOOrder } from "@/utils/atoValidation";
import {
  AlertTriangle,
  CheckCircle2,
  Send,
  Save,
  Pencil,
  Trash2,
  Shield,
  Target,
  Eye,
  Radio,
  Zap,
  Plane,
  Clock,
  MapPin,
  Package,
  Users,
  Navigation,
} from "lucide-react";
import { BASE_COORDS } from "@/pages/map/constants";

// ── Haversine distance in nautical miles ────────────────────────────────────
function calculateDistanceNM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R_NM = 3440.065; // Earth radius in NM
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R_NM * c;
}

// ── Display constants (mirrored from ATO.tsx) ────────────────────────────────

const missionIcons: Partial<Record<MissionType, React.ReactNode>> = {
  DCA: <Shield className="h-4 w-4" />,
  QRA: <Target className="h-4 w-4" />,
  RECCE: <Eye className="h-4 w-4" />,
  AEW: <Radio className="h-4 w-4" />,
  AI_DT: <Zap className="h-4 w-4" />,
  AI_ST: <Zap className="h-4 w-4" />,
  ESCORT: <Shield className="h-4 w-4" />,
  TRANSPORT: <Plane className="h-4 w-4" />,
};

const priorityColor: Record<string, string> = {
  high: "text-status-red border-status-red/40 bg-status-red/10",
  medium: "text-status-yellow border-status-yellow/40 bg-status-yellow/10",
  low: "text-muted-foreground border-border bg-muted/20",
};

const statusColor: Record<string, string> = {
  pending: "bg-primary/10 border-primary/30 text-primary",
  assigned: "bg-status-yellow/10 border-status-yellow/30 text-status-yellow",
  dispatched: "bg-status-green/10 border-status-green/30 text-status-green",
  completed: "bg-muted border-border text-muted-foreground",
};

const statusLabel: Record<string, string> = {
  pending: "VÄNTANDE",
  assigned: "TILLDELAD",
  dispatched: "SKICKAD",
  completed: "GENOMFÖRD",
};

function formatHour(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

// ── Form constants ────────────────────────────────────────────────────────────

const MISSION_TYPES: MissionType[] = ["DCA", "QRA", "RECCE", "AEW", "AI_DT", "AI_ST", "ESCORT", "TRANSPORT"];
const AIRCRAFT_TYPES: AircraftType[] = ["GripenE", "GripenF_EA", "GlobalEye", "VLO_UCAV", "LOTUS"];
const BASES: BaseType[] = ["MOB"];

// ── Component ─────────────────────────────────────────────────────────────────

interface ATOMissionPanelProps {
  order: ATOOrder;
  allOrders: ATOOrder[];
  state: GameState;
  availableAircraft: Aircraft[];
  selectedAircraft: string[];
  onSelectAircraft: (ids: string[]) => void;
  onAssign: () => void;
  onDispatch: () => void;
  onEdit: () => void;
  onDelete: () => void;
  currentHour: number;
  currentDay: number;
  onSelectOrder: (id: string) => void;
  editATOOrder: (id: string, updates: Partial<ATOOrder>) => void;
}

export function ATOMissionPanel({
  order,
  allOrders,
  state,
  availableAircraft,
  selectedAircraft,
  onSelectAircraft,
  onAssign,
  onDispatch,
  onEdit,
  onDelete,
  currentHour,
  currentDay,
  onSelectOrder,
  editATOOrder,
}: ATOMissionPanelProps) {
  const [activeTab, setActiveTab] = useState<"details" | "timeline" | "assign">("details");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Inline form state
  const [formMissionType, setFormMissionType] = useState<MissionType>(order.missionType);
  const [formLabel, setFormLabel] = useState(order.label);
  const [formStartHour, setFormStartHour] = useState(order.startHour);
  const [formEndHour, setFormEndHour] = useState(order.endHour);
  const [formRequiredCount, setFormRequiredCount] = useState(order.requiredCount);
  const [formAircraftType, setFormAircraftType] = useState<AircraftType | "">(order.aircraftType ?? "");
  const [formPayload, setFormPayload] = useState(order.payload ?? "");
  const [formLaunchBase, setFormLaunchBase] = useState<BaseType>(order.launchBase);
  const [formPriority, setFormPriority] = useState<"high" | "medium" | "low">(order.priority);
  const [formDirty, setFormDirty] = useState(false);
  const [formDestinationName, setFormDestinationName] = useState(order.destinationName ?? "");
  const [formCoordsLat, setFormCoordsLat] = useState(order.coords?.lat ?? 57);
  const [formCoordsLng, setFormCoordsLng] = useState(order.coords?.lng ?? 18);
  const [formMissionCallsign, setFormMissionCallsign] = useState(order.missionCallsign ?? "");
  const [formFuelOnArrival, setFormFuelOnArrival] = useState(order.fuelOnArrival ?? 60);

  // Reset form when switching to a different order
  useEffect(() => {
    setFormMissionType(order.missionType);
    setFormLabel(order.label);
    setFormStartHour(order.startHour);
    setFormEndHour(order.endHour);
    setFormRequiredCount(order.requiredCount);
    setFormAircraftType(order.aircraftType ?? "");
    setFormPayload(order.payload ?? "");
    setFormLaunchBase(order.launchBase);
    setFormPriority(order.priority);
    setFormDirty(false);
    setShowDeleteConfirm(false);
    setFormDestinationName(order.destinationName ?? "");
    setFormCoordsLat(order.coords?.lat ?? 57);
    setFormCoordsLng(order.coords?.lng ?? 18);
    setFormMissionCallsign(order.missionCallsign ?? "");
    setFormFuelOnArrival(order.fuelOnArrival ?? 60);
  }, [order.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper: set a field and mark form dirty
  function setField<T>(setter: React.Dispatch<React.SetStateAction<T>>) {
    return (val: T) => {
      setter(val);
      setFormDirty(true);
    };
  }

  function handleSaveDetails() {
    editATOOrder(order.id, {
      missionType: formMissionType,
      label: formLabel,
      startHour: formStartHour,
      endHour: formEndHour,
      requiredCount: formRequiredCount,
      aircraftType: formAircraftType || undefined,
      payload: formPayload || undefined,
      launchBase: formLaunchBase,
      priority: formPriority,
      destinationName: formDestinationName || undefined,
      coords: formDestinationName ? { lat: formCoordsLat, lng: formCoordsLng } : undefined,
      missionCallsign: formMissionCallsign || undefined,
      fuelOnArrival: formDestinationName ? formFuelOnArrival : undefined,
    });
    setFormDirty(false);
    toast.success("Order uppdaterad");
  }

  // Validation
  const warnings = validateATOOrder(order, state);
  const errorCount = warnings.filter((w) => w.severity === "error").length;

  // Today's orders for Gantt
  const todayOrders = allOrders.filter((o) => o.day === currentDay);

  const fieldCls = "w-full px-2 py-1.5 rounded text-xs font-mono bg-muted/30 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40";
  const labelCls = "text-[10px] font-mono font-bold block mb-1 text-muted-foreground";

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Panel header ───────────────────────────────────────────────────── */}
      <div className="border-b border-border px-4 py-3 flex items-center gap-3 shrink-0">
        <span className={`p-1.5 rounded-lg border shrink-0 ${priorityColor[order.priority]}`}>
          {missionIcons[order.missionType] ?? <Plane className="h-4 w-4" />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-sm text-foreground truncate">
              {order.missionType} — {order.label}
            </h3>
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${statusColor[order.status]}`}>
              {statusLabel[order.status]}
            </span>
            {errorCount > 0 && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border bg-status-red/10 border-status-red/30 text-status-red shrink-0 flex items-center gap-1">
                <AlertTriangle className="h-2.5 w-2.5" />
                {errorCount} FEL
              </span>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-0.5 flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatHour(order.startHour)}–{formatHour(order.endHour)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {order.launchBase}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {order.requiredCount} fpl
            </span>
            {order.payload && (
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {order.payload}
              </span>
            )}
            {order.destinationName && order.coords && (
              <>
                <span className="flex items-center gap-1" style={{ color: "hsl(42 64% 53%)" }}>
                  <Navigation className="h-3 w-3" />
                  {order.destinationName}
                </span>
                <span
                  className="flex items-center gap-1 font-bold"
                  style={{ color: "hsl(42 64% 53%)" }}
                >
                  {Math.round(
                    calculateDistanceNM(
                      BASE_COORDS[order.launchBase]?.lat ?? 0,
                      BASE_COORDS[order.launchBase]?.lng ?? 0,
                      order.coords.lat,
                      order.coords.lng
                    )
                  )} NM
                </span>
                {order.fuelOnArrival != null && (
                  <span className="flex items-center gap-1">
                    <Plane className="h-3 w-3" style={{ color: order.fuelOnArrival < 25 ? "hsl(0 72% 51%)" : "hsl(152 60% 45%)" }} />
                    <span style={{ color: order.fuelOnArrival < 25 ? "hsl(0 72% 51%)" : "inherit" }}>
                      {order.fuelOnArrival}%
                    </span>
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Edit / Delete buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            title="Öppna i editor"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded hover:bg-status-red/10 text-muted-foreground hover:text-status-red transition-colors"
              title="Radera order"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-1 bg-status-red/10 border border-status-red/30 rounded px-2 py-1">
              <span className="text-[9px] font-mono text-status-red">Radera?</span>
              <button
                onClick={() => { onDelete(); setShowDeleteConfirm(false); }}
                className="text-[9px] font-mono text-status-red hover:underline font-bold"
              >
                JA
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-[9px] font-mono text-muted-foreground hover:underline"
              >
                NEJ
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <div className="border-b border-border px-4 py-2 flex gap-1 shrink-0">
        {(["details", "timeline", "assign"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 text-[10px] font-mono rounded transition-colors ${
              activeTab === tab
                ? "bg-primary/20 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "details" ? "DETALJER" : tab === "timeline" ? "TIDSLINJE" : "TILLDELA"}
          </button>
        ))}
      </div>

      {/* ── Tab content ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {/* DETALJER */}
        {activeTab === "details" && (
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>UPPDRAGSTYP</label>
                <select
                  value={formMissionType}
                  onChange={(e) => setField(setFormMissionType)(e.target.value as MissionType)}
                  className={fieldCls}
                >
                  {MISSION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>PRIORITET</label>
                <select
                  value={formPriority}
                  onChange={(e) => setField(setFormPriority)(e.target.value as "high" | "medium" | "low")}
                  className={fieldCls}
                >
                  <option value="high">HÖG</option>
                  <option value="medium">MEDEL</option>
                  <option value="low">LÅG</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>BENÄMNING</label>
              <input
                value={formLabel}
                onChange={(e) => setField(setFormLabel)(e.target.value)}
                className={fieldCls}
                placeholder="t.ex. Defensivt luftförsvar"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>START (timme)</label>
                <input
                  type="number" min={0} max={23}
                  value={formStartHour}
                  onChange={(e) => setField(setFormStartHour)(Number(e.target.value))}
                  className={fieldCls}
                />
              </div>
              <div>
                <label className={labelCls}>SLUT (timme)</label>
                <input
                  type="number" min={1} max={24}
                  value={formEndHour}
                  onChange={(e) => setField(setFormEndHour)(Number(e.target.value))}
                  className={fieldCls}
                />
              </div>
              <div>
                <label className={labelCls}>ANTAL FPL</label>
                <input
                  type="number" min={1} max={20}
                  value={formRequiredCount}
                  onChange={(e) => setField(setFormRequiredCount)(Number(e.target.value))}
                  className={fieldCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>FLYGPLANSTYP</label>
                <select
                  value={formAircraftType}
                  onChange={(e) => setField(setFormAircraftType)(e.target.value as AircraftType | "")}
                  className={fieldCls}
                >
                  <option value="">Valfri</option>
                  {AIRCRAFT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>STARTBAS</label>
                <select
                  value={formLaunchBase}
                  onChange={(e) => setField(setFormLaunchBase)(e.target.value as BaseType)}
                  className={fieldCls}
                >
                  {BASES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>LASTNING / BEVÄPNING</label>
              <input
                value={formPayload}
                onChange={(e) => setField(setFormPayload)(e.target.value)}
                placeholder="t.ex. IRIS-T + Meteor"
                className={fieldCls}
              />
            </div>

            {/* ── Destination / routing ── */}
            <div
              className="rounded-lg border p-3 space-y-2"
              style={{
                borderColor: formDestinationName ? "hsl(42 64% 53% / 0.5)" : "hsl(215 14% 80%)",
                background: formDestinationName ? "hsl(42 64% 53% / 0.04)" : "transparent",
              }}
            >
              <div className="text-[10px] font-mono font-bold" style={{ color: "hsl(218 15% 45%)" }}>
                DESTINATION / PLANERING
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>MÅLOMRÅDE</label>
                  <input
                    value={formDestinationName}
                    onChange={(e) => setField(setFormDestinationName)(e.target.value)}
                    placeholder="t.ex. Gotland East"
                    className={fieldCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>CALLSIGN</label>
                  <input
                    value={formMissionCallsign}
                    onChange={(e) => setField(setFormMissionCallsign)(e.target.value)}
                    placeholder="t.ex. VIPER 1"
                    className={fieldCls}
                  />
                </div>
              </div>
              {formDestinationName && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>LAT</label>
                      <input
                        type="number"
                        step={0.0001}
                        min={55}
                        max={70}
                        value={formCoordsLat}
                        onChange={(e) => setField(setFormCoordsLat)(Number(e.target.value))}
                        className={fieldCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>LNG</label>
                      <input
                        type="number"
                        step={0.0001}
                        min={10}
                        max={30}
                        value={formCoordsLng}
                        onChange={(e) => setField(setFormCoordsLng)(Number(e.target.value))}
                        className={fieldCls}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>BRÄNSLE VID ANKOMST (%)</label>
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={formFuelOnArrival}
                      onChange={(e) => setField(setFormFuelOnArrival)(Number(e.target.value))}
                      className={fieldCls}
                    />
                  </div>
                </>
              )}
            </div>

            {formDirty && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                <button
                  onClick={handleSaveDetails}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold rounded transition-all hover:opacity-90"
                  style={{
                    background: "hsl(220 63% 18%)",
                    color: "hsl(42 64% 62%)",
                    border: "1px solid hsl(42 64% 53% / 0.3)",
                  }}
                >
                  <Save className="h-3.5 w-3.5" />
                  SPARA ÄNDRINGAR
                </button>
              </motion.div>
            )}
          </div>
        )}

        {/* TIDSLINJE */}
        {activeTab === "timeline" && (
          <div className="h-full min-h-[320px]">
            <ATOGanttView
              orders={todayOrders}
              currentHour={currentHour}
              selectedOrderId={order.id}
              onSelectOrder={onSelectOrder}
              timelineStart={6}
              timelineEnd={24}
            />
          </div>
        )}

        {/* TILLDELA */}
        {activeTab === "assign" && (
          <div className="p-4 space-y-4">
            {order.status !== "dispatched" && order.status !== "completed" ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Välj flygplan</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Tillgängliga MC vid {order.launchBase}
                      {order.aircraftType ? ` · Typ: ${order.aircraftType}` : ""}
                    </p>
                  </div>
                  <div className={`text-sm font-mono font-bold ${
                    selectedAircraft.length >= order.requiredCount
                      ? "text-status-green"
                      : "text-status-red"
                  }`}>
                    {selectedAircraft.length} / {order.requiredCount}
                  </div>
                </div>

                {availableAircraft.length === 0 ? (
                  <div className="bg-status-red/10 border border-status-red/30 rounded-lg p-4 text-center">
                    <AlertTriangle className="h-5 w-5 text-status-red mx-auto mb-2" />
                    <p className="text-xs text-status-red font-bold">Inga tillgängliga flygplan</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Inga MC-flygplan av typ {order.aircraftType ?? "valfri"} vid {order.launchBase}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {availableAircraft.map((ac) => {
                      const sel = selectedAircraft.includes(ac.id);
                      const overCount = !sel && selectedAircraft.length >= order.requiredCount;
                      const newIds = sel
                        ? selectedAircraft.filter((x) => x !== ac.id)
                        : [...selectedAircraft, ac.id];
                      return (
                        <button
                          key={ac.id}
                          onClick={() => !overCount && onSelectAircraft(newIds)}
                          disabled={overCount}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            sel
                              ? "bg-primary/15 border-primary/50 text-foreground"
                              : overCount
                              ? "opacity-40 cursor-not-allowed border-border bg-card"
                              : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              sel ? "bg-primary border-primary" : "border-muted-foreground"
                            }`}>
                              {sel && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold font-mono">{ac.tailNumber}</div>
                              <div className="text-[10px] text-muted-foreground">{ac.type}</div>
                            </div>
                            <div className="ml-auto text-right">
                              <div className="text-[9px] font-mono text-muted-foreground">{ac.flightHours}h</div>
                              <div className="text-[9px] font-mono text-status-green">MC</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={onAssign}
                    disabled={selectedAircraft.length === 0}
                    className="px-4 py-2 text-sm font-mono rounded border border-primary/40 text-primary bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    SPARA TILLDELNING
                  </button>
                  <button
                    onClick={onDispatch}
                    disabled={selectedAircraft.length === 0 || availableAircraft.length === 0}
                    className="flex items-center gap-2 px-6 py-2 text-sm font-mono font-bold rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                    SKICKA UPPDRAG
                  </button>
                  {selectedAircraft.length < order.requiredCount && selectedAircraft.length > 0 && (
                    <span className="text-[10px] text-status-yellow font-mono">
                      ⚠ {order.requiredCount - selectedAircraft.length} fpl saknas
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className={`rounded-lg border p-6 text-center ${
                order.status === "dispatched"
                  ? "bg-status-green/10 border-status-green/30"
                  : "bg-muted border-border"
              }`}>
                <CheckCircle2 className={`h-8 w-8 mx-auto mb-2 ${
                  order.status === "dispatched" ? "text-status-green" : "text-muted-foreground"
                }`} />
                <p className="font-bold text-sm">
                  {order.status === "dispatched" ? "Uppdrag skickat" : "Uppdrag genomfört"}
                </p>
                {order.assignedAircraft.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-2 font-mono">
                    Flygplan: {order.assignedAircraft.join(", ")}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Validation footer ──────────────────────────────────────────────── */}
      {warnings.length > 0 && (
        <div className="border-t border-border shrink-0">
          <div className="px-4 py-2 space-y-1 max-h-36 overflow-y-auto">
            <div className="text-[9px] font-mono text-muted-foreground tracking-wider uppercase mb-1">
              Varningar
            </div>
            {warnings.map((w) => (
              <div
                key={w.id}
                className={`flex items-start gap-2 text-[10px] font-mono rounded px-2 py-1 ${
                  w.severity === "error"
                    ? "bg-status-red/10 text-status-red"
                    : w.severity === "warning"
                    ? "bg-status-yellow/10 text-status-yellow"
                    : "bg-muted/30 text-muted-foreground"
                }`}
              >
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                {w.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
