import P from "../../constants/palette";

/* ── Button ──────────────────────────────────────────────────── */
export const Btn = ({
  onClick, children, variant = "primary", size = "md",
  disabled, loading, style = {}, type = "button",
}) => {
  const sizes   = { sm: { padding: "6px 14px", fontSize: 13 }, md: { padding: "9px 20px", fontSize: 14 }, lg: { padding: "12px 28px", fontSize: 15 } };
  const variants = {
    primary:   { background: P.green,       color: "#fff" },
    secondary: { background: P.white,       color: P.text,  border: `1.5px solid ${P.border}` },
    danger:    { background: P.red,         color: "#fff" },
    ghost:     { background: "transparent", color: P.green },
    amber:     { background: P.amber,       color: "#fff" },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        cursor: disabled || loading ? "not-allowed" : "pointer",
        fontFamily: "'Source Sans 3',sans-serif",
        fontWeight: 600,
        border: "none",
        borderRadius: 8,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        transition: "all .2s",
        opacity: disabled || loading ? 0.6 : 1,
        ...sizes[size],
        ...variants[variant],
        ...style,
      }}
    >
      {loading && (
        <span className="spin" style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.35)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", flexShrink: 0 }} />
      )}
      {children}
    </button>
  );
};

/* ── Badge ───────────────────────────────────────────────────── */
export const Badge = ({ children, color = P.green, bg = P.greenLight }) => (
  <span style={{ background: bg, color, padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
    {children}
  </span>
);

/* ── Card ────────────────────────────────────────────────────── */
export const Card = ({ children, style = {}, className = "" }) => (
  <div
    className={`fade-in ${className}`}
    style={{ background: P.bgCard, borderRadius: 12, border: `1px solid ${P.border}`, padding: 24, ...style }}
  >
    {children}
  </div>
);

/* ── FieldLabel ──────────────────────────────────────────────── */
export const FieldLabel = ({ children }) => (
  <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: P.muted, display: "block", marginBottom: 4 }}>
    {children}
  </label>
);

/* ── Input ───────────────────────────────────────────────────── */
export const Input = ({ value, onChange, placeholder, type = "text", style = {}, autoComplete }) => (
  <input
    value={value ?? ""}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    type={type}
    autoComplete={autoComplete}
    style={{ width: "100%", padding: "8px 12px", border: `1.5px solid ${P.border}`, borderRadius: 7, fontSize: 14, background: P.white, color: P.text, ...style }}
    onFocus={(e) => (e.target.style.borderColor = P.green)}
    onBlur={(e)  => (e.target.style.borderColor = style.borderColor ?? P.border)}
  />
);

/* ── Mono ────────────────────────────────────────────────────── */
export const Mono = ({ children, style = {} }) => (
  <span style={{ fontFamily: "'IBM Plex Mono',monospace", ...style }}>{children}</span>
);

/* ── KpiCard ─────────────────────────────────────────────────── */
export const KpiCard = ({ label, value, sub, icon, accent = P.green }) => (
  <Card style={{ padding: 20, flex: 1, minWidth: 130 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div style={{ fontSize: 11, color: P.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{label}</div>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 22, fontWeight: 500, color: P.text }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: P.faint, marginTop: 3 }}>{sub}</div>}
      </div>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
        {icon}
      </div>
    </div>
  </Card>
);

/* ── EmptyState ──────────────────────────────────────────────── */
export const EmptyState = ({ icon = "📭", title, sub }) => (
  <div style={{ padding: "48px 20px", textAlign: "center", color: P.faint }}>
    <div style={{ fontSize: 40, marginBottom: 10 }}>{icon}</div>
    <div style={{ fontSize: 15, fontWeight: 600, color: P.muted, marginBottom: 4 }}>{title}</div>
    {sub && <div style={{ fontSize: 13 }}>{sub}</div>}
  </div>
);

/* ── AlertBox ────────────────────────────────────────────────── */
export const AlertBox = ({ type = "amber", children }) => {
  const map = { amber: { bg: P.amberLight, color: P.amber, border: `${P.amber}40` }, red: { bg: P.redLight, color: P.red, border: `${P.red}40` }, green: { bg: P.greenLight, color: P.greenMid, border: `${P.green}30` } };
  const s = map[type] || map.amber;
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: "12px 16px", color: s.color, fontSize: 13 }}>
      {children}
    </div>
  );
};
