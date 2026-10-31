import { z } from "zod";

export const SECTION_KEYS = [
  ["intro", "Introduction"],
  ["overview", "Overview and status"],
  ["problem", "The problem or opportunity"],
  ["users", "Intended users and their needs"],
  ["context", "Context and constraints"],
  ["role", "My role and responsibilities"],
  ["discovery", "Discovery and research"],
  ["decisions", "Key product and design decisions"],
  ["design", "Flows, wireframes and design system"],
  ["implementation", "Implementation and technical decisions"],
  ["tradeoffs", "Challenges and trade-offs"],
  ["final", "Final product"],
  ["outcomes", "Outcomes (only where substantiated)"],
  ["lessons", "Lessons learned"],
] as const;
export const SECTION_LABEL: Record<string, string> = Object.fromEntries(SECTION_KEYS);

export const slugSchema = z
  .string()
  .min(1, "Slug is required")
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens");

const empty = (v: string) => (v === "" ? null : v);
const dateOpt = z
  .string()
  .trim()
  .transform(empty)
  .pipe(
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
      .nullable()
  );
const urlOpt = z
  .string()
  .trim()
  .transform(empty)
  .pipe(
    z
      .string()
      .regex(/^https?:\/\/\S+$/, "Must start with http:// or https://")
      .max(500)
      .nullable()
  );
const textOpt = (n: number) => z.string().trim().max(n).transform(empty);

export const projectSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  slug: slugSchema,
  summary: z.string().trim().max(400, "Keep the summary under 400 characters"),
  category: z.string().trim().max(80),
  role: z.string().trim().max(120),
  contribution: z.string().trim().max(2000),
  status: z.enum(["live", "in_progress", "concept", "archived"]),
  featured: z.boolean(),
  sort_order: z.coerce.number().int().min(0).max(9999),
  start_date: dateOpt,
  end_date: dateOpt,
  external_url: urlOpt,
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  case_study_enabled: z.boolean(),
  seo_title: textOpt(70),
  seo_description: textOpt(200),
});

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

export function parseProjectForm(fd: FormData) {
  return projectSchema.safeParse({
    title: str(fd, "title"),
    slug: str(fd, "slug").trim(),
    summary: str(fd, "summary"),
    category: str(fd, "category"),
    role: str(fd, "role"),
    contribution: str(fd, "contribution"),
    status: str(fd, "status"),
    featured: fd.get("featured") === "on",
    sort_order: str(fd, "sort_order") || "0",
    start_date: str(fd, "start_date"),
    end_date: str(fd, "end_date"),
    external_url: str(fd, "external_url"),
    tags: str(fd, "tags")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    case_study_enabled: fd.get("case_study_enabled") === "on",
    seo_title: str(fd, "seo_title"),
    seo_description: str(fd, "seo_description"),
  });
}

export const profileSchema = z.object({
  display_name: z.string().trim().min(1).max(80),
  descriptor: z.string().trim().max(120),
  headline: z.string().trim().min(1).max(200),
  intro: z.string().trim().max(600),
  biography: z.string().trim().max(6000),
  location: z.string().trim().max(120),
  timezone: z.string().trim().max(80),
  building: z.array(z.string().trim().min(1).max(120)).max(20),
  founder: z.array(z.string().trim().min(1).max(120)).max(20),
  open_to: z.array(z.string().trim().min(1).max(120)).max(20),
  portrait_alt: z.string().trim().max(200),
  email: z.string().trim().email("Enter a valid email address"),
  alternate_email: z
    .union([z.literal(""), z.string().trim().email("Enter a valid alternate email").max(254)])
    .transform(empty),
  linkedin: urlOpt,
  x: urlOpt,
  github: urlOpt,
  available: z.boolean(),
  availability_note: z.string().trim().max(120),
  footer_copy: z.string().trim().max(300),
  seo_title: textOpt(70),
  seo_description: textOpt(200),
});
