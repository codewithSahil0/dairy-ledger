import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import P from "../constants/palette";
import { fmtINR, fmtL, statusColor } from "../utils/helpers";
import { Card, KpiCard, Badge, Mono, EmptyState } from "./ui";

/* Build trend from receipts (last 14 days) */
const buildTrend = (receipts) => {
  const days = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const key = `${d.getDate()}/${d.getMonth() + 1}`;
    days[key] = { date: key, quantity: 0, revenue: 0, fat: [], snf: [] };
  }
  receipts.forEach((r) => {
    const d = new Date(r.created_at);
    const key = `${d.getDate()}/${d.getMonth() + 1}`;
    if (days[key]) {
      days[key].quantity += r.quantity_liters || 0;
      days[key].revenue += r.amount_inr || 0;
      if (r.fat_percent) days[key].fat.push(r.fat_percent);
      if (r.snf_percent) days[key].snf.push(r.snf_percent);
    }
  });
  return Object.values(days).map((d) => ({
    ...d,
    quantity: +d.quantity.toFixed(1),
    revenue: +d.revenue.toFixed(0),
    fat: d.fat.length
      ? +(d.fat.reduce((a, b) => a + b, 0) / d.fat.length).toFixed(2)
      : null,
    snf: d.snf.length
      ? +(d.snf.reduce((a, b) => a + b, 0) / d.snf.length).toFixed(2)
      : null,
  }));
};

const ttp = {
  contentStyle: {
    fontFamily: "'Source Sans 3',sans-serif",
    fontSize: 12,
    borderRadius: 8,
    border: `1px solid ${P.border}`,
  },
};

