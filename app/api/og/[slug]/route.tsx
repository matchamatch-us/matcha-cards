import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getProfileBySlug } from "@/lib/getProfile";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, context: { params: { slug: string } }) {
  const slug = context.params.slug;

  const u = new URL(req.url);
  const debug = u.searchParams.get("debug") === "1";

  const { user, extra } = await getProfileBySlug(slug);

  const name = user?.name ?? "Matcha Match User";
  const school = extra?.school ?? "";
  const job = extra?.job_type ?? "";
  const accent = (user as any)?.favorite_color ?? "#7CFFB2";

  const photoUrl = user?.photo_url ?? "";
  const photoSrc = photoUrl
    ? `${photoUrl}${photoUrl.includes("?") ? "&" : "?"}t=${Date.now()}`
    : "";

  if (debug) {
    let photoFetch: any = null;
    if (photoSrc) {
      try {
        const r = await fetch(photoSrc, { cache: "no-store" });
        photoFetch = {
          ok: r.ok,
          status: r.status,
          contentType: r.headers.get("content-type"),
        };
      } catch (e: any) {
        photoFetch = { ok: false, error: e?.message || String(e) };
      }
    }

    return new Response(
      JSON.stringify(
        {
          slug,
          userFound: Boolean(user),
          name,
          school,
          job,
          accent,
          photoSrc,
          photoFetch,
        },
        null,
        2
      ),
      { headers: { "content-type": "application/json" } }
    );
  }

  const img = new ImageResponse(
    (
      <div
        style={{
          width: 1080,
          height: 1920,
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "#111",
          fontFamily: "system-ui",
        }}
      >
        {photoSrc ? (
          <img
            src={photoSrc}
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
              "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.05) 55%, rgba(0,0,0,0.55))",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 110,
            left: 80,
            right: 80,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            color: "white",
            textAlign: "center",
          }}
        >
          <div
            style={{
              padding: "18px 26px",
              borderRadius: 22,
              border: `6px solid ${accent}`,
              background: "rgba(0,0,0,0.25)",
              fontSize: 92,
              fontWeight: 900,
              lineHeight: 1.05,
            }}
          >
            {name}
          </div>

          <div style={{ marginTop: 28, fontSize: 48, opacity: 0.9 }}>
            Connecting
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 80,
            right: 80,
            bottom: 100,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 40,
            color: "white",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 68, fontWeight: 900 }}>{school}</div>
            <div style={{ fontSize: 44, opacity: 0.9 }}>{job}</div>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.92)",
              color: "#000",
              padding: "28px 44px",
              borderRadius: 28,
              fontSize: 44,
              fontWeight: 900,
            }}
          >
            Connect Now
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920 }
  );

  img.headers.set("Cache-Control", "no-store");
  return img;
}
