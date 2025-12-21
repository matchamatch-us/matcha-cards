
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "profile-photos"; // Supabase bucket name
const FOLDER = "photos"; // folder inside the bucket

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !serviceKey) return null;

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

export async function GET(req: NextRequest) {
  // Debug endpoint (does NOT reveal secrets)
  const url = new URL(req.url);
  const debug = url.searchParams.get("debug") === "1";
  if (!debug) return json({ ok: true });

  const slug = url.searchParams.get("slug") || "";
  const token = url.searchParams.get("token") || "";

  const supabase = getSupabaseAdmin();
  if (!supabase) return json({ ok: false, error: "Missing Supabase env vars" }, 500);

  if (!slug) {
    return json({
      ok: true,
      slug,
      tokenPresent: Boolean(token),
      userFound: false,
      tokenMatchesDb: false,
      note: "Missing slug",
    });
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("user_id, profile_slug, upload_token")
    .eq("profile_slug", slug)
    .maybeSingle();

  if (error) {
    return json({ ok: false, error: error.message }, 500);
  }

  const expected = user?.upload_token || "";

  return json({
    ok: true,
    slug,
    tokenPresent: Boolean(token),
    userFound: Boolean(user),
    dbTokenSet: Boolean(expected),
    tokenMatchesDb: Boolean(expected) && token === expected,
  });
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);

  const slug = url.searchParams.get("slug") || "";
  const token = url.searchParams.get("token") || "";

  if (!slug) return json({ error: "Missing slug" }, 400);
  if (!token) return json({ error: "Missing token" }, 400);

  const supabase = getSupabaseAdmin();
  if (!supabase) return json({ error: "Missing Supabase env vars" }, 500);

  // ✅ Validate token AGAINST DB (per-user token), not env var
  const { data: user, error: userErr } = await supabase
    .from("users")
    .select("user_id, profile_slug, upload_token")
    .eq("profile_slug", slug)
    .maybeSingle();

  if (userErr) return json({ error: userErr.message }, 500);
  if (!user) return json({ error: "User not found for this slug" }, 404);

  const expected = user.upload_token || "";
  if (!expected || token !== expected) {
    return json({ error: "Invalid token" }, 401);
  }

  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return json({ error: "Missing file" }, 400);
  }

  // Read file bytes
  const inBuf = Buffer.from(await file.arrayBuffer());

  // Convert to JPEG bytes (JPG/PNG will work; HEIC may fail depending on sharp build)
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

  // Upload to Supabase Storage
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, jpgBuf, {
    upsert: true,
    contentType: "image/jpeg",
    cacheControl: "3600",
  });

  if (upErr) return json({ error: upErr.message }, 500);

  // Public URL
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  // Update DB: set photo_url and (optionally) clear token so it can’t be reused
  const nowIso = new Date().toISOString();
  const origin = process.env.SITE_URL || new URL(req.url).origin;

  const cardFullUrl = `${origin}/p/${slug}`;
  const cardOgUrl = `${origin}/api/og/${slug}?v=${Date.now()}`;

  const { error: dbErr } = await supabase
    .from("users")
    .update({
      photo_url: publicUrl,
      card_full_url: cardFullUrl,
      card_og_url: cardOgUrl,
      card_last_generated_at: nowIso,
      upload_token: null, // ✅ invalidate the link after a successful upload
    })
    .eq("profile_slug", slug);

  if (dbErr) return json({ error: dbErr.message }, 500);

  // Redirect to the profile page (with cache-bust)
  return NextResponse.redirect(new URL(`/p/${slug}?v=${Date.now()}`, origin), 303);
}

