import { useState, useRef, useCallback } from "react";
import P from "../constants/palette";
import { Btn, Card } from "./ui";
import CorrectionScreen from "./CorrectionScreen";

// ---------------------------------------------------------------------------
// OCR via /api/ocr — our own Vercel proxy → Hugging Face Qwen2-VL (FREE)
// No CORS issues, token stays server-side only.
// ---------------------------------------------------------------------------

async function extractReceipt(base64Image) {
  const res = await fetch("/api/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64Image }),
  });

  const data = await res.json();

  if (!res.ok) {
    if (res.status === 503) {
      throw new Error("__loading__"); // special flag for auto-retry
    }
    throw new Error(data.error || `Server error ${res.status}`);
  }

  console.log("=== OCR RESULT ===", data);
  return data;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UploadScreen({ onComplete, user }) {
  const [imgData, setImgData] = useState(null);
  const [imgFile, setImgFile] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [status, setStatus] = useState("idle"); // idle|processing|retrying|done|error
  const [statusMsg, setStatusMsg] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [ocrResult, setOcrResult] = useState(null);
  const [errMsg, setErrMsg] = useState("");
  const fileRef = useRef();
  const timerRef = useRef();

  // ---- file handling -------------------------------------------------------

  const handleFile = (file) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setErrMsg("File too large — max 8 MB.");
      return;
    }
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

  // ---- rotated base64 ------------------------------------------------------

  const getRotatedBase64 = useCallback(
    () =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const rad = (rotation * Math.PI) / 180;
          const sin = Math.abs(Math.sin(rad));
          const cos = Math.abs(Math.cos(rad));
          canvas.width = Math.round(img.width * cos + img.height * sin);
          canvas.height = Math.round(img.width * sin + img.height * cos);
          const ctx = canvas.getContext("2d");
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(rad);
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
          resolve(canvas.toDataURL("image/jpeg", 0.95).split(",")[1]);
        };
        img.src = imgData;
      }),
    [imgData, rotation],
  );

  // ---- countdown helper ----------------------------------------------------

  const startCountdown = (seconds, onDone) => {
    setCountdown(seconds);
    let remaining = seconds;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        onDone();
      }
    }, 1000);
  };

  // ---- main OCR call -------------------------------------------------------

  const attemptOCR = async (base64) => {
    try {
      const parsed = await extractReceipt(base64);
      parsed.imageUrl = imgData;
      parsed.ocr_confidence = 85;
      setOcrResult(parsed);
      setStatus("done");
    } catch (e) {
      if (e.message === "__loading__") {
        // Model cold-starting — wait 20s then retry automatically
        setStatus("retrying");
        setStatusMsg("Model is warming up on Hugging Face…");
        startCountdown(20, async () => {
          setStatus("processing");
          setStatusMsg("Retrying now…");
          try {
            const parsed = await extractReceipt(base64);
            parsed.imageUrl = imgData;
            parsed.ocr_confidence = 85;
            setOcrResult(parsed);
            setStatus("done");
          } catch (e2) {
            setErrMsg(e2.message || "Extraction failed. Please try again.");
            setStatus("error");
          }
        });
      } else {
        setErrMsg(e.message || "Extraction failed — check server logs.");
        setStatus("error");
      }
    }
  };

  const runOCR = async () => {
    setStatus("processing");
    setStatusMsg("Sending image to AI…");
    setErrMsg("");
    const base64 = await getRotatedBase64();
    await attemptOCR(base64);
  };

  // ---- manual fallback -----------------------------------------------------

  const useManualEntry = () => {
    clearInterval(timerRef.current);
    setOcrResult({ imageUrl: imgData, confidence: {} });
    setStatus("done");
  };

  // ---- render --------------------------------------------------------------

  if (status === "done" && ocrResult) {
    return (
      <CorrectionScreen
        receipt={ocrResult}
        imageUrl={ocrResult.imageUrl}
        onSave={(r) => onComplete(r)}
        isNew
        user={user}
      />
    );
  }

  const isProcessing = status === "processing" || status === "retrying";

  return (
    <div
      className="page-wrap fade-in"
      style={{ maxWidth: 820, margin: "0 auto" }}
    >
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: 26,
            color: P.text,
            marginBottom: 4,
          }}
        >
          Upload Receipt
        </h1>
        <p style={{ color: P.muted, fontSize: 14 }}>
          Photograph a milk collection slip — AI Vision extracts all fields for
          free.
        </p>
      </div>

      {!imgData ? (
        <Card
          style={{
            textAlign: "center",
            padding: "48px 24px",
            border: `2px dashed ${P.border}`,
            cursor: "pointer",
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => {
            fileRef.current.removeAttribute("capture");
            fileRef.current.click();
          }}
        >
          <div style={{ fontSize: 44, marginBottom: 12 }}>📷</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
            Tap to browse or drag & drop
          </div>
          <div style={{ color: P.muted, fontSize: 13, marginBottom: 24 }}>
            JPEG, PNG, HEIC · Max 8 MB
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files[0])}
            onClick={(e) => e.stopPropagation()}
          />

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Btn
              onClick={(e) => {
                e.stopPropagation();
                fileRef.current.removeAttribute("capture");
                fileRef.current.click();
              }}
            >
              📁 Gallery
            </Btn>
            <Btn
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                fileRef.current.setAttribute("capture", "environment");
                fileRef.current.click();
              }}
            >
              📸 Camera
            </Btn>
          </div>

          {errMsg && (
            <div style={{ marginTop: 16, color: P.red, fontSize: 13 }}>
              ⚠ {errMsg}
            </div>
          )}
        </Card>
      ) : (
        <div className="upload-grid">
          <Card style={{ padding: 14 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: P.muted,
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                }}
              >
                PREVIEW
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn size="sm" variant="secondary" onClick={rotate}>
                  ↻ Rotate
                </Btn>
                <Btn
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setImgData(null);
                    setStatus("idle");
                    setErrMsg("");
                  }}
                >
                  ✕
                </Btn>
              </div>
            </div>
            <div
              style={{
                borderRadius: 8,
                overflow: "hidden",
                background: P.bgMuted,
                minHeight: 260,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={imgData}
                alt="Receipt preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: 400,
                  transform: `rotate(${rotation}deg)`,
                  transition: "transform .3s",
                  objectFit: "contain",
                }}
              />
            </div>
          </Card>

          <div>
            {imgFile && (
              <Card style={{ padding: 14, marginBottom: 14 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: P.muted,
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                  }}
                >
                  FILE INFO
                </div>
                <div style={{ fontSize: 13, color: P.muted }}>
                  {imgFile.name}
                </div>
                <div style={{ fontSize: 12, color: P.faint, marginTop: 3 }}>
                  {(imgFile.size / 1024).toFixed(0)} KB · {imgFile.type}
                </div>
              </Card>
            )}

            {status === "error" && (
              <div
                style={{
                  background: P.redLight,
                  color: P.red,
                  padding: "12px 14px",
                  borderRadius: 8,
                  fontSize: 13,
                  marginBottom: 12,
                }}
              >
                ⚠ {errMsg}
              </div>
            )}

            <Btn
              onClick={runOCR}
              loading={isProcessing}
              style={{
                width: "100%",
                justifyContent: "center",
                marginBottom: 10,
              }}
            >
              {isProcessing ? "Scanning…" : "🤗 Extract with AI Vision (Free)"}
            </Btn>

            {isProcessing && (
              <div
                style={{
                  background: P.greenLight,
                  padding: "12px 14px",
                  borderRadius: 8,
                  fontSize: 13,
                  color: P.greenMid,
                  marginBottom: 10,
                  textAlign: "center",
                }}
              >
                <span className="pulse">●</span> {statusMsg}
                {status === "retrying" && countdown > 0 && (
                  <div style={{ marginTop: 6, fontWeight: 600, fontSize: 15 }}>
                    Retrying in {countdown}s…
                  </div>
                )}
                <div style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>
                  First scan may take ~20 sec while model loads
                </div>
              </div>
            )}

            <Btn
              variant="secondary"
              size="sm"
              style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
              onClick={useManualEntry}
            >
              ✏ Enter fields manually
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
