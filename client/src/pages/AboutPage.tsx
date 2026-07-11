import { Link } from "wouter";
import { Headphones, Video, BookOpen, FileText, Star, ChevronRight, Mic, ExternalLink, KeyRound, ShoppingBag, GraduationCap, Newspaper, Library, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import TipJar from "@/components/TipJar";
import { usePageMeta } from "@/hooks/usePageMeta";
import SuggestChangesForm from "@/components/SuggestChangesForm";

const BADGE_EXPLANATIONS = [
  { icon: Headphones, label: "Audio", color: "text-sky-600", desc: "A recording plays in the mini player." },
  { icon: Video, label: "Video", color: "text-rose-600", desc: "A YouTube performance is embedded." },
  { icon: BookOpen, label: "ABC", color: "text-violet-600", desc: "ABC notation rendered as staff music." },
  { icon: FileText, label: "Sheet Music", color: "text-emerald-600", desc: "A transcription image is available." },
];

export default function AboutPage() {
  usePageMeta(
    "About & FAQ",
    "Learn how to use TuneVault — over 1,000 Old-Time fiddle tunes with audio, history, ABC notation, YouTube video, an in-browser key finder, community recordings, Tune of the Day, a store, lessons, and the blog."
  );

  return (
    <div className="min-h-screen bg-background pb-16 pt-16 sm:pt-20">
      <div className="container mx-auto max-w-3xl px-6">

        {/* Header */}
        <header className="border-t border-foreground pt-6 pb-10">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">The Field Guide</div>
          <h1 className="font-display text-[44px] sm:text-6xl font-semibold tracking-tight leading-[0.95] text-foreground">About TuneVault</h1>
          <p className="font-display italic text-xl text-muted-foreground mt-3">Over 1,000 Old-Time fiddle tunes — built for practice, not just browsing.</p>
        </header>

        <div className="space-y-10">

          {/* Quick Start */}
          <section>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">In Four Moves</div>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground tracking-tight mb-6">Quick start</h2>
            <ol className="space-y-5">
              {[
                { title: "Search & filter", body: "Find tunes by name, key, difficulty, region, or type — all filters stack instantly. Star any tune to save it and switch to favorites-only mode." },
                { title: "Play from the list", body: "Hover a tune to play it without leaving the page. In the mini player, slow down to 75% or 50% with no pitch change, or transpose by semitone to match any key." },
                { title: "Dig into a tune", body: "Open a tune page for the full history, multiple recordings, embedded video, ABC notation, and sheet music. Recordings are credited to the source fiddler where known." },
                { title: "Contribute & correct", body: "Every tune page has a \"Suggest a correction\" button for wrong keys, missing credits, or bad links. Have a recording? Submit it and it may appear on the page." },
              ].map(({ title, body }, i) => (
                <li key={title} className="flex gap-5">
                  <span className="font-display text-2xl font-semibold text-primary tabular-nums leading-none pt-0.5 w-8 shrink-0">0{i + 1}</span>
                  <div>
                    <p className="font-display text-lg font-semibold text-foreground mb-0.5">{title}</p>
                    <p className="font-serif text-[15px] text-muted-foreground leading-relaxed">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-7">
              <Link href="/blog/what-is-old-time-music" className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-800 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />
                New to old-time music? Read the full essay →
              </Link>
            </div>
          </section>

          {/* Key Finder — featured tool */}
          <section className="border-t border-border pt-7">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">The Tool</div>
            <div className="border border-foreground bg-foreground text-background p-7 sm:p-9">
              <div className="flex items-start gap-5">
                <KeyRound className="w-8 h-8 shrink-0 text-background/90" />
                <div className="flex-1">
                  <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mb-2">What key is this?</h2>
                  <p className="font-serif text-[15px] leading-relaxed text-background/80 max-w-xl mb-5">
                    Stuck on a tune at a jam, or puzzling out a recording by ear? Play into your mic or drop in an audio clip and TuneVault names the key for you — in seconds, right in your browser. Nothing leaves your device, and it's completely free.
                  </p>
                  <Link
                    href="/identify-key"
                    data-testid="link-identify-key-about"
                    className="inline-flex items-center gap-2 bg-background text-foreground px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Mic className="w-3.5 h-3.5" /> Identify a key
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Badge guide */}
          <section className="border-t border-border pt-7">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">The Marks</div>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground tracking-tight mb-6">What the badges mean</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              {BADGE_EXPLANATIONS.map(({ icon: Icon, label, color, desc }) => (
                <div key={label} className="flex items-start gap-4">
                  <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${color}`} />
                  <div>
                    <dt className="font-display text-base font-semibold text-foreground">{label}</dt>
                    <dd className="font-serif text-[14px] text-muted-foreground leading-relaxed mt-0.5">{desc}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </section>

          {/* Tune of the Day teaser */}
          <section className="border-t border-border pt-7">
            <div className="flex items-start justify-between gap-5 flex-wrap">
              <div className="max-w-md">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-2">
                  <Star className="w-3 h-3 fill-primary text-primary" /> Daily Feature
                </div>
                <h2 className="font-display text-3xl font-semibold text-foreground tracking-tight mb-2">Tune of the Day</h2>
                <p className="font-serif text-[15px] text-muted-foreground leading-relaxed">
                  A featured tune with full history, recordings, video, and notation — refreshes every day. Shuffle any time to discover more.
                </p>
              </div>
              <Link
                href="/tune-of-the-day"
                data-testid="link-tune-of-day-about"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-foreground text-background text-[11px] uppercase tracking-[0.16em] font-medium hover:bg-primary transition-colors mt-2"
              >
                Try it now <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </section>

          {/* More to explore */}
          <section className="border-t border-border pt-7">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">More to Explore</div>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground tracking-tight mb-6">Beyond the tunes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { href: "/gear", icon: ShoppingBag, title: "The Store", desc: "Hand-picked books, classic recordings, and gear for old-time players." },
                { href: "/book-a-lesson", icon: GraduationCap, title: "Lessons", desc: "Private instruction in fiddle, clawhammer banjo, guitar, and upright bass." },
                { href: "/blog", icon: Newspaper, title: "The Journal", desc: "Stories, history, and deep dives into the old-time tradition." },
              ].map(({ href, icon: Icon, title, desc }) => (
                <Link
                  key={href}
                  href={href}
                  data-testid={`link-explore-${href.replace(/\//g, "")}`}
                  className="group border border-border bg-card p-5 hover:border-foreground transition-colors"
                >
                  <Icon className="w-5 h-5 text-primary mb-3" />
                  <div className="font-display text-lg font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    {title}
                    <ChevronRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </div>
                  <p className="font-serif text-[14px] text-muted-foreground leading-relaxed">{desc}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* Sources & methodology */}
          <section id="sources" data-testid="section-sources-methodology" className="border-t border-border pt-7">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">
              <ShieldCheck className="w-3 h-3 text-primary" /> Trust & Transparency
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground tracking-tight mb-4">Sources & methodology</h2>
            <p className="font-serif text-[15px] text-muted-foreground leading-relaxed max-w-prose mb-7">
              TuneVault is built for serious learners and history buffs, so accuracy matters more than volume. Every tune draws on references and archives trusted within the old-time community. We don't invent or embellish history, and we don't overstate what we don't know — tunes without a documented source carry an honest "not yet documented" note instead of filler.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-7 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Headphones className="w-4 h-4 text-primary" />
                  <h3 className="font-display text-lg font-semibold text-foreground">Audio recordings</h3>
                </div>
                <ul className="space-y-2 font-serif text-[14px] text-muted-foreground leading-relaxed">
                  {[
                    "Slippery Hill — a leading old-time field-recording archive",
                    "The Canote Brothers recording archive",
                    "Library of Congress, American Folklife Center field recordings (1937–1938)",
                    "Internet Archive — historical 78rpm digitizations and field recordings",
                    "OldTimeFiddleTunes.net (John Lamancusa)",
                  ].map((s) => (
                    <li key={s} className="flex gap-2"><span className="text-primary mt-0.5">·</span><span>{s}</span></li>
                  ))}
                </ul>
                <p className="font-serif text-[13px] text-muted-foreground/80 italic mt-3">Each recording is credited to its performer and source on the tune's page wherever known.</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Library className="w-4 h-4 text-primary" />
                  <h3 className="font-display text-lg font-semibold text-foreground">History & tune notes</h3>
                </div>
                <ul className="space-y-2 font-serif text-[14px] text-muted-foreground leading-relaxed">
                  {[
                    "The Traditional Tune Archive (tunearch.org)",
                    "OldTimeFiddleTunes.net tune write-ups (John Lamancusa)",
                    "O'Neill's collections",
                    "Marion Thede, \"The Fiddle Book\"",
                    "Rounder Records liner notes",
                    "Library of Congress American Folklife Center",
                    "Internet Archive item records — performer credits and 78rpm disc dates",
                    "TheSession.org — cross-checked tune listings and ABC notation settings (CC BY-SA)",
                    "Documented fiddler biographies and fiddle-contest records",
                  ].map((s) => (
                    <li key={s} className="flex gap-2"><span className="text-primary mt-0.5">·</span><span>{s}</span></li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border border-border bg-card p-6">
              <h3 className="font-display text-lg font-semibold text-foreground mb-4">How we handle accuracy</h3>
              <ul className="space-y-3">
                {[
                  "We source from references known and trusted in the old-time community — not from anonymous or unverifiable web content.",
                  "We never fabricate history. Tunes with no findable, documented source show a placeholder asking for help, rather than invented prose.",
                  "We don't overstate certainty. The automated key detector only assists — a human reviews and approves every key, and it never silently overwrites a tune.",
                  "Performers and recording sources are attributed on each tune page wherever they're known.",
                  "We respect copyright: playback relies on YouTube embeds and public-domain or openly-archived recordings.",
                ].map((s) => (
                  <li key={s} className="flex gap-3 font-serif text-[14px] text-foreground/85 leading-relaxed">
                    <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
              <p className="font-serif text-[14px] text-muted-foreground leading-relaxed mt-5">
                Spot something wrong or have a better source? Use the <a href="#suggestion-box" className="text-amber-700 hover:text-amber-800 underline underline-offset-2">suggestion box below</a> or the "Suggest a correction" button on any tune page. Corrections from the community are how this stays accurate.
              </p>
            </div>
          </section>

          {/* FAQ */}
          <section className="border-t border-border pt-7">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">Questions</div>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground tracking-tight mb-6">Frequently asked</h2>
            <dl className="space-y-5 mb-12">
              {[
                { q: "Where do the audio and history come from?", a: "From archives and references trusted in the old-time community — see the Sources & methodology section above for the full list and our accuracy standards." },
                { q: "Does TuneVault work on mobile?", a: "Yes — fully mobile-responsive. Swipe left/right on the home page to page through tunes. In the mini player, swipe left for next and right for previous." },
              ].map(({ q, a }) => (
                <div key={q} className="border-b border-border pb-5 last:border-0 last:pb-0">
                  <dt className="font-display text-lg font-semibold text-foreground mb-1.5">{q}</dt>
                  <dd className="font-serif text-[15px] text-muted-foreground leading-relaxed">{a}</dd>
                </div>
              ))}
            </dl>

            {/* Suggestion box */}
            <div id="suggestion-box" className="border-t border-foreground pt-7">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">Help us improve</div>
              <h3 className="font-display text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-2">Suggest a correction or new tune</h3>
              <p className="font-serif text-[15px] text-muted-foreground mb-6 max-w-prose leading-relaxed">
                Spot a wrong key, missing fiddler credit, or a tune that should be here? Use the form below or hit "Suggest a correction" on any tune page.
              </p>
              <SuggestChangesForm className="border border-border p-6 bg-card" />
            </div>
          </section>

          {/* Submit a Recording */}
          <section data-testid="submit-recording-section" className="border-t border-border pt-7">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 justify-between">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <Mic className="w-5 h-5 text-primary shrink-0 mt-1" />
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-1">Community</div>
                  <h3 className="font-display text-2xl font-semibold text-foreground tracking-tight mb-1">Share your playing</h3>
                  <p className="font-serif text-[15px] text-muted-foreground leading-relaxed max-w-md">
                    Have a recording of an old-time tune? Submit it and — with your permission — it'll appear on the tune's page for everyone to hear.
                  </p>
                </div>
              </div>
              <Link href="/submit-recording">
                <Button
                  className="bg-foreground hover:bg-primary text-background text-[11px] uppercase tracking-[0.16em] font-medium rounded-none shrink-0"
                  data-testid="link-submit-recording"
                >
                  Submit a Recording
                </Button>
              </Link>
            </div>
          </section>

          <TipJar />
        </div>
      </div>
    </div>
  );
}
