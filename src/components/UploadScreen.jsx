import { useState, useRef, useCallback } from "react";
import P from "../constants/palette";
import { OCR_PROMPT } from "../constants/ocr";
import { Btn, Card } from "./ui";
import CorrectionScreen from "./CorrectionScreen";

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

export default function UploadScreen({ onComplete, user }) {
  const [imgData,    setImgData]   = useState(null);
  const [imgFile,    setImgFile]   = useState(null);
  const [rotation,   setRotation]  = useState(0);
  const [status,     setStatus]    = useState("idle"); // idle|processing|done|error
  const [ocrResult,  setOcrResult] = useState(null);
  const [errMsg,     setErrMsg]    = useState("");
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setErrMsg("File too large — max 8 MB."); return; }
    setImgFile(file);
    setRotation(0);
    setStatus("idle");
    setErrMsg("");
    const reader = new FileReader();
    reader.onload = (e) => setImgData(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const rotate = () => setRotation((r) => (r + 90) % 360);

  const getRotatedBase64 = useCallback(() => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const rad = (rotation * Math.PI) / 180;
      const sin = Math.abs(Math.sin(rad)), cos = Math.abs(Math.cos(rad));
      canvas.width  = Math.round(img.width * cos + img.height * sin);
      canvas.height = Math.round(img.width * sin + img.height * cos);
      const ctx = canvas.getContext("2d");
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
    };
    img.src = imgData;
  }), [imgData, rotation]);

  const runOCR = async () => {
    if (!GEMINI_KEY) {
      setErrMsg("VITE_GEMINI_API_KEY is not set. Add it to your .env file and restart the dev server.");
      setStatus("error");
      return;
    }
    setStatus("processing");
    setErrMsg("");
    try {
      const b64 = await getRotatedBase64();
      const res = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: "image/jpeg", data: b64 } },
              { text: OCR_PROMPT },
            ],
          }],
          generationConfig: { temperature: 0, maxOutputTokens: 1000 },
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const text   = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setOcrResult({ ...parsed, imageUrl: imgData });
      setStatus("done");
    } catch (e) {
      setErrMsg(e.message || "OCR failed — check your API key and network.");
      setStatus("error");
    }
  };

  const useManualEntry = () => {
    setOcrResult({ imageUrl: imgData, confidence: {} });
    setStatus("done");
  };

  if (status === "done" && ocrResult) {
    return <CorrectionScreen receipt={ocrResult} imageUrl={ocrResult.imageUrl} onSave={(r) => onComplete(r)} isNew user={user} />;
  }

  return (
    <div className="page-wrap fade-in" style={{ maxWidth: 820, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, color: P.text, marginBottom: 4 }}>Upload Receipt</h1>
        <p style={{ color: P.muted, fontSize: 14 }}>Photograph a milk collection slip and extract fields automatically.</p>
      </div>

      {!imgData ? (
        /* Drop zone */
        <Card
          style={{ textAlign: "center", padding: "48px 24px", border: `2px dashed ${P.border}`, cursor: "pointer" }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => { fileRef.current.removeAttribute("capture"); fileRef.current.click(); }}
        >
          <div style={{ fontSize: 44, marginBottom: 12 }}>📷</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Tap to browse or drag & drop</div>
          <div style={{ color: P.muted, fontSize: 13, marginBottom: 24 }}>JPEG, PNG, HEIC · Max 8 MB</div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} onClick={(e) => e.stopPropagation()} />
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Btn onClick={(e) => { e.stopPropagation(); fileRef.current.removeAttribute("capture"); fileRef.current.click(); }}>
              📁 Gallery
            </Btn>
            <Btn variant="secondary" onClick={(e) => { e.stopPropagation(); fileRef.current.setAttribute("capture", "environment"); fileRef.current.click(); }}>
              📸 Camera
            </Btn>
          </div>
          {errMsg && <div style={{ marginTop: 16, color: P.red, fontSize: 13 }}>⚠ {errMsg}</div>}
        </Card>
      ) : (
        /* Preview + controls */
        <div className="upload-grid">
          <Card style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: P.muted, textTransform: "uppercase", letterSpacing: ".06em" }}>PREVIEW</span>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn size="sm" variant="secondary" onClick={rotate}>↻ Rotate</Btn>
                <Btn size="sm" variant="ghost" onClick={() => { setImgData(null); setStatus("idle"); setErrMsg(""); }}>✕</Btn>
              </div>
            </div>
            <div style={{ borderRadius: 8, overflow: "hidden", background: P.bgMuted, minHeight: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src={imgData} alt="Receipt preview" style={{ maxWidth: "100%", maxHeight: 400, transform: `rotate(${rotation}deg)`, transition: "transform .3s", objectFit: "contain" }} />
            </div>
          </Card>

          <div>
            {imgFile && (
              <Card style={{ padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: P.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>FILE INFO</div>
                <div style={{ fontSize: 13, color: P.muted }}>{imgFile.name}</div>
                <div style={{ fontSize: 12, color: P.faint, marginTop: 3 }}>{(imgFile.size / 1024).toFixed(0)} KB · {imgFile.type}</div>
              </Card>
            )}

            {status === "error" && (
              <div style={{ background: P.redLight, color: P.red, padding: "12px 14px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>⚠ {errMsg}</div>
            )}

            <Btn onClick={runOCR} loading={status === "processing"} style={{ width: "100%", justifyContent: "center", marginBottom: 10 }}>
              {status === "processing" ? "Extracting fields…" : "🔍 Extract with AI OCR"}
            </Btn>

            {status === "processing" && (
              <div style={{ background: P.greenLight, padding: "12px 14px", borderRadius: 8, fontSize: 13, color: P.greenMid, marginBottom: 10 }}>
                <span className="pulse">●</span> Analysing with Gemini Vision…
              </div>
            )}

            <Btn variant="secondary" size="sm" style={{ width: "100%", justifyContent: "center", marginTop: 4 }} onClick={useManualEntry}>
              ✏ Enter fields manually
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
