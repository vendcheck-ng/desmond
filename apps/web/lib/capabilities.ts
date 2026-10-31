export type Capability = { group: string; items: string[] };

// Only technologies confirmed by the owner. Edit from Admin → Site profile.
export const DEFAULT_CAPABILITIES: Capability[] = [
  { group: "Product thinking and discovery", items: ["User research", "Wireframing", "Product and project management", "Customer experience optimization"] },
  { group: "UX/UI design", items: ["Figma", "Visual design", "Prototyping"] },
  { group: "Web and mobile engineering", items: ["React", "TypeScript", "Node.js", "MERN", "Flutter"] },
  { group: "Research and data", items: ["Data analysis", "Research and content structuring", "Data annotation"] },
  { group: "Domain knowledge", items: ["Estate management and valuation", "PropTech strategy awareness"] },
];

/** Format: one group per line, "Group | item, item, item" */
export function parseCapabilities(text: string): Capability[] {
  return text.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
    const [group, rest = ""] = line.split("|");
    return { group: (group ?? "").trim(), items: rest.split(",").map((s) => s.trim()).filter(Boolean) };
  }).filter((c) => c.group && c.items.length);
}
export const formatCapabilities = (caps: Capability[]) => caps.map((c) => `${c.group} | ${c.items.join(", ")}`).join("\n");
