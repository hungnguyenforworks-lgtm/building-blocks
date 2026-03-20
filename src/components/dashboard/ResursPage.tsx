import { Base, ScenarioPhase, GameEvent } from "@/types/game";
import { motion } from "framer-motion";
import {
  Fuel, Zap, Package, Users, Wrench,
  AlertTriangle, Info, CheckCircle2, Radio,
} from "lucide-react";
import { buildIntelFeed, type IntelFeedItem } from "./IntelligenceSidebar";

// ─── SAAB palette (light-mode) ─────────────────────────────────────────────────
const NAVY   = "#0C234C";
const RED    = "#D9192E";

interface Props {
  base: Base;
  phase: ScenarioPhase;
  events: GameEvent[];
}

// ─── Animated donut gauge (light bg version) ───────────────────────────────────
function DonutGauge({ pct, color, label, sub }: { pct: number; color: string; label: string; sub?: string }) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const filled = (Math.min(100, Math.max(0, pct)) / 100) * circ;
  const isLow = pct < 30;
  const stroke = isLow ? RED : color;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={82} height={82} viewBox="0 0 82 82">
        <circle cx={41} cy={41} r={r} fill="none" stroke="hsl(216 18% 92%)" strokeWidth={9} />
        <motion.circle
          cx={41} cy={41} r={r} fill="none"
          stroke={stroke} strokeWidth={9} strokeLinecap="round"
          transform="rotate(-90 41 41)"
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${filled} ${circ}` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        <text x={41} y={38} textAnchor="middle" fontSize="14" fontFamily="monospace" fontWeight="700"
          fill={isLow ? RED : NAVY}>{pct}%</text>
        {sub && (
          <text x={41} y={52} textAnchor="middle" fontSize="8" fontFamily="monospace"
            fill="hsl(218 15% 55%)">{sub}</text>
        )}
      </svg>
      <span style={{
        color: "hsl(220 63% 18%)", fontSize: 9, fontFamily: "monospace",
        fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
      }}>
        {label}
      </span>
    </div>
  );
}

// ─── Bar row with count + pct ──────────────────────────────────────────────────
function ResourceBar({ label, pct, color, count }: { label: string; pct: number; color: string; count?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <span style={{
        color: "hsl(218 15% 40%)", fontSize: 10, fontFamily: "monospace",
        width: 130, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}
        title={label}>
        {label}
      </span>
      <div style={{
        flex: 1, height: 7, background: "hsl(216 18% 91%)",
        borderRadius: 4, overflow: "hidden", position: "relative",
      }}>
        <motion.div
          style={{ height: "100%", background: color, borderRadius: 4 }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.65, ease: "easeOut" }}
        />
        {[25, 50, 75].map(t => (
          <div key={t} style={{
            position: "absolute", top: 0, bottom: 0, width: 1,
            left: `${t}%`, background: "rgba(255,255,255,0.7)",
          }} />
        ))}
      </div>
      {/* count + pct in a fixed-width right block */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0, minWidth: 90 }}>
        {count && (
          <span style={{
            color: "hsl(220 63% 18%)", fontSize: 10, fontFamily: "monospace",
            fontWeight: 700, minWidth: 44, textAlign: "right",
          }}>
            {count}
          </span>
        )}
        <span style={{
          color: "hsl(218 15% 52%)", fontSize: 9, fontFamily: "monospace",
          minWidth: 30, textAlign: "right",
        }}>
          {pct}%
        </span>
      </div>
    </div>
  );
}

// ─── Small intel bubbles for feed cards ───────────────────────────────────────
const FEED_CFG = {
  critical: { bg: "hsl(353 74% 47% / 0.07)", border: "hsl(353 74% 47% / 0.25)", icon: AlertTriangle, nameColor: RED        },
  warning:  { bg: "hsl(42 64% 53% / 0.07)",  border: "hsl(42 64% 53% / 0.28)",  icon: AlertTriangle, nameColor: "#C07A00"  },
  success:  { bg: "hsl(152 60% 32% / 0.07)", border: "hsl(152 60% 32% / 0.25)", icon: CheckCircle2,  nameColor: "#15803d"  },
  info:     { bg: "hsl(220 63% 38% / 0.06)", border: "hsl(220 63% 38% / 0.2)",  icon: Info,          nameColor: "#1d4ed8"  },
};

function FeedBubble({ item }: { item: IntelFeedItem }) {
  const cfg = FEED_CFG[item.type as keyof typeof FEED_CFG];
  const Icon = cfg.icon;
  return (
    <div style={{
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: 8, padding: "7px 10px", marginBottom: 5,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
        <Icon size={10} color={cfg.nameColor} />
        <span style={{ color: cfg.nameColor, fontSize: 9, fontFamily: "monospace", fontWeight: 700, textTransform: "uppercase" }}>
          {item.source}
        </span>
        <span style={{ color: "hsl(218 15% 65%)", fontSize: 8, fontFamily: "monospace", marginLeft: "auto" }}>
          {item.time}
        </span>
      </div>
      <p style={{ color: "hsl(220 63% 18%)", fontSize: 10, fontFamily: "monospace", margin: 0, lineHeight: 1.4, opacity: 0.85 }}>
        {item.msg}
      </p>
    </div>
  );
}

// ─── Resource card ────────────────────────────────────────────────────────────
function ResCard({
  icon: Icon, title, accent, feedCategory, critical, children,
  feedItems,
}: {
  icon: React.ElementType; title: string; accent: string;
  feedCategory: "fuel" | "ammo" | "parts" | "personnel";
  critical?: boolean;
  children: React.ReactNode;
  feedItems: IntelFeedItem[];
}) {
  const filtered = feedItems.filter(f => f.category === feedCategory);
  const criticalFeed = filtered.filter(f => f.type === "critical" || f.type === "warning").length;
  return (
    <div style={{
      background: "hsl(0 0% 100%)",
      border: `1px solid ${critical ? "hsl(353 74% 47% / 0.3)" : "hsl(215 14% 86%)"}`,
      borderRadius: 12, overflow: "hidden",
      boxShadow: critical
        ? "0 0 0 1px hsl(353 74% 47% / 0.08), 0 2px 8px hsl(353 74% 47% / 0.06)"
        : "0 1px 3px hsl(220 63% 18% / 0.06)",
      display: "flex", flexDirection: "column",
    }}>
      {/* Card header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px",
        borderBottom: `1px solid ${critical ? "hsl(353 74% 47% / 0.15)" : "hsl(215 14% 90%)"}`,
        background: critical
          ? "linear-gradient(90deg, hsl(353 74% 47% / 0.05), transparent)"
          : "linear-gradient(90deg, hsl(220 63% 18% / 0.03), transparent)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Icon size={13} color={accent} />
          <span style={{
            color: "hsl(220 63% 18%)", fontSize: 10, fontFamily: "monospace",
            fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.10em",
          }}>
            {title}
          </span>
        </div>
        {criticalFeed > 0 && (
          <span style={{
            background: "hsl(353 74% 47% / 0.10)", color: RED,
            border: "1px solid hsl(353 74% 47% / 0.3)",
            borderRadius: 10, fontSize: 8, fontFamily: "monospace",
            fontWeight: 700, padding: "1px 6px", display: "flex", alignItems: "center", gap: 3,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: RED, display: "inline-block" }} />
            {criticalFeed} VARNING
          </span>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ flex: 1 }}>{children}</div>

        {/* Filtered feed */}
        {filtered.length > 0 && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid hsl(215 14% 90%)" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 5, marginBottom: 7,
              color: "hsl(218 15% 55%)", fontSize: 8, fontFamily: "monospace",
              letterSpacing: "0.09em", textTransform: "uppercase",
            }}>
              <Radio size={9} color="hsl(218 15% 55%)" />
              HÄNDELSEFEED
              <span style={{
                background: "hsl(220 63% 18% / 0.07)", color: "hsl(220 63% 38%)",
                borderRadius: 8, padding: "1px 5px",
                fontSize: 7, fontFamily: "monospace", fontWeight: 700,
                border: "1px solid hsl(220 63% 38% / 0.2)",
              }}>
                {filtered.length}
              </span>
            </div>
            {filtered.map(item => <FeedBubble key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function ResursPage({ base, phase, events }: Props) {
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

  const freeColor = (pct: number) => pct < 30 ? RED : pct < 60 ? "#D97706" : "#22A05A";
  const feedItems = buildIntelFeed(base, events);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Top: gauges strip ── */}
      <div style={{
        background: "hsl(0 0% 100%)",
        border: "1px solid hsl(215 14% 86%)",
        borderRadius: 12,
        padding: "16px 24px",
        boxShadow: "0 1px 3px hsl(220 63% 18% / 0.06)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 14,
        }}>
          <span style={{
            color: "hsl(220 63% 18%)", fontSize: 10, fontFamily: "monospace",
            fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em",
          }}>
            RESURSSTATUS — {base.name}
          </span>
          <span style={{
            background: "hsl(220 63% 18% / 0.06)", color: "hsl(220 63% 38%)",
            border: "1px solid hsl(220 63% 38% / 0.2)",
            borderRadius: 8, fontSize: 8, fontFamily: "monospace", padding: "2px 8px",
          }}>
            {criticalParts.length > 0 ? `⚠ ${criticalParts.length} KRITISKA RESERVDELAR` : "✓ NOMINELL RESURSNIVÅ"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
          <DonutGauge pct={fuelPct}      color="#D97706" label="Bränsle"    sub={`~${etdHours}h kvar`} />
          <div style={{ width: 1, height: 80, background: "hsl(215 14% 88%)" }} />
          <DonutGauge pct={ammoPct}      color="#3B82F6" label="Ammunition" sub={`${totalAmmo}/${maxAmmo}`} />
          <div style={{ width: 1, height: 80, background: "hsl(215 14% 88%)" }} />
          <DonutGauge pct={personnelPct} color="#22A05A" label="Personal"   sub={`${personnelAvail}/${personnelTotal}`} />
          <div style={{ width: 1, height: 80, background: "hsl(215 14% 88%)" }} />
          <DonutGauge
            pct={Math.round(((base.maintenanceBays.total - base.maintenanceBays.occupied) / base.maintenanceBays.total) * 100)}
            color="#7C3AED" label="UH-Platser"
            sub={`${base.maintenanceBays.total - base.maintenanceBays.occupied}/${base.maintenanceBays.total}`}
          />
        </div>
      </div>

      {/* ── 2×2 resource cards grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Fuel card */}
        <ResCard icon={Fuel} title="Bränsle" accent="#D97706" feedCategory="fuel" critical={fuelPct < 30} feedItems={feedItems}>
          <ResourceBar label="Nivå" pct={fuelPct}
            color={freeColor(fuelPct)} count={`${fuelLiters.toLocaleString("sv-SE")} L`} />
          <div style={{ display: "flex", gap: 16, marginTop: 4, flexWrap: "wrap" }}>
            <Stat label="Förbrukning" value={`${fuelRate} %/h`} />
            <Stat label="Tom om" value={`~${etdHours}h (${etdTime})`} critical={etdHours < 12} />
          </div>
        </ResCard>

        {/* Ammo card */}
        <ResCard icon={Zap} title="Vapen / Last" accent="#3B82F6" feedCategory="ammo" feedItems={feedItems}
          critical={base.ammunition.some(a => a.quantity / a.max < 0.30)}>
          {base.ammunition.map(a => {
            const p = Math.round((a.quantity / a.max) * 100);
            return <ResourceBar key={a.type} label={a.type} pct={p}
              color={freeColor(p)} count={`${a.quantity}/${a.max}`} />;
          })}
        </ResCard>

        {/* Parts card */}
        <ResCard icon={Package} title="Reservdelar" accent={criticalParts.length > 0 ? RED : "#0C234C"}
          feedCategory="parts" critical={criticalParts.length > 0} feedItems={feedItems}>
          {criticalParts.length > 0 && (
            <>
              <div style={{
                display: "flex", alignItems: "center", gap: 5, marginBottom: 7,
                color: RED, fontSize: 9, fontFamily: "monospace",
                fontWeight: 700, textTransform: "uppercase",
              }}>
                <AlertTriangle size={9} color={RED} />
                KRITISKA — GROUNDER PLAN
              </div>
              {criticalParts.map(p => {
                const pct = Math.round((p.quantity / p.maxQuantity) * 100);
                return <ResourceBar key={p.id} label={p.name} pct={pct}
                  color={RED} count={`${p.quantity}/${p.maxQuantity}`} />;
              })}
              {secondaryParts.length > 0 && <div style={{ height: 1, background: "hsl(215 14% 90%)", margin: "10px 0" }} />}
            </>
          )}
          {secondaryParts.length > 0 && (
            <>
              <div style={{
                color: "hsl(218 15% 55%)", fontSize: 9, fontFamily: "monospace",
                textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7,
              }}>
                Sekundära
              </div>
              {secondaryParts.map(p => {
                const pct = Math.round((p.quantity / p.maxQuantity) * 100);
                return <ResourceBar key={p.id} label={p.name} pct={pct}
                  color={freeColor(pct)} count={`${p.quantity}/${p.maxQuantity}`} />;
              })}
            </>
          )}
          {/* Maintenance bays */}
          <div style={{ height: 1, background: "hsl(215 14% 90%)", margin: "10px 0" }} />
          <div style={{
            display: "flex", alignItems: "center", gap: 5, marginBottom: 7,
            color: "hsl(218 15% 55%)", fontSize: 9, fontFamily: "monospace",
            textTransform: "uppercase",
          }}>
            <Wrench size={9} color="#D97706" />
            UH-Platser
          </div>
          <ResourceBar
            label="Lediga"
            pct={Math.round(((base.maintenanceBays.total - base.maintenanceBays.occupied) / base.maintenanceBays.total) * 100)}
            color="#22A05A"
            count={`${base.maintenanceBays.total - base.maintenanceBays.occupied}/${base.maintenanceBays.total}`}
          />
        </ResCard>

        {/* Personnel card */}
        <ResCard icon={Users} title="Personal" accent="#22A05A" feedCategory="personnel"
          critical={personnelPct < 50} feedItems={feedItems}>
          {base.personnel.map(p => {
            const pct = Math.round((p.available / p.total) * 100);
            return <ResourceBar key={p.id} label={p.role} pct={pct}
              color={pct < 50 ? RED : "#22A05A"} count={`${p.available}/${p.total}`} />;
          })}
          <div style={{ height: 1, background: "hsl(215 14% 90%)", margin: "10px 0" }} />
          <div style={{
            color: "hsl(218 15% 55%)", fontSize: 9, fontFamily: "monospace",
            textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7,
          }}>
            Team-status
          </div>
          {[
            { team: "Team Alpha", task: "Arbetar med GE01",  status: "busy"  },
            { team: "Team Beta",  task: "Viloperiod",          status: "rest"  },
            { team: "Team Gamma", task: "GE05 pre-flight",     status: "busy"  },
            { team: "Team Delta", task: "Tillgänglig",          status: "ready" },
          ].map(t => (
            <div key={t.team} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                background: t.status === "ready" ? "#22A05A" : t.status === "rest" ? "hsl(215 14% 80%)" : "#D97706",
              }} />
              <span style={{ color: "hsl(220 63% 18%)", fontSize: 9, fontFamily: "monospace", fontWeight: 600, width: 80, flexShrink: 0 }}>
                {t.team}
              </span>
              <span style={{ color: "hsl(218 15% 50%)", fontSize: 9, fontFamily: "monospace" }}>
                {t.task}
              </span>
            </div>
          ))}
        </ResCard>
      </div>
    </div>
  );
}

// ─── Inline stat pill ─────────────────────────────────────────────────────────
function Stat({ label, value, critical }: { label: string; value: string; critical?: boolean }) {
  return (
    <div style={{
      background: critical ? "hsl(353 74% 47% / 0.07)" : "hsl(216 18% 96%)",
      border: `1px solid ${critical ? "hsl(353 74% 47% / 0.2)" : "hsl(215 14% 89%)"}`,
      borderRadius: 6, padding: "4px 8px",
    }}>
      <div style={{ color: "hsl(218 15% 55%)", fontSize: 8, fontFamily: "monospace" }}>{label}</div>
      <div style={{ color: critical ? RED : "hsl(220 63% 18%)", fontSize: 10, fontFamily: "monospace", fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
}
