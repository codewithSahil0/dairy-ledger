// api/ocr.js — Vercel serverless function
// Place at project root: /api/ocr.js

const HF_TOKEN = process.env.VITE_HF_TOKEN;
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

// Extract a JSON object from a string even if there's extra text around it
function extractJSON(text) {
  if (!text || !text.trim()) throw new Error("Empty response from model");

  // Try direct parse first
  try {
    return JSON.parse(text.trim());
  } catch (_) {}

  // Try stripping markdown fences
  const stripped = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(stripped);
  } catch (_) {}

  // Try finding the first { ... } block
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch (_) {}
  }

  throw new Error(
    `Could not parse model response as JSON.\nRaw response: ${text.slice(0, 300)}`,
  );
}

function normalizeFields(obj) {
  const o = { ...obj };
  if (o.shift) {
    const s = o.shift.trim().toLowerCase();
    o.shift = s.startsWith("e") ? "E" : "M";
  }
  ["quantity", "fat", "snf", "clr", "added_water", "rate", "amount"].forEach(
    (k) => {
      if (o[k]) o[k] = String(o[k]).match(/[\d.]+/)?.[0] || o[k];
    },
  );
  if (!o.added_water || /n\/a|na/i.test(o.added_water)) o.added_water = "0";

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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { image } = req.body || {};
  if (!image)
    return res.status(400).json({ error: "No image provided in request body" });

  if (!HF_TOKEN) {
    return res.status(500).json({
      error:
        "VITE_HF_TOKEN not set. Add it to your Vercel environment variables.",
    });
  }

  let hfRes;
  try {
    hfRes = await fetch(HF_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
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
  } catch (fetchErr) {
    return res
      .status(502)
      .json({
        error: `Network error reaching Hugging Face: ${fetchErr.message}`,
      });
  }

  // Read raw body once — don't call .json() and .text() both
  const rawBody = await hfRes.text();
  console.log(`[ocr] HF status: ${hfRes.status}`);
  console.log(`[ocr] HF raw response: ${rawBody.slice(0, 500)}`);

  if (!hfRes.ok) {
    if (hfRes.status === 503) {
      return res
        .status(503)
        .json({ error: "Model is loading, please retry in 20 seconds." });
    }
    if (hfRes.status === 401) {
      return res
        .status(401)
        .json({ error: "Invalid Hugging Face token. Check VITE_HF_TOKEN." });
    }
    let errMsg = `HF API error ${hfRes.status}`;
    try {
      errMsg = JSON.parse(rawBody)?.error?.message || errMsg;
    } catch (_) {}
    return res.status(hfRes.status).json({ error: errMsg });
  }

  let hfData;
  try {
    hfData = JSON.parse(rawBody);
  } catch (_) {
    return res
      .status(502)
      .json({ error: `HF returned non-JSON: ${rawBody.slice(0, 200)}` });
  }

  const text = hfData.choices?.[0]?.message?.content || "";
  console.log(`[ocr] Model text output: ${text}`);

  try {
    const parsed = normalizeFields(extractJSON(text));
    return res.status(200).json(parsed);
  } catch (parseErr) {
    return res.status(422).json({ error: parseErr.message });
  }
}
