import { createClient } from "@supabase/supabase-js";

export function supabaseServer() {
  const url = process.env.https://gbveyxvtempqrcwwosbd.supabase.co!;
  const serviceKey = process.env.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdidmV5eHZ0ZW1wcXJjd3dvc2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTUxODM4MiwiZXhwIjoyMDgxMDk0MzgyfQ.bN7rvBf1o0ZYjpeh1q1Tiug4Ak8oWkQ4JX5n5o-Jzw8!;

  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
