import type { Metadata } from "next";
import { getProfileBySlug } from "@/lib/getProfile";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { user, extra } = await getProfileBySlug(params.slug);

  const title = user?.name ? `${user.name} — Matcha Match` : "Matcha Match Profile";
  const desc =
    extra?.school && extra?.job_type
      ? `${extra.school} • ${extra.job_type}`
      : "Matcha Match profile card";

  const baseUrl = process.env.https://matcha-cards.vercel.app!;
  const url = `${baseUrl}/p/${params.slug}`;

  const ogBase = user?.card_og_url || process.env.DEFAULT_OG_IMAGE!;
  const v = user?.card_last_generated_at
    ? `?v=${encodeURIComponent(user.card_last_generated_at)}`
    : "";
  const ogImage = `${ogBase}${v}`;

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      url,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [ogImage],
    },
    robots: { index: false, follow: false },
  };
}

export default async function ProfilePage({ params }: Props) {
  const { user, extra } = await getProfileBySlug(params.slug);

  if (!user) {
    return <div className="p-10">Not found.</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-neutral-50">
      <div className="w-full max-w-md">
        <div className="mb-4 text-center">
          <div className="text-2xl font-semibold">{user.name || "Matcha Match"}</div>
          <div className="text-sm text-neutral-600">
            {extra?.school ? extra.school : ""} {extra?.job_type ? `• ${extra.job_type}` : ""}
          </div>
          <div className="text-xs text-neutral-400 mt-1">{user.role}</div>
        </div>

        {user.card_status !== "ready" || !user.card_full_url ? (
          <div className="rounded-2xl bg-white shadow p-6 text-center">
            Card not generated yet.
            <div className="text-sm text-neutral-500 mt-2">
              (Once generated, it will show here and the link preview will improve.)
            </div>
          </div>
        ) : (
          <div className="rounded-3xl overflow-hidden shadow bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={user.card_full_url} alt="Profile card" className="w-full h-auto" />
          </div>
        )}

        {user.card_full_url && (
          <div className="mt-4">
            <a
              href={user.card_full_url}
              className="block text-center rounded-xl bg-black text-white py-3"
              target="_blank"
              rel="noreferrer"
            >
              Download card
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
