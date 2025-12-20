"use client";

import { useMemo, useState } from "react";

export default function UploadPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { token?: string };
}) {
  const slug = params.slug;
  const token = searchParams?.token || "";

  const endpoint = useMemo(() => {
    const t = encodeURIComponent(token);
    return `/api/upload?slug=${encodeURIComponent(slug)}&token=${t}`;
  }, [slug, token]);

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setStatus("Uploading...");

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch(endpoint, {
      method: "POST",
      body: fd,
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setStatus(`Error: ${json?.error || "Upload failed"}`);
      return;
    }

    setStatus("Uploaded! Generating preview…");

    // After upload, take them to their profile (with cache-bust)
    const v = Date.now();
    window.location.href = `/p/${encodeURIComponent(slug)}?v=${v}`;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#0b0b0b",
        color: "white",
        fontFamily: "system-ui",
      }}
    >
      <div style={{ width: "min(520px, 92vw)" }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 10 }}>
          Upload your photo
        </h1>
        <p style={{ opacity: 0.85, marginBottom: 18 }}>
          This photo will be used on your Matcha Match profile card.
        </p>

        {!token ? (
          <div
            style={{
              background: "rgba(255,255,255,0.1)",
              padding: 16,
              borderRadius: 14,
            }}
          >
            Missing token in URL. Please use the link you were texted.
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            style={{
              background: "rgba(255,255,255,0.06)",
              padding: 18,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{ display: "block", marginBottom: 14 }}
            />
            <button
              type="submit"
              disabled={!file}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                fontWeight: 900,
                border: "none",
                cursor: file ? "pointer" : "not-allowed",
              }}
            >
              Upload
            </button>
            {status ? (
              <div style={{ marginTop: 14, opacity: 0.9 }}>{status}</div>
            ) : null}
          </form>
        )}
      </div>
    </main>
  );
}
