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

function isHeic(mime: string, filename: string) {
  const lower = filename.toLowerCase();
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

    if (!slug) {
      return Response.json({ error: "Missing slug" }, { status: 400 });
    }
    if (!token) {
      return Response.json({ error: "Missing token" }, { status: 400 });
    }

    // Validate upload token by reading users row
    const uRes = await supabaseRest(
      `/rest/v1/users?select=user_id,profile_slug,upload_token&profile_slug=eq.${encodeURIComponent(
        slug
      )}&limit=1`
    );
    const uJson = await uRes.json().catch(() => []);
    const user = Array.isArray(uJson) ? uJson[0] : null;

    if (!user) {
      return Response.json({ error: "Invalid slug" }, { status: 404 });
    }
    if (!user.upload_token || user.upload_token !== token) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return Response.json({ error: "Missing file" }, { status: 400 });
    }

    const mime = file.type || "application/octet-stream";
    const filename = file.name || "upload";

    const buf = Buffer.from(await file.arrayBuffer());

    let outBuf = buf;
    let outMime = mime;

    // Convert HEIC/HEIF -> JPEG
    if (isHeic(mime, filename)) {
      const heicConvert = (await import("heic-convert")).default;
      outBuf = Buffer.from(
        await heicConvert({
          buffer: buf,
          format: "JPEG",
          quality: 0.9,
        })
      );
      outMime = "image/jpeg";
    } else if (
      mime !== "image/jpeg" &&
      mime !== "image/png" &&
      mime !== "image/webp"
    ) {
      // If it's some other image type, still store but force jpeg would be better.
      // For now just reject to keep OG reliable.
      return Response.json(
        { error: `Unsupported image type: ${mime}. Please upload JPG/PNG/WebP.` },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage: profile-photos bucket
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
      return Response.json(
        { error: "Upload failed", details: text },
        { status: 500 }
      );
    }

    const photo_url = publicPhotoUrl(slug);

    // Update users.photo_url to the new jpg URL
    const patchRes = await supabaseRest(`/rest/v1/users?profile_slug=eq.${encodeURIComponent(slug)}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        prefer: "return=minimal",
      },
      body: JSON.stringify({ photo_url }),
    });

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
      photo_url,
      convertedFromHeic: isHeic(mime, filename),
    });
  } catch (e: any) {
    return Response.json(
      { error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
