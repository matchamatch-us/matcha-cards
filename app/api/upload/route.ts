import { NextRequest } from "next/server";

export const runtime = "nodejs"; // IMPORTANT: heic-convert needs Node runtime

async function supabaseRest(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return fetch(`${supabaseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      ...(init.headers || {}),
    },
  });
}

function publicPhotoUrl(slug: string) {
  const supabaseUrl = process.env.SUPABASE_URL!.replace(/\/$/, "");
  return `${supabaseUrl}/storage/v1/object/public/profile-photos/photos/${encodeURIComponent(
    slug
  )}.jpg`;
}

// HEIC sniff: ISO BMFF files contain "ftyp" + brand like "heic"/"heif"/"mif1"/"heix"/"hevc"
function looksLikeHeic(buf: Buffer) {
  if (!buf || buf.length < 16) return false;
  const head = buf.subarray(0, 64).toString("latin1");
  // typical brands that indicate HEIF/HEIC container
  return (
    head.includes("ftypheic") ||
    head.includes("ftypheif") ||
    head.includes("ftypheix") ||
    head.includes("ftyphevc") ||
    head.includes("ftypmif1") ||
    head.includes("ftypmsf1")
  );
}

function isHeicByMeta(mime: string, filename: string) {
  const lower = (filename || "").toLowerCase();
  return (
    mime === "image/heic" ||
    mime === "image/heif" ||
    lower.endsWith(".heic") ||
    lower.endsWith(".heif")
  );
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    const token = url.searchParams.get("token");

    if (!slug) return Response.json({ error: "Missing slug" }, { status: 400 });
    if (!token) return Response.json({ error: "Missing token" }, { status: 400 });

    // Validate upload token
    const uRes = await supabaseRest(
      `/rest/v1/users?select=user_id,profile_slug,upload_token&profile_slug=eq.${encodeURIComponent(
        slug
      )}&limit=1`
    );
    const uJson = await uRes.json().catch(() => []);
    const user = Array.isArray(uJson) ? uJson[0] : null;

    if (!user) return Response.json({ error: "Invalid slug" }, { status: 404 });
    if (!user.upload_token || user.upload_token !== token) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return Response.json({ error: "Missing file" }, { status: 400 });
    }

    const mime = file.type || ""; // sometimes empty
    const filename = file.name || "upload";

    const buf = Buffer.from(await file.arrayBuffer());

    const shouldConvertHeic = isHeicByMeta(mime, filename) || looksLikeHeic(buf);

    let outBuf = buf;
    let outMime = mime || "application/octet-stream";
    let convertedFromHeic = false;

    if (shouldConvertHeic) {
      const heicConvert = (await import("heic-convert")).default;
      outBuf = Buffer.from(
        await heicConvert({
          buffer: buf,
          format: "JPEG",
          quality: 0.9,
        })
      );
      outMime = "image/jpeg";
      convertedFromHeic = true;
    } else {
      // Allow only OG-safe formats if not HEIC
      const ok =
        outMime === "image/jpeg" ||
        outMime === "image/jpg" ||
        outMime === "image/png" ||
        outMime === "image/webp";

      if (!ok) {
        return Response.json(
          { error: `Unsupported image type: ${outMime || "(empty)"} — please upload JPG/PNG/WebP.` },
          { status: 400 }
        );
      }

      // normalize jpg
      if (outMime === "image/jpg") outMime = "image/jpeg";
    }

    // Upload as .jpg (even if original was png/webp, still okay for now — but we’ll keep bytes as-is)
    // If you want to always convert everything to jpg, tell me and I’ll do it.
    const objectPath = `photos/${slug}.jpg`;

    const upRes = await supabaseRest(
      `/storage/v1/object/profile-photos/${encodeURIComponent(objectPath)}`,
      {
        method: "PUT",
        headers: {
          "content-type": outMime,
          "x-upsert": "true",
        },
        body: outBuf,
      }
    );

    if (!upRes.ok) {
      const text = await upRes.text().catch(() => "");
      return Response.json({ error: "Upload failed", details: text }, { status: 500 });
    }

    const photo_url = publicPhotoUrl(slug);

    // Update users.photo_url to public jpg URL
    const patchRes = await supabaseRest(
      `/rest/v1/users?profile_slug=eq.${encodeURIComponent(slug)}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          prefer: "return=minimal",
        },
        body: JSON.stringify({ photo_url }),
      }
    );

    if (!patchRes.ok) {
      const text = await patchRes.text().catch(() => "");
      return Response.json(
        { error: "DB update failed", details: text, photo_url },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      slug,
      filename,
      mime,
      detectedHeic: shouldConvertHeic,
      convertedFromHeic,
      storedContentType: outMime,
      photo_url,
    });
  } catch (e: any) {
    return Response.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
