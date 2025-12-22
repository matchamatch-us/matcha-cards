import { ImageResponse } from "next/og";
import { getProfileBySlug } from "@/lib/getProfile";

export const runtime = "edge";
export const dynamic = "force-dynamic";

function titleCase(s: string) {
  return (s || "")
    .toLowerCase()
    .split(/[\s/_-]+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

function normalizeAccent(input?: string | null) {
  const fallback = "#22c55e";
  if (!input) return fallback;

  const c = String(input).trim();
  if (c.startsWith("#") || c.startsWith("rgb")) return c;

  const key = c.toLowerCase();
  const named: Record<string, string> = {
    green: "#22c55e",
    mint: "#7CFFB2",
    yellow: "#f59e0b",
    orange: "#f97316",
    red: "#ef4444",
    pink: "#ec4899",
    purple: "#a855f7",
    blue: "#3b82f6",
    teal: "#14b8a6",
    black: "#111111",
    white: "#ffffff",
  };

  return named[key] || fallback;
}

function safeText(v: any) {
  return (v ?? "").toString();
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const url = new URL(req.url);
  const debug = url.searchParams.get("debug") === "1";

  const { user, extra } = await getProfileBySlug(slug);

  // Pull fields with flexible fallbacks (handles email vs email_address, etc.)
  const name = safeText(user?.name) || "Matcha Match User";
  const school = safeText((extra as any)?.school);
  const jobRaw = safeText((extra as any)?.job_type);
  const job = jobRaw ? titleCase(jobRaw) : "";
  const accent = normalizeAccent((user as any)?.favorite_color);

  const email =
    safeText((user as any)?.email) ||
    safeText((user as any)?.email_address) ||
    safeText((user as any)?.emailAddress) ||
    "";

  const photo = safeText((user as any)?.photo_url);

  const subtitle = `${school ? `${school} student` : "Student"}${
    job ? ` seeking ${job} internship.` : " seeking an internship."
  }`;

  if (debug) {
    return Response.json({
      slug,
      userFound: Boolean(user),
      name,
      school,
      job,
      email,
      accent,
      photoSrc: photo,
    });
  }

  const W = 1080;
  const H = 1920;

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 30% 10%, #f5f5f5, #e9eaee)",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        }}
      >
        {/* Outer card */}
        <div
          style={{
            width: 920,
            height: 1680,
            borderRadius: 92,
            overflow: "hidden",
            background: "#fff",
            border: "10px solid rgba(255,255,255,0.95)",
            boxShadow: "0 60px 160px rgba(0,0,0,0.22)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Photo section */}
          <div style={{ position: "relative", width: "100%", height: 1080 }}>
            {photo ? (
              <img
                src={photo}
                alt=""
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
                  background:
                    "linear-gradient(135deg, rgba(0,0,0,0.08), rgba(0,0,0,0.02))",
                }}
              />
            )}

            {/* subtle highlight */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to bottom, rgba(255,255,255,0.22), rgba(255,255,255,0.00) 35%)",
              }}
            />
          </div>

          {/* Content section (frosted-ish panel look) */}
          <div
            style={{
              flex: 1,
              padding: 64,
              background:
                "linear-gradient(to bottom, rgba(255,255,255,0.92), rgba(255,255,255,0.98))",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {/* Name + badge */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  color: "#0b0b0b",
                }}
              >
                <div
                  style={{
                    fontSize: 74,
                    fontWeight: 950,
                    letterSpacing: -1.2,
                    lineHeight: 1.05,
                  }}
                >
                  {name}
                </div>

                {/* badge (accent) */}
                <div style={{ width: 64, height: 64 }}>
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 64 64"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* “seal” shape (scalloped) */}
                    <path
                      d="M32 4
                         C36 9, 44 8, 48 12
                         C52 16, 51 24, 56 28
                         C61 32, 60 40, 56 44
                         C52 48, 44 47, 40 52
                         C36 57, 28 56, 24 52
                         C20 48, 12 49, 8 44
                         C4 40, 5 32, 8 28
                         C12 24, 11 16, 16 12
                         C20 8, 28 9, 32 4Z"
                      fill={accent}
                      opacity="1"
                    />
                    {/* check */}
                    <path
                      d="M46 23L28.5 40.5L18 30"
                      stroke="#fff"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Subtitle */}
              <div
                style={{
                  marginTop: 20,
                  fontSize: 36,
                  lineHeight: 1.25,
                  color: "#1f2937",
                  opacity: 0.92,
                  maxWidth: 760,
                }}
              >
                {subtitle}
              </div>
            </div>

            {/* Bottom row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 24,
              }}
            >
              {/* person icon + email */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  color: "#111827",
                  fontSize: 30,
                  fontWeight: 800,
                  maxWidth: 560,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  opacity: 0.9,
                }}
              >
                <svg
                  width="34"
                  height="34"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M20 21c0-3.314-3.582-6-8-6s-8 2.686-8 6"
                    stroke="#111827"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                    stroke="#111827"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                  {email || "—"}
                </div>
              </div>

              {/* Connect button */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  padding: "22px 40px",
                  borderRadius: 999,
                  background: "rgba(0,0,0,0.06)",
                  border: "1px solid rgba(0,0,0,0.10)",
                  boxShadow: "0 18px 50px rgba(0,0,0,0.12)",
                  color: "#0b0b0b",
                  fontSize: 34,
                  fontWeight: 950,
                }}
              >
                Connect
                <span style={{ fontSize: 40, lineHeight: 1, marginTop: -2 }}>+</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: W, height: H }
  );
}
