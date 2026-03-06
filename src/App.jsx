import { useState, useEffect, useCallback } from "react";
import P from "./constants/palette";
import {
  seedAdmin,
  getSession,
  saveSession,
  clearSession,
  getReceipts,
  addReceipt,
  updateReceipt,
  refreshSession,
} from "./utils/storage";
import Layout           from "./components/Layout";
import AuthScreen       from "./components/AuthScreen";
import DashboardScreen  from "./components/DashboardScreen";
import UploadScreen     from "./components/UploadScreen";
import QueueScreen      from "./components/QueueScreen";
import CorrectionScreen from "./components/CorrectionScreen";
import AdminScreen      from "./components/AdminScreen";

export default function App() {
  const [user,        setUser]       = useState(() => getSession());
  const [page,        setPage]       = useState("dashboard");
  const [receipts,    setReceipts]   = useState([]);
  const [selected,    setSelected]   = useState(null);
  const [initializing,setInitializing] = useState(true);  // true while seeding + fetching
  const [initError,   setInitError]  = useState(null);

  // ── Bootstrap: seed admin + fetch receipts on mount ────────────────────────
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        await seedAdmin();
        const rows = await getReceipts();
        if (!cancelled) setReceipts(rows);
      } catch (e) {
        if (!cancelled) setInitError(e.message);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  // ── Re-fetch receipts from Supabase ────────────────────────────────────────
  const refreshReceipts = useCallback(async () => {
    const rows = await getReceipts();
    setReceipts(rows);
  }, []);

  // ── Auth ───────────────────────────────────────────────────────────────────
  const handleAuth = async (u) => {
    saveSession(u);
    setUser(u);
    setPage("dashboard");
    await refreshReceipts();   // load data for the newly-logged-in user
  };

  const handleSignOut = () => {
    clearSession();
    setUser(null);
    setReceipts([]);
    setPage("dashboard");
    setSelected(null);
  };

  // ── Receipt flow ───────────────────────────────────────────────────────────
  const handleUploadComplete = async (newReceipt) => {
    try {
      await addReceipt(newReceipt);
      await refreshReceipts();
      setPage("queue");
    } catch (e) {
      console.error("[handleUploadComplete]", e.message);
    }
  };

  const handleSelectReceipt = (r) => {
    setSelected(r);
    setPage("correction");
  };

  const handleSaveCorrection = async (updated) => {
    try {
      await updateReceipt(updated.id, { ...updated, status: "reviewed" });
      await refreshReceipts();
      setSelected(null);
      setPage("queue");
    } catch (e) {
      console.error("[handleSaveCorrection]", e.message);
    }
  };

  // ── Admin: role change → refresh current user's session if it was them ─────
  const handleUsersChanged = async () => {
    const fresh = await refreshSession(user.id);
    if (fresh) setUser(fresh);
  };

  // ── Navigation guard ───────────────────────────────────────────────────────
  const safePage = (p) => {
    if (p === "admin" && user?.role === "uploader") return;
    setSelected(null);
    setPage(p);
  };

  // ── Pending count for nav badge ────────────────────────────────────────────
  const pendingCount = user?.role === "uploader"
    ? receipts.filter((r) => r.uploaded_by === user.id && r.status === "pending_review").length
    : receipts.filter((r) => r.status === "pending_review").length;

  // ── Full-screen loading / error states ─────────────────────────────────────
  if (initError) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: P.bg, padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: P.text, marginBottom: 8 }}>
            Connection Error
          </div>
          <div style={{ fontSize: 14, color: P.muted, marginBottom: 20 }}>{initError}</div>
          <div style={{ fontSize: 13, color: P.faint }}>
            Check that <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> are set in your <code>.env</code> file and restart the dev server.
          </div>
        </div>
      </div>
    );
  }

  if (initializing) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: P.bg }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>🥛</div>
          <div className="pulse" style={{ fontSize: 14, color: P.muted }}>Connecting…</div>
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen onAuth={handleAuth} />;

  // ── Page renderer ──────────────────────────────────────────────────────────
  const renderPage = () => {
    switch (page) {
      case "upload":
        return <UploadScreen onComplete={handleUploadComplete} user={user} />;

      case "queue":
        return <QueueScreen receipts={receipts} onSelect={handleSelectReceipt} user={user} onRefresh={refreshReceipts} />;

      case "correction":
        return selected ? (
          <CorrectionScreen
            receipt={selected}
            imageUrl={selected.imageUrl}
            onSave={handleSaveCorrection}
            onCancel={() => { setSelected(null); setPage("queue"); }}
            user={user}
          />
        ) : null;

      case "admin":
        return (
          <AdminScreen
            user={user}
            receipts={receipts}
            onUsersChanged={handleUsersChanged}
            onRefresh={refreshReceipts}
          />
        );

      case "dashboard":
      default:
        return <DashboardScreen receipts={receipts} user={user} />;
    }
  };

  return (
    <Layout page={page} setPage={safePage} user={user} onSignOut={handleSignOut} pendingCount={pendingCount}>
      {renderPage()}
    </Layout>
  );
}
