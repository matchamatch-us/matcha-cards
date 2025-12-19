import { getProfileBySlug } from "@/lib/getProfile";

export const dynamic = "force-dynamic";

export default async function RenderCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;

  const sp = await searchParams;
  const providedRaw = Array.isArray(sp.token) ? sp.token[0] : sp.token;

  const provided = (providedRaw ?? "").trim();
  const expected = (process.env.RENDER_TOKEN ?? "").trim();

  if (!expected) {
    return <div style={{ padding: 40 }}>Server misconfigured: missing RENDER_TOKEN</div>;
  }

  if (provided !== expected) {
    return <div style={{ padding: 40 }}>Unauthorized</div>;
  }

  const { user, extra } = await getProfileBySlug(slug);
  if (!user) return <div style={{ padding: 40 }}>Not found</div>;

  return (
    <div
      id="card-root"
      style={{
        width: 1080,
        height: 1920,
        borderRadius: 80,
        overflow: "hidden",
        position: "relative",
        background: "linear-gradient(180deg, #bcd4e6 0%, #cfd9c2 70%, #ffffff 100%)",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      }}
    >
      {/* Background photo */}
      <div style={{ position: "absolute", inset: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {user.photo_url ? (
          <img
            src={user.photo_url}
            alt="photo"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "rgba(0,0,0,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
            }}
          >
            Missing photo_url
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.10)" }} />
      </div>

      {/* Top text */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 0,
          right: 0,
          textAlign: "center",
          color: "white",
          zIndex: 10,
          padding: "0 80px",
          textShadow: "0 10px 30px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05 }}>
          {user.name || "Matcha Match"}
        </div>
        <div style={{ fontSize: 40, opacity: 0.92, marginTop: 18 }}>Connecting</div>
      </div>

      {/* Bottom bar */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 64, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ color: "white", textShadow: "0 10px 30px rgba(0,0,0,0.35)" }}>
            <div style={{ fontSize: 44, fontWeight: 700 }}>{extra?.school || ""}</div>
            <div style={{ fontSize: 34, opacity: 0.92 }}>{extra?.job_type || ""}</div>
          </div>

          <div
            style={{
              background: "white",
              borderRadius: 30,
              padding: "36px 56px",
              boxShadow: "0 18px 45px rgba(0,0,0,0.25)",
              fontSize: 38,
              fontWeight: 700,
            }}
          >
            + Add Member
          </div>
        </div>
      </div>
    </div>
  );
}

