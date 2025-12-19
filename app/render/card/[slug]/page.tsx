import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function sanitizeHexColor(input: unknown, fallback = "#2E5C4C") {
  const s = (typeof input === "string" ? input : "").trim();
  // Allow only hex colors to avoid any CSS injection weirdness.
  if (/^#([0-9a-fA-F]{3}){1,2}$/.test(s)) return s;
  if (/^#([0-9a-fA-F]{8})$/.test(s)) return s; // #RRGGBBAA
  return fallback;
}

export default async function RenderCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;

  // --- Token gate ---
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

  // --- Load user + profile data (use select("*") so missing columns won't crash) ---
  const supabase = supabaseServer();

  const { data: user, error: userErr } = await supabase
    .from("users")
    .select("*")
    .eq("profile_slug", slug)
    .maybeSingle();

  if (userErr) throw userErr;
  if (!user) return <div style={{ padding: 40 }}>Not found</div>;

  const role = (user.role ?? "").toString();

  let extra: any = null;
  if (role === "mentor") {
    const { data, error } = await supabase
      .from("mentor_profiles")
      .select("*")
      .eq("user_id", user.user_id)
      .maybeSingle();
    if (error) throw error;
    extra = data;
  } else if (role === "mentee") {
    const { data, error } = await supabase
      .from("mentee_profiles")
      .select("*")
      .eq("user_id", user.user_id)
      .maybeSingle();
    if (error) throw error;
    extra = data;
  }

  const favoriteColor = sanitizeHexColor(extra?.favorite_color ?? user?.favorite_color ?? "#2E5C4C");
  const school = extra?.school ?? "";
  const jobType = extra?.job_type ?? "";

  // Responsive scale: fit within viewport width/height, centered.
  // This keeps the "design size" 1080x1920 and scales it down as needed.
  const W = 1080;
  const H = 1920;

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#f5f5f5",
      }}
    >
      <div
        style={{
          // CSS variable scale = min(1, availableWidth/1080, availableHeight/1920)
          // so it auto-fits on any screen and stays centered.
          ["--pad" as any]: "24px",
          ["--scale" as any]: `min(1, calc((100vw - (var(--pad) * 2)) / ${W}), calc((100vh - (var(--pad) * 2)) / ${H}))`,
          width: `calc(${W}px * var(--scale))`,
          height: `calc(${H}px * var(--scale))`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          id="card-root"
          style={{
            width: W,
            height: H,
            transform: "scale(var(--scale))",
            transformOrigin: "center",
            borderRadius: 80,
            overflow: "hidden",
            position: "relative",
            background: "linear-gradient(180deg, #bcd4e6 0%, #cfd9c2 70%, #ffffff 100%)",
            boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
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
                  fontSize: 40,
                }}
              >
                Missing photo_url
              </div>
            )}

            {/* Soft overlay for legibility */}
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.12)" }} />

            {/* Slight bottom fade for text */}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: 520,
                background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 100%)",
              }}
            />
          </div>

          {/* Top text (name bigger + colored box) */}
          <div
            style={{
              position: "absolute",
              top: 72,
              left: 0,
              right: 0,
              textAlign: "center",
              color: "white",
              zIndex: 10,
              padding: "0 80px",
              textShadow: "0 10px 30px rgba(0,0,0,0.35)",
            }}
          >
            <div
              style={{
                display: "inline-block",
                background: favoriteColor,
                padding: "18px 34px",
                borderRadius: 26,
                boxShadow: "0 18px 45px rgba(0,0,0,0.25)",
              }}
            >
              <div style={{ fontSize: 104, fontWeight: 800, lineHeight: 1.02 }}>
                {user.name || "Matcha Match"}
              </div>
            </div>

            <div style={{ fontSize: 42, opacity: 0.95, marginTop: 22 }}>Connecting</div>
          </div>

          {/* Bottom bar */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 72, zIndex: 10 }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
              <div style={{ color: "white", textShadow: "0 10px 30px rgba(0,0,0,0.35)" }}>
                <div style={{ fontSize: 58, fontWeight: 800, lineHeight: 1.05 }}>{school}</div>
                <div style={{ fontSize: 44, opacity: 0.92, marginTop: 10 }}>{jobType}</div>
              </div>

              <div
                style={{
                  background: "white",
                  borderRadius: 30,
                  padding: "36px 56px",
                  boxShadow: "0 18px 45px rgba(0,0,0,0.25)",
                  fontSize: 40,
                  fontWeight: 800,
                }}
              >
                Connect Now
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

