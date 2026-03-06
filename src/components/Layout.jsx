import P from "../constants/palette";
import { NAV } from "../constants/ocr";
import { clearSession } from "../utils/storage";

export default function Layout({ page, setPage, user, onSignOut, pendingCount, children }) {

  const handleSignOut = () => { clearSession(); onSignOut(); };

  return (
    <div className="app-layout">
      {/* ── Desktop Sidebar ──────────────────────────────────── */}
      <aside
        className="sidebar"
        style={{ background: P.green, display: "flex", flexDirection: "column", boxShadow: "4px 0 24px rgba(0,0,0,.14)" }}
      >
        {/* Logo */}
        <div style={{ padding: "24px 20px 18px", borderBottom: "1px solid rgba(255,255,255,.12)" }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, color: "#fff", fontWeight: 700 }}>🥛 DairyLedger</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,.45)", marginTop: 3, letterSpacing: ".08em", textTransform: "uppercase" }}>OCR Receipt Platform</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 10px" }}>
          {NAV.map((n) => {
            // Hide Admin nav item from non-admin/non-reviewer users
            if (n.key === "admin" && user.role === "uploader") return null;
            const active = page === n.key || (page === "correction" && n.key === "queue");
            return (
              <button
                key={n.key}
                onClick={() => setPage(n.key)}
                style={{
                  width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: 8, border: "none",
                  background: active ? "rgba(255,255,255,.15)" : "transparent",
                  color: active ? "#fff" : "rgba(255,255,255,.6)",
                  fontFamily: "'Source Sans 3',sans-serif", fontSize: 14, fontWeight: active ? 600 : 400,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 10, marginBottom: 2, transition: "all .2s",
                }}
              >
                <span style={{ fontSize: 16 }}>{n.icon}</span>
                {n.label}
                {n.key === "queue" && pendingCount > 0 && (
                  <span style={{ marginLeft: "auto", background: P.amber, color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,.12)" }}>
          <div style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{user.name}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginBottom: 8 }}>
            {user.role}&nbsp;·&nbsp;
            <span style={{ fontFamily: "'IBM Plex Mono',monospace" }}>{user.code}</span>
          </div>
          <button onClick={handleSignOut} style={{ fontSize: 12, color: "rgba(255,255,255,.45)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            Sign out →
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="main-content">
        {children}
      </main>

      {/* ── Mobile bottom nav ────────────────────────────────── */}
      <nav className="mobile-nav">
        <div className="mobile-nav-inner">
          {NAV.map((n) => {
            if (n.key === "admin" && user.role === "uploader") return null;
            const active = page === n.key || (page === "correction" && n.key === "queue");
            return (
              <button key={n.key} className={`mobile-nav-btn${active ? " active" : ""}`} onClick={() => setPage(n.key)}>
                {n.key === "queue" && pendingCount > 0 && <span className="mobile-nav-badge">{pendingCount}</span>}
                <span className="mobile-nav-icon">{n.icon}</span>
                {n.label.split(" ")[0]}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
