import { useState } from "react";
import P from "../constants/palette";
import { fmtINR, fmtL, statusColor, confColor } from "../utils/helpers";
import { Btn, Badge, Card, Mono, EmptyState } from "./ui";

export default function QueueScreen({ receipts, onSelect, user }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  /* Reviewers + admins see all; uploaders see only theirs */
  const scoped = (user.role === "uploader")
    ? receipts.filter((r) => r.uploaded_by === user.id)
    : receipts;

  const filtered = scoped.filter((r) => {
    if (filter === "pending" && r.status !== "pending_review") return false;
    if (filter === "anomaly" && !r.amount_mismatch && !(r.added_water_percent > 0)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.farmer_name?.toLowerCase().includes(q) && !r.name?.toLowerCase().includes(q) && !r.id?.includes(q) && !r.slip_number?.includes(q))
        return false;
    }
    return true;
  });

  const pendingCount = scoped.filter((r) => r.status === "pending_review").length;

  return (
    <div className="page-wrap fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, color: P.text, marginBottom: 4 }}>Review Queue</h1>
          <p style={{ color: P.muted, fontSize: 14 }}>{pendingCount} receipt{pendingCount !== 1 ? "s" : ""} awaiting review</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        {["all", "pending", "anomaly"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "7px 16px", borderRadius: 20, border: `1.5px solid ${filter === f ? P.green : P.border}`,
              background: filter === f ? P.greenLight : P.white, color: filter === f ? P.green : P.text,
              fontFamily: "'Source Sans 3',sans-serif", fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}
          >
            {f === "all" ? "All" : f === "pending" ? "Pending" : "⚠ Anomalies"}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search farmer / receipt ID…"
          style={{ padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${P.border}`, fontSize: 13, fontFamily: "'Source Sans 3',sans-serif", outline: "none", flex: "1 1 180px", minWidth: 160 }}
        />
      </div>

      {scoped.length === 0 ? (
        <EmptyState icon="📋" title="No receipts yet" sub={user.role === "uploader" ? "Upload a receipt to see it here." : "No receipts have been uploaded."} />
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-scroll">
            <table className="resp-table card-rows" style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
              <thead>
                <tr style={{ background: P.bgMuted }}>
                  {["Receipt ID", "Date", "Farmer", "Qty (L)", "FAT %", "Amount", "Conf.", "Status", ""].map((h) => (
                    <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: P.muted, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const sc = statusColor(r.status);
                  return (
                    <tr
                      key={r.id}
                      style={{ borderTop: `1px solid ${P.border}`, cursor: "pointer", transition: "background .15s" }}
                      onMouseOver={(e) => (e.currentTarget.style.background = P.bgMuted)}
                      onMouseOut={(e)  => (e.currentTarget.style.background = "")}
                      onClick={() => onSelect(r)}
                    >
                      <td data-label="ID"      style={{ padding: "11px 14px" }}><Mono style={{ fontSize: 12, color: P.green, fontWeight: 500 }}>{r.id?.slice(-8)}</Mono></td>
                      <td data-label="Date"    style={{ padding: "11px 14px", fontSize: 13 }}>
                        {r.date || r.created_at?.split("T")[0]}
                        <span style={{ display: "block", fontSize: 11, color: P.muted }}>{r.shift === "M" ? "Morning" : "Evening"}</span>
                      </td>
                      <td data-label="Farmer"  style={{ padding: "11px 14px" }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{r.farmer_name || r.name || "—"}</div>
                        {r.code && <div style={{ fontSize: 11, color: P.muted }}>{r.code}</div>}
                      </td>
                      <td data-label="Qty"     style={{ padding: "11px 14px" }}><Mono style={{ fontSize: 13 }}>{fmtL(r.quantity_liters)}</Mono></td>
                      <td data-label="FAT"     style={{ padding: "11px 14px" }}><Mono style={{ fontSize: 13 }}>{r.fat_percent != null ? `${r.fat_percent}%` : "—"}</Mono></td>
                      <td data-label="Amount"  style={{ padding: "11px 14px" }}>
                        <Mono style={{ fontSize: 13 }}>{fmtINR(r.amount_inr)}</Mono>
                        {r.amount_mismatch    && <span style={{ display: "block", fontSize: 11, color: P.amber }}>⚠ mismatch</span>}
                        {r.added_water_percent > 0 && <span style={{ display: "block", fontSize: 11, color: P.red }}>💧 {r.added_water_percent}%</span>}
                      </td>
                      <td data-label="Conf"    style={{ padding: "11px 14px" }}>
                        {r.ocr_confidence != null ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <div style={{ width: 48, height: 5, borderRadius: 3, background: P.bgMuted, overflow: "hidden" }}>
                              <div style={{ width: `${r.ocr_confidence}%`, height: "100%", background: confColor(r.ocr_confidence), borderRadius: 3 }} />
                            </div>
                            <Mono style={{ fontSize: 11 }}>{r.ocr_confidence}%</Mono>
                          </div>
                        ) : <span style={{ color: P.faint, fontSize: 12 }}>—</span>}
                      </td>
                      <td data-label="Status"  style={{ padding: "11px 14px" }}><Badge color={sc.text} bg={sc.bg}>{r.status === "pending_review" ? "Pending" : "Reviewed"}</Badge></td>
                      <td data-label="Action"  style={{ padding: "11px 14px" }} onClick={(e) => { e.stopPropagation(); onSelect(r); }}>
                        <Btn size="sm" variant="secondary">View →</Btn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: P.faint, fontSize: 14 }}>No receipts match your filter.</div>
          )}
        </Card>
      )}
    </div>
  );
}
