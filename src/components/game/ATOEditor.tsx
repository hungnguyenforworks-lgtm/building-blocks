import { useState } from "react";
import type { Aircraft, MissionType, AircraftType, BaseType, ATOOrder } from "@/types/game";
import { X, Plus, Save } from "lucide-react";

interface ATOEditorProps {
  order?: ATOOrder; // if editing
  defaultStartHour?: number; // pre-fill when creating via Gantt click
  availableAircraft?: Aircraft[]; // only passed when creating new
  onSave: (order: Omit<ATOOrder, "id" | "status" | "assignedAircraft">, selectedAircraft: string[]) => void;
  onCancel: () => void;
}

const MISSION_TYPES: MissionType[] = ["DCA", "QRA", "RECCE", "AEW", "AI_DT", "AI_ST", "ESCORT", "TRANSPORT"];
const AIRCRAFT_TYPES: AircraftType[] = ["GripenE", "GripenF_EA", "GlobalEye", "VLO_UCAV", "LOTUS"];
const BASES: BaseType[] = ["MOB"];
const PRIORITIES = ["high", "medium", "low"] as const;

export function ATOEditor({ order, defaultStartHour, availableAircraft, onSave, onCancel }: ATOEditorProps) {
  const initStart = order?.startHour ?? defaultStartHour ?? 6;
  const initEnd = order?.endHour ?? (defaultStartHour != null ? defaultStartHour + 2 : 12);
  const [missionType, setMissionType] = useState<MissionType>(order?.missionType ?? "DCA");
  const [label, setLabel] = useState(order?.label ?? "");
  const [startHour, setStartHour] = useState(initStart);
  const [endHour, setEndHour] = useState(initEnd);
  const [requiredCount, setRequiredCount] = useState(order?.requiredCount ?? 2);
  const [aircraftType, setAircraftType] = useState<AircraftType | "">(order?.aircraftType ?? "");
  const [payload, setPayload] = useState(order?.payload ?? "");
  const [launchBase, setLaunchBase] = useState<BaseType>(order?.launchBase ?? "MOB");
  const [priority, setPriority] = useState<"high" | "medium" | "low">(order?.priority ?? "medium");
  const [day, setDay] = useState(order?.day ?? 1);
  const [selectedAircraftIds, setSelectedAircraftIds] = useState<string[]>([]);
  const [destinationName, setDestinationName] = useState(order?.destinationName ?? "");
  const [coordsLat, setCoordsLat] = useState(order?.coords?.lat ?? 57);
  const [coordsLng, setCoordsLng] = useState(order?.coords?.lng ?? 18);
  const [missionCallsign, setMissionCallsign] = useState(order?.missionCallsign ?? "");
  const [fuelOnArrival, setFuelOnArrival] = useState(order?.fuelOnArrival ?? 60);

  const filteredAircraft = availableAircraft?.filter(
    (ac) => !aircraftType || ac.type === aircraftType
  ) ?? [];

  function toggleAircraft(id: string) {
    setSelectedAircraftIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= requiredCount) return prev;
      return [...prev, id];
    });
  }

  const handleSubmit = () => {
    const finalPayload = payload || undefined;
    const finalAircraftType = aircraftType || undefined;
    const finalCoords = destinationName
      ? { lat: coordsLat, lng: coordsLng }
      : undefined;
    onSave(
      {
        day,
        missionType,
        label: label || `${missionType}-uppdrag`,
        startHour,
        endHour,
        requiredCount,
        aircraftType: finalAircraftType,
        payload: finalPayload,
        launchBase,
        priority,
        sortiesPerDay: undefined,
        destinationName: destinationName || undefined,
        coords: finalCoords,
        missionCallsign: missionCallsign || undefined,
        fuelOnArrival: destinationName ? fuelOnArrival : undefined,
      },
      selectedAircraftIds
    );
  };

  const fieldStyle = {
    background: "hsl(216 18% 97%)",
    border: "1px solid hsl(215 14% 86%)",
    color: "hsl(220 63% 18%)",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "hsl(220 63% 10% / 0.5)" }}>
      <div
        className="w-full max-w-lg rounded-xl overflow-hidden shadow-2xl flex flex-col"
        style={{ background: "hsl(0 0% 100%)", border: "1px solid hsl(215 14% 84%)", maxHeight: "90vh" }}
      >
        {/* Header */}
        <div
          className="px-5 py-3 flex items-center justify-between shrink-0"
          style={{
            background: "hsl(220 63% 18%)",
            borderBottom: "2px solid hsl(42 64% 53% / 0.5)",
          }}
        >
          <div className="flex items-center gap-2">
            {order ? <Save className="h-4 w-4" style={{ color: "hsl(42 64% 62%)" }} /> : <Plus className="h-4 w-4" style={{ color: "hsl(42 64% 62%)" }} />}
            <h3 className="text-sm font-mono font-bold" style={{ color: "hsl(42 64% 62%)" }}>
              {order ? "REDIGERA ORDER" : "NY ATO-ORDER"}
            </h3>
          </div>
          <button onClick={onCancel} className="p-1 rounded hover:bg-white/10 transition-colors">
            <X className="h-4 w-4" style={{ color: "hsl(200 12% 72%)" }} />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-mono font-bold block mb-1" style={{ color: "hsl(218 15% 45%)" }}>UPPDRAGSTYP</label>
              <select
                value={missionType}
                onChange={(e) => setMissionType(e.target.value as MissionType)}
                className="w-full px-3 py-2 rounded-lg text-xs font-mono"
                style={fieldStyle}
              >
                {MISSION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono font-bold block mb-1" style={{ color: "hsl(218 15% 45%)" }}>PRIORITET</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg text-xs font-mono"
                style={fieldStyle}
              >
                {PRIORITIES.map((p) => <option key={p} value={p}>{p === "high" ? "HÖG" : p === "medium" ? "MEDEL" : "LÅG"}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono font-bold block mb-1" style={{ color: "hsl(218 15% 45%)" }}>BENÄMNING</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="t.ex. Defensivt luftförsvar"
              className="w-full px-3 py-2 rounded-lg text-xs font-mono"
              style={fieldStyle}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-mono font-bold block mb-1" style={{ color: "hsl(218 15% 45%)" }}>START</label>
              <input
                type="number"
                min={0}
                max={23}
                value={startHour}
                onChange={(e) => setStartHour(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg text-xs font-mono"
                style={fieldStyle}
              />
            </div>
            <div>
              <label className="text-[10px] font-mono font-bold block mb-1" style={{ color: "hsl(218 15% 45%)" }}>SLUT</label>
              <input
                type="number"
                min={1}
                max={24}
                value={endHour}
                onChange={(e) => setEndHour(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg text-xs font-mono"
                style={fieldStyle}
              />
            </div>
            <div>
              <label className="text-[10px] font-mono font-bold block mb-1" style={{ color: "hsl(218 15% 45%)" }}>ANTAL FPL</label>
              <input
                type="number"
                min={1}
                max={20}
                value={requiredCount}
                onChange={(e) => { setRequiredCount(Number(e.target.value)); setSelectedAircraftIds([]); }}
                className="w-full px-3 py-2 rounded-lg text-xs font-mono"
                style={fieldStyle}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-mono font-bold block mb-1" style={{ color: "hsl(218 15% 45%)" }}>FLYGPLANSTYP</label>
              <select
                value={aircraftType}
                onChange={(e) => { setAircraftType(e.target.value as AircraftType | ""); setSelectedAircraftIds([]); }}
                className="w-full px-3 py-2 rounded-lg text-xs font-mono"
                style={fieldStyle}
              >
                <option value="">Valfri</option>
                {AIRCRAFT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono font-bold block mb-1" style={{ color: "hsl(218 15% 45%)" }}>STARTBAS</label>
              <select
                value={launchBase}
                onChange={(e) => setLaunchBase(e.target.value as BaseType)}
                className="w-full px-3 py-2 rounded-lg text-xs font-mono"
                style={fieldStyle}
              >
                {BASES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono font-bold block mb-1" style={{ color: "hsl(218 15% 45%)" }}>LASTNING / BEVÄPNING</label>
            <input
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              placeholder="t.ex. IRIS-T + Meteor"
              className="w-full px-3 py-2 rounded-lg text-xs font-mono"
              style={fieldStyle}
            />
          </div>

          {/* Divider */}
          <div className="border-t" style={{ borderColor: "hsl(215 14% 88%)" }} />

          <div className="text-[10px] font-mono font-bold" style={{ color: "hsl(218 15% 45%)" }}>
            DESTINATION / PLANERING
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-mono font-bold block mb-1" style={{ color: "hsl(218 15% 45%)" }}>MÅLOMRÅDE</label>
              <input
                value={destinationName}
                onChange={(e) => setDestinationName(e.target.value)}
                placeholder="t.ex. Gotland East"
                className="w-full px-3 py-2 rounded-lg text-xs font-mono"
                style={fieldStyle}
              />
            </div>
            <div>
              <label className="text-[10px] font-mono font-bold block mb-1" style={{ color: "hsl(218 15% 45%)" }}>CALLSIGN</label>
              <input
                value={missionCallsign}
                onChange={(e) => setMissionCallsign(e.target.value)}
                placeholder="t.ex. VIPER 1"
                className="w-full px-3 py-2 rounded-lg text-xs font-mono"
                style={fieldStyle}
              />
            </div>
          </div>

          {destinationName && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono font-bold block mb-1" style={{ color: "hsl(218 15% 45%)" }}>LATITUDE</label>
                  <input
                    type="number"
                    step={0.0001}
                    min={55}
                    max={70}
                    value={coordsLat}
                    onChange={(e) => setCoordsLat(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg text-xs font-mono"
                    style={fieldStyle}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold block mb-1" style={{ color: "hsl(218 15% 45%)" }}>LONGITUDE</label>
                  <input
                    type="number"
                    step={0.0001}
                    min={10}
                    max={30}
                    value={coordsLng}
                    onChange={(e) => setCoordsLng(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg text-xs font-mono"
                    style={fieldStyle}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono font-bold block mb-1" style={{ color: "hsl(218 15% 45%)" }}>
                  BRÄNSLE VID ANKOMST <span className="font-normal opacity-60">(%)</span>
                </label>
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={fuelOnArrival}
                  onChange={(e) => setFuelOnArrival(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg text-xs font-mono"
                  style={fieldStyle}
                />
              </div>
            </>
          )}

          {/* Aircraft selection (only when creating new) */}
          {!order && availableAircraft && (
            <div
              style={aircraftType ? {
                border: "1px solid hsl(42 64% 53% / 0.5)",
                borderRadius: "0.5rem",
                padding: "0.75rem",
                background: "hsl(42 64% 53% / 0.04)",
              } : {
                border: "1px dashed hsl(215 14% 80%)",
                borderRadius: "0.5rem",
                padding: "0.75rem",
                background: "hsl(216 18% 98%)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-mono font-bold" style={{ color: aircraftType ? "hsl(42 64% 40%)" : "hsl(218 15% 55%)" }}>
                  {aircraftType
                    ? `VÄLJ SPECIFIKA ${aircraftType.toUpperCase()} FLYGPLAN`
                    : "VÄLJ SPECIFIKA FLYGPLAN"}
                </label>
                {aircraftType && (
                  <span
                    className="text-[10px] font-mono font-bold"
                    style={{ color: selectedAircraftIds.length >= requiredCount ? "hsl(152 60% 38%)" : "hsl(218 15% 50%)" }}
                  >
                    {selectedAircraftIds.length} / {requiredCount} valda
                  </span>
                )}
              </div>

              {!aircraftType ? (
                <div className="text-[10px] font-mono text-center py-2" style={{ color: "hsl(218 15% 60%)" }}>
                  Välj flygplanstyp ovan för att tilldela specifika flygplan till uppdraget.
                  <br />
                  <span style={{ color: "hsl(218 15% 75%)" }}>Tilldelade flygplan visas direkt i flygschema.</span>
                </div>
              ) : filteredAircraft.length === 0 ? (
                <div className="text-[10px] font-mono text-center py-3 rounded-lg"
                  style={{ color: "hsl(218 15% 55%)", border: "1px dashed hsl(215 14% 86%)" }}>
                  Inga tillgängliga {aircraftType} vid {launchBase}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 p-2 rounded-lg" style={{ background: "hsl(216 18% 97%)", border: "1px solid hsl(215 14% 86%)" }}>
                  {filteredAircraft.map((ac) => {
                    const selected = selectedAircraftIds.includes(ac.id);
                    const maxed = !selected && selectedAircraftIds.length >= requiredCount;
                    return (
                      <button
                        key={ac.id}
                        onClick={() => toggleAircraft(ac.id)}
                        disabled={maxed}
                        className="px-2 py-1 rounded text-[9px] font-mono font-bold transition-all"
                        style={selected ? {
                          background: "hsl(152 60% 20%)",
                          border: "1px solid hsl(152 60% 40%)",
                          color: "hsl(152 60% 70%)",
                        } : maxed ? {
                          background: "hsl(216 18% 94%)",
                          border: "1px solid hsl(215 14% 84%)",
                          color: "hsl(218 15% 70%)",
                          opacity: 0.5,
                        } : {
                          background: "hsl(0 0% 100%)",
                          border: "1px solid hsl(42 64% 53% / 0.4)",
                          color: "hsl(220 63% 25%)",
                        }}
                      >
                        {ac.tailNumber}
                        <span className="ml-1 opacity-60">{ac.type.replace("Gripen", "G").replace("_EA", "")}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 flex items-center justify-end gap-2 shrink-0"
          style={{ borderTop: "1px solid hsl(215 14% 88%)", background: "hsl(216 18% 98%)" }}
        >
          <button
            onClick={onCancel}
            className="px-4 py-2 text-[10px] font-mono font-bold rounded-lg"
            style={{ color: "hsl(218 15% 50%)" }}
          >
            AVBRYT
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-4 py-2 text-[10px] font-mono font-bold rounded-lg transition-all hover:opacity-90"
            style={{
              background: "hsl(220 63% 18%)",
              color: "hsl(42 64% 62%)",
              border: "1px solid hsl(42 64% 53% / 0.3)",
            }}
          >
            <Save className="h-3.5 w-3.5" />
            {order ? "SPARA ÄNDRINGAR" : "SKAPA ORDER"}
          </button>
        </div>
      </div>
    </div>
  );
}
