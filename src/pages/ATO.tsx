import { useState } from "react";
import { useGame } from "@/context/GameContext";
import { TopBar } from "@/components/game/TopBar";
import { ATOEditor } from "@/components/game/ATOEditor";
import { ATOMissionPanel } from "@/components/game/ATOMissionPanel";
import { ATOImporter } from "@/components/game/ATOImporter";
import { ATOOrder, Aircraft, MissionType } from "@/types/game";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Shield,
  Target,
  Eye,
  Radio,
  Zap,
  Plane,
  Send,
  AlertTriangle,
  ChevronRight,
  MapPin,
  Package,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import { ATOGanttView } from "@/components/game/ATOGanttView";

const missionIcons: Partial<Record<MissionType, React.ReactNode>> = {
  DCA: <Shield className="h-4 w-4" />,
  QRA: <Target className="h-4 w-4" />,
  RECCE: <Eye className="h-4 w-4" />,
  AEW: <Radio className="h-4 w-4" />,
  AI_DT: <Zap className="h-4 w-4" />,
  AI_ST: <Zap className="h-4 w-4" />,
  ESCORT: <Shield className="h-4 w-4" />,
  TRANSPORT: <Plane className="h-4 w-4" />,
  REBASE: <MapPin className="h-4 w-4" />,
};

const priorityColor = {
  high: "text-status-red border-status-red/40 bg-status-red/10",
  medium: "text-status-yellow border-status-yellow/40 bg-status-yellow/10",
  low: "text-muted-foreground border-border bg-muted/20",
};

const priorityLabel = { high: "HÖG", medium: "MEDEL", low: "LÅG" };

const statusColor = {
  pending: "bg-primary/10 border-primary/30 text-primary",
  assigned: "bg-status-yellow/10 border-status-yellow/30 text-status-yellow",
  dispatched: "bg-status-green/10 border-status-green/30 text-status-green",
  completed: "bg-muted border-border text-muted-foreground",
};

const statusLabel = {
  pending: "VÄNTANDE",
  assigned: "TILLDELAD",
  dispatched: "SKICKAD",
  completed: "GENOMFÖRD",
};

