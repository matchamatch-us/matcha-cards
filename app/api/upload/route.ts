import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs"; // important for file handling

export async function POST(req: Request) {
  const form = await req.formData();

  const slug = (form.get("slug") as string | null)?.trim() || "";
  const token = (form.get("token") as string | null)?.trim() || "";
  const file = form.get("file") as File | null;

  const expected = (process.env.UPLOAD_TOKEN ?? "").trim();

  if (!expected) {
    return NextResponse.json({ error: "Missing UPLOAD_TOKEN on server" }, { status: 500 });
  }
  if (!slug || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!file) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }

  // Convert File -> bytes
  const bytes = new Uint8Array(await file.arrayBuffer());

  const supabase = supabaseServer();

  // Very simple extension selection
  const ext = file.type === "image/png" ? "png" : "jpg";
  const path = `photos/${slug}.${ext}`;

  // Upload to Storage bucket "profile-photos"
  const { error: upErr } = await supabase.storage
    .from("profile-photos")
    .upload(path, bytes, {
      contentType: file.type,
      upsert: true,
    });

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  // Public URL
  const { data: pub } = supabase.storage.from("profile-photos").getPublicUrl(path);
  const photoUrl = pub.publicUrl;

  // Update DB
  const { error: dbErr } = await supabase
    .from("users")
    .update({
      photo_url: photoUrl,
      card_status: "photo_received",
      card_last_generated_at: new Date().toISOString(), 
    })
    .eq("profile_slug", slug);

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  // Redirect to the profile page
  const site = (process.env.SITE_URL ?? "").trim() || "https://matcha-cards.vercel.app";
  return NextResponse.redirect(`${site}/p/${slug}`, 302);
}
