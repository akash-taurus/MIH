export function DotBar({ value, max, count = 5, color = "var(--primary-raw)", size = 6, gap = 4 }) {
  const filled = Math.round((value / max) * count);
  return (
    <div style={{ display: "flex", alignItems: "center", gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} style={{
          width: size, height: size,
          borderRadius: 2, // Slight curve, mostly square matching Influro
          flexShrink: 0,
          background: i < filled ? color : "var(--surface-container-high)",
          transition: "background .25s var(--ease-out)",
        }} />
      ))}
    </div>
  );
}
