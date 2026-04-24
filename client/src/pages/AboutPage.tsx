import { Link } from "wouter";
import { Music2, Headphones, Video, BookOpen, FileText, Star, ChevronRight, MessageCircleQuestion, Mic, ListMusic, Gauge, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import TipJar from "@/components/TipJar";
import { usePageMeta } from "@/hooks/usePageMeta";
import SuggestChangesForm from "@/components/SuggestChangesForm";

const FAQ_ITEMS = [
  {
    q: "How many tunes are in TuneVault?",
    a: "1,032 — spanning reels, breakdowns, waltzes, jigs, polkas, marches, hornpipes, modal tunes, and more. Audio is available for over 940 of them, and more than 270 have embedded YouTube performances.",
  },
  {
    q: "Where does the audio come from?",
    a: "From Slippery Hill (slippery-hill.com), the Canote Brothers archive (stringband.mossyroof.com), the Library of Congress American Folklife Center, and Old Time Fiddle Tunes archives. Each recording is credited on the tune page.",
  },
  {
    q: "Where does the historical information come from?",
    a: "Fiddle contest records, the LOC American Folklife Center, O'Neill's collections, Marion Thede's 'The Fiddle Book,' Rounder Records liner notes, and documented fiddler biographies.",
  },
  {
    q: "Does TuneVault work on mobile?",
    a: "Yes — fully mobile-responsive. Swipe left/right on the home page to page through tunes. In the mini player, swipe left for next and right for previous.",
  },
  {
    q: "How do I use TuneVault to actually learn tunes?",
    a: "The mini player is built for learning, not just listening. Drop the speed to 75% or 50% to hear bow patterns and ornaments clearly at a pace you can follow. Use transpose to practice a tune in a different key — great for matching a jam group's pitch or cross-tuning practice. On the home page, filter by key (e.g. key of A) and difficulty (Easy or Intermediate) to build a focused practice set, then star your targets to drill them in favorites-only mode.",
  },
  {
    q: "When does the Tune of the Day change?",
    a: "Every day at midnight Eastern Time. The same tune is shown to all visitors on a given calendar day — it's deterministic, not random per visit.",
  },
  {
    q: "Can I suggest a correction to a tune's details?",
    a: "Yes — every tune page has a 'Suggest a correction' button. You can flag issues with the title, key, source fiddler, description, audio, video link, or anything else. Pick the correction type, enter the suggested value, and optionally leave your name and email. Submissions go into a review queue.",
  },
  {
    q: "Can I submit my own recording?",
    a: "Yes. Use the 'Submit a Recording' page to share a URL (SoundCloud, YouTube, Dropbox, etc.) for any old-time tune in the vault. With your permission, approved submissions are added directly to that tune's page for everyone to hear.",
  },
  {
    q: "What is the Playlist feature?",
    a: "The mini player at the bottom doubles as a playlist manager. Queue any tune to play it next, or add multiple tunes to a session playlist. Swipe or use the skip controls to move between tracks.",
  },
  {
    q: "Can I suggest a new tune that isn't in TuneVault yet?",
    a: "Absolutely. Use the 'Suggest a correction' form on any tune page (choose 'General / other') or use the form on this page and describe the tune you'd like added. The goal is to cover the full canon of Old-Time repertoire.",
  },
  {
    q: "Is there a blog?",
    a: "Yes — the Blog covers fiddle history, regional styles, tune deep-dives, and the tradition's living players. Find it in the navigation menu.",
  },
  {
    q: "Can I take lessons?",
    a: "Yes. Jason Chinchen offers private fiddle lessons. Visit the 'Book a Lesson' page to learn more and reach out.",
  },
];

const BADGE_EXPLANATIONS = [
  { icon: Headphones, label: "Audio", color: "text-sky-600", desc: "A recording is available — plays in the mini player at the bottom." },
  { icon: Video, label: "Video", color: "text-rose-600", desc: "A YouTube performance is embedded on the tune page." },
  { icon: BookOpen, label: "ABC", color: "text-violet-600", desc: "ABC notation rendered as staff music." },
  { icon: FileText, label: "Sheet Music", color: "text-emerald-600", desc: "A transcription image is available to view or enlarge." },
];

export default function AboutPage() {
  usePageMeta(
    "About & FAQ",
    "Learn how to use TuneVault — 1,032 Old-Time fiddle tunes with audio, history, ABC notation, YouTube video, community recordings, Tune of the Day, blog, and lessons. FAQ for serious learners and session players."
  );


  return (
    <div className="min-h-screen bg-background pb-8 pt-12 sm:pt-12">
      {/* Hero */}
      <div
        className="relative text-primary-foreground px-4 pt-12 pb-10 overflow-hidden border-b border-white/10"
        style={{
          backgroundImage: "linear-gradient(150deg, hsl(var(--primary)) 0%, hsl(25 75% 28%) 100%)",
        }}
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

      <div className="container mx-auto max-w-3xl px-4 py-10 space-y-12">

        {/* What is TuneVault */}
        <section>
          <h2 className="text-2xl font-serif font-bold text-foreground mb-3">What is TuneVault?</h2>
          <p className="text-muted-foreground leading-relaxed">
            TuneVault is a comprehensive, searchable hub for serious old-time fiddle players. It connects web-wide fiddle sources, allowing users to search, filter, and study various old-time forms.
            Designed for practice and growth, it offers historical context, playing notes, recordings, YouTube performances, and sheet music (ABC staff notation) for each tune.
          </p>
        </section>

        {/* What is Old-Time */}
        <section>
          <h2 className="text-2xl font-serif font-bold text-foreground mb-3">What is Old-Time Music?</h2>
          <p className="text-muted-foreground leading-relaxed">
            Old-Time music is fiddle-driven dance music rooted in the British Isles and the African American South, which merged in the mountains of Appalachia and spread across the continent over four centuries. It's fundamentally social music — played for dancing, for community, for memory. The fiddle carries the melody while clawhammer banjo, guitar, and bass hold the groove. The emphasis is on drive, feel, and flow over showmanship.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-3">
            The tradition thrives today in jam sessions, contradance halls, and music camps from Asheville to Portland. Its repertoire stretches from 18th-century Scottish reels to tunes composed last decade that already feel traditional.
          </p>
        </section>

        {/* Quick Start */}
        <section>
          <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Quick Start</h2>
          <div className="space-y-3">
            {[
              { title: "Search & Filter", body: "Use the search bar to find tunes by name. Filter by key, difficulty, region, and tune type — all filters combine and narrow instantly. Working on tunes in A? Filter to key of A. Building your beginner repertoire? Filter to Easy. Use favorites-only mode to drill your personal set list." },
              { title: "Play & Slow It Down", body: "Click any tune to open it, then hit play to load it into the mini player. The player has a speed control — drop it to 75% or 50% to hear every ornament and bow change at a learnable pace. Use transpose to hear the tune in a different key without retuning. Add tunes to a session playlist and swipe or skip through them." },
              { title: "Favorites", body: "Star any tune to save it locally. Filter to favorites-only with the star button in the toolbar." },
              { title: "Tune of the Day", body: "A featured tune with full history, audio, and notation — refreshes every day at midnight Eastern. Shuffle any time for a different discovery." },
              { title: "Suggest a Correction", body: "Spot a wrong key, misspelled title, or missing fiddler credit? Every tune page has a 'Suggest a correction' button. Pick the issue type, enter the fix, and submit — it goes straight to the review queue." },
              { title: "Submit a Recording", body: "Recorded yourself playing a tune? Submit a link on the 'Submit a Recording' page and — with your permission — it may be added to that tune's page for the community." },
              { title: "Blog & Lessons", body: "The Blog explores fiddle history, regional styles, and player profiles. If you'd like personalized instruction, visit the 'Book a Lesson' page to study with Jason Chinchen." },
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

        {/* Practice Tools callout */}
        <section className="rounded-xl border border-sky-200 bg-sky-50 dark:bg-sky-950/20 dark:border-sky-800 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-sky-600" />
            <h2 className="text-xl font-serif font-bold text-sky-900 dark:text-sky-100">Built for Learning, Not Just Listening</h2>
          </div>
          <p className="text-sky-800 dark:text-sky-200 text-sm leading-relaxed">
            TuneVault is a practice room as much as a reference library. Three tools make it especially useful when you're actively working on your playing:
          </p>
          <div className="space-y-3">
            <div className="flex gap-3">
              <Gauge className="w-4 h-4 mt-0.5 shrink-0 text-sky-600" />
              <div>
                <p className="font-semibold text-sky-900 dark:text-sky-100 text-sm">Speed Control</p>
                <p className="text-sky-800 dark:text-sky-300 text-sm leading-relaxed">
                  The mini player lets you slow any recording to 75% or 50% of full speed with no pitch change. Hear every grace note, bow lift, and rhythmic nuance at a pace you can actually follow — then ramp back up as the tune gets under your fingers.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <SlidersHorizontal className="w-4 h-4 mt-0.5 shrink-0 text-sky-600" />
              <div>
                <p className="font-semibold text-sky-900 dark:text-sky-100 text-sm">Transpose</p>
                <p className="text-sky-800 dark:text-sky-300 text-sm leading-relaxed">
                  Shift a recording up or down by semitone without re-tuning your instrument. Ideal when a jam session is playing a tune in a different key, when you're exploring cross-tunings, or when you want to hear how a melody sits in D versus A.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <SlidersHorizontal className="w-4 h-4 mt-0.5 shrink-0 text-sky-600" />
              <div>
                <p className="font-semibold text-sky-900 dark:text-sky-100 text-sm">Filters as a Practice Planner</p>
                <p className="text-sky-800 dark:text-sky-300 text-sm leading-relaxed">
                  Filter the full vault by key, difficulty, region, and tune type simultaneously. Drill everything in the key of G before moving on, focus on waltzes one week, or work through Easy tunes region by region. Star what you're working on and switch to favorites-only mode to keep your practice list front and center.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Tune of the Day teaser */}
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
            <h2 className="text-xl font-serif font-bold text-amber-900">Tune of the Day</h2>
          </div>
          <p className="text-amber-800 text-sm leading-relaxed mb-4">
            A randomly selected featured tune — full history, recordings, video, and notation in one place. Shuffle any time to discover more.
          </p>
          <Link
            href="/tune-of-the-day"
            data-testid="link-tune-of-day-about"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors"
          >
            Try it now <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </section>

        {/* FAQ + Suggestion Box */}
        <section>
          <h2 className="text-2xl font-serif font-bold text-foreground mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4 mb-8">
            {FAQ_ITEMS.map(({ q, a }) => (
              <div key={q} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <p className="font-semibold text-foreground text-sm mb-1">{q}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>

          <h3 className="text-xl font-serif font-bold text-foreground mb-1">Suggest a Tune or Correction</h3>
          <p className="text-muted-foreground text-sm mb-5">
            Know a tune that should be here? Spot a wrong key, misspelled title, or missing fiddler credit? Use the form below — structured corrections go straight to our review queue.
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
                Have a recording or video of an old-time tune? Submit it and — with your permission — it'll appear directly on the tune's page for everyone to hear.
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