export default function DashboardScreen({ receipts, user, onSignOut }) {
  const mine =
    user.role === "admin"
      ? receipts
      : receipts.filter((r) => r.uploaded_by === user.id);

  const totalQty = mine.reduce((s, r) => s + (r.quantity_liters || 0), 0);
  const totalRev = mine.reduce((s, r) => s + (r.amount_inr || 0), 0);
  const avgFat = mine.length
    ? mine.reduce((s, r) => s + (r.fat_percent || 0), 0) / mine.length
    : 0;
  const avgSnf = mine.length
    ? mine.reduce((s, r) => s + (r.snf_percent || 0), 0) / mine.length
    : 0;
  const pending = mine.filter((r) => r.status === "pending_review").length;
  const anomalies = mine.filter(
    (r) => r.amount_mismatch || r.added_water_percent > 0,
  );
  const trend = buildTrend(mine);

  const shiftData = [
    {
      name: "Morning",
      quantity: mine
        .filter((r) => r.shift === "M")
        .reduce((s, r) => s + (r.quantity_liters || 0), 0)
        .toFixed(1),
    },
    {
      name: "Evening",
      quantity: mine
        .filter((r) => r.shift === "E")
        .reduce((s, r) => s + (r.quantity_liters || 0), 0)
        .toFixed(1),
    },
  ];

  const topSuppliers = [...mine]
    .sort((a, b) => (b.quantity_liters || 0) - (a.quantity_liters || 0))
    .slice(0, 5);

  // ── Mobile header with user info + sign out ──────────────────────────────
  const MobileHeader = () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: P.bgCard,
        borderRadius: 14,
        padding: "14px 16px",
        marginBottom: 20,
        boxShadow: "0 2px 12px rgba(0,0,0,.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Avatar */}
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${P.green}, ${P.greenMid})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            color: "#fff",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {user.name?.[0]?.toUpperCase() || "U"}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: P.text }}>
            {user.name || "User"}
          </div>
          <div style={{ fontSize: 11, color: P.muted, marginTop: 1 }}>
            <span
              style={{
                background:
                  user.role === "admin" ? `${P.green}20` : `${P.amber}20`,
                color: user.role === "admin" ? P.green : P.amber,
                padding: "1px 7px",
                borderRadius: 99,
                fontWeight: 600,
                fontSize: 10,
              }}
            >
              {user.role?.toUpperCase()}
            </span>
            <span style={{ marginLeft: 6 }}>· {user.code}</span>
          </div>
        </div>
      </div>

      {/* Sign out button */}
      {onSignOut && (
        <button
          onClick={onSignOut}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 8,
            border: `1.5px solid ${P.border}`,
            background: "transparent",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            color: P.muted,
            fontFamily: "'Source Sans 3',sans-serif",
            transition: "all .2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = P.red;
            e.currentTarget.style.color = P.red;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = P.border;
            e.currentTarget.style.color = P.muted;
          }}
        >
          <span>↩</span> Sign Out
        </button>
      )}
    </div>
  );

  if (mine.length === 0) {
    return (
      <div className="page-wrap fade-in">
        <MobileHeader />
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: 26,
              color: P.text,
              marginBottom: 4,
            }}
          >
            Dashboard
          </h1>
          <p style={{ color: P.muted, fontSize: 14 }}>
            {user.role === "admin"
              ? "All collection centres"
              : "Your collection summary"}
          </p>
        </div>
        <EmptyState
          icon="📊"
          title="No receipts yet"
          sub="Upload your first receipt to see analytics here."
        />
      </div>
    );
  }

  return (
    <div className="page-wrap fade-in">
      {/* Mobile user card — always visible on mobile */}
      <MobileHeader />

      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: 26,
            color: P.text,
            marginBottom: 4,
          }}
        >
          Dashboard
        </h1>
        <p style={{ color: P.muted, fontSize: 14 }}>
          {user.role === "admin"
            ? `All centres · ${receipts.length} receipts`
            : "Your collection summary"}
        </p>
      </div>

      {/* KPIs */}
      <div className="kpi-row">
        <KpiCard
          label="Total Volume"
          value={`${totalQty.toFixed(1)} L`}
          sub="All time"
          icon="🥛"
          accent={P.green}
        />
        <KpiCard
          label="Total Revenue"
          value={fmtINR(totalRev)}
          sub="Gross"
          icon="₹"
          accent={P.amber}
        />
        <KpiCard
          label="Avg FAT %"
          value={`${avgFat.toFixed(2)}%`}
          sub="Target 3.5–6%"
          icon="🧈"
          accent={P.greenMid}
        />
        <KpiCard
          label="Avg SNF %"
          value={`${avgSnf.toFixed(2)}%`}
          sub="Target 8–9.5%"
          icon="💧"
          accent={P.greenMid}
        />
        <KpiCard
          label="Pending Review"
          value={pending}
          sub="Needs action"
          icon="⏳"
          accent={P.amber}
        />
      </div>

      {/* Volume trend + shift */}
      <div className="chart-2col">
        <Card>
          <div
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: 15,
              marginBottom: 18,
            }}
          >
            14-Day Volume Trend
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={trend}
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gQ" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={P.green} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={P.green} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: P.muted }}
                interval={1}
              />
              <YAxis tick={{ fontSize: 10, fill: P.muted }} />
              <Tooltip {...ttp} />
              <Area
                type="monotone"
                dataKey="quantity"
                stroke={P.green}
                strokeWidth={2}
                fill="url(#gQ)"
                name="Litres"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: 15,
              marginBottom: 18,
            }}
          >
            Shift Breakdown
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={shiftData}
              margin={{ top: 0, right: 0, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: P.muted }} />
              <YAxis tick={{ fontSize: 10, fill: P.muted }} />
              <Tooltip {...ttp} />
              <Bar
                dataKey="quantity"
                fill={P.green}
                radius={[5, 5, 0, 0]}
                name="Litres"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* FAT/SNF + Anomaly feed */}
      <div className="chart-32col">
        <Card>
          <div
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: 15,
              marginBottom: 18,
            }}
          >
            FAT & SNF Trend
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart
              data={trend}
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: P.muted }}
                interval={2}
              />
              <YAxis tick={{ fontSize: 10, fill: P.muted }} domain={[3, 11]} />
              <Tooltip {...ttp} />
              <Line
                type="monotone"
                dataKey="fat"
                stroke={P.amber}
                strokeWidth={2}
                dot={false}
                name="FAT %"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="snf"
                stroke={P.greenMid}
                strokeWidth={2}
                dot={false}
                name="SNF %"
                connectNulls
              />
              <Legend iconType="line" wrapperStyle={{ fontSize: 12 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: 15,
              marginBottom: 14,
            }}
          >
            ⚠ Anomaly Feed
          </div>
          {anomalies.length === 0 ? (
            <div
              style={{
                color: P.faint,
                fontSize: 13,
                textAlign: "center",
                padding: "16px 0",
              }}
            >
              ✓ No anomalies
            </div>
          ) : (
            anomalies.slice(0, 6).map((r) => (
              <div
                key={r.id}
                style={{
                  padding: "9px 0",
                  borderBottom: `1px solid ${P.border}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>
                    {r.farmer_name || r.name || "—"}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: r.added_water_percent > 0 ? P.red : P.amber,
                    }}
                  >
                    {r.added_water_percent > 0
                      ? `💧 Water: ${r.added_water_percent}%`
                      : "⚠ Amount mismatch"}
                  </div>
                </div>
                <Mono style={{ fontSize: 11, color: P.muted }}>
                  {r.id?.slice(-8)}
                </Mono>
              </div>
            ))
          )}
        </Card>
      </div>

      {/* Top suppliers */}
      {topSuppliers.length > 0 && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "18px 20px 14px",
              fontFamily: "'Playfair Display',serif",
              fontSize: 15,
            }}
          >
            Top Suppliers by Volume
          </div>
          <div className="table-scroll">
            <table
              className="resp-table"
              style={{ width: "100%", borderCollapse: "collapse" }}
            >
              <thead>
                <tr style={{ background: P.bgMuted }}>
                  {[
                    "#",
                    "Farmer",
                    "Shift",
                    "Volume",
                    "FAT %",
                    "Amount",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 14px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                        color: P.muted,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topSuppliers.map((r, i) => {
                  const sc = statusColor(r.status);
                  return (
                    <tr
                      key={r.id}
                      style={{ borderTop: `1px solid ${P.border}` }}
                    >
                      <td style={{ padding: "10px 14px" }}>
                        <Mono
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: i === 0 ? P.amber : P.faint,
                          }}
                        >
                          #{i + 1}
                        </Mono>
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          fontWeight: 500,
                          fontSize: 13,
                        }}
                      >
                        {r.farmer_name || r.name || "—"}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          fontSize: 12,
                          color: P.muted,
                        }}
                      >
                        {r.shift === "M" ? "Morning" : "Evening"}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <Mono style={{ fontSize: 13 }}>
                          {fmtL(r.quantity_liters)}
                        </Mono>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <Mono style={{ fontSize: 13 }}>{r.fat_percent}%</Mono>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <Mono style={{ fontSize: 13 }}>
                          {fmtINR(r.amount_inr)}
                        </Mono>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <Badge color={sc.text} bg={sc.bg}>
                          {r.status === "pending_review"
                            ? "Pending"
                            : "Reviewed"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
