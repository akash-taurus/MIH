export function SignalDot({ value, thresholds = [75, 50], label, size = 10 }) {
  // Influro signals: Emerald (Elite/High), Blue (Verified/Mid), Amber/Red (Lower)
  const isHigh = value >= thresholds[0];
  const isMid = value >= thresholds[1];
  
  const color = isHigh ? "var(--secondary)" : isMid ? "var(--primary-raw)" : "var(--tertiary)";
  const tier = isHigh ? "strong" : isMid ? "stable" : "risk";
  
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }} title={label ? `${label}: ${value}` : value}>
      <span style={{
        width: size, height: size, borderRadius: "50%", display: "inline-block", flexShrink: 0,
        background: color,
        boxShadow: `0 0 0 3px ${color}22`,
      }} />
      {label && <span className="text-label" style={{ fontSize: 10, color: "var(--ink2)" }}>{tier}</span>}
    </div>
  );
}
