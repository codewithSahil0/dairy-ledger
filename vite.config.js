import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ⚠ PASTE YOUR TOKEN HERE for local dev (this file is not sent to the browser)
// Get it free at: https://huggingface.co/settings/tokens
const LOCAL_HF_TOKEN = process.env.VITE_HF_TOKEN || "";

const HF_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const HF_URL = "https://router.huggingface.co/groq/openai/v1/chat/completions";

const RECEIPT_PROMPT = `This is a dairy milk collection slip. Read every line of text carefully from top to bottom.

The slip contains lines like these — read each one and extract the value after the colon:
- "Date: 4-3-26"           → date = "4-3-26"
- "Time: 9:34 AM"          → time = "9:34 AM"  
- "Shift: Morning"         → shift = "M"
- "SL#: 11"                → slip_no = "11"
- "CODE: 30"               → farmer_code = "30"
- "Name: ..."              → farmer_name = "..."
- "QTY: 3.03 LTR"          → quantity = "3.03"
- "FAT%: 5.8 (MIX)"        → fat = "5.8"
- "SNF%: 9.00 (MANUAL)"    → snf = "9.00"
- "CLR: 0.00"              → clr = "0.00"
- "ADDED WATER%: N/A"      → added_water = "0"
- "Rate: 27.50"            → rate = "27.50"
- "Amt: 83.42"             → amount = "83.42"

Now read THIS image and return ONLY this JSON, no other text:
{"date":"","time":"","shift":"","slip_no":"","farmer_code":"","farmer_name":"","quantity":"","fat":"","snf":"","clr":"","added_water":"","rate":"","amount":""}`;

function extractJSON(text) {
  if (!text?.trim()) throw new Error("Empty response from model");
  try {
    return JSON.parse(text.trim());
  } catch (_) {}
  const stripped = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(stripped);
  } catch (_) {}
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch (_) {}
  }
  throw new Error(
    `Could not parse model response.\nRaw: ${text.slice(0, 300)}`,
  );
}

// Normalise fields after parsing — fix shift, trim whitespace etc.
function normalizeFields(obj) {
  const o = { ...obj };
  // shift: accept Morning/Evening/M/E/m/e
  if (o.shift) {
    const s = o.shift.trim().toLowerCase();
    o.shift = s.startsWith("e") ? "E" : "M";
  }
  // strip units from numbers — e.g. "3.03 LTR" → "3.03"
  ["quantity", "fat", "snf", "clr", "added_water", "rate", "amount"].forEach(
    (k) => {
      if (o[k]) o[k] = String(o[k]).match(/[\d.]+/)?.[0] || o[k];
    },
  );
  // added_water: N/A or na → 0
  if (!o.added_water || /n\/a|na/i.test(o.added_water)) o.added_water = "0";

  // ── Remap OCR keys → FIELDS_META keys used by CorrectionScreen ──
  return {
    date: o.date || "",
    time: o.time || "",
    shift: o.shift || "",
    slip_number: o.slip_no || "",
    code: o.farmer_code || "",
    name: o.farmer_name || "",
    quantity_liters: o.quantity ? +o.quantity : null,
    fat_percent: o.fat ? +o.fat : null,
    snf_percent: o.snf ? +o.snf : null,
    clr: o.clr ? +o.clr : null,
    added_water_percent: o.added_water ? +o.added_water : 0,
    rate_inr: o.rate ? +o.rate : null,
    amount_inr: o.amount ? +o.amount : null,
  };
}

// Local /api/ocr handler — mirrors api/ocr.js for Vercel
function ocrMiddleware() {
  return {
    name: "ocr-middleware",
    configureServer(server) {
      server.middlewares.use("/api/ocr", async (req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Type", "application/json");

        if (req.method === "OPTIONS") {
          res.statusCode = 200;
          res.end();
          return;
        }
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        // Read body
        const body = await new Promise((resolve) => {
          let data = "";
          req.on("data", (chunk) => (data += chunk));
          req.on("end", () => resolve(data));
        });

        let image;
        try {
          image = JSON.parse(body).image;
        } catch (_) {}
        if (!image) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "No image provided" }));
          return;
        }

        const token = LOCAL_HF_TOKEN;
        if (!token || token === "PASTE_YOUR_HF_TOKEN_HERE") {
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              error:
                "Paste your HF token into LOCAL_HF_TOKEN in vite.config.js",
            }),
          );
          return;
        }

        try {
          const hfRes = await fetch(HF_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: HF_MODEL,
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "image_url",
                      image_url: { url: `data:image/jpeg;base64,${image}` },
                    },
                    { type: "text", text: RECEIPT_PROMPT },
                  ],
                },
              ],
              max_tokens: 600,
              temperature: 0,
            }),
          });

          const rawBody = await hfRes.text();
          console.log(`[ocr] HF status: ${hfRes.status}`);
          console.log(`[ocr] HF response: ${rawBody.slice(0, 500)}`);

          if (!hfRes.ok) {
            if (hfRes.status === 503) {
              res.statusCode = 503;
              res.end(
                JSON.stringify({
                  error: "Model is loading, please retry in 20 seconds.",
                }),
              );
              return;
            }
            if (hfRes.status === 401) {
              res.statusCode = 401;
              res.end(JSON.stringify({ error: "Invalid Hugging Face token." }));
              return;
            }
            res.statusCode = hfRes.status;
            res.end(
              JSON.stringify({
                error: `HF API error ${hfRes.status}: ${rawBody.slice(0, 200)}`,
              }),
            );
            return;
          }

          const hfData = JSON.parse(rawBody);
          const text = hfData.choices?.[0]?.message?.content || "";
          console.log(`[ocr] Model output: ${text}`);

          const parsed = normalizeFields(extractJSON(text));
          res.statusCode = 200;
          res.end(JSON.stringify(parsed));
        } catch (e) {
          console.error("[ocr] Error:", e.message);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), ocrMiddleware()],
});
