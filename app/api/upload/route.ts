import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "profile-photos";
const FOLDER = "photos";

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
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

  try {
    const supabase = getSupabaseAdmin();
    const { data: user, error } = await supabase
      .from("users")
      .select("profile_slug, upload_token")
      .eq("profile_slug", slug)
      .maybeSingle();

    return json({
      ok: true,
      slug,
      tokenPresent: Boolean(token),
      userFound: Boolean(user),
      userHasToken: Boolean(user?.upload_token),
      tokenMatchesUser: Boolean(user?.upload_token) && token === user?.upload_token,
      error: error ? error.message : null,
    });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || String(e) }, 500);
  }
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") || "";
  const token = url.searchParams.get("token") || "";

  if (!slug) return json({ error: "Missing slug" }, 400);
  if (!token) return json({ error: "Missing token" }, 400);

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (e: any) {
    return json({ error: e?.message || "Missing Supabase env vars" }, 500);
  }

  // 1) Load expected token for this user
  const { data: user, error: userErr } = await supabase
    .from("users")
    .select("user_id, profile_slug, upload_token")
    .eq("profile_slug", slug)
    .maybeSingle();

  if (userErr) return json({ error: userErr.message }, 500);
  if (!user) return json({ error: "User not found for slug" }, 404);

  if (!user.upload_token) {
    return json(
      { error: "Upload token not set for this user (upload_token is NULL in users table)" },
      401
    );
  }

  if (token !== user.upload_token) {
    return json({ error: "Invalid token" }, 401);
  }

  // 2) Get file
  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return json({ error: "Missing file" }, 400);
  }

  // 3) Convert -> JPEG (rotate fixes iPhone orientation)
  const inBuf = Buffer.from(await file.arrayBuffer());

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

  // 4) Upload
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, jpgBuf, {
    upsert: true,
    contentType: "image/jpeg",
    cacheControl: "3600",
  });

  if (upErr) return json({ error: upErr.message }, 500);

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  // 5) Update DB (IMPORTANT: do NOT null upload_token)
  const { error: dbErr } = await supabase
    .from("users")
    .update({
      photo_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("profile_slug", slug);

  if (dbErr) return json({ error: dbErr.message }, 500);

  // 6) Redirect to card
  return NextResponse.redirect(new URL(`/p/${slug}?v=${Date.now()}`, req.url), 303);
}
