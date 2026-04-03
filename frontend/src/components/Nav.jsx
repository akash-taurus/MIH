export function Nav({ page, setPage, role, setRole }) {
  const brandLinks = [
    ["discover", "Creators"],
    ["campaigns", "Campaigns"],
    ["analyze", "Analytics"],
  ];
  const creatorLinks = [["creator-dash", "Dashboard"]];
  const links = role === "brand" ? brandLinks : creatorLinks;

  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
      background: "rgba(14,14,14,0.82)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      borderBottom: "1px solid var(--ghost-border)",
      display: "flex", alignItems: "center", gap: 0,
      height: 56, paddingRight: 20,
    }}>
      {/* Brand */}
      <div
        onClick={() => setPage(role === "creator" ? "creator-dash" : "discover")}
        style={{
          display: "flex", alignItems: "center", gap: 0, cursor: "pointer",
          padding: "0 24px", height: "100%",
        }}
      >
        <span style={{
          fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800,
          letterSpacing: "-.02em", color: "var(--ink)",
        }}>Influro</span>
      </div>

      {/* Nav Links */}
      <div style={{ display: "flex", alignItems: "center", height: "100%", flex: 1, gap: 4, paddingLeft: 8 }}>
        {links.map(([p, label]) => (
          <button key={p} onClick={() => setPage(p)} style={{
            background: "transparent",
            border: "none",
            borderBottom: page === p ? "2px solid var(--primary-raw)" : "2px solid transparent",
            color: page === p ? "var(--primary)" : "var(--ink2)",
            fontWeight: page === p ? 600 : 400,
            fontSize: 13,
            padding: "0 16px",
            height: "100%",
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            transition: "color .2s var(--ease-out)",
            marginBottom: "-1px",
            letterSpacing: ".02em",
          }}>{label}</button>
        ))}
      </div>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Notification bell */}
        <button style={{
          background: "transparent", border: "none", cursor: "pointer",
          color: "var(--ink2)", padding: 4, display: "flex", transition: "color .15s",
        }}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>

        {/* User avatar / Sign out */}
        <button
          onClick={() => { setPage("auth"); setRole(null); }}
          style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "linear-gradient(135deg, var(--primary-raw), var(--primary-container))",
            border: "none", cursor: "pointer",
            color: "#fff", fontSize: 12, fontWeight: 700,
            fontFamily: "var(--font-body)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "box-shadow .2s",
          }}
          title="Sign out"
        >V</button>
      </div>
    </header>
  );
}
