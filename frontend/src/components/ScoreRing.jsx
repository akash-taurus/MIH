export function ScoreRing({ score, size = 52, strokeWidth = 4 }) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  
  // Use Digital Curator palette
  const color = score >= 80 ? "var(--secondary)" : score >= 60 ? "var(--primary-raw)" : "var(--amber)";
  const trackColor = "var(--surface-container-high)";

  return (
    <div className="score-ring-wrap" style={{ width: size, height: size, flexShrink: 0 }}>
      {/* Background glow for high scores */}
      {score >= 80 && (
        <div style={{
          position: "absolute", inset: strokeWidth, borderRadius: "50%",
          boxShadow: `0 0 12px ${color}`, opacity: 0.15,
        }} />
      )}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)", position: "absolute" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <span className="text-data" style={{ 
        fontSize: size < 60 ? 14 : 22, 
        color: "var(--ink)", 
        position: "relative", zIndex: 1,
        letterSpacing: "-.02em" 
      }}>{score}</span>
    </div>
  );
}
