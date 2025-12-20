import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "profile-photos"; // your Supabase bucket name
const FOLDER = "photos"; // folder inside the bucket

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

export async function GET(req: NextRequest) {
  // Debug endpoint (does NOT reveal secrets)
  const url = new URL(req.url);
  const debug = url.searchParams.get("debug") === "1";
  if (!debug) return json({ ok: true });

  const slug = url.searchParams.get("slug") || "";
  const token = url.searchParams.get("token") || "";

  const envToken = process.env.UPLOAD_TOKEN || "";
  return json({
    ok: true,
    slug,
    tokenPresent: Boolean(token),
    envTokenSet: Boolean(envToken),
    tokenMatchesEnv: Boolean(envToken) && token === envToken,
  });
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);

  const slug = url.searchParams.get("slug") || "";
  const token = url.searchParams.get("token") || "";

  if (!slug) return json({ error: "Missing slug" }, 400);

  const expected = process.env.UPLOAD_TOKEN || "";
  if (!expected) {
    // This is the #1 cause of "Invalid token" on Vercel
    return json(
      { error: "Server missing UPLOAD_TOKEN env var (set it in Vercel and redeploy)" },
      500
    );
  }

  if (!token || token !== expected) {
    return json({ error: "Invalid token" }, 401);
  }

  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Missing Supabase env vars" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return json({ error: "Missing file" }, 400);
  }

  // Read file bytes
  const inBuf = Buffer.from(await file.arrayBuffer());

  // Convert ANY image (including HEIC) -> real JPEG bytes
  // rotate() fixes iPhone orientation
  let jpgBuf: Buffer;
  try {
    jpgBuf = await sharp(inBuf).rotate().jpeg({ quality: 85 }).toBuffer();
  } catch (e) {
    return json(
      {
        error:
          "Could not process image. If you uploaded HEIC, try a different image or export as JPG/PNG.",
      },
      400
    );
  }

  const path = `${FOLDER}/${slug}.jpg`;

  // Upload to Supabase Storage (public bucket)
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, jpgBuf, {
      upsert: true,
      contentType: "image/jpeg",
      cacheControl: "3600",
    });

  if (upErr) return json({ error: upErr.message }, 500);

  // Get public URL
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  // Update user photo_url in DB by slug
  const { error: dbErr } = await supabase
    .from("users")
    .update({ photo_url: publicUrl })
    .eq("profile_slug", slug);

  if (dbErr) return json({ error: dbErr.message }, 500);

  // Redirect back to the profile page
  return NextResponse.redirect(new URL(`/p/${slug}?v=${Date.now()}`, req.url), 303);
}
