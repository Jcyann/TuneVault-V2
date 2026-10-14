/** One plain-text snippet for server-rendered and client-side tune metadata. */
export function tuneDescriptionSnippet(
  tune: { title: string; key: string; tuneType: string | null; description: string | null },
  limit = 160,
): string {
  const text = (tune.description?.split(/\n\s*\n(?:Sources?:|\(Source:)/i)[0]
    || `${tune.title}: ${tune.key} ${tune.tuneType || "fiddle tune"}. Historical notes are not yet documented.`)
    .replace(/[*_]/g, "").replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  return text.slice(0, limit - 1).replace(/\s+\S*$/, "").trimEnd() + "…";
}
