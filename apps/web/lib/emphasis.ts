export type Seg = { text: string; em: boolean };

/** "I build *thoughtful* things" → plain text + emphasised segments. Never produces HTML. */
export function parseEmphasis(input: string): Seg[] {
  const out: Seg[] = [];
  const re = /\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input))) {
    if (m.index > last) out.push({ text: input.slice(last, m.index), em: false });
    out.push({ text: m[1]!, em: true });
    last = m.index + m[0].length;
  }
  if (last < input.length) out.push({ text: input.slice(last), em: false });
  return out;
}
export const stripEmphasis = (s: string) => s.replace(/\*([^*]+)\*/g, "$1");
