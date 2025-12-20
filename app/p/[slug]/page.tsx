import type { Metadata } from "next";
import { getProfileBySlug } from "@/lib/getProfile";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function baseUrl() {
  // You already set SITE_URL in Vercel, so rely on it.
  return (process.env.SITE_URL || "https://matcha-cards.vercel.app").replace(/\/$/, "");
}

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const slug = params.slug;
  const site = baseUrl();

  // Always provide OG image, even if DB fetch fails
  const ogImage = `${site}/api/og/${encodeURIComponent(slug)}?v=${Date.now()}`;
  const url = `${site}/p/${encodeURIComponent(slug)}`;

  // Try to personalize title/desc, but never throw
  let title = "Matcha Match profile";
  let description = "Matcha Match profile card";

  try {
    const { user, extra } = await getProfileBySlug(slug);
    if (user?.name) title = `${user.name} • Matcha Match`;
    if (extra?.school || extra?.job_type) {
      description = [extra?.school, extra?.job_type].filter(Boolean).join(" • ");
    }
  } catch (e) {
    console.error("generateMetadata failed:", e);
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: [{ url: ogImage, width: 1080, height: 1920 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ProfilePage(
  { params }: { params: { slug: string } }
) {
  const slug = params.slug;

  try {
    const { user, extra } = await getProfileBySlug(slug);

    if (!user) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui" }}>
          <h1>Profile not found</h1>
          <p>That link may be invalid or expired.</p>
        </div>
      );
    }

    const name = user.name ?? "Matcha Match User";
    const school = extra?.school ?? "";
    const job = extra?.job_type ?? "";
    const photo = user.photo_url ?? "";

    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "#0b0b0b",
          fontFamily: "system-ui",
        }}
      >
        <div
          style={{
            width: "min(420px, 92vw)",
            aspectRatio: "9 / 16",
            borderRadius: 28,
            overflow: "hidden",
            position: "relative",
            background: "#111",
            boxShadow: "0 20px 70px rgba(0,0,0,0.55)",
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
          ) : null}

          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.1) 55%, rgba(0,0,0,0.65))",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: 26,
              left: 26,
              right: 26,
              textAlign: "center",
              color: "white",
            }}
          >
            <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.05 }}>
              {name}
            </div>
            <div style={{ marginTop: 10, fontSize: 18, opacity: 0.9 }}>
              Connecting
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              left: 22,
              right: 22,
              bottom: 22,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 18,
              color: "white",
            }}
          >
            <div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{school}</div>
              <div style={{ fontSize: 16, opacity: 0.9 }}>{job}</div>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.92)",
                color: "#000",
                padding: "12px 16px",
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 900,
                whiteSpace: "nowrap",
              }}
            >
              Connect Now
            </div>
          </div>
        </div>
      </main>
    );
  } catch (e) {
    console.error("ProfilePage failed:", e);
    return (
      <div style={{ padding: 24, fontFamily: "system-ui" }}>
        <h1>Temporary error</h1>
        <p>This profile card couldn’t load right now. Please try again.</p>
      </div>
    );
  }
}
