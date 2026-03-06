import P from "../constants/palette";

export const fmtINR = (v) =>
  v != null ? `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—";

export const fmtL = (v) => (v != null ? `${v} L` : "—");

export const statusColor = (s) =>
  s === "pending_review"
    ? { bg: P.amberLight, text: P.amber }
    : s === "reviewed"
      ? { bg: P.greenLight, text: P.greenMid }
      : { bg: P.redLight, text: P.red };

export const confColor = (c) =>
  c >= 85 ? P.greenMid : c >= 60 ? P.amber : P.red;

export const roleColor = (role) => ({
  color: role === "admin"    ? P.red    : role === "reviewer" ? P.green    : P.amber,
  bg:    role === "admin"    ? P.redLight : role === "reviewer" ? P.greenLight : P.amberLight,
});

export const validate = (fields) => {
  const errs = {};
  if (fields.fat_percent != null && (fields.fat_percent < 2 || fields.fat_percent > 12))
    errs.fat_percent = "Outside range 2–12%";
  if (fields.snf_percent != null && (fields.snf_percent < 7 || fields.snf_percent > 11))
    errs.snf_percent = "Outside range 7–11%";
  if (fields.added_water_percent > 5)
    errs.added_water_percent = "Critical: adulteration > 5%";
  if (fields.quantity_liters != null && fields.rate_inr != null && fields.amount_inr != null) {
    const expected = +(fields.quantity_liters * fields.rate_inr).toFixed(2);
    if (Math.abs(expected - fields.amount_inr) > 0.05)
      errs.amount_inr = `Mismatch: expected ₹${expected}`;
  }
  return errs;
};
