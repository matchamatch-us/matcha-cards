export const dynamic = "force-dynamic";

export default async function UploadPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const tokenRaw = Array.isArray(sp.token) ? sp.token[0] : sp.token;
  const token = (tokenRaw ?? "").trim();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#f5f5f5",
      }}
    >
      <div style={{ width: "100%", maxWidth: 520 }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>Upload your profile photo</h1>
        <p style={{ opacity: 0.8, marginBottom: 20 }}>
          Choose a clear headshot/selfie. This will be used on your Matcha Match profile card.
        </p>

        <form
          action="/api/upload"
          method="post"
          encType="multipart/form-data"
          style={{
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 12,
            padding: 18,
            display: "grid",
            gap: 12,
            background: "white",
          }}
        >
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="token" value={token} />

          <input name="file" type="file" accept="image/*" required style={{ fontSize: 16 }} />

          <button
            type="submit"
            style={{
              padding: "12px 14px",
              fontSize: 16,
              fontWeight: 700,
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
            }}
          >
            Upload Photo
          </button>
        </form>

        <p style={{ marginTop: 14, fontSize: 13, opacity: 0.65 }}>
          If you have trouble, try a smaller image or a different browser.
        </p>
      </div>
    </div>
  );
}
