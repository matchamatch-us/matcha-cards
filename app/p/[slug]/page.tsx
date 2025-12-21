import { getProfileBySlug } from "@/lib/getProfile";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { user, extra } = await getProfileBySlug(slug);

  const name = user?.name ?? "Matcha Match";
  const school = extra?.school ?? "";
  const job = extra?.job_type ?? "";
  const baseUrl = process.env.SITE_URL || "https://matcha-cards.vercel.app";

  const og = `${baseUrl}/api/og/${slug}?v=${Date.now()}`;

  return {
    title: `${name} • Matcha Match`,
    description: [school, job].filter(Boolean).join(" • "),
    openGraph: {
      title: `${name} • Matcha Match`,
      description: [school, job].filter(Boolean).join(" • "),
      url: `${baseUrl}/p/${slug}`,
      images: [{ url: og, width: 1080, height: 1920 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} • Matcha Match`,
      description: [school, job].filter(Boolean).join(" • "),
      images: [og],
    },
  };
}

export default async function ProfilePage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { user, extra } = await getProfileBySlug(slug);

  if (!user) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b0b0b", color: "white", padding: 24 }}>
        <div>Profile not found.</div>
      </main>
    );
  }

  const name = user.name ?? "Matcha Match User";
  const school = extra?.school ?? "";
  const job = extra?.job_type ?? "";
  const accent = (user as any)?.favorite_color || "#7CFFB2";
  const photo = user.photo_url || "";

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b0b0b", padding: 24 }}>
      <div style={{ width: "min(440px, 92vw)" }}>
        <div
          style={{
            width: "100%",
            aspectRatio: "9 / 16",
            borderRadius: 28,
            overflow: "hidden",
            position: "relative",
            backgroundColor: "#111",
            boxShadow: "0 20px 80px rgba(0,0,0,0.6)",
            backgroundImage: photo ? `url(${photo})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.05) 55%, rgba(0,0,0,0.55))",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: "7%",
              left: "7%",
              right: "7%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              color: "white",
            }}
          >
            <div
              style={{
                padding: "12px 18px",
                borderRadius: 18,
                border: `4px solid ${accent}`,
                background: "rgba(0,0,0,0.25)",
                fontSize: 42,
                fontWeight: 900,
                lineHeight: 1.05,
              }}
            >
              {name}
            </div>
            <div style={{ marginTop: 14, fontSize: 22, opacity: 0.9 }}>
              Connecting
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              left: "7%",
              right: "7%",
              bottom: "7%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 16,
              color: "white",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 26, fontWeight: 900 }}>{school}</div>
              <div style={{ fontSize: 18, opacity: 0.9 }}>{job}</div>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.92)",
                color: "#000",
                padding: "12px 16px",
                borderRadius: 16,
                fontSize: 16,
                fontWeight: 900,
              }}
            >
              Connect Now
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
