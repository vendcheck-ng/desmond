import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function serverClient() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list: CookieToSet[]) => {
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* called from a Server Component */ }
      },
    },
  });
}

/** Server-side authorization. Every admin page and action calls this; RLS enforces it again in the database. */
export async function requireAdmin() {
  const sb = await serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: row } = await sb.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!row) redirect("/admin/login?denied=1");
  return { sb, user };
}
