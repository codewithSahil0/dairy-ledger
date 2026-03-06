import { useState } from "react";
import P from "../constants/palette";
import { FIELDS_META } from "../constants/ocr";
import { validate, confColor } from "../utils/helpers";
import { Btn, Card, FieldLabel, Input, Mono, AlertBox } from "./ui";

export default function CorrectionScreen({ receipt, imageUrl, onSave, onCancel, isNew = false, user }) {
  const [fields, setFields] = useState({ ...receipt });
  const [saving,  setSaving]  = useState(false);
  const errs = validate(fields);

  const set = (k, v) => setFields((f) => ({ ...f, [k]: v }));

  const autoFill = () => {
    if (fields.quantity_liters && fields.rate_inr)
      set("amount_inr", +(fields.quantity_liters * fields.rate_inr).toFixed(2));
  };

  const handleSave = () => {
    setSaving(true);
    const id = receipt.id || `RCP-${Date.now()}`;
    const corrected = {
      ...fields,
      id,
      status:       "pending_review",
      uploaded_by:  user?.id,
      uploader_name: user?.name,
      created_at:   receipt.created_at || new Date().toISOString(),
      ocr_confidence: receipt.ocr_confidence ?? (
        receipt.confidence
          ? Math.round(Object.values(receipt.confidence).reduce((a, b) => a + b, 0) / Object.keys(receipt.confidence).length)
          : null
      ),
    };
    setTimeout(() => { onSave(corrected); setSaving(false); }, 500);
  };

  const avgConf = receipt.confidence
    ? Math.round(Object.values(receipt.confidence).reduce((a, b) => a + b, 0) / Object.keys(receipt.confidence).length)
    : receipt.ocr_confidence ?? null;

  return (
    <div className="page-wrap fade-in">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: P.text, marginBottom: 3 }}>
            {isNew ? "Review Extracted Fields" : `Receipt ${receipt.id}`}
          </h1>
          <p style={{ color: P.muted, fontSize: 13 }}>Verify and correct each field before saving.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {onCancel && <Btn variant="secondary" onClick={onCancel}>Cancel</Btn>}
          <Btn onClick={handleSave} loading={saving}>{saving ? "Saving…" : "✓ Save Receipt"}</Btn>
        </div>
      </div>

      <div className="correction-grid">
        {/* Image panel */}
        <Card style={{ padding: 14, alignSelf: "start", position: "sticky", top: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: P.muted, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 10 }}>RECEIPT IMAGE</div>
          <div style={{ borderRadius: 8, overflow: "hidden", background: P.bgMuted, minHeight: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {imageUrl && imageUrl.length > 50 ? (
              <img src={imageUrl} alt="Receipt" style={{ maxWidth: "100%", objectFit: "contain" }} />
            ) : (
              <div style={{ color: P.faint, textAlign: "center", padding: 32 }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🧾</div>
                <div style={{ fontSize: 13 }}>No image</div>
              </div>
            )}
          </div>
          {receipt.raw_text && (
            <details style={{ marginTop: 10 }}>
              <summary style={{ fontSize: 12, color: P.muted, cursor: "pointer", userSelect: "none" }}>Raw OCR text</summary>
              <pre style={{ fontSize: 11, color: P.muted, marginTop: 8, whiteSpace: "pre-wrap", fontFamily: "'IBM Plex Mono',monospace", background: P.bgMuted, padding: 10, borderRadius: 6, maxHeight: 200, overflow: "auto" }}>
                {receipt.raw_text}
              </pre>
            </details>
          )}
        </Card>

        {/* Fields */}
        <div>
          {/* Confidence banner */}
          {avgConf != null && (
            <AlertBox type="green" style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>🎯</span>
                <div>
                  <span style={{ fontWeight: 600 }}>OCR Confidence: </span>
                  <Mono style={{ fontWeight: 600 }}>{avgConf}%</Mono>
                  <span style={{ fontSize: 12, color: P.muted, marginLeft: 8 }}>Colour shows per-field accuracy</span>
                </div>
              </div>
            </AlertBox>
          )}

          {/* Validation errors */}
          {Object.keys(errs).length > 0 && (
            <AlertBox type="amber" style={{ marginBottom: 14 }}>
              {Object.entries(errs).map(([k, v]) => (
                <div key={k} style={{ marginBottom: 2 }}>⚠ <strong>{k}:</strong> {v}</div>
              ))}
            </AlertBox>
          )}

          <Card style={{ padding: 18 }}>
            <div className="field-grid">
              {FIELDS_META.map(({ key, label, type }) => {
                const conf   = receipt.confidence?.[key];
                const hasErr = errs[key];
                return (
                  <div key={key}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <FieldLabel>{label}</FieldLabel>
                      {conf != null && (
                        <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono',monospace", color: confColor(conf), fontWeight: 600 }}>{conf}%</span>
                      )}
                    </div>
                    <Input
                      value={fields[key]}
                      onChange={(v) => set(key, type === "number" ? (v === "" ? null : +v) : v)}
                      type={type}
                      style={{ borderColor: hasErr ? P.amber : conf != null && conf < 60 ? `${P.red}80` : P.border }}
                    />
                    {hasErr && <div style={{ fontSize: 11, color: P.amber, marginTop: 3 }}>{hasErr}</div>}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${P.border}` }}>
              <Btn size="sm" variant="secondary" onClick={autoFill}>⚡ Auto-compute amount</Btn>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
