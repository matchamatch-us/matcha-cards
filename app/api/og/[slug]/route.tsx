import { ImageResponse } from "next/og";

export const runtime = "edge";

type UserRow = {
  user_id: string;
  name: string | null;
  role: "mentor" | "mentee" | null;
  profile_slug: string | null;
  photo_url: string | null;
  favorite_color: string | null;
};

type ExtraRow = {
  school: string | null;
  job_type: string | null;
};

async function supabaseSelect<T>(
  table: string,
  query: Record<string, string>
): Promise<T[]> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("Missing Supabase env vars", {
      hasUrl: !!supabaseUrl,
      hasKey: !!serviceKey,
    });
    return [];
  }

  const qs = new URLSearchParams(query);
  const url = `${supabaseUrl}/rest/v1/${table}?${qs.toString()}`;

  const res = await fetch(url, {
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      // keep it explicit
      "content-type": "application/json",
    },
    // Edge fetch caching can be weird; force fresh
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Supabase REST error", table, res.status, text);
    return [];
  }

  return (await res.json()) as T[];
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  // defaults (fallback)
  let name = "Matcha Match User";
  let school = "";
  let job = "";
  let photo = "";
  let accent = "#7CFFB2";

  // 1) fetch user by profile_slug
  const users = await supabaseSelect<UserRow>("users", {
    select: "user_id,name,role,profile_slug,photo_url,favorite_color",
    profile_slug: `eq.${slug}`,
    limit: "1",
  });

  const user = users[0];
  if (user) {
    name = user.name ?? name;
    photo = user.photo_url ?? "";
    accent = user.favorite_color ?? accent;

    // 2) role-specific fetch
    if (user.role === "mentor") {
      const extra = await supabaseSelect<ExtraRow>("mentor_profiles", {
        select: "school,job_type",
        user_id: `eq.${user.user_id}`,
        limit: "1",
      });
      school = extra[0]?.school ?? "";
      job = extra[0]?.job_type ?? "";
    } else if (user.role === "mentee") {
      const extra = await supabaseSelect<ExtraRow>("mentee_profiles", {
        select: "school,job_type",
        user_id: `eq.${user.user_id}`,
        limit: "1",
      });
      school = extra[0]?.school ?? "";
      job = extra[0]?.job_type ?? "";
    }
  } else {
    console.error("No user found for slug:", slug);
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
