import type { Metadata } from "next";
import { getProfileBySlug } from "@/lib/getProfile";

export const dynamic = "force-dynamic";

function getBaseUrl() {
  const raw = (process.env.SITE_URL || "https://matcha-cards.vercel.app").trim();
  return raw.replace(/\/+$/, "");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { user, extra } = await getProfileBySlug(slug);

  const title = user?.name ? `${user.name} • Matcha Match` : "Matcha Match profile card";
  const description =
    extra?.school || extra?.job_type
      ? `${extra?.school ?? ""}${extra?.school && extra?.job_type ? " • " : ""}${extra?.job_type ?? ""}`
      : "Matcha Match profile card";

  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/p/${slug}`;
  const ogImage =
    user?.card_og_url ||
    process.env.DEFAULT_OG_IMAGE ||
    `${baseUrl}/default-og.png`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { user, extra } = await getProfileBySlug(slug);

  // Instead of hard 404, show a helpful debug page (for now)
  if (!user) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "system-ui" }}>
        <div style={{ maxWidth: 520, width: "100%" }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Profile not found</h1>
          <p style={{ opacity: 0.7, lineHeight: 1.4 }}>
            No user matched <code>{slug}</code> in <code>users.profile_slug</code>.
          </p>
        </div>
      </main>
    );
  }

  const name = user.name || "Matcha Match User";
  const photo = user.photo_url || "";
  const school = extra?.school || "";
  const job = extra?.job_type || "";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#0b0b0c",
        fontFamily: "system-ui",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div
          style={{
            width: "100%",
            aspectRatio: "9 / 16",
            borderRadius: 32,
            overflow: "hidden",
            boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
            position: "relative",
            background: "#111",
          }}
        >
          {photo ? (
            <img
              src={photo}
              alt={name}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                opacity: 0.7,
              }}
            >
              No photo yet
            </div>
          )}

          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0.0) 55%, rgba(0,0,0,0.45))",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: 28,
              left: 24,
              right: 24,
              textAlign: "center",
              color: "white",
            }}
          >
            <div
              style={{
                fontSize: 34,
                fontWeight: 800,
                lineHeight: 1.1,
                textShadow: "0 8px 20px rgba(0,0,0,0.45)",
              }}
            >
              {name}
            </div>
            <div style={{ marginTop: 8, opacity: 0.9 }}>Connecting</div>
          </div>

          <div
            style={{
              position: "absolute",
              bottom: 24,
              left: 24,
              right: 24,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 16,
              color: "white",
            }}
          >
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{school}</div>
              <div style={{ fontSize: 16, opacity: 0.9 }}>{job}</div>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.92)",
                color: "#000",
                padding: "14px 18px",
                borderRadius: 16,
                fontWeight: 800,
              }}
            >
              Connect Now
            </div>
          </div>
        </div>

        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, marginTop: 12, textAlign: "center" }}>
          This page exists mainly for iMessage link previews (Open Graph).
        </p>
      </div>
    </main>
  );
}
