import { Link } from "wouter";
import { Headphones, Video, BookOpen, FileText, Star, ChevronRight, Mic, ExternalLink } from "lucide-react";
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
    "Learn how to use TuneVault — over 1,050 Old-Time fiddle tunes with audio, history, ABC notation, YouTube video, community recordings, Tune of the Day, blog, and lessons."
  );

  return (
    <div className="min-h-screen bg-background pb-16 pt-16 sm:pt-20">
      <div className="container mx-auto max-w-3xl px-6">

        {/* Header */}
        <header className="border-t border-foreground pt-6 pb-10">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">The Field Guide</div>
          <h1 className="font-display text-[44px] sm:text-6xl font-semibold tracking-tight leading-[0.95] text-foreground">About TuneVault</h1>
          <p className="font-display italic text-xl text-muted-foreground mt-3">1,050+ Old-Time fiddle tunes — built for practice, not just browsing.</p>
        </header>

        <div className="space-y-10">

          {/* Quick Start */}
          <section>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">In Four Moves</div>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground tracking-tight mb-6">Quick start</h2>
            <ol className="space-y-5">
              {[
                { title: "Search & filter", body: "Find tunes by name, key, difficulty, region, or type — all filters stack instantly. Star any tune to save it and switch to favorites-only mode." },
                { title: "Play from the list", body: "Hover a tune in search results to play it directly without leaving the page. Tap the mini player at the bottom to expand controls." },
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

          {/* FAQ */}
          <section className="border-t border-border pt-7">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">Questions</div>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground tracking-tight mb-6">Frequently asked</h2>
            <dl className="space-y-5 mb-12">
              {[
                { q: "Where does the audio come from?", a: "Slippery Hill, the Canote Brothers archive, the Library of Congress American Folklife Center, and Old Time Fiddle Tunes archives. Each recording is credited on the tune page." },
                { q: "Where does the historical information come from?", a: "Fiddle contest records, the LOC American Folklife Center, O'Neill's collections, Marion Thede's 'The Fiddle Book,' Rounder Records liner notes, and documented fiddler biographies." },
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
