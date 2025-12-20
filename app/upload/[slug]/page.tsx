export const dynamic = "force-dynamic";

type MaybePromise<T> = T | Promise<T>;

export default async function UploadPage(props: {
  params: MaybePromise<{ slug: string }>;
  searchParams?: MaybePromise<{ token?: string }>;
}) {
  const { slug } = await props.params;
  const sp = (await props.searchParams) ?? {};
  const token = sp.token ?? "";

  const action = `/api/upload?slug=${encodeURIComponent(
    slug
  )}&token=${encodeURIComponent(token)}`;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        background: "#0b0b0b",
        color: "white",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
      }}
    >
      <div style={{ width: "min(760px, 92vw)" }}>
        <h1 style={{ fontSize: 56, margin: 0, fontWeight: 800 }}>
          Upload your photo
        </h1>
        <p style={{ marginTop: 14, fontSize: 22, opacity: 0.85 }}>
          This photo will be used on your Matcha Match profile card.
        </p>

        {!token ? (
          <div
            style={{
              marginTop: 28,
              padding: "18px 20px",
              borderRadius: 18,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.10)",
              fontSize: 18,
              opacity: 0.95,
            }}
          >
            Missing token in URL. Please use the link you were texted.
          </div>
        ) : (
          <form
            action={action}
            method="POST"
            encType="multipart/form-data"
            style={{
              marginTop: 30,
              padding: 24,
              borderRadius: 22,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <input
              name="file"
              type="file"
              accept="image/*"
              required
              style={{
                width: "100%",
                padding: 18,
                borderRadius: 16,
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "white",
                fontSize: 18,
              }}
            />

            <button
              type="submit"
              style={{
                marginTop: 18,
                width: "100%",
                padding: "16px 18px",
                borderRadius: 16,
                background: "white",
                color: "black",
                border: "none",
                fontSize: 20,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Upload Photo
            </button>

            <p style={{ marginTop: 16, opacity: 0.7 }}>
              If you have trouble, try a smaller image or a different browser.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
