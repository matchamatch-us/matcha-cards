import { supabaseServer } from "@/lib/supabaseServer";

export type Role = "mentor" | "mentee";

export async function getProfileBySlug(slug: string) {
  const supabase = supabaseServer();

  // 1) Fetch base user row
  const { data: user, error: userErr } = await supabase
    .from("users")
    .select(
      "uuid, name, role, profile_slug, photo_url, card_status, card_full_url, card_og_url, card_last_generated_at"
    )
    .eq("profile_slug", slug)
    .maybeSingle();

  if (userErr) throw userErr;
  if (!user) return { user: null, extra: null };

  // 2) Fetch role-specific info
  // IMPORTANT: adjust selected column names if your mentors/mentees schema differs.
  let extra: any = null;

  if ((user.role as Role) === "mentor") {
    const { data, error } = await supabase
      .from("mentors")
      .select("school, job_type, company") // <- change/extend if you have more fields
      .eq("uuid", user.uuid)
      .maybeSingle();
    if (error) throw error;
    extra = data;
  } else {
    const { data, error } = await supabase
      .from("mentees")
      .select("school, job_type, ten_years, favorite_color") // <- change/extend if you have more fields
      .eq("uuid", user.uuid)
      .maybeSingle();
    if (error) throw error;
    extra = data;
  }

  return { user, extra };
}
