import { fmtNum, fmtINR } from "../utils/format";
import { platformColors } from "../utils/data";
import { DotBar } from "./DotBar";
import { SignalDot } from "./SignalDot";

export function CreatorRow({ c, rank, onSelect, isSelected }) {
  const maxReach = 200000;

  return (
    <div className="row-card" onClick={() => onSelect(c)} style={{
      display: "grid",
      gridTemplateColumns: "36px 1fr 64px 90px 80px 72px 160px",
      alignItems: "center",
      gap: 0,
      padding: "16px 24px",
      minHeight: 76,
      background: isSelected ? "var(--surface-container)" : "transparent",
      position: "relative"
    }}>
      {/* Active Selection Indicator */}
      {isSelected && (
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
          background: "var(--primary-raw)", borderRadius: "0 4px 4px 0"
        }} />
      )}

      <span className="text-data" style={{ fontSize: 13, color: "var(--ink3)" }}>
        {rank < 10 ? `0${rank}` : rank}
      </span>

      {/* Creator identity */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, overflow: "hidden" }}>
        <div style={{ 
          width: 36, height: 36, borderRadius: "50%", 
          border: "1px solid var(--ghost-border-visible)", 
          background: "var(--surface-container-high)", 
          display: "flex", alignItems: "center", justifyContent: "center", 
          fontSize: 14, fontWeight: 700, fontFamily: "var(--font-display)",
          color: "var(--ink)", flexShrink: 0, overflow: "hidden" 
        }}>
          {c.avatar 
            ? <img src={c.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span>{c.handle[1].toUpperCase()}</span>
          }
        </div>
        <div style={{ overflow: "hidden" }}>
          <div style={{ 
            fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, 
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            letterSpacing: "-.01em", color: "var(--ink)"
          }}>{c.handle}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <span className="platform-dot" style={{ background: platformColors[c.platform] }} />
            <span className="text-label" style={{ fontSize: 9 }}>{c.platform}</span>
            <span style={{ fontSize: 10, color: "var(--outline)" }}>/</span>
            <span className="text-label" style={{ fontSize: 9 }}>{c.niche}</span>
          </div>
        </div>
      </div>

      {/* Auth Score */}
      <SignalDot value={c.score} thresholds={[80, 60]} label="System check" size={8} />

      {/* Followers */}
      <div>
        <div className="text-data" style={{ fontSize: 14, color: "var(--ink)", marginBottom: 2 }}>{fmtNum(c.followers)}</div>
        <div className="text-label" style={{ fontSize: 9 }}>Followers</div>
      </div>

      {/* Reach → dot bar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }} title={`Est. reach: ${fmtNum(c.reach)}`}>
        <DotBar value={c.reach} max={maxReach} count={6} color="var(--primary-raw)" size={6} gap={3} />
        <span className="text-label" style={{ fontSize: 9 }}>Reach</span>
      </div>

      {/* Engagement */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <SignalDot value={c.eng} thresholds={[5, 3]} label="" size={8} />
        <span className="text-label" style={{ fontSize: 9 }}>Eng.</span>
      </div>

      {/* Price */}
      <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
        <div className="text-data" style={{ fontSize: 14, color: "var(--ink)", marginBottom: 2 }}>{fmtINR(c.priceMin)}–{fmtINR(c.priceMax)}</div>
        <div className="text-label" style={{ fontSize: 9 }}>Avg / Reel</div>
      </div>
    </div>
  );
}
