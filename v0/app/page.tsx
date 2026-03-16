"use client";

import { useState, useRef, type ChangeEvent, type FormEvent } from "react";

export default function Home() {
  const [personPreview, setPersonPreview] = useState<string | null>(null);
  const [garmentPreview, setGarmentPreview] = useState<string | null>(null);
  const [personBase64, setPersonBase64] = useState<string | null>(null);
  const [garmentBase64, setGarmentBase64] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    credits: string;
    elapsed: number;
  } | null>(null);

  const personInputRef = useRef<HTMLInputElement>(null);
  const garmentInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(
    e: ChangeEvent<HTMLInputElement>,
    setPreview: (v: string | null) => void,
    setBase64: (v: string | null) => void
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      setPreview(dataUri);
      setBase64(dataUri); // Fashn.ai accepts data URIs directly
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!personBase64 || !garmentBase64) {
      setError("Please upload both a person photo and a garment image.");
      return;
    }

    setLoading(true);
    setError(null);
    setResultUrl(null);
    setStats(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personImageBase64: personBase64,
          garmentImageBase64: garmentBase64,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setResultUrl(data.resultImageUrl);
      setStats({
        credits: data.creditsUsed,
        elapsed: data.elapsedSeconds,
      });
    } catch (err) {
      setError(`Network error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <header className="header">
        <h1>VTON Validator</h1>
        <p className="subtitle">
          Upload a person photo + garment image → see the try-on result
        </p>
      </header>

      <form onSubmit={handleSubmit} className="form">
        <div className="inputs-row">
          {/* Person Photo */}
          <div className="upload-card">
            <label className="upload-label">Person Photo</label>
            <input
              ref={personInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) =>
                handleFileSelect(e, setPersonPreview, setPersonBase64)
              }
              className="file-input"
              id="person-input"
            />
            <div
              className="drop-zone"
              onClick={() => personInputRef.current?.click()}
            >
              {personPreview ? (
                <img
                  src={personPreview}
                  alt="Person preview"
                  className="preview-img"
                />
              ) : (
                <div className="placeholder">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Click to upload</span>
                  <span className="hint">JPG, PNG, WebP</span>
                </div>
              )}
            </div>
          </div>

          {/* Garment Image */}
          <div className="upload-card">
            <label className="upload-label">Garment Image</label>
            <input
              ref={garmentInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) =>
                handleFileSelect(e, setGarmentPreview, setGarmentBase64)
              }
              className="file-input"
              id="garment-input"
            />
            <div
              className="drop-zone"
              onClick={() => garmentInputRef.current?.click()}
            >
              {garmentPreview ? (
                <img
                  src={garmentPreview}
                  alt="Garment preview"
                  className="preview-img"
                />
              ) : (
                <div className="placeholder">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-2l-2-2H9L7 7H5a2 2 0 00-2 2z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                  <span>Click to upload</span>
                  <span className="hint">JPG, PNG, WebP</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="submit-btn"
          disabled={loading || !personBase64 || !garmentBase64}
        >
          {loading ? (
            <span className="loading-text">
              <span className="spinner" />
              Generating… this takes 10-20s
            </span>
          ) : (
            "Generate Try-On"
          )}
        </button>
      </form>

      {error && (
        <div className="error-box">
          <strong>Error:</strong> {error}
        </div>
      )}

      {resultUrl && (
        <div className="result-section">
          <h2>Result</h2>
          {stats && (
            <p className="stats">
              Credits used: <strong>{stats.credits}</strong> &middot; Time:{" "}
              <strong>{stats.elapsed}s</strong>
            </p>
          )}
          <div className="result-image-wrapper">
            <img src={resultUrl} alt="Try-on result" className="result-img" />
          </div>
          <a
            href={resultUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="open-link"
          >
            Open full-size in new tab ↗
          </a>
        </div>
      )}
    </main>
  );
}
