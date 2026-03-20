import { useState, useRef, useEffect } from "react";
import { Base, ScenarioPhase, GameEvent } from "@/types/game";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fuel, Zap, Users, Radio, ChevronLeft, ChevronRight,
  AlertTriangle, Info, CheckCircle2, Package, Wrench,
} from "lucide-react";

// ─── SAAB palette ──────────────────────────────────────────────────────────────
const SILVER = "#D7DEE1";
const RED    = "#D9192E";

// ─── Section IDs ───────────────────────────────────────────────────────────────
type ActiveSection = "fuel" | "ammo" | "parts" | "personnel" | "feed" | null;
type FeedCategory  = "fuel" | "ammo" | "parts" | "personnel" | "general";

export type IntelFeedItem = {
  id: string;
  source: string;
  time: string;
  type: "critical" | "warning" | "success" | "info";
  category: FeedCategory;
  msg: string;
};

function categorize(message: string): FeedCategory {
  const m = message.toLowerCase();
  if (m.includes("bränsle") || m.includes("fuel") || m.includes("tank")) return "fuel";
  if (m.includes("ammo") || m.includes("robot") || m.includes("vapen") || m.includes("beväpning")) return "ammo";
  if (m.includes("reservdel") || m.includes("lru") || m.includes("motor") || m.includes("radar")) return "parts";
  if (m.includes("personal") || m.includes("mekaniker") || m.includes("pilot") || m.includes("tekniker") || m.includes("vapensmed")) return "personnel";
  return "general";
}

export function buildIntelFeed(base: Base, events: GameEvent[]): IntelFeedItem[] {
  const items: IntelFeedItem[] = [];

  // Resource-driven alerts
  if (base.fuel < 30) {
    items.push({
      id: `fuel-low-${base.id}`,
      source: "Bränsle",
      time: "--:--",
      type: base.fuel < 15 ? "critical" : "warning",
      category: "fuel",
      msg: `Bränslenivå ${base.fuel.toFixed(0)}% vid ${base.id}.`,
    });
  }

  const totalAmmo = base.ammunition.reduce((s, a) => s + a.quantity, 0);
  const maxAmmo = base.ammunition.reduce((s, a) => s + a.max, 0);
  const ammoPct = maxAmmo > 0 ? Math.round((totalAmmo / maxAmmo) * 100) : 0;
  if (ammoPct < 30) {
    items.push({
      id: `ammo-low-${base.id}`,
      source: "Vapensmed",
      time: "--:--",
      type: ammoPct < 15 ? "critical" : "warning",
      category: "ammo",
      msg: `Ammunitionsnivå låg (${ammoPct}%) vid ${base.id}.`,
    });
  }

  base.spareParts.forEach((p) => {
    const pct = (p.quantity / p.maxQuantity) * 100;
    if (pct < 30) {
      items.push({
        id: `part-low-${base.id}-${p.id}`,
        source: "Reservdel",
        time: "--:--",
        type: pct < 15 ? "critical" : "warning",
        category: "parts",
        msg: `${p.name} låg (${p.quantity}/${p.maxQuantity}) vid ${base.id}.`,
      });
    }
  });

  const personnelAvail = base.personnel.reduce((s, p) => s + p.available, 0);
  const personnelTotal = base.personnel.reduce((s, p) => s + p.total, 0);
  const personnelPct = personnelTotal > 0 ? Math.round((personnelAvail / personnelTotal) * 100) : 0;
  if (personnelPct < 50) {
    items.push({
      id: `personnel-low-${base.id}`,
      source: "Personal",
      time: "--:--",
      type: personnelPct < 30 ? "critical" : "warning",
      category: "personnel",
      msg: `Personal tillgänglig ${personnelAvail}/${personnelTotal} vid ${base.id}.`,
    });
  }

  // Game events → feed
  events
    .filter((e) => !e.base || e.base === base.id)
    .slice(0, 20)
    .forEach((e, i) => {
      items.push({
        id: `evt-${e.id ?? i}`,
        source: e.actionType ? e.actionType.replace(/_/g, " ") : "Händelse",
        time: e.timestamp?.split(" ")?.[2]?.slice(0, 5) ?? "--:--",
        type: e.type,
        category: categorize(e.message),
        msg: e.message,
      });
    });

  return items;
}

