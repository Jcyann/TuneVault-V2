import { Link } from "wouter";
import { Headphones, Video, BookOpen, FileText, Star, ChevronRight, MessageCircleQuestion, Mic, Gauge, SlidersHorizontal, ExternalLink, ListMusic } from "lucide-react";
import { Button } from "@/components/ui/button";
import TipJar from "@/components/TipJar";
import { usePageMeta } from "@/hooks/usePageMeta";
import SuggestChangesForm from "@/components/SuggestChangesForm";

const FAQ_ITEMS = [
  {
    q: "Where does the audio come from?",
    a: "Slippery Hill, the Canote Brothers archive, the Library of Congress American Folklife Center, and Old Time Fiddle Tunes archives. Each recording is credited on the tune page.",
  },
  {
    q: "Where does the historical information come from?",
    a: "Fiddle contest records, the LOC American Folklife Center, O'Neill's collections, Marion Thede's 'The Fiddle Book,' Rounder Records liner notes, and documented fiddler biographies.",
  },
  {
    q: "Does TuneVault work on mobile?",
    a: "Yes — fully mobile-responsive. Swipe left/right on the home page to page through tunes. In the mini player, swipe left for next and right for previous.",
  },
];

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
    <div className="min-h-screen bg-background pb-8 pt-12 sm:pt-12">
      {/* Hero */}
      <div
        className="relative text-primary-foreground px-4 pt-12 pb-10 overflow-hidden border-b border-white/10"
        style={{ backgroundImage: "linear-gradient(150deg, hsl(var(--primary)) 0%, hsl(25 75% 28%) 100%)" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.18),transparent_65%)] pointer-events-none" />
        <div className="container mx-auto max-w-3xl relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <MessageCircleQuestion className="w-10 h-10 opacity-90" />
            <div>
              <h1 className="text-4xl font-bold tracking-tight font-serif drop-shadow-sm">About TuneVault</h1>
              <p className="text-primary-foreground/70 text-sm mt-0.5">How to use the app &amp; FAQ</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-10 space-y-10">

        {/* Intro */}
        <section className="space-y-3">
          <p className="text-muted-foreground leading-relaxed">
            TuneVault is a searchable hub for Old-Time fiddle players — 1,050+ tunes with audio, video, historical context, and ABC notation. Built for practice and serious learning, not just browsing.
          </p>
          <Link href="/blog/what-is-old-time-music" className="group inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-800 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
            What is Old-Time Music? Read the full essay →
          </Link>
        </section>

        {/* Practice Tools */}
        <section className="rounded-xl border border-sky-200 bg-sky-50 dark:bg-sky-950/20 dark:border-sky-800 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-sky-600" />
            <h2 className="text-lg font-serif font-bold text-sky-900 dark:text-sky-100">Built for Learning, Not Just Listening</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex gap-2.5">
              <Gauge className="w-4 h-4 mt-0.5 shrink-0 text-sky-600" />
              <p className="text-sky-800 dark:text-sky-300"><span className="font-semibold text-sky-900 dark:text-sky-100">Speed Control</span> — Slow any recording to 75% or 50% with no pitch change. Hear every grace note at a learnable pace.</p>
            </div>
            <div className="flex gap-2.5">
              <SlidersHorizontal className="w-4 h-4 mt-0.5 shrink-0 text-sky-600" />
              <p className="text-sky-800 dark:text-sky-300"><span className="font-semibold text-sky-900 dark:text-sky-100">Transpose</span> — Shift a recording up or down by semitone without retuning. Match a jam session's pitch or explore cross-tunings.</p>
            </div>
            <div className="flex gap-2.5">
              <ListMusic className="w-4 h-4 mt-0.5 shrink-0 text-sky-600" />
              <p className="text-sky-800 dark:text-sky-300"><span className="font-semibold text-sky-900 dark:text-sky-100">Filters as a Practice Planner</span> — Filter by key, difficulty, region, and type simultaneously. Star targets and switch to favorites-only mode to drill your set list.</p>
            </div>
          </div>
        </section>

        {/* Quick Start */}
        <section>
          <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Quick Start</h2>
          <div className="space-y-3">
            {[
              { title: "Search & Filter", body: "Find tunes by name, key, difficulty, region, and type — all filters combine instantly. Star tunes to save them and switch to favorites-only mode." },
              { title: "Play & Slow It Down", body: "Click a tune, hit play, and use the mini player's speed control (75%/50%) to hear every ornament at a learnable pace. Use transpose to match a different key." },
              { title: "Tune of the Day", body: "A featured tune with full history, audio, and notation — refreshes at midnight Eastern. Shuffle any time for a random discovery." },
              { title: "Suggest & Submit", body: "Every tune page has a 'Suggest a correction' button for wrong keys, missing credits, or anything else. Have a recording? Submit it on the Submit a Recording page." },
            ].map(({ title, body }) => (
              <div key={title} className="flex gap-3">
                <ChevronRight className="w-4 h-4 mt-1 shrink-0 text-amber-500" />
                <div>
                  <p className="font-semibold text-foreground text-sm">{title}</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Badge guide */}
        <section>
          <h2 className="text-2xl font-serif font-bold text-foreground mb-4">What the Badges Mean</h2>
          <div className="grid grid-cols-2 gap-3">
            {BADGE_EXPLANATIONS.map(({ icon: Icon, label, color, desc }) => (
              <div key={label} className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card">
                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${color}`} />
                <div>
                  <p className="font-semibold text-foreground text-sm">{label}</p>
                  <p className="text-muted-foreground text-xs leading-relaxed mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tune of the Day teaser */}
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
            <h2 className="text-lg font-serif font-bold text-amber-900">Tune of the Day</h2>
          </div>
          <p className="text-amber-800 text-sm leading-relaxed mb-3">
            A featured tune with full history, recordings, video, and notation — refreshes every day. Shuffle any time to discover more.
          </p>
          <Link
            href="/tune-of-the-day"
            data-testid="link-tune-of-day-about"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors"
          >
            Try it now <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-2xl font-serif font-bold text-foreground mb-5">FAQ</h2>
          <div className="space-y-4 mb-8">
            {FAQ_ITEMS.map(({ q, a }) => (
              <div key={q} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <p className="font-semibold text-foreground text-sm mb-1">{q}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>

          <h3 className="text-xl font-serif font-bold text-foreground mb-2">Suggest a Correction or New Tune</h3>
          <p className="text-muted-foreground text-sm mb-5">
            Spot a wrong key, missing fiddler credit, or a tune that should be here? Every tune page has a "Suggest a correction" button — or use the form below. Have a recording to share? Head to the <Link href="/submit-recording" className="underline hover:text-foreground transition-colors">Submit a Recording</Link> page.
          </p>
          <SuggestChangesForm className="rounded-2xl border border-border bg-card p-6" />
        </section>

        {/* Submit a Recording */}
        <section data-testid="submit-recording-section">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Mic className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-serif font-bold text-lg text-foreground">Share Your Playing</h3>
              <p className="text-muted-foreground text-sm mt-0.5 leading-relaxed">
                Have a recording of an old-time tune? Submit it and — with your permission — it'll appear on the tune's page for everyone to hear.
              </p>
            </div>
            <Link href="/submit-recording">
              <Button
                className="bg-amber-500 hover:bg-amber-600 text-white font-semibold shrink-0"
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
  );
}
