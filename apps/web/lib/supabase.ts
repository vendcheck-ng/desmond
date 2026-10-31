import { createClient } from "@supabase/supabase-js";
export { mediaUrl } from "./media-url";
export { STATUS_LABEL } from "./labels";

// Public, read-only client. Row level security limits it to published content.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "missing",
  { auth: { persistSession: false } }
);
