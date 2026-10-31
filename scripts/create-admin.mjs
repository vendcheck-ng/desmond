// One-time admin creation. Run from the repo root:
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-unique-password' npm run create-admin
// Reads apps/web/.env.local itself and names exactly which setting is missing.
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envFile = new URL("../apps/web/.env.local", import.meta.url);
if (!existsSync(envFile)) {
  console.error("Missing apps/web/.env.local — copy apps/web/.env.example to that name and fill it in.");
  process.exit(1);
}
for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);   // skips comments and stray lines like ```
  if (!m) continue;
  let value = m[2];
  if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
  if (process.env[m[1]] === undefined) process.env[m[1]] = value;
}

const need = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ADMIN_EMAIL", "ADMIN_PASSWORD"];
const missing = need.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("Missing:", missing.join(", "));
  if (missing.some((k) => k.startsWith("ADMIN_"))) console.error("ADMIN_EMAIL and ADMIN_PASSWORD go on the command line, not in the file.");
  process.exit(1);
}
const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env;
if (password.length < 12) { console.error(`Password is ${password.length} characters; use at least 12.`); process.exit(1); }

const sb = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
if (error) { console.error("Create user failed:", error.message); process.exit(1); }
const { error: e2 } = await sb.from("admin_users").insert({ user_id: data.user.id });
if (e2) { console.error("Admin row failed (have all 3 SQL migrations been run?):", e2.message); process.exit(1); }
console.log("Admin created:", email, "— sign in at /admin/login");
