import { useMemo, useState } from "react";
import { fmtNum, fmtINR, calcDeliverablePrices, DELIVERABLES_BY_PLATFORM } from "../utils/format";
import { platformColors } from "../utils/data";
import { DotBar } from "./DotBar";
import { ScoreRing } from "./ScoreRing";

export function CreatorDetail({ c, onClose, onCampaign }) {
  const [pricePlatform, setPricePlatform] = useState(c.platform || "Instagram");
  
  const prices = useMemo(() => calcDeliverablePrices(c.followers, c.score, c.niche), [c.followers, c.score, c.niche]);
  const platPrices = pricePlatform === "YouTube" ? prices.youtube : prices.instagram;

  const barData = [
    { label: "Engagement Rate", val: Math.round(c.eng * 10), color: "var(--primary-raw)" },
    { label: "Comment Quality", val: c.score - 3, color: "var(--primary-raw)" },
    { label: "Follower Growth", val: Math.round(c.score * 0.9), color: "var(--primary-dim)" },
    { label: "Content Freq.", val: Math.round(c.score * 0.85 + 5), color: "var(--outline)" },
    { label: "Profile Health", val: Math.min(100, c.score + 5), color: "var(--secondary)" },
  ];

  return (
    <div className="anim-in glass-panel" style={{
      width: 360, flexShrink: 0,
      borderLeft: "none", borderTop: "none", borderBottom: "none",
      borderRight: "none", borderRadius: 0,
      borderLeftWidth: "1px", borderLeftStyle: "solid", borderLeftColor: "var(--ghost-border)",
      height: "100%",
      overflowY: "auto",
      background: "rgba(14,14,14,0.6)",
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
    }}>
      <div style={{ 
        padding: "20px 24px", 
        borderBottom: "1px solid var(--ghost-border)", 
        display: "flex", alignItems: "center", justifyContent: "space-between", 
        position: "sticky", top: 0, 
        zIndex: 10 
      }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, letterSpacing: ".02em", color: "var(--ink2)", textTransform: "uppercase" }}>Creator Identity</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink2)", fontSize: 16, lineHeight: 1, padding: "4px" }}>✕</button>
      </div>

      <div style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <div style={{ 
            width: 56, height: 56, borderRadius: "50%", 
            border: "1px solid var(--ghost-border-visible)", 
            background: "var(--surface-container)", 
            display: "flex", alignItems: "center", justifyContent: "center", 
            fontSize: 20, fontWeight: 700, fontFamily: "var(--font-display)", 
            color: "var(--ink)", flexShrink: 0 
          }}>
            {c.handle[1].toUpperCase()}
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, letterSpacing: "-.02em" }}>{c.handle}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
              <span className="platform-dot" style={{ background: platformColors[c.platform] }} />
              <span className="text-label" style={{ fontSize: 9 }}>{c.platform}</span>
              <span style={{ fontSize: 10, color: "var(--outline)" }}>/</span>
              <span className="text-label" style={{ fontSize: 9 }}>{c.niche}</span>
            </div>
          </div>
        </div>

        {/* Auth score */}
        <div className="panel" style={{ padding: "20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 20 }}>
          <ScoreRing score={c.score} size={64} strokeWidth={5} />
          <div>
            <div className="text-label" style={{ marginBottom: 6 }}>Authenticity Score</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className={`status-dot ${c.score >= 80 ? 'status-dot--elite' : c.score >= 65 ? 'status-dot--verified' : 'status-dot--risk'}`} />
              <span style={{ fontSize: 12, color: "var(--ink)", fontWeight: 600 }}>{c.trust}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {/* Card: Reach */}
          <div className="metric-card" style={{ padding: "16px" }}>
             <div className="text-label" style={{ marginBottom: 8 }}>Est. Reach</div>
             <DotBar value={c.reach} max={300000} count={6} color="var(--primary-raw)" size={6} gap={4} />
             <div className="text-data" style={{ marginTop: 8, fontSize: 15 }}>{fmtNum(c.reach)}</div>
          </div>
          {/* Card: Engagement */}
          <div className="metric-card" style={{ padding: "16px" }}>
            <div className="text-label" style={{ marginBottom: 12 }}>Engagement</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ 
                width: 10, height: 10, borderRadius: 2, 
                background: c.eng >= 5 ? "var(--secondary)" : c.eng >= 3 ? "var(--primary-raw)" : "var(--tertiary)", 
                flexShrink: 0 
              }} />
              <span className="text-data" style={{ fontSize: 13 }}>{c.eng >= 5 ? "High (A+)" : c.eng >= 3 ? "Stable (B)" : "Risk (C)"}</span>
            </div>
          </div>
          
          <div className="metric-card" style={{ padding: "16px", gridColumn: "1 / -1" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div className="text-label">Price / Deliverable</div>
              <div style={{ display: "flex", gap: 4 }}>
                {["Instagram", "YouTube"].map(p => (
                  <button key={p} onClick={() => setPricePlatform(p)} style={{
                    padding: "4px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600,
                    border: pricePlatform === p ? `1px solid var(--primary-raw)` : "1px solid var(--ghost-border-visible)",
                    background: pricePlatform === p ? `rgba(0,102,255,0.08)` : "transparent",
                    color: pricePlatform === p ? "var(--primary)" : "var(--ink2)",
                    cursor: "pointer", fontFamily: "var(--font-body)",
                    textTransform: "uppercase", letterSpacing: ".02em"
                  }}>{p}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${(DELIVERABLES_BY_PLATFORM[pricePlatform] || []).length}, 1fr)`, gap: 8 }}>
              {(DELIVERABLES_BY_PLATFORM[pricePlatform] || []).map(d => (
                <div key={d} style={{ textAlign: "center", padding: "10px 4px", borderRadius: 8, background: "var(--surface-container-highest)" }}>
                  <div className="text-label" style={{ fontSize: 9, marginBottom: 6 }}>{d}</div>
                  <div className="text-data" style={{ fontSize: 12, color: "var(--ink)" }}>{fmtINR(platPrices[d])}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {c.fake > 15 && (
          <div style={{ 
            border: "1px solid rgba(255,113,98,0.3)", borderRadius: 8, 
            padding: "14px 16px", marginBottom: 24, display: "flex", gap: 12,
            background: "rgba(255,113,98,0.05)"
          }}>
            <span style={{ color: "var(--tertiary)", fontSize: 14, marginTop: 2 }}>⚠</span>
            <p style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.6 }}>
               Anomaly detected: Potential artificial inflation in follower base. Review carefully before extending an offer.
            </p>
          </div>
        )}

        {/* Score breakdown */}
        <div style={{ marginBottom: 32 }}>
          <div className="text-label" style={{ marginBottom: 16 }}>Vector Breakdown</div>
          {barData.map((b, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "var(--ink2)", fontWeight: 500 }}>{b.label}</span>
              </div>
              <div style={{ height: 4, background: "var(--surface-container-highest)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${b.val}%`, background: b.color, borderRadius: 2, animation: "barFill 1s var(--ease-out) both" }} />
              </div>
            </div>
          ))}
        </div>

        <button className="btn-primary" style={{ width: "100%", padding: "14px 0" }} onClick={() => onCampaign(c)}>
          Initiate Draft →
        </button>
      </div>
    </div>
  );
}
