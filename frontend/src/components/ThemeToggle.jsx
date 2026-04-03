export function ThemeToggle({ theme, setTheme }) {
  return (
    <button
      onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
      className="btn-ghost"
      style={{ padding: "7px 12px", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
      title="Toggle theme"
    >
      {theme === "dark"
        ? <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
        : <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      }
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
