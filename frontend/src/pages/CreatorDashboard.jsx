import { ScoreRing } from "../components/ScoreRing";

export function CreatorDashboard() {
  const offers = [];
  const collabs = [];
  const statusColors = { Active: "var(--primary-raw)", Waiting: "var(--amber)", Review: "var(--secondary)" };

  return (
    <div style={{ marginTop: 56, maxWidth: 960, margin: "56px auto 0", padding: "32px 28px 48px" }}>
      {/* ── Hero Header ── */}
      <div className="anim-up" style={{
        background: "var(--surface-container-low)",
        border: "1px solid var(--ghost-border)",
        borderRadius: 16, padding: "28px 32px", marginBottom: 24,
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span className="badge-success">● Elite Creator</span>
            <span style={{ fontSize: 11, color: "var(--ink3)" }}>CRT-2026-28</span>
          </div>
          <h2 style={{
            fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800,
            letterSpacing: "-.03em", lineHeight: 1.15,
          }}>
            Welcome back,<br />
            <span style={{ color: "var(--primary)" }}>Elena Valerius.</span>
          </h2>
        </div>
        <div style={{ display: "flex", gap: 28, textAlign: "right" }}>
          {[["PEAK REACH", "2.4M", "+16.3%"], ["ENGAGEMENT RATE", "8.2%", "+2.1%"]].map(([label, val, delta]) => (
            <div key={label}>
              <div className="text-label" style={{ marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, letterSpacing: "-.02em" }}>{val}</div>
              <div style={{ fontSize: 12, color: "var(--secondary)", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3, marginTop: 2 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14l5-5 5 5z"/></svg>
                {delta}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Audience Resonance + Reputation Shield ── */}
      <div className="anim-up-1" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Chart area */}
        <div className="panel" style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700 }}>Audience Resonance</div>
              <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 3 }}>Content performance across creator verticals</div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {[["BLUE", "REACH"], ["GREEN", "ENGAGEMENT"]].map(([c, l]) => (
                <span key={l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: c === "BLUE" ? "var(--primary-raw)" : "var(--secondary)", display: "inline-block" }} />
                  {l}
                </span>
              ))}
            </div>
          </div>
          {/* Bar chart */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 140, paddingBottom: 4 }}>
            {[65, 78, 85, 72, 90, 68, 82, 88, 75, 92, 70, 80].map((h, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, alignItems: "stretch" }}>
                <div style={{
                  height: `${h * 1.2}px`, background: "var(--primary-raw)",
                  borderRadius: "3px 3px 0 0", transition: "height .6s var(--ease-out)",
                  animation: `barFill .8s ${i * 0.06}s var(--ease-out) both`,
                  opacity: 0.85 + (i % 3) * 0.05,
                }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(m => (
              <span key={m} style={{ fontSize: 9, color: "var(--ink3)", fontWeight: 500, letterSpacing: ".02em" }}>{m}</span>
            ))}
          </div>
        </div>

        {/* Reputation Shield */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="panel" style={{ padding: "18px 20px" }}>
            <div className="text-label" style={{ marginBottom: 14 }}>Reputation Shield</div>
            {[["Brand Safety", "Elite", "var(--secondary)"], ["Collaboration Clone", "Unique", "var(--primary)"]].map(([label, val, color]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: 11, color: "var(--ink3)" }}>{val === "Elite" ? "Tier 1" : "Score: High"}</div>
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color, padding: "3px 8px", borderRadius: 4, background: `${color}10` }}>{val}</span>
              </div>
            ))}
          </div>
          <div className="metric-card">
            <div className="text-label" style={{ marginBottom: 8 }}>Net Potential Reach</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, letterSpacing: "-.02em" }}>18.4M</div>
            <div style={{ fontSize: 12, color: "var(--ink3)", marginBottom: 8 }}>Verified impressions</div>
            <div style={{ height: 4, borderRadius: 2, background: "var(--surface-container-highest)" }}>
              <div style={{ height: "100%", width: "72%", borderRadius: 2, background: "var(--secondary)", animation: "barFill 1s var(--ease-out) both" }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Active Assignments ── */}
      <div className="anim-up-2" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700 }}>Active Assignments</div>
          <span style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600, cursor: "pointer" }}>View full →</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {offers.map((o, i) => (
            <div key={i} className="panel" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{
                height: 100, background: "var(--surface-container)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 36, borderBottom: "1px solid var(--ghost-border)",
              }}>{o.img}</div>
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div>
                    <span className="text-label" style={{ fontSize: 9, color: statusColors[o.status] }}>{o.status.toUpperCase()}</span>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, marginTop: 2 }}>{o.brand}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-display)" }}>{o.budget}</div>
                </div>
                <div style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 10 }}>📐 {o.type} · Due {o.deadline}</div>
                <button className={o.status === "Active" ? "btn-primary" : "btn-secondary"} style={{ width: "100%", padding: "8px 0", fontSize: 12 }}>
                  {o.status === "Active" ? "Create Delivery" : o.status}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Collaboration History ── */}
      <div className="anim-up-3">
        <div className="panel" style={{ padding: "20px 24px" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Collaboration History</div>
          {collabs.map((c, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 0",
              borderBottom: i < collabs.length - 1 ? "1px solid var(--ghost-border)" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 12, color: "var(--ink3)", fontWeight: 500, width: 50 }}>{c.date}</span>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: "var(--surface-container-highest)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, color: "var(--ink2)",
                }}>{c.brand[0]}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.brand}</div>
                  <div style={{ fontSize: 11, color: "var(--ink3)" }}>Campaign Partner</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ display: "flex", gap: 3 }}>
                  {c.platforms.map(p => (
                    <span key={p} style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: p === "IG" ? "#e1306c" : p === "YT" ? "#ff0000" : "#0077b5",
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--secondary)" }}>{c.impact}</span>
                <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink3)", padding: 4 }}>⋮</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
