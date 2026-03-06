export const OCR_PROMPT = `You are an OCR system for Indian milk collection receipts. Analyze this image carefully.
Extract all fields and return ONLY valid JSON (no markdown, no explanation):
{
  "date": "YYYY-MM-DD or null",
  "time": "HH:mm:ss or null",
  "shift": "M or E or null",
  "slip_number": "string or null",
  "code": "string or null",
  "name": "string or null",
  "quantity_liters": number or null,
  "fat_percent": number or null,
  "snf_percent": number or null,
  "clr": number or null,
  "added_water_percent": number or null,
  "rate_inr": number or null,
  "amount_inr": number or null,
  "raw_text": "full text visible in receipt",
  "confidence": {"date":0-100,"time":0-100,"shift":0-100,"slip_number":0-100,"code":0-100,"name":0-100,"quantity_liters":0-100,"fat_percent":0-100,"snf_percent":0-100,"clr":0-100,"added_water_percent":0-100,"rate_inr":0-100,"amount_inr":0-100}
}
If this is not a milk receipt or no text is visible, set numeric fields to null and raw_text to "Not a milk receipt / No text detected".`;

export const FIELDS_META = [
  { key: "date",                label: "Date",           type: "text"   },
  { key: "time",                label: "Time",           type: "text"   },
  { key: "shift",               label: "Shift (M / E)",  type: "text"   },
  { key: "slip_number",         label: "Slip Number",    type: "text"   },
  { key: "code",                label: "Farmer Code",    type: "text"   },
  { key: "name",                label: "Farmer Name",    type: "text"   },
  { key: "quantity_liters",     label: "Quantity (L)",   type: "number" },
  { key: "fat_percent",         label: "FAT %",          type: "number" },
  { key: "snf_percent",         label: "SNF %",          type: "number" },
  { key: "clr",                 label: "CLR",            type: "number" },
  { key: "added_water_percent", label: "Added Water %",  type: "number" },
  { key: "rate_inr",            label: "Rate (₹ / L)",   type: "number" },
  { key: "amount_inr",          label: "Amount (₹)",     type: "number" },
];

export const NAV = [
  { key: "dashboard", label: "Dashboard",      icon: "◉" },
  { key: "upload",    label: "Upload Receipt",  icon: "⊕" },
  { key: "queue",     label: "Review Queue",    icon: "≡" },
  { key: "admin",     label: "Admin",           icon: "⚙" },
];