const TEAM_STATUS = [
  { team: "Team Alpha", task: "Arbetar med GE01",  status: "busy"  },
  { team: "Team Beta",  task: "Viloperiod",          status: "rest"  },
  { team: "Team Gamma", task: "GE05 pre-flight",     status: "busy"  },
  { team: "Team Delta", task: "Tillgänglig",          status: "ready" },
];

const FEED_CFG = {
  critical: { bg: "rgba(217,25,46,0.13)",  border: "rgba(217,25,46,0.35)",  icon: AlertTriangle, nameColor: RED      },
  warning:  { bg: "rgba(217,151,42,0.11)", border: "rgba(217,151,42,0.28)", icon: AlertTriangle, nameColor: "#D97706" },
  success:  { bg: "rgba(34,160,90,0.10)",  border: "rgba(34,160,90,0.25)",  icon: CheckCircle2,  nameColor: "#22A05A" },
  info:     { bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.22)", icon: Info,           nameColor: "#3B82F6" },
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function DonutGauge({ pct, color, label, sub }: { pct: number; color: string; label: string; sub?: string }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const filled = (Math.min(100, Math.max(0, pct)) / 100) * circ;
  const isLow = pct < 30;
  const stroke = isLow ? RED : color;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <svg width={66} height={66} viewBox="0 0 66 66">
        <circle cx={33} cy={33} r={r} fill="none" stroke="rgba(215,222,225,0.07)" strokeWidth={8} />
        <motion.circle
          cx={33} cy={33} r={r} fill="none"
          stroke={stroke} strokeWidth={8} strokeLinecap="round"
          transform="rotate(-90 33 33)"
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${filled} ${circ}` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        <text x={33} y={30} textAnchor="middle" fontSize="12" fontFamily="monospace" fontWeight="700"
          fill={isLow ? RED : SILVER}>{pct}%</text>
        {sub && (
          <text x={33} y={43} textAnchor="middle" fontSize="7" fontFamily="monospace"
            fill="rgba(215,222,225,0.38)">{sub}</text>
        )}
      </svg>
      <span style={{
        color: "rgba(215,222,225,0.55)", fontSize: 8, fontFamily: "monospace",
        textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center",
      }}>
        {label}
      </span>
    </div>
  );
}

function MiniBar({ label, pct, color, count }: { label: string; pct: number; color: string; count?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
      <span style={{
        color: "rgba(215,222,225,0.55)", fontSize: 9, fontFamily: "monospace",
        width: 74, flexShrink: 0, overflow: "hidden", whiteSpace: "nowrap",
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 5, background: "rgba(215,222,225,0.07)", borderRadius: 3, overflow: "hidden" }}>
        <motion.div
          style={{ height: "100%", background: color, borderRadius: 3 }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      {count && (
        <span style={{
          color: SILVER, fontSize: 8, fontFamily: "monospace", fontWeight: 700,
          flexShrink: 0, minWidth: 30, textAlign: "right",
        }}>
          {count}
        </span>
      )}
      <span style={{
        color: "rgba(215,222,225,0.38)", fontSize: 8, fontFamily: "monospace",
        flexShrink: 0, minWidth: 28, textAlign: "right",
      }}>
        {pct}%
      </span>
    </div>
  );
}

function IntelBubble({ item }: { item: IntelFeedItem }) {
  const cfg = FEED_CFG[item.type as keyof typeof FEED_CFG];
  const Icon = cfg.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        borderRadius: 8, padding: "8px 10px", marginBottom: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
        <Icon size={10} color={cfg.nameColor} />
        <span style={{ color: cfg.nameColor, fontSize: 9, fontFamily: "monospace", fontWeight: 700, textTransform: "uppercase" }}>
          {item.source}
        </span>
        <span style={{ color: "rgba(215,222,225,0.28)", fontSize: 8, fontFamily: "monospace", marginLeft: "auto" }}>
          {item.time}
        </span>
      </div>
      <p style={{ color: SILVER, fontSize: 10, fontFamily: "monospace", margin: 0, lineHeight: 1.45, opacity: 0.82 }}>
        {item.msg}
      </p>
    </motion.div>
  );
}

// Mini filtered feed strip (shown at bottom of each section)
function SectionFeed({ category, items }: { category: FeedCategory; items: IntelFeedItem[] }) {
  const filtered = items.filter(f => f.category === category);
  if (filtered.length === 0) return null;
  return (
    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(215,222,225,0.07)" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 5,
        color: "rgba(215,222,225,0.28)", fontSize: 7, fontFamily: "monospace",
        letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 6,
      }}>
        <Radio size={8} color="rgba(215,222,225,0.3)" />
        RELATERADE HÄNDELSER
        <span style={{
          background: "rgba(217,25,46,0.18)", color: RED, borderRadius: 6,
          padding: "1px 4px", fontSize: 6, fontFamily: "monospace", fontWeight: 700,
          border: "1px solid rgba(217,25,46,0.3)",
        }}>{filtered.length}</span>
      </div>
      {filtered.map(item => <IntelBubble key={item.id} item={item} />)}
    </div>
  );
}

function StripButton({
  icon: Icon, label, critical, active, badge, onClick,
}: {
  icon: React.ElementType; label: string; critical: boolean;
  active: boolean; badge?: number; onClick: () => void;
}) {
  const bg        = active ? "rgba(217,25,46,0.22)" : critical ? "rgba(217,25,46,0.13)" : "rgba(215,222,225,0.05)";
  const border    = active ? "rgba(217,25,46,0.55)" : critical ? "rgba(217,25,46,0.32)" : "rgba(215,222,225,0.07)";
  const iconColor = active || critical ? RED : "rgba(215,222,225,0.55)";
  const textColor = active || critical ? RED : "rgba(215,222,225,0.38)";
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        width: 38, height: 46, borderRadius: 8,
        background: bg, border: `1px solid ${border}`,
        cursor: "pointer", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 2, position: "relative", padding: 0,
        transition: "background 0.2s, border-color 0.2s",
        outline: active ? `1.5px solid ${RED}` : "none",
        outlineOffset: active ? "2px" : "0",
      }}
    >
      <Icon size={14} color={iconColor} />
      <span style={{ color: textColor, fontSize: 7, fontFamily: "monospace", fontWeight: 700 }}>
        {label}
      </span>
      {badge != null && badge > 0 && (
        <div style={{
          position: "absolute", top: 3, right: 3,
          width: 10, height: 10, borderRadius: "50%",
          background: RED, color: "white",
          fontSize: 6, fontFamily: "monospace", fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {badge}
        </div>
      )}
    </button>
  );
}

function Section({ id, active, children }: { id: string; active: boolean; children: React.ReactNode }) {
  return (
    <div
      id={`intel-section-${id}`}
      style={{
        padding: "10px 14px",
        borderBottom: "1px solid rgba(215,222,225,0.05)",
        flexShrink: 0,
        borderLeft: active ? `3px solid ${RED}` : "3px solid transparent",
        background: active ? "rgba(217,25,46,0.04)" : "transparent",
        transition: "background 0.25s, border-left-color 0.25s",
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children, icon, accent }: { children: React.ReactNode; icon?: React.ReactNode; accent?: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 5,
      color: accent ?? "rgba(215,222,225,0.32)",
      fontSize: 8, fontFamily: "monospace", letterSpacing: "0.10em",
      textTransform: "uppercase", marginBottom: 8,
    }}>
      {icon}{children}
    </div>
  );
}

function Row({ label, value, critical }: { label: string; value: string; critical?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
      <span style={{ color: "rgba(215,222,225,0.5)", fontSize: 10, fontFamily: "monospace" }}>{label}</span>
      <span style={{ color: critical ? RED : SILVER, fontSize: 10, fontFamily: "monospace", fontWeight: 700 }}>{value}</span>
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────
interface Props { base: Base; phase: ScenarioPhase; events: GameEvent[]; }

export function IntelligenceSidebar({ base, phase, events }: Props) {
  const [expanded, setExpanded]           = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>(null);
  const scrollRef                         = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeSection || !expanded) return;
    const el = document.getElementById(`intel-section-${activeSection}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeSection, expanded]);

  const fuelRate      = phase === "KRIG" ? 3 : phase === "KRIS" ? 1.5 : 0.5;
  const fuelPct       = Math.round((base.fuel / base.maxFuel) * 100);
  const fuelLiters    = Math.round(base.fuel * 800);
  const etdHours      = base.fuel > 0 ? Math.floor(base.fuel / fuelRate) : 0;
  const etdTime       = new Date(Date.now() + etdHours * 3600000)
    .toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });

  const totalAmmo     = base.ammunition.reduce((s, a) => s + a.quantity, 0);
  const maxAmmo       = base.ammunition.reduce((s, a) => s + a.max, 0);
  const ammoPct       = maxAmmo > 0 ? Math.round((totalAmmo / maxAmmo) * 100) : 0;

  const personnelAvail = base.personnel.reduce((s, p) => s + p.available, 0);
  const personnelTotal = base.personnel.reduce((s, p) => s + p.total, 0);
  const personnelPct   = personnelTotal > 0 ? Math.round((personnelAvail / personnelTotal) * 100) : 0;

  const criticalParts  = base.spareParts.filter(p => p.quantity / p.maxQuantity < 0.30);
  const secondaryParts = base.spareParts.filter(p => p.quantity / p.maxQuantity >= 0.30);
  const feedItems = buildIntelFeed(base, events);
  const criticalIntel  = feedItems.filter(f => f.type === "critical" || f.type === "warning").length;

  const panelW = 300;
  const stripW = 48;

  const handleStrip = (section: ActiveSection) => {
    setExpanded(true);
    setActiveSection(section);
  };

  const glass: React.CSSProperties = {
    background: "rgba(12,35,76,0.96)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
  };

  return (
    <motion.div
      animate={{ width: expanded ? panelW + stripW : stripW }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      style={{ display: "flex", flexShrink: 0, overflow: "hidden", borderLeft: "1px solid rgba(215,222,225,0.06)", ...glass }}
    >
      {/* ── EXPANDED PANEL ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            ref={scrollRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{
              width: panelW, flexShrink: 0,
              display: "flex", flexDirection: "column",
              overflowY: "auto", overflowX: "hidden",
              borderRight: "1px solid rgba(215,222,225,0.06)",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "12px 14px", flexShrink: 0,
              borderBottom: "1px solid rgba(215,222,225,0.07)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "rgba(217,25,46,0.04)",
            }}>
              <div>
                <div style={{ color: SILVER, fontSize: 11, fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.12em" }}>
                  BASE INTELLIGENCE
                </div>
                <div style={{ color: "rgba(215,222,225,0.38)", fontSize: 8, fontFamily: "monospace" }}>
                  {base.name} · {activeSection ? activeSection.toUpperCase() : "ALLA RESURSER"}
                </div>
              </div>
              {criticalParts.length > 0 && (
                <span style={{
                  background: "rgba(217,25,46,0.18)", color: RED,
                  border: "1px solid rgba(217,25,46,0.38)",
                  borderRadius: 12, fontSize: 8, fontFamily: "monospace", fontWeight: 700, padding: "2px 7px",
                }}>
                  ⚠ {criticalParts.length} KRITISK
                </span>
              )}
            </div>

            {/* Donut gauges — always visible */}
            <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid rgba(215,222,225,0.05)", flexShrink: 0 }}>
              <SectionLabel>RESURSGAUGES</SectionLabel>
              <div style={{ display: "flex", justifyContent: "space-around", paddingTop: 6 }}>
                <DonutGauge pct={fuelPct}      color="#D97706" label="Bränsle"    sub={`~${etdHours}h`} />
                <DonutGauge pct={ammoPct}      color="#3B82F6" label="Ammunition" sub={`${totalAmmo}/${maxAmmo}`} />
                <DonutGauge pct={personnelPct} color="#22A05A" label="Personal"   sub={`${personnelAvail}/${personnelTotal}`} />
              </div>
            </div>

            {/* ── Fuel ── */}
            <Section id="fuel" active={activeSection === "fuel"}>
              <SectionLabel icon={<Fuel size={9} color="#D97706" />}>BRÄNSLE — DETALJER</SectionLabel>
              <MiniBar label="Nivå" pct={fuelPct} color={fuelPct < 30 ? RED : "#D97706"}
                count={`${fuelLiters.toLocaleString("sv-SE")} L`} />
              <Row label="Förbrukning"  value={`${fuelRate} %/h`} />
              <Row label="Tom om"       value={`~${etdHours}h  (${etdTime})`} critical={etdHours < 12} />
            <SectionFeed category="fuel" items={feedItems} />
            </Section>

            {/* ── Ammo ── */}
            <Section id="ammo" active={activeSection === "ammo"}>
              <SectionLabel icon={<Zap size={9} color="#3B82F6" />}>VAPEN / LAST</SectionLabel>
              {base.ammunition.map(a => {
                const p = Math.round((a.quantity / a.max) * 100);
                return (
                  <MiniBar key={a.type} label={a.type} pct={p}
                    color={p < 30 ? RED : p < 60 ? "#D97706" : "#3B82F6"}
                    count={`${a.quantity}/${a.max}`} />
                );
              })}
            <SectionFeed category="ammo" items={feedItems} />
            </Section>

            {/* ── Spare parts + Maintenance bays ── */}
            <Section id="parts" active={activeSection === "parts"}>
              {criticalParts.length > 0 && (
                <>
                  <SectionLabel icon={<AlertTriangle size={9} color={RED} />} accent={RED}>
                    KRITISKA RESERVDELAR
                  </SectionLabel>
                  {criticalParts.map(p => {
                    const pct = Math.round((p.quantity / p.maxQuantity) * 100);
                    return <MiniBar key={p.id} label={p.name} pct={pct} color={RED} count={`${p.quantity}/${p.maxQuantity}`} />;
                  })}
                  {secondaryParts.length > 0 && <div style={{ height: 1, background: "rgba(215,222,225,0.07)", margin: "8px 0" }} />}
                </>
              )}
              {secondaryParts.length > 0 && (
                <>
                  <SectionLabel icon={<Package size={9} color="rgba(215,222,225,0.5)" />}>SEKUNDÄRA RESERVDELAR</SectionLabel>
                  {secondaryParts.map(p => {
                    const pct = Math.round((p.quantity / p.maxQuantity) * 100);
                    return <MiniBar key={p.id} label={p.name} pct={pct}
                      color={pct > 60 ? "#22A05A" : "#D97706"} count={`${p.quantity}/${p.maxQuantity}`} />;
                  })}
                </>
              )}
              <div style={{ height: 1, background: "rgba(215,222,225,0.07)", margin: "8px 0" }} />
              <SectionLabel icon={<Wrench size={9} color="#D97706" />}>UH-PLATSER</SectionLabel>
              <MiniBar
                label="Lediga"
                pct={Math.round(((base.maintenanceBays.total - base.maintenanceBays.occupied) / base.maintenanceBays.total) * 100)}
                color="#22A05A"
                count={`${base.maintenanceBays.total - base.maintenanceBays.occupied}/${base.maintenanceBays.total}`}
              />
            <SectionFeed category="parts" items={feedItems} />
            </Section>

            {/* ── Personnel ── */}
            <Section id="personnel" active={activeSection === "personnel"}>
              <SectionLabel icon={<Users size={9} color="#22A05A" />}>PERSONAL</SectionLabel>
              {base.personnel.map(p => {
                const pct = Math.round((p.available / p.total) * 100);
                return <MiniBar key={p.id} label={p.role} pct={pct}
                  color={pct < 50 ? RED : "#22A05A"} count={`${p.available}/${p.total}`} />;
              })}
              <div style={{ height: 1, background: "rgba(215,222,225,0.07)", margin: "8px 0" }} />
              <SectionLabel>TEAM-STATUS</SectionLabel>
              {TEAM_STATUS.map(t => (
                <div key={t.team} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                    background: t.status === "ready" ? "#22A05A" : t.status === "rest" ? "rgba(215,222,225,0.2)" : "#D97706",
                  }} />
                  <span style={{ color: SILVER, fontSize: 9, fontFamily: "monospace", fontWeight: 600, width: 76, flexShrink: 0 }}>
                    {t.team}
                  </span>
                  <span style={{ color: "rgba(215,222,225,0.42)", fontSize: 9, fontFamily: "monospace", flex: 1 }}>
                    {t.task}
                  </span>
                </div>
              ))}
            <SectionFeed category="personnel" items={feedItems} />
            </Section>

            {/* ── Full intelligence feed ── */}
            <Section id="feed" active={activeSection === "feed"}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                <SectionLabel icon={<Radio size={9} color="rgba(215,222,225,0.5)" />}>
                  BASE INTELLIGENCE FEED
                </SectionLabel>
                <span style={{
                  background: "rgba(217,25,46,0.2)", color: RED, borderRadius: 8,
                  padding: "1px 5px", fontSize: 7, fontFamily: "monospace", fontWeight: 700,
                  border: "1px solid rgba(217,25,46,0.35)", marginLeft: 4, marginBottom: 8,
                }}>LIVE</span>
              </div>
              {feedItems.map(item => <IntelBubble key={item.id} item={item} />)}
            </Section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ICON STRIP ──────────────────────────────────────────────────────── */}
      <div style={{
        width: stripW, flexShrink: 0,
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: 10, paddingBottom: 16, gap: 5,
      }}>
        <button
          onClick={() => { if (expanded) { setExpanded(false); setActiveSection(null); } else setExpanded(true); }}
          style={{
            width: 34, height: 34, borderRadius: 8,
            background: expanded ? "rgba(217,25,46,0.18)" : "rgba(215,222,225,0.06)",
            border: `1px solid ${expanded ? "rgba(217,25,46,0.4)" : "rgba(215,222,225,0.09)"}`,
            color: SILVER, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 6, flexShrink: 0,
          }}
        >
          {expanded ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <StripButton icon={Fuel}    label={`${fuelPct}%`}      critical={fuelPct < 30}       active={activeSection === "fuel"}      onClick={() => handleStrip("fuel")} />
        <StripButton icon={Zap}     label={`${ammoPct}%`}      critical={ammoPct < 30}        active={activeSection === "ammo"}      onClick={() => handleStrip("ammo")} />
        <StripButton icon={Package} label="DELAR"              critical={criticalParts.length > 0} active={activeSection === "parts"} badge={criticalParts.length || undefined} onClick={() => handleStrip("parts")} />
        <StripButton icon={Users}   label={`${personnelAvail}`} critical={personnelPct < 50}  active={activeSection === "personnel"} onClick={() => handleStrip("personnel")} />
        <StripButton icon={Radio}   label="FEED"               critical={false}               active={activeSection === "feed"}      badge={criticalIntel || undefined} onClick={() => handleStrip("feed")} />

        <div style={{
          marginTop: "auto",
          color: "rgba(215,222,225,0.18)",
          fontSize: 7, fontFamily: "monospace", letterSpacing: "0.18em",
          writingMode: "vertical-rl", textTransform: "uppercase", userSelect: "none",
        }}>
          INTEL
        </div>
      </div>
    </motion.div>
  );
}