function formatHour(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

export function ATOBody({ embedded = false }: { embedded?: boolean }) {
  const { state, advanceTurn, resetGame, assignAircraftToOrder, dispatchOrder, createATOOrder, editATOOrder, deleteATOOrder } = useGame();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedAircraft, setSelectedAircraft] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "dispatched" | "completed">("all");
  const [showEditor, setShowEditor] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ATOOrder | undefined>(undefined);
  const [newOrderStartHour, setNewOrderStartHour] = useState<number | undefined>(undefined);

  const selectedOrder = state.atoOrders.find((o) => o.id === selectedOrderId) ?? null;
  const selectedBase = selectedOrder
    ? state.bases.find((b) => b.id === selectedOrder.launchBase)
    : null;
  const mobReadyAircraft = state.bases.find((b) => b.id === "MOB")?.aircraft.filter((ac) => ac.status === "ready") ?? [];

  const availableAircraft: Aircraft[] = selectedBase
    ? selectedBase.aircraft.filter(
        (ac) =>
          ac.status === "ready" &&
          (!selectedOrder?.aircraftType || ac.type === selectedOrder.aircraftType)
      )
    : [];

  const filteredOrders = state.atoOrders.filter(
    (o) => filterStatus === "all" || o.status === filterStatus
  );

  const pendingCount = state.atoOrders.filter((o) => o.status === "pending").length;
  const dispatchedCount = state.atoOrders.filter((o) => o.status === "dispatched").length;

  function handleSelectOrder(order: ATOOrder) {
    setSelectedOrderId(order.id);
    setSelectedAircraft(order.assignedAircraft.length > 0 ? order.assignedAircraft : []);
  }

  function toggleAircraft(id: string) {
    setSelectedAircraft((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleAssign() {
    if (!selectedOrder) return;
    assignAircraftToOrder(selectedOrder.id, selectedAircraft);
    toast.success(`Tilldelat ${selectedAircraft.length} flygplan till ${selectedOrder.missionType}`);
  }

  function handleGanttClickEmpty(startHour: number) {
    setEditingOrder(undefined);
    setNewOrderStartHour(startHour);
    setShowEditor(true);
  }

  function handleDelete() {
    if (!selectedOrderId) return;
    deleteATOOrder(selectedOrderId);
    toast.success("Order raderad");
    setSelectedOrderId(null);
    setSelectedAircraft([]);
  }

  function handleOpenEdit() {
    if (!selectedOrder) return;
    setEditingOrder(selectedOrder);
    setShowEditor(true);
  }

  function handleDispatch() {
    if (!selectedOrder) return;
    if (selectedAircraft.length === 0) {
      toast.error("Inga flygplan tilldelade. Tilldela flygplan först.");
      return;
    }
    // Assign first if not already
    assignAircraftToOrder(selectedOrder.id, selectedAircraft);
    dispatchOrder(selectedOrder.id);
    toast.success(
      `${selectedAircraft.length} fpl skickade på ${selectedOrder.missionType}-uppdrag från ${selectedOrder.launchBase}`
    );
    setSelectedOrderId(null);
    setSelectedAircraft([]);
  }

  return (
    <div className={embedded ? "flex flex-col flex-1 overflow-hidden bg-background" : "flex flex-col h-screen bg-background"}>
      {!embedded && <TopBar state={state} onAdvanceTurn={advanceTurn} onReset={resetGame} />}

      {/* Sub-header */}
      <div className="border-b border-border bg-card px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Send className="h-4 w-4 text-primary" />
          <h2 className="font-sans font-bold text-sm text-foreground tracking-wider">
            ATO — UPPDRAGSORDERN
          </h2>
          <span className="text-[10px] font-mono text-muted-foreground">
            Dag {state.day} · Fas: {state.phase}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {pendingCount} VÄNTANDE ORDER
            </span>
          )}
          {dispatchedCount > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-status-green/10 text-status-green border border-status-green/30">
              {dispatchedCount} AKTIVA UPPDRAG
            </span>
          )}
          <button
            onClick={() => { setEditingOrder(undefined); setNewOrderStartHour(undefined); setShowEditor(true); }}
            className="flex items-center gap-1.5 text-xs font-mono font-bold px-4 py-2 rounded-lg transition-all hover:opacity-90"
            style={{ background: "hsl(220 63% 18%)", color: "hsl(42 64% 62%)", border: "1px solid hsl(42 64% 53% / 0.3)" }}
          >
            <Plus className="h-3.5 w-3.5" />
            NY ORDER
          </button>
        </div>
      </div>

      {/* ATO Importer — inline panel */}
      <div className="border-b border-border bg-card overflow-y-auto" style={{ maxHeight: "320px" }}>
        <div className="px-6 py-4">
          <ATOImporter />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-0">

        {/* LEFT: ATO order list + importer */}
        <div className="border-r border-border flex flex-col overflow-hidden">
          {/* Filter tabs */}
          <div className="px-4 py-2 border-b border-border flex gap-1">
            {(["all", "pending", "dispatched", "completed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={`px-3 py-1 text-[10px] font-mono rounded transition-colors ${
                  filterStatus === f
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "all" ? "ALLA" : f === "pending" ? "VÄNTANDE" : f === "dispatched" ? "SKICKADE" : "KLARA"}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredOrders.length === 0 && (
              <div className="text-center text-muted-foreground text-xs py-8">
                Inga order
              </div>
            )}
            {filteredOrders.map((order) => {
              const isSelected = order.id === selectedOrderId;
              const base = state.bases.find((b) => b.id === order.launchBase);
              const mcAtBase = base?.aircraft.filter(
                (ac) =>
                  ac.status === "ready" &&
                  (!order.aircraftType || ac.type === order.aircraftType)
              ).length ?? 0;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => handleSelectOrder(order)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary/60 bg-primary/10"
                      : "border-border bg-card hover:border-border hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`p-1 rounded border ${priorityColor[order.priority]}`}
                      >
                        {missionIcons[order.missionType] ?? <Plane className="h-4 w-4" />}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-foreground">
                          {order.missionType} — {order.label}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                          {formatHour(order.startHour)}–{formatHour(order.endHour)} · {order.requiredCount} fpl
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${statusColor[order.status]}`}
                      >
                        {statusLabel[order.status]}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${priorityColor[order.priority]}`}
                      >
                        {priorityLabel[order.priority]}
                      </span>
                      <div className="flex gap-0.5 mt-0.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingOrder(order); setShowEditor(true); }}
                          className="p-0.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteATOOrder(order.id); toast.success("Order raderad"); if (selectedOrderId === order.id) { setSelectedOrderId(null); setSelectedAircraft([]); } }}
                          className="p-0.5 rounded text-muted-foreground hover:text-status-red hover:bg-status-red/10 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {order.launchBase}
                    </span>
                    {order.payload && (
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {order.payload}
                      </span>
                    )}
                    <span className="flex items-center gap-1 ml-auto">
                      <Plane className="h-3 w-3" />
                      <span className={mcAtBase < order.requiredCount ? "text-status-red" : "text-status-green"}>
                        {mcAtBase} MC
                      </span>
                      /{order.requiredCount} krävda
                    </span>
                  </div>

                  {order.assignedAircraft.length > 0 && (
                    <div className="mt-1.5 text-[9px] font-mono text-status-yellow">
                      Tilldelade: {order.assignedAircraft.join(", ")}
                    </div>
                  )}

                  {isSelected && (
                    <div className="mt-1 flex items-center gap-1 text-[9px] text-primary font-mono">
                      <ChevronRight className="h-3 w-3" />
                      Välj flygplan →
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Mission panel */}
        <div className="overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {selectedOrder ? (
              <motion.div
                key={selectedOrder.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="flex-1 overflow-hidden flex flex-col h-full"
              >
                <ATOMissionPanel
                  order={selectedOrder}
                  allOrders={state.atoOrders}
                  state={state}
                  availableAircraft={availableAircraft}
                  selectedAircraft={selectedAircraft}
                  onSelectAircraft={setSelectedAircraft}
                  onAssign={handleAssign}
                  onDispatch={handleDispatch}
                  onEdit={handleOpenEdit}
                  onDelete={handleDelete}
                  currentHour={state.hour}
                  currentDay={state.day}
                  onSelectOrder={(id) => {
                    const o = state.atoOrders.find((o) => o.id === id);
                    if (o) handleSelectOrder(o);
                  }}
                  editATOOrder={editATOOrder}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-8"
              >
                <Send className="h-12 w-12 opacity-20" />
                <p className="text-sm font-mono">Välj en ATO-order för att tilldela flygplan</p>
                <p className="text-[10px] text-center max-w-xs">
                  Välj ett uppdrag i listan till vänster, tilldela tillgängliga MC-flygplan och skicka uppdraget.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Gantt panel */}
      <div className="border-t border-border bg-card shrink-0" style={{ height: "300px" }}>
        <div className="px-4 py-1.5 flex items-center justify-between border-b border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-muted-foreground tracking-widest">DAGLIG ATO-PLAN</span>
            <span className="text-[10px] font-mono text-muted-foreground">· Dag {state.day}</span>
          </div>
          <span className="text-[9px] font-mono text-muted-foreground/60 italic">Klicka på tomt fält för att skapa ny order</span>
        </div>
        <div style={{ height: "264px" }}>
          <ATOGanttView
            orders={state.atoOrders.filter((o) => o.day === state.day)}
            currentHour={state.hour}
            selectedOrderId={selectedOrderId ?? ""}
            onSelectOrder={(id) => {
              const o = state.atoOrders.find((o) => o.id === id);
              if (o) handleSelectOrder(o);
            }}
            onClickEmpty={handleGanttClickEmpty}
          />
        </div>
      </div>

      {/* ATO Editor Modal */}
      {showEditor && (
        <ATOEditor
          order={editingOrder}
          defaultStartHour={editingOrder ? undefined : newOrderStartHour}
          availableAircraft={editingOrder ? undefined : mobReadyAircraft}
          onSave={(order, selectedAircraft) => {
            if (editingOrder) {
              editATOOrder(editingOrder.id, order);
              toast.success("Order uppdaterad");
            } else {
              createATOOrder(order, selectedAircraft);
              toast.success(`Ny ATO-order skapad${selectedAircraft.length > 0 ? ` · ${selectedAircraft.length} fpl tilldelade` : ""}`);
            }
            setShowEditor(false);
            setEditingOrder(undefined);
            setNewOrderStartHour(undefined);
          }}
          onCancel={() => { setShowEditor(false); setEditingOrder(undefined); setNewOrderStartHour(undefined); }}
        />
      )}
    </div>
  );
}

export default function ATO() {
  return <ATOBody />;
}
