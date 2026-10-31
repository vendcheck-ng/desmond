/** Public bucket only. Safe to import from client components (no Supabase client inside). */
export const mediaUrl = (path: string | null | undefined) =>
  path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media-public/${path}` : null;
