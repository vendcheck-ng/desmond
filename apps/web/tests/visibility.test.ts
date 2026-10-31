import { describe, expect, it } from "vitest";
import { desiredPublicAssetIds, planSync, showsCaseStudy } from "../lib/visibility";
import { sniffType, validateUpload } from "../lib/uploads";

const assets = [{ id: "a" }, { id: "b" }, { id: "c" }];
const base = { publish: "published", case_study_enabled: true, cover_asset_id: "a", og_asset_id: null };

describe("public media policy", () => {
  it("drafts expose nothing", () => {
    expect(desiredPublicAssetIds({ ...base, publish: "draft" }, assets).size).toBe(0);
  });
  it("published + case study on exposes every asset", () => {
    expect([...desiredPublicAssetIds(base, assets)].sort()).toEqual(["a", "b", "c"]);
  });
  it("published + case study off exposes only cover and OG image", () => {
    const s = desiredPublicAssetIds({ ...base, case_study_enabled: false, og_asset_id: "c" }, assets);
    expect([...s].sort()).toEqual(["a", "c"]);
  });
  it("case study off with no cover exposes nothing", () => {
    expect(desiredPublicAssetIds({ ...base, case_study_enabled: false, cover_asset_id: null }, assets).size).toBe(0);
  });
  it("planSync copies missing and removes stale files", () => {
    expect(planSync(new Set(["x", "y"]), new Set(["y", "z"]))).toEqual({ toCopy: ["x"], toRemove: ["z"] });
  });
  it("case study content is gated by the flag", () => {
    expect(showsCaseStudy({ case_study_enabled: false })).toBe(false);
    expect(showsCaseStudy({ case_study_enabled: true })).toBe(true);
  });
});

describe("upload validation", () => {
  it("rejects empty, oversized and wrong-type files", () => {
    expect(validateUpload({ name: "a", size: 0, type: "image/png" }).ok).toBe(false);
    expect(validateUpload({ name: "a", size: 11 * 1024 * 1024, type: "image/png" }).ok).toBe(false);
    expect(validateUpload({ name: "a.svg", size: 10, type: "image/svg+xml" }).ok).toBe(false);
    expect(validateUpload({ name: "a.pdf", size: 10, type: "application/pdf" }).ok).toBe(false);
  });
  it("allows PDFs only when asked", () => {
    expect(validateUpload({ name: "cv.pdf", size: 10, type: "application/pdf" }, true).ok).toBe(true);
  });
  it("sniffs real file signatures", () => {
    expect(sniffType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(sniffType(new TextEncoder().encode("RIFF\0\0\0\0WEBP"))).toBe("image/webp");
    expect(sniffType(new TextEncoder().encode("%PDF-1.7"))).toBe("application/pdf");
    expect(sniffType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });
});
