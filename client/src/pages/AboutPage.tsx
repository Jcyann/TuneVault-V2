import { useState } from "react";
import { Link } from "wouter";
import { Music2, Headphones, Video, BookOpen, FileText, Star, ChevronRight, MessageCircleQuestion, Send, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import TipJar from "@/components/TipJar";
import { usePageMeta } from "@/hooks/usePageMeta";
import { apiRequest } from "@/lib/queryClient";

const FAQ_ITEMS = [
  {
    q: "How many tunes are in TuneVault?",
    a: "Over 1,000 — spanning reels, breakdowns, waltzes, jigs, polkas, marches, hornpipes, modal tunes, and more. Audio is available for over 940 of them.",
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
    q: "Can I suggest a tune?",
    a: "Absolutely — use the suggestion box below. The goal is to cover the full canon of Old-Time repertoire.",
    anchor: "#suggestion-box",
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
    "Learn how to use TuneVault — nearly 1,000 Old-Time fiddle tunes with audio, history, notation, and video. FAQ for serious learners and session players."
  );

  const [sugName, setSugName] = useState("");
  const [sugMessage, setSugMessage] = useState("");
  const [sugError, setSugError] = useState("");
  const [sugSubmitting, setSugSubmitting] = useState(false);
  const [sugSubmitted, setSugSubmitted] = useState(false);

  const handleSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sugMessage.trim()) { setSugError("Please enter a message."); return; }
    setSugError("");
    setSugSubmitting(true);
    try {
      await apiRequest("POST", "/api/suggestion", { name: sugName.trim() || null, message: sugMessage.trim() });
      setSugSubmitted(true);
    } catch {
      setSugError("Something went wrong. Please try again.");
    } finally {
      setSugSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8 pt-12 sm:pt-12">
      {/* Hero */}
      <div
        className="relative text-primary-foreground px-4 pt-12 pb-10 overflow-hidden border-b border-white/10"
        style={{
          backgroundImage: [
            "repeating-linear-gradient(0deg, transparent, transparent 22px, rgba(255,255,255,0.05) 22px, rgba(255,255,255,0.05) 23px)",
            "linear-gradient(150deg, hsl(var(--primary)) 0%, hsl(25 75% 28%) 100%)",
          ].join(", "),
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
            TuneVault is a comprehensive, searchable treasury of Old-Time fiddle tunes built for serious learners, session players, and history buffs. Each tune comes with a deep historical write-up, playing notes, audio recordings, embedded YouTube performances, ABC staff notation, and sheet music where available. Nearly 1,000 tunes spanning every major Old-Time form — all in one place.
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
              { title: "Search & Filter", body: "Use the search bar to find tunes by name. Filter by key, difficulty, region, and tune type — all filters combine." },
              { title: "Play & Follow Along", body: "Click a tune card to open it. Tap the play button to queue audio in the mini player. The player remembers your position and lets you shuffle or go in order." },
              { title: "Favorites", body: "Star any tune to save it locally. Filter to favorites-only with the star button in the toolbar." },
              { title: "Tune of the Day", body: "A random featured tune with full history, audio, and notation. Shuffle for a new one any time." },
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

        {/* FAQ */}
        <section>
          <h2 className="text-2xl font-serif font-bold text-foreground mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map(({ q, a, anchor }) => (
              <div key={q} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <p className="font-semibold text-foreground text-sm mb-1">{q}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {a}
                  {anchor && (
                    <a
                      href={anchor}
                      className="ml-1 text-amber-600 hover:text-amber-700 underline underline-offset-2 transition-colors"
                      data-testid="link-suggestion-box"
                    >
                      Open the box ↓
                    </a>
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Suggestion box */}
        <section id="suggestion-box" data-testid="suggestion-box-section">
          <h2 className="text-2xl font-serif font-bold text-foreground mb-1">Suggest a Tune</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Know a tune that should be here? Drop the name, region, fiddler, or any detail that helps us find it.
          </p>

          {sugSubmitted ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 p-7 text-center space-y-2" data-testid="suggestion-success">
              <CheckCircle2 className="w-9 h-9 text-green-500 mx-auto" />
              <p className="font-semibold text-green-900 dark:text-green-300">Got it — thanks!</p>
              <p className="text-green-700 dark:text-green-400 text-sm">We'll look into adding it to TuneVault.</p>
            </div>
          ) : (
            <form
              onSubmit={handleSuggestion}
              className="rounded-2xl border border-border bg-card p-6 space-y-4"
              data-testid="suggestion-form"
            >
              <div className="space-y-1.5">
                <Label htmlFor="sug-name">Your name <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  id="sug-name"
                  data-testid="input-suggestion-name"
                  placeholder="Jane Smith"
                  value={sugName}
                  onChange={(e) => setSugName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sug-message">Tune suggestion *</Label>
                <Textarea
                  id="sug-message"
                  data-testid="textarea-suggestion-message"
                  placeholder="Tune title, region, fiddler, recording, or any context that helps us find it..."
                  value={sugMessage}
                  onChange={(e) => setSugMessage(e.target.value)}
                  rows={4}
                />
                {sugError && <p className="text-xs text-destructive" data-testid="suggestion-error">{sugError}</p>}
              </div>
              <Button
                type="submit"
                disabled={sugSubmitting}
                className="bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                data-testid="button-submit-suggestion"
              >
                {sugSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" />Send Suggestion</>
                )}
              </Button>
            </form>
          )}
        </section>

        <TipJar />
      </div>
    </div>
  );
}
