"use client";

import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

async function compressToJpeg(
  file: File,
  opts?: { maxDim?: number; quality?: number }
) {
  const maxDim = opts?.maxDim ?? 1600;   // lower if you hit 413 again
  const quality = opts?.quality ?? 0.82; // lower if needed

  // If already small JPEG, keep it
  if (file.size <= 1_800_000 && /jpe?g/i.test(file.type)) return file;

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Could not load image"));
      i.src = url;
    });

    const w = (img as any).naturalWidth ?? img.width;
    const h = (img as any).naturalHeight ?? img.height;

    const scale = Math.min(1, maxDim / Math.max(w, h));
    const outW = Math.max(1, Math.round(w * scale));
    const outH = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No canvas context");
    ctx.drawImage(img, 0, 0, outW, outH);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("JPEG encode failed"))),
        "image/jpeg",
        quality
      );
    });

    return new File([blob], "upload.jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function UploadPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const slug = useMemo(() => {
    const raw = (params as any)?.slug;
    if (typeof raw === "string") return raw;
    if (Array.isArray(raw)) return raw[0] ?? "";
    return "";
  }, [params]);

  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const prettySize = (n: number) => `${(n / (1024 * 1024)).toFixed(2)} MB`;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    if (!slug) {
      setMsg("Missing profile slug in URL. Please use the exact link you were texted.");
      return;
    }
    if (!token) {
      setMsg("Missing token in URL. Please use the exact link you were texted.");
      return;
    }
    if (!file) {
      setMsg("Please choose a photo.");
      return;
    }

    setBusy(true);
    try {
      const outFile = await compressToJpeg(file);

      if (outFile.size > 3_500_000) {
        setMsg(
          `That photo is still too large (${prettySize(outFile.size)}). Try a different photo or crop it.`
        );
        setBusy(false);
        return;
      }

      const fd = new FormData();
      fd.append("file", outFile);

      const apiUrl = `/api/upload?slug=${encodeURIComponent(slug)}&token=${encodeURIComponent(token)}`;

      const res = await fetch(apiUrl, {
        method: "POST",
        body: fd,
      });

      const contentType = res.headers.get("content-type") || "";
      if (!res.ok) {
        if (contentType.includes("application/json")) {
          const j = await res.json();
          setMsg(j?.error || "Upload failed.");
        } else {
          setMsg("Upload failed.");
        }
        setBusy(false);
        return;
      }

      // Redirect to /p/:slug (cache-busted)
      window.location.href = `/p/${slug}?v=${Date.now()}`;
    } catch (err: any) {
      setMsg(err?.message || "Upload failed.");
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b0b0b",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "min(720px, 92vw)",
          color: "white",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        }}
      >
        <h1 style={{ fontSize: 52, margin: 0, fontWeight: 900 }}>Upload your photo</h1>
        <p style={{ marginTop: 12, fontSize: 20, opacity: 0.85 }}>
          This photo will be used on your Matcha Match profile card.
        </p>

        {/* Debug line so you can SEE what slug/token the page is using */}
        <div style={{ marginTop: 10, fontSize: 14, opacity: 0.65 }}>
          Debug: slug=<code style={{ opacity: 1 }}>{slug || "(missing)"}</code>{" "}
          token=<code style={{ opacity: 1 }}>{token ? token.slice(0, 10) + "…" : "(missing)"}</code>
        </div>

        {!slug || !token ? (
          <div
            style={{
              marginTop: 22,
              padding: 18,
              borderRadius: 16,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: 18,
            }}
          >
            Missing slug or token in URL. Please use the exact link you were texted.
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            style={{
              marginTop: 26,
              padding: 22,
              borderRadius: 18,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={{ fontSize: 18 }}
              disabled={busy}
            />

            {file ? (
              <div style={{ marginTop: 10, opacity: 0.8 }}>
                Selected: <b>{file.name}</b> ({prettySize(file.size)})
              </div>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              style={{
                marginTop: 18,
                width: "100%",
                padding: "14px 16px",
                borderRadius: 14,
                border: "none",
                fontSize: 18,
                fontWeight: 800,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              {busy ? "Uploading..." : "Upload Photo"}
            </button>

            {msg ? (
              <div style={{ marginTop: 14, color: "#ffb3b3", fontWeight: 700 }}>
                {msg}
              </div>
            ) : null}
          </form>
        )}
      </div>
    </main>
  );
}
