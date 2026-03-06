import { useState } from "react";
import P from "../constants/palette";
import { registerUser, loginUser, saveSession } from "../utils/storage";
import { Btn } from "./ui";

export default function AuthScreen({ onAuth }) {
  const [tab,    setTab]    = useState("login");    // "login" | "register"
  const [name,   setName]   = useState("");
  const [code,   setCode]   = useState("");
  const [error,  setError]  = useState("");
  const [loading,setLoading]= useState(false);

  const reset = (newTab) => { setTab(newTab); setError(""); setName(""); setCode(""); };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const result = tab === "register"
        ? await registerUser(name, code)
        : await loginUser(code);
      if (result.error) { setError(result.error); return; }
      saveSession(result.user);
      onAuth(result.user);
    } catch (e) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") handleSubmit(); };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(145deg, ${P.green} 0%, #0B2E12 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      {/* Decorative circles */}
      <div style={{ position: "fixed", top: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: "rgba(255,255,255,.04)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: -80, left: -80, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,.03)", pointerEvents: "none" }} />

      <div
        className="slide-up"
        style={{ background: P.bgCard, borderRadius: 18, padding: "36px 32px", maxWidth: 420, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,.35)" }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 52, marginBottom: 8, lineHeight: 1 }}>🥛</div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, color: P.green }}>DairyLedger</div>
          <div style={{ fontSize: 13, color: P.muted, marginTop: 3 }}>Milk Receipt OCR Platform</div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: P.bgMuted, borderRadius: 10, padding: 4, marginBottom: 24 }}>
          {["login", "register"].map((t) => (
            <button
              key={t}
              onClick={() => reset(t)}
              style={{
                flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer",
                background: tab === t ? P.white : "transparent",
                color: tab === t ? P.text : P.muted,
                fontFamily: "'Source Sans 3',sans-serif",
                fontSize: 14, fontWeight: tab === t ? 600 : 400,
                boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,.1)" : "none",
                transition: "all .2s",
              }}
            >
              {t === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {tab === "register" && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: P.muted, textTransform: "uppercase", letterSpacing: ".07em", display: "block", marginBottom: 6 }}>
                Full Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                autoComplete="name"
                onKeyDown={handleKey}
                style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${P.border}`, borderRadius: 8, fontSize: 15, background: P.white, color: P.text, outline: "none" }}
                onFocus={(e) => (e.target.style.borderColor = P.green)}
                onBlur={(e)  => (e.target.style.borderColor = P.border)}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: P.muted, textTransform: "uppercase", letterSpacing: ".07em", display: "block", marginBottom: 6 }}>
              {tab === "register" ? "Choose Your Code" : "Your Code"}
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={tab === "register" ? "e.g. SK-07 or RAVI23" : "Enter your code"}
              autoComplete="off"
              onKeyDown={handleKey}
              style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${P.border}`, borderRadius: 8, fontSize: 15, background: P.white, color: P.text, outline: "none", fontFamily: "'IBM Plex Mono',monospace", letterSpacing: ".1em" }}
              onFocus={(e) => (e.target.style.borderColor = P.green)}
              onBlur={(e)  => (e.target.style.borderColor = P.border)}
            />
            {tab === "register" && (
              <p style={{ fontSize: 12, color: P.muted, marginTop: 5 }}>
                This code is your login key — share it with no one. Min. 4 characters.
              </p>
            )}
          </div>

          {error && (
            <div style={{ background: P.redLight, color: P.red, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500 }}>
              ⚠ {error}
            </div>
          )}

          <Btn onClick={handleSubmit} loading={loading} style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: 15, marginTop: 4 }}>
            {loading ? (tab === "register" ? "Creating account…" : "Signing in…") : (tab === "register" ? "Create Account →" : "Sign In →")}
          </Btn>
        </div>

        {/* Admin hint */}
        <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${P.border}`, textAlign: "center" }}>
          <p style={{ fontSize: 11, color: P.faint }}>
            Admin access? Use code&nbsp;
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", background: P.bgMuted, padding: "1px 6px", borderRadius: 4, color: P.muted }}>
              {import.meta.env.VITE_ADMIN_CODE || "ADMIN0000"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
