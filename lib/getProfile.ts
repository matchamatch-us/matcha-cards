import { supabaseServer } from "@/lib/supabaseServer";

type UserRow = {
  user_id: string;
  name: string | null;
  role: "mentor" | "mentee" | null;
  profile_slug: string | null;

  photo_url: string | null;
  favorite_color: string | null;

  card_full_url: string | null;
  card_og_url: string | null;
  card_last_generated_at: string | null;
};

export async function getProfileBySlug(slug: string) {
  const supabase = supabaseServer();

  const { data: user, error: userErr } = await supabase
    .from("users")
    .select(
      [
        "user_id",
        "name",
        "role",
        "profile_slug",
        "photo_url",
        "favorite_color",
        "card_full_url",
        "card_og_url",
        "card_last_generated_at",
      ].join(",")
    )
    .eq("profile_slug", slug)
    .maybeSingle<UserRow>();

  if (userErr) throw userErr;
  if (!user) return { user: null, extra: null };

  let extra: { school?: string | null; job_type?: string | null } | null = null;

  if (user.role === "mentor") {
    const { data, error } = await supabase
      .from("mentor_profiles")
      .select("school, job_type")
      .eq("user_id", user.user_id)
      .maybeSingle();

    if (error) throw error;
    extra = data;
  } else if (user.role === "mentee") {
    const { data, error } = await supabase
      .from("mentee_profiles")
      .select("school, job_type")
      .eq("user_id", user.user_id)
      .maybeSingle();

    if (error) throw error;
    extra = data;
  }

  return { user, extra };
}
