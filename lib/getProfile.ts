type UserRow = {
  user_id: string;
  name: string | null;
  role: "mentor" | "mentee" | null;
  profile_slug: string | null;
  photo_url: string | null;

  // optional (may or may not exist yet)
  favorite_color?: string | null;

  card_full_url: string | null;
  card_og_url: string | null;
  card_status: string | null;
  card_last_generated_at: string | null;
};

type ExtraRow = {
  school: string | null;
  job_type: string | null;
};

type RestDebug = {
  ok: boolean;
  status: number;
  url: string;
  bodySnippet?: string;
};

async function restSelect<T>(
  table: string,
  query: Record<string, string>
): Promise<{ data: T[]; debug: RestDebug }> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const base = supabaseUrl ? supabaseUrl.replace(/\/$/, "") : "";
  const qs = new URLSearchParams(query);
  const url = `${base}/rest/v1/${table}?${qs.toString()}`;

  if (!supabaseUrl || !serviceKey) {
    return {
      data: [],
      debug: {
        ok: false,
        status: 0,
        url,
        bodySnippet: `Missing env vars: SUPABASE_URL=${!!supabaseUrl} SUPABASE_SERVICE_ROLE_KEY=${!!serviceKey}`,
      },
    };
  }

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
        "content-type": "application/json",
      },
      cache: "no-store",
    });
  } catch (e: any) {
    return {
      data: [],
      debug: {
        ok: false,
        status: 0,
        url,
        bodySnippet: `Fetch threw: ${e?.message || String(e)}`,
      },
    };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      data: [],
      debug: {
        ok: false,
        status: res.status,
        url,
        bodySnippet: text.slice(0, 400),
      },
    };
  }

  const json = (await res.json()) as T[];
  return { data: json, debug: { ok: true, status: res.status, url } };
}

export async function getProfileBySlug(slug: string): Promise<{
  user: UserRow | null;
  extra: ExtraRow | null;
  debug: { users: RestDebug; extra?: RestDebug };
}> {
  // IMPORTANT: select=* so missing/new columns (like favorite_color) never hard-fail
  const usersRes = await restSelect<UserRow>("users", {
    select: "*",
    profile_slug: `eq.${slug}`,
    limit: "1",
  });

  const user = usersRes.data[0] ?? null;

  if (!user) {
    return { user: null, extra: null, debug: { users: usersRes.debug } };
  }

  if (user.role === "mentor") {
    const extraRes = await restSelect<ExtraRow>("mentor_profiles", {
      select: "school,job_type",
      user_id: `eq.${user.user_id}`,
      limit: "1",
    });
    return {
      user,
      extra: extraRes.data[0] ?? null,
      debug: { users: usersRes.debug, extra: extraRes.debug },
    };
  }

  if (user.role === "mentee") {
    const extraRes = await restSelect<ExtraRow>("mentee_profiles", {
      select: "school,job_type",
      user_id: `eq.${user.user_id}`,
      limit: "1",
    });
    return {
      user,
      extra: extraRes.data[0] ?? null,
      debug: { users: usersRes.debug, extra: extraRes.debug },
    };
  }

  return { user, extra: null, debug: { users: usersRes.debug } };
}
