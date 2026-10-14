/**
 * Conservative editorial helpers: remove padding without generating new history.
 * The approved review is applied separately, with snapshot conflict checks.
 */
export const wordCount = (text: string | null | undefined) => (text?.match(/\S+/g) ?? []).length;

export function splitSentences(text: string): string[] {
  const protectedText = text
    .replace(/\b(?:Mr|Mrs|Dr|St|Jr|Sr|vol|Vol|No|pp|Mo|Mass|Tenn|Ky|Va|N\.C|E\.F|R\.P)\./g, s => s.replace(/\./g, "\u2024"))
    .replace(/\b[A-Z]\.(?=\s?[A-Z]\.)/g, s => s.replace(".", "\u2024"));
  return protectedText.split(/(?<=[.!?])\s+(?=[A-Z"'“(])/)
    .map(s => s.replace(/\u2024/g, ".").trim()).filter(Boolean);
}

export function sourceCredits(text: string): string[] {
  const credits = text.match(/\(Source:[^\n]+|^Source: Traditional Tune Archive[^\n]+/gm) ?? [];
  return Array.from(new Set(credits)).filter(s => !/TuneVault editorial research|Source: recording by/i.test(s));
}

const scaffolding = /research summary|research reveals|here(?:'s| is) (?:a |the )?(?:full |comprehensive )?(?:research|summary)|search results|web research|the searches\b|as an AI\b|I (?:myself )?(?:have not|wasn.t|couldn.t)|not been able to find|sources consulted/i;
const padding = /deep DNA|soul of (?:this|the) tune|powerful metaphor|metaphor in a culture|feel every listener|cement(?:ed|ing) its (?:place|status)|cross(?:ed|ing) the Atlantic and took root|transatlantic lineage:|one of the most colorful|fascinating folk-process|the (?:kitchen|waterfall|rabbit|creek) setting suggests|earns its place|testament to|more than (?:just )?a tune|the beauty of|the magic of/i;
const speculative = /almost certainly|the (?:name|title) (?:may|might|probably|almost certainly)|(?:title|name) suggests|may (?:have been named|refer to)|the (?:tune|melody) (?:predates|is older than).*(?:probably|certainly)|the (?:name|title) (?:references|refers to).*Lincoln/i;
const metadata = /^(?:AKA\b|Also known as:|Geographic provenance:|Genre:|Key:|Form:|Type:|Tuning:|Attributed to [^.]+\.$|[A-G](?:#|♭|b)? (?:Major|Minor|Mixolydian|Dorian)\b|Standard(?: or.*?)? tuning\b|(?:AEae|ADae|GDgd|DDad|AEac#) (?:or |and )?Standard tuning\b|A{1,3}['’]?[BC][A-G'’()/: \d&,-]*\.?$|(?:American|Old-Time|Irish|Scottish|English|Canadian|French|German)(?:[,;].*)?\.$|USA[;,\.]|Canada[;,\.])/i;

export function plainHistory(original: string | null): string | null {
  if (!original) return null;
  const credits = sourceCredits(original);
  let body = original
    .replace(/\(Source:[^\n]+|^Source: Traditional Tune Archive[^\n]+/gm, "")
    .replace(/Geographic provenance:[^.]+\./g, "")
    .replace(/\bFirst documented in\b/g, "Included in")
    .replace(/\[\d+\]/g, "")
    .replace(/(?:AKA(?: and see)?\s*[–—:-]?|Also known as:)[^\n]*?(?=(?:American|Old-Time|Irish|English|Scottish|Canadian)[,;]|\n|$)/g, "")
    .replace(/^\s*\|.*$/gm, "")
    .replace(/^(?:Ed Haley|Ward Jarvis) \([^)]*\):\s*$/gm, "")
    .replace(/^\s*(?:The clearest documented line|The tune carries two intertwined dedications|The title's meaning is hotly debated|Several competing folk explanations)[^\n]*:\s*$/gm, "");
  const paragraphs: string[] = [];
  for (const paragraph of body.split(/\n\s*\n/)) {
    const unique = new Set<string>();
    const kept: string[] = [];
    for (let sentence of splitSentences(paragraph)) {
      if (scaffolding.test(sentence) || padding.test(sentence) || speculative.test(sentence)) continue;
      if (metadata.test(sentence)) continue;
      if (/^[A-Z\d\s'’(),/&.-]{5,}\.$/.test(sentence)) continue;
      if (/…|\.\.\.$/.test(sentence)) continue;
      if (sentence.trim().endsWith(":")) continue;
      sentence = sentence
        .replace(/\b(?:legendary|influential|iconic|quintessential|ubiquitous|renowned|remarkable|fascinating|canonical)\s+/gi, "")
        .replace(/\b(?:beautifully|firmly|deeply|widely)\s+(?=(?:embedded|established|known|recognized|documented))/gi, "")
        .replace(/\bthe ultimate source\b/gi, "a source")
        .replace(/Source for notated version:\s*-?\s*/gi, "Notation sources: ")
        .replace(/Printed sources:\s*-?\s*/gi, "Published in ")
        .replace(/Recorded sources:\s*-?\s*/gi, "Recordings include ")
        .replace(/\s+/g, " ").trim();
      if (!sentence || unique.has(sentence)) continue;
      unique.add(sentence);
      kept.push(sentence);
    }
    if (kept.length) paragraphs.push(kept.join(" "));
  }
  body = Array.from(new Set(paragraphs)).join("\n\n").trim();
  // Drop genuinely unfinished tails rather than print chopped quotations.
  body = body.replace(/(?:^|\s)[^.!?\n]*\([^)]*$/g, "").trim();
  if (!body) return null;
  return body + (credits.length ? `\n\n${credits.join("\n")}` : "");
}

export function plainNotes(original: string | null): string | null {
  if (!original) return null;
  const kept = splitSentences(original).filter(sentence =>
    // Keep factual version/tuning references, not unsupported playing prescriptions.
    /\b(?:recording|version|tuning|tuned|variant)\b/i.test(sentence)
    && !/\b(?:should|must|requires?|demand|don't|do not|always|never|essential|best|soul|feel|beautiful|haunting|magic|before you start|GDAD|elbow|high position|high register|workout|hangover|panic|breath|ache)\b/i.test(sentence)
    && !/Celtic.*Old.Time|Old.Time.*Celtic|title suggests|Kentucky fiddlers prefer/i.test(sentence),
  ).map(s => s.replace(/\b(?:try|experiment with)\b/gi, "You can try"));
  return kept.join(" ") || null;
}
