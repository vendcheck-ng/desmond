// Single source of truth for what is public. Used by the renderer, the storage sync and the tests.

type P = { publish: string; case_study_enabled: boolean; cover_asset_id: string | null; og_asset_id: string | null };

/** Which asset ids may be in the PUBLIC bucket for this project. */
export function desiredPublicAssetIds(p: P, assets: { id: string }[]): Set<string> {
  if (p.publish !== "published") return new Set();
  if (p.case_study_enabled) return new Set(assets.map((a) => a.id));
  return new Set(assets.filter((a) => a.id === p.cover_asset_id || a.id === p.og_asset_id).map((a) => a.id));
}

/** Diff between what should be public and what is. */
export function planSync(want: Set<string>, have: Set<string>) {
  return { toCopy: [...want].filter((x) => !have.has(x)), toRemove: [...have].filter((x) => !want.has(x)) };
}

/** Case-study content (contribution, sections, gallery) shows only when the case study is enabled. */
export const showsCaseStudy = (p: { case_study_enabled: boolean }) => p.case_study_enabled;
