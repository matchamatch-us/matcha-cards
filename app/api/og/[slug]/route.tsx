import { ImageResponse } from "next/og";
import { getProfileBySlug } from "@/lib/getProfile";

export const runtime = "edge";

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const urlObj = new URL(req.url);
  const debugMode = urlObj.searchParams.get("debug") === "1";

  const slug = params.slug;

  // defaults
  let name = "Matcha Match User";
  let school = "";
  let job = "";
  let photo = "";
  let accent = "#7CFFB2";

  try {
    const { user, extra, debug } = await getProfileBySlug(slug);

    if (debugMode) {
      return Response.json({
        slug,
        env: {
          SUPABASE_URL: !!process.env.SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
        debug,
        userFound: !!user,
        user: user
          ? {
              user_id: user.user_id,
              name: user.name,
              role: user.role,
              profile_slug: user.profile_slug,
              photo_url: user.photo_url,
              favorite_color: user.favorite_color,
            }
          : null,
        extra,
      });
    }

    if (user) {
      name = user.name ?? name;
      photo = user.photo_url ?? "";
      accent = user.favorite_color ?? accent;
    }
    if (extra) {
      school = extra.school ?? "";
      job = extra.job_type ?? "";
    }
  } catch (e: any) {
    if (debugMode) {
      return Response.json({
        slug,
        error: e?.message || String(e),
        env: {
          SUPABASE_URL: !!process.env.SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      });
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1920px",
          display: "flex",
          position: "relative",
          borderRadius: 80,
          overflow: "hidden",
          background: "#111",
          fontFamily: "system-ui",
        }}
      >
        {photo ? (
          <img
            src={photo}
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
}
