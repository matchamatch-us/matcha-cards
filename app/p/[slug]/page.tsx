import type { Metadata } from "next";
import { getProfileBySlug } from "@/lib/getProfile";

function cleanBaseUrl(url: string) {
  return url.replace(/\/$/, "");
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { slug: string } | Promise<{ slug: string }>;
  searchParams?: Record<string, string> | Promise<Record<string, string>>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sp = (await searchParams) || {};
  const shareV = typeof sp.v === "string" ? sp.v : undefined;

  const baseUrl = cleanBaseUrl(
    process.env.SITE_URL || "https://matcha-cards.vercel.app"
  );

  try {
    const { user, extra } = await getProfileBySlug(slug);

    const title = user?.name ? `${user.name} • Matcha Match` : "Matcha Match";
    const description = extra?.school
      ? `${extra.school}${extra.job_type ? " • " + extra.job_type : ""}`
      : "Matcha Match profile card";

    // Use a cache-busting version.
    // Priority:
    // 1) explicit ?v= passed in the URL (lets you force-refresh iMessage preview)
    // 2) user's updated_at (if present in users table)
    // 3) user's card_last_generated_at
    // 4) fallback to slug (stable)
    const updatedAt =
      (user as any)?.updated_at ||
      (user as any)?.card_last_generated_at ||
      null;

    const version =
      shareV ||
      (updatedAt ? String(new Date(updatedAt as string).getTime()) : slug);

    const ogImage = `${baseUrl}/api/og/${encodeURIComponent(
      slug
    )}?v=${encodeURIComponent(version)}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `${baseUrl}/p/${encodeURIComponent(slug)}`,
        images: [
          {
            url: ogImage,
            width: 1080,
            height: 1920,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImage],
      },
      alternates: {
        canonical: `${baseUrl}/p/${encodeURIComponent(slug)}`,
      },
    };
  } catch (e) {
    // Never let metadata throw (it can cause iMessage + bots to cache a bad response)
    const ogImage = `${baseUrl}/default-og.png`;
    return {
      title: "Matcha Match",
      description: "Matcha Match profile card",
      openGraph: {
        title: "Matcha Match",
        description: "Matcha Match profile card",
        url: `${baseUrl}/p/${encodeURIComponent(slug)}`,
        images: [{ url: ogImage, width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        title: "Matcha Match",
        description: "Matcha Match profile card",
        images: [ogImage],
      },
    };
  }
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: { slug: string } | Promise<{ slug: string }>;
  searchParams?: Record<string, string> | Promise<Record<string, string>>;
}) {
  const { slug } = await params;
  const sp = (await searchParams) || {};
  const shareV = typeof sp.v === "string" ? sp.v : undefined;

  const baseUrl = cleanBaseUrl(
    process.env.SITE_URL || "https://matcha-cards.vercel.app"
  );

  // Render the exact image used for OG (so you can visually confirm)
  const version = shareV || String(Date.now()); // ok for the page render
  const ogImage = `${baseUrl}/api/og/${encodeURIComponent(
    slug
  )}?v=${encodeURIComponent(version)}`;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        background: "#0b0b0b",
      }}
    >
      <div style={{ width: "min(440px, 92vw)" }}>
        <img
          src={ogImage}
          alt="Matcha Match profile card"
          style={{
            width: "100%",
            height: "auto",
            borderRadius: 28,
            boxShadow: "0 20px 80px rgba(0,0,0,0.6)",
            display: "block",
          }}
        />
      </div>
    </main>
  );
}
