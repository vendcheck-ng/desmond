# The Working Atlas — Desmond Odeyemi's portfolio

## Open in VS Code
1. Unzip, then **File → Open Workspace from File… → `atlas.code-workspace`** (or just open the `atlas` folder).
2. Accept the recommended extensions (ESLint, Prettier, Vitest, Supabase).
3. Terminal → `npm run setup` (installs everything and creates `apps/web/.env.local` from the example), fill in the three Supabase values, then follow **Run it** below.
4. **Terminal → Run Task…** has dev, typecheck, lint, test, build. **Run and Debug** has server and Chrome debugging. Needs Node 22 (`.nvmrc`; 20.6+ works).

## Layout
```
atlas/
├─ apps/web/                    Next.js 15 app (public site + /admin)
│  ├─ app/(site)/               public pages: home, about, work/[slug]
│  ├─ app/admin/                login, dashboard, project editor, profile, server actions
│  ├─ components/               Media, CaseStudy, UploadDropzone, Flash, SubmitButton
│  ├─ lib/                      data access, validation, upload checks, storage sync, public-visibility rules
│  ├─ tests/                    Vitest unit tests
│  └─ middleware.ts             first gate for /admin (real auth is server-side + RLS)
├─ supabase/
│  ├─ migrations/               0001 schema · 0002 seed (drafts) · 0003 private media + hardening
│  └─ tests/rls_checks.sql      manual database/permission checks
├─ scripts/create-admin.mjs     one-time admin creation (uses the service-role key locally only)
├─ .vscode/ · atlas.code-workspace · .editorconfig · .prettierrc · .nvmrc
└─ README.md
```


## Run it

1. **Supabase project** (free): supabase.com → New project (pick a region near Lagos).
2. **SQL Editor** → run, in order: `0001_init.sql`, `0002_seed.sql`, `0003_private_media_and_hardening.sql`. Already ran 0001/0002? Just run 0003 — it never edits earlier migrations.
3. **Authentication → Providers → Email**: keep Email on, turn **OFF "Allow new users to sign up"**.
4. **Project Settings → API**: copy the Project URL, `anon` key and `service_role` key.
5. In a terminal at the repo root:
   ```
   cp apps/web/.env.example apps/web/.env.local     # fill in the 3 Supabase values
   npm install
   ADMIN_EMAIL=midecancode@gmail.com ADMIN_PASSWORD='a-long-unique-password' npm run create-admin
   npm run dev
   ```
   (Node 20.6+ needed.) Site: http://localhost:3000 · Admin: http://localhost:3000/admin/login

Then commit the generated `package-lock.json` (none exists yet — the build sandbox had no network).

Checks: `npm run typecheck` · `npm run lint` · `npm run test` · `npm run build`

## Using the admin
- **Dashboard** — counts, add a project, reorder with ↑/↓, recent changes.
- **Project editor** — all fields, 14 optional case-study sections, SEO, images (upload, alt text, caption, reorder, cover, remove), **Preview draft**, **Publish/Unpublish**, **Duplicate**, **Archive** (hides it), **Delete** (confirmation step).
- **Site profile** — name, headline, bio, portrait, CV PDF, email, social links, availability, capabilities, footer, SEO.
- Seeded projects are **drafts**. Check each summary, upload screenshots, then Publish.
- To use the Vendcheck screenshot: open Vendcheck → upload it → write alt text (e.g. "VendCheck homepage showing a verified vendor profile") → Make cover.

## Media privacy model (read this)
A public Supabase bucket serves any file to anyone who has its URL — row-level security does not protect it. So:
- **`media-private`** (not public): every project upload goes here. Only admins can read/write. The admin editor and draft preview use **signed URLs that expire** (1 hour / 10 minutes).
- **`media-public`** (public): receives **copies** of only what is meant to be public. The server keeps it in sync after publish, unpublish, archive, save, upload, replace, cover change and delete:
  - draft/archived project → nothing public
  - published, case study **on** → all of its images
  - published, case study **off** → only the cover (and OG) image
  - portrait and CV go straight to the public bucket (they are public by design).
- If a copy/remove fails, the action reports the error. A failed publish is rolled back to draft.
- Trade-offs: images exist twice (private original + public copy); copying happens through the admin's own session, so no service-role key is needed in the app. Anyone who has already seen a published image URL can still fetch it until you unpublish (then it is deleted). Public file names are unguessable UUIDs.
- The old `media` bucket from 0001 is made private by 0003. Images uploaded before 0003 must be re-uploaded; then delete the old empty bucket in the Supabase dashboard.
- Anonymous visitors read through the views `public_projects` / `public_assets`, not the tables, so case-study text of a project with the case study switched off is not exposed even through the API.

## Case-study switch
"This project has a published case study" controls: the **Read case study** label on the index, and whether the project page shows contribution, sections and gallery. Off = a short project page (summary, facts, cover, live link). Enforced in the database views, the renderer and the storage sync, and covered by tests.

## Security model
- No public signup. Only users in `admin_users` (created by `npm run create-admin`) are admins.
- Every admin page and action calls `requireAdmin()` on the server; the database enforces it again with RLS. Actions verify that an asset belongs to the project in the request, validate input with zod, check file signatures (not just the declared type), and report partial failures instead of success.
- Ordering uses atomic SQL functions; a trigger guarantees cover/OG images belong to their project.
- The `service_role` key is used only by the local `create-admin` script. Never add it to Vercel.
- Password recovery: Supabase dashboard → Authentication → Users → send reset.
- Login rate limiting is Supabase Auth's built-in limits (no extra app-level limiter).

## Tests
- `npm run test` (Vitest): slugs, project validation, capabilities, public-media policy, case-study gating, upload validation and file-signature sniffing.
- `supabase/tests/rls_checks.sql`: manual database checks (anon cannot read tables/private storage/write; drafts and disabled case studies do not leak; cover must belong to project). Run them in the SQL editor after migrating.
- Not included: browser end-to-end tests, automated accessibility audit (see below).

## PWA — deliberately not implemented
A portfolio gains little from installability or offline mode, and a service worker adds a risk of serving stale pages or caching admin responses and signed URLs. Deferred. If added later: cache only public static assets, never `/admin` or signed URLs.

## Deploy
Push to GitHub → import on Vercel → root directory `apps/web` → set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (your real domain). Back up by exporting the database from Supabase and downloading the `media` bucket.

## Known limitations
- Dependencies have never been installed, and the app has never been built or opened in a browser by the author. The author's sandbox had no network, so there is no lockfile and no verified `typecheck`, `lint` or `build`. Run them first and send me any errors.
- Uploads show per-file status (waiting, uploading, uploaded, failed with Retry) but not byte-level progress.
- No browser tests, no automated axe/Lighthouse run yet; the colour contrast of every colour pair was computed (all text pairs ≥ 4.5:1; oxide `#B84A32` is used for large type and fills only).
- No contact form (email link only), no journal pages (table exists), no hover previews on the index.
- Favicon is an SVG icon; no generated social-share image yet (project and home pages use their cover/portrait).
