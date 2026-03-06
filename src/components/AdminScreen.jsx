import { useState, useEffect } from "react";
import P from "../constants/palette";
import { getUsers, updateUserRole } from "../utils/storage";
import { fmtINR, fmtL, statusColor, roleColor } from "../utils/helpers";
import { Card, KpiCard, Badge, Mono, EmptyState, Btn, AlertBox } from "./ui";

const ROLES = ["uploader", "reviewer", "admin"];

export default function AdminScreen({ user, receipts, onUsersChanged, onRefresh }) {
  const [tab,        setTab]       = useState("overview");
  const [users,      setUsers]     = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [search,     setSearch]    = useState("");

  // Load users from Supabase on mount
  useEffect(() => {
    let cancelled = false;
    getUsers().then((rows) => {
      if (!cancelled) { setUsers(rows); setUsersLoading(false); }
    });
    return () => { cancelled = true; };
  }, []);

  if (user.role !== "admin") {
    return (
      <div className="page-wrap fade-in" style={{ textAlign: "center", paddingTop: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
        <div style={{ fontSize: 16, color: P.muted }}>Admin access required.</div>
      </div>
    );
  }

  /* ── User management ─────────────────────────────────────── */
  const handleRoleChange = async (userId, newRole) => {
    if (userId === user.id) return;   // can't demote yourself
    try {
      await updateUserRole(userId, newRole);
      const updated = await getUsers();
      setUsers(updated);
      await onUsersChanged?.();
    } catch (e) {
      console.error("[handleRoleChange]", e.message);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || u.code.toLowerCase().includes(q) || u.role.includes(q);
  });

  /* ── Aggregate stats ─────────────────────────────────────── */
  const totalQty = receipts.reduce((s, r) => s + (r.quantity_liters || 0), 0);
  const totalRev = receipts.reduce((s, r) => s + (r.amount_inr      || 0), 0);
  const pending  = receipts.filter((r) => r.status === "pending_review").length;
  const reviewed = receipts.filter((r) => r.status === "reviewed").length;
  const anomalies= receipts.filter((r) => r.amount_mismatch || r.added_water_percent > 0);

  /* ── Per-user receipt stats ──────────────────────────────── */
  const userStats = users.map((u) => {
    const ur = receipts.filter((r) => r.uploaded_by === u.id);
    return {
      ...u,
      count:   ur.length,
      volume:  ur.reduce((s, r) => s + (r.quantity_liters || 0), 0),
      revenue: ur.reduce((s, r) => s + (r.amount_inr      || 0), 0),
      pending: ur.filter((r) => r.status === "pending_review").length,
    };
  }).sort((a, b) => b.count - a.count);

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "users",    label: `Users (${users.length})` },
    { key: "receipts", label: `All Receipts (${receipts.length})` },
  ];

  return (
    <div className="page-wrap fade-in">
      <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, color: P.text, marginBottom: 22 }}>Admin Panel</h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 20px", borderRadius: 8, border: `1.5px solid ${tab === t.key ? P.green : P.border}`,
              background: tab === t.key ? P.greenLight : P.white, color: tab === t.key ? P.green : P.text,
              fontFamily: "'Source Sans 3',sans-serif", fontSize: 14, fontWeight: 500, cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ Overview ══════════════════════════════════════════ */}
      {tab === "overview" && (
        <>
          <div className="kpi-row" style={{ marginBottom: 20 }}>
            <KpiCard label="Total Users"    value={users.length}          sub="Registered accounts"   icon="👤" accent={P.green}    />
            <KpiCard label="Total Receipts" value={receipts.length}       sub="All time"               icon="🧾" accent={P.amber}    />
            <KpiCard label="Total Volume"   value={`${totalQty.toFixed(1)} L`} sub="Collected"        icon="🥛" accent={P.greenMid} />
            <KpiCard label="Total Revenue"  value={fmtINR(totalRev)}      sub="Gross"                  icon="₹"  accent={P.amber}    />
            <KpiCard label="Pending"        value={pending}               sub="Needs review"           icon="⏳" accent={P.amber}    />
            <KpiCard label="Reviewed"       value={reviewed}              sub="Completed"              icon="✓"  accent={P.green}    />
          </div>

          {anomalies.length > 0 && (
            <Card style={{ marginBottom: 20, padding: 18 }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, marginBottom: 14 }}>⚠ Anomalies ({anomalies.length})</div>
              {anomalies.slice(0, 8).map((r) => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${P.border}` }}>
                  <div>
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{r.farmer_name || r.name || "—"}</span>
                    <span style={{ fontSize: 12, color: P.muted, marginLeft: 8 }}>{r.uploader_name}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {r.added_water_percent > 0 && <Badge color={P.red}   bg={P.redLight}>💧 Water {r.added_water_percent}%</Badge>}
                    {r.amount_mismatch          && <Badge color={P.amber} bg={P.amberLight}>⚠ Mismatch</Badge>}
                    <Mono style={{ fontSize: 11, color: P.muted }}>{r.id?.slice(-8)}</Mono>
                  </div>
                </div>
              ))}
            </Card>
          )}

          {/* Per-user summary */}
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 18px 12px", fontFamily: "'Playfair Display',serif", fontSize: 15 }}>User Activity</div>
            <div className="table-scroll">
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                <thead>
                  <tr style={{ background: P.bgMuted }}>
                    {["User", "Role", "Receipts", "Volume", "Revenue", "Pending"].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: P.muted, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {userStats.map((u) => {
                    const rc = roleColor(u.role);
                    return (
                      <tr key={u.id} style={{ borderTop: `1px solid ${P.border}` }}>
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{u.name}</div>
                          <Mono style={{ fontSize: 11, color: P.muted }}>{u.code}</Mono>
                        </td>
                        <td style={{ padding: "10px 14px" }}><Badge color={rc.color} bg={rc.bg}>{u.role}</Badge></td>
                        <td style={{ padding: "10px 14px" }}><Mono style={{ fontSize: 13 }}>{u.count}</Mono></td>
                        <td style={{ padding: "10px 14px" }}><Mono style={{ fontSize: 13 }}>{fmtL(+u.volume.toFixed(1))}</Mono></td>
                        <td style={{ padding: "10px 14px" }}><Mono style={{ fontSize: 13 }}>{fmtINR(u.revenue)}</Mono></td>
                        <td style={{ padding: "10px 14px" }}>
                          {u.pending > 0
                            ? <Badge color={P.amber} bg={P.amberLight}>{u.pending}</Badge>
                            : <span style={{ color: P.faint, fontSize: 12 }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* ══ Users ════════════════════════════════════════════ */}
      {tab === "users" && (
        <>
          <div style={{ marginBottom: 14 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, code or role…"
              style={{ padding: "8px 14px", borderRadius: 8, border: `1.5px solid ${P.border}`, fontSize: 13, width: "100%", maxWidth: 320, fontFamily: "'Source Sans 3',sans-serif", outline: "none" }}
            />
          </div>
          {usersLoading && <div style={{ padding: "24px 0", textAlign: "center", color: P.muted, fontSize: 14 }} className="pulse">Loading users…</div>}
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div className="table-scroll">
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                <thead>
                  <tr style={{ background: P.bgMuted }}>
                    {["Name", "Code", "Role", "Registered", "Receipts", "Change Role"].map((h) => (
                      <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: P.muted, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const rc = roleColor(u.role);
                    const userReceipts = receipts.filter((r) => r.uploaded_by === u.id).length;
                    const isSelf = u.id === user.id;
                    return (
                      <tr key={u.id} style={{ borderTop: `1px solid ${P.border}` }}>
                        <td style={{ padding: "11px 14px" }}>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{u.name}</div>
                          {isSelf && <span style={{ fontSize: 11, color: P.faint }}>(you)</span>}
                        </td>
                        <td style={{ padding: "11px 14px" }}><Mono style={{ fontSize: 13, color: P.muted }}>{u.code}</Mono></td>
                        <td style={{ padding: "11px 14px" }}><Badge color={rc.color} bg={rc.bg}>{u.role}</Badge></td>
                        <td style={{ padding: "11px 14px", fontSize: 12, color: P.muted }}>{u.createdAt?.split("T")[0]}</td>
                        <td style={{ padding: "11px 14px" }}><Mono style={{ fontSize: 13 }}>{userReceipts}</Mono></td>
                        <td style={{ padding: "11px 14px" }}>
                          {isSelf ? (
                            <span style={{ fontSize: 12, color: P.faint }}>—</span>
                          ) : (
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {ROLES.filter((r) => r !== u.role).map((r) => {
                                const rc2 = roleColor(r);
                                return (
                                  <button
                                    key={r}
                                    onClick={() => handleRoleChange(u.id, r)}
                                    title={`Promote to ${r}`}
                                    style={{
                                      padding: "3px 10px", borderRadius: 14, fontSize: 11, fontWeight: 600, cursor: "pointer",
                                      background: rc2.bg, color: rc2.color, border: `1px solid ${rc2.color}30`,
                                    }}
                                  >
                                    → {r}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredUsers.length === 0 && <div style={{ padding: 32, textAlign: "center", color: P.faint }}>No users found.</div>}
          </Card>
        </>
      )}

      {/* ══ All Receipts ══════════════════════════════════════ */}
      {tab === "receipts" && (
        <>
          {receipts.length === 0 ? (
            <EmptyState icon="🧾" title="No receipts yet" sub="Receipts uploaded by any user will appear here." />
          ) : (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div className="table-scroll">
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 660 }}>
                  <thead>
                    <tr style={{ background: P.bgMuted }}>
                      {["Receipt ID", "Date", "Farmer", "Uploader", "Qty", "FAT %", "Amount", "Status"].map((h) => (
                        <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: P.muted, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((r) => {
                      const sc = statusColor(r.status);
                      return (
                        <tr key={r.id} style={{ borderTop: `1px solid ${P.border}` }}>
                          <td style={{ padding: "10px 14px" }}><Mono style={{ fontSize: 12, color: P.green }}>{r.id?.slice(-8)}</Mono></td>
                          <td style={{ padding: "10px 14px", fontSize: 12, color: P.muted }}>{r.date || r.created_at?.split("T")[0]}</td>
                          <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 500 }}>{r.farmer_name || r.name || "—"}</td>
                          <td style={{ padding: "10px 14px", fontSize: 12, color: P.muted }}>{r.uploader_name || "—"}</td>
                          <td style={{ padding: "10px 14px" }}><Mono style={{ fontSize: 13 }}>{fmtL(r.quantity_liters)}</Mono></td>
                          <td style={{ padding: "10px 14px" }}><Mono style={{ fontSize: 13 }}>{r.fat_percent != null ? `${r.fat_percent}%` : "—"}</Mono></td>
                          <td style={{ padding: "10px 14px" }}><Mono style={{ fontSize: 13 }}>{fmtINR(r.amount_inr)}</Mono></td>
                          <td style={{ padding: "10px 14px" }}><Badge color={sc.text} bg={sc.bg}>{r.status === "pending_review" ? "Pending" : "Reviewed"}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
