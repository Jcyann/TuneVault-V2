import { Link } from "wouter";
import { Music2, Headphones, Video, BookOpen, FileText, Star, Shuffle, ChevronRight, MessageCircleQuestion } from "lucide-react";
import TipJar from "@/components/TipJar";

const FAQ_ITEMS = [
  {
    q: "How many tunes are in TuneVault?",
    a: "TuneVault currently holds 997 tunes spanning reels, breakdowns, waltzes, jigs, polkas, marches, hornpipes, and more. We're always adding historical depth and new recordings.",
  },
  {
    q: "Does TuneVault work on mobile?",
    a: "Yes — TuneVault is fully mobile-responsive. On the home page you can swipe left/right to page through tunes. In the mini player at the bottom, swipe left for the next tune and right for the previous one.",
  },
  {
    q: "Where does the audio come from?",
    a: "Audio recordings are sourced from Slippery Hill (slippery-hill.com), the Canote Brothers archive (stringband.mossyroof.com), the Library of Congress, and Old Time Fiddle Tunes archives. All sources are credited on each tune's page.",
  },
  {
    q: "What is the Tune of the Day?",
    a: "Every day TuneVault selects a featured tune automatically. It's the same tune for everyone on the same day, so it's a great conversation starter at sessions. The page shows the full history, audio, video, and notation if available.",
  },
  {
    q: "Can I save my favorite tunes?",
    a: "Yes — tap the star on any tune card to add it to your Favorites. Your favorites are saved locally in your browser and persist between sessions. You can filter to show only favorites using the Favorites button in the toolbar.",
  },
  {
    q: "What do the colored tune type badges mean?",
    a: "Each tune type has its own color: amber for breakdowns, sky-blue for reels, violet for waltzes, emerald for jigs, rose for modal tunes, and so on. The badge shows the tune's form and rhythm family at a glance.",
  },
  {
    q: "Where does the historical information come from?",
    a: "The historical notes and descriptions are drawn from primary sources: fiddle contest records, the Library of Congress American Folklife Center, O'Neill's collections, Marion Thede's 'The Fiddle Book,' Rounder Records liner notes, and documented fiddler biographies.",
  },
  {
    q: "Can I suggest a tune to add?",
    a: "Absolutely. Reach out via Venmo tip jar or book a lesson and leave a note. The goal is to eventually cover the full canon of Old-Time fiddle repertoire.",
  },
];

const BADGE_EXPLANATIONS = [
  { icon: Headphones, label: "Audio", color: "text-sky-600", desc: "A direct audio recording is available — plays in the mini player." },
  { icon: Video, label: "Video", color: "text-rose-600", desc: "A YouTube video is embedded on the tune's detail page." },
  { icon: BookOpen, label: "ABC", color: "text-violet-600", desc: "ABC notation is available and rendered as staff notation." },
  { icon: FileText, label: "Sheet Music", color: "text-emerald-600", desc: "A transcription image (sheet music) is available to view." },
];

export default function AboutPage() {
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

      <div className="container mx-auto max-w-3xl px-4 py-10 space-y-14">

        {/* What is TuneVault */}
        <section>
          <h2 className="text-2xl font-serif font-bold text-foreground mb-3">What is TuneVault?</h2>
          <p className="text-muted-foreground leading-relaxed">
            TuneVault is a comprehensive, searchable treasury of Old-Time fiddle tunes — built for serious learners, session players, and history buffs. Each tune comes with a deep historical write-up, playing notes, audio recordings, embedded YouTube performances, ABC staff notation, and sheet music images where available. The goal is to keep everything in one place so you can explore the full breadth of the tradition without bouncing between tabs.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-3">
            TuneVault currently holds <strong className="text-foreground">997 tunes</strong> spanning every major Old-Time form — reels, breakdowns, waltzes, jigs, polkas, marches, hornpipes, modal tunes, and more. Audio is available for nearly 940 of them.
          </p>
        </section>

        {/* What is Old-Time */}
        <section>
          <h2 className="text-2xl font-serif font-bold text-foreground mb-3">What is Old-Time Music?</h2>
          <p className="text-muted-foreground leading-relaxed">
            Old-Time music is a tradition of fiddle-driven dance music rooted in the British Isles and the African American South, which merged in the mountains of Appalachia and spread across the continent over four centuries. Unlike its cousin bluegrass — which emerged in the 1940s as a self-conscious art form — Old-Time is fundamentally social music. Tunes are played for dancing, for community, for memory. The fiddle carries the melody while banjo, guitar, and bass hold the groove. The emphasis is on drive, groove, and feel over showmanship.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-3">
            The tradition is alive today in jam sessions, contradance halls, and music camps from Asheville to Portland. Its repertoire stretches from ancient Scottish reels to 19th-century breakdowns, from Civil War-era parlor songs to tunes composed last decade that already feel traditional.
          </p>
        </section>

        {/* How to use */}
        <section>
          <h2 className="text-2xl font-serif font-bold text-foreground mb-4">How to Use TuneVault</h2>
          <div className="space-y-4">
            {[
              { title: "Search & Filter", body: "Use the search bar at the top of the home page to find tunes by name. Below the search bar are filter controls — narrow by key, difficulty, region, and tune type. All filters work together." },
              { title: "Tune Cards", body: "Each card on the home page shows the tune's title, key, type, region, and difficulty level. Badges indicate whether audio, video, ABC notation, or sheet music are available. Click any card to open the full tune page." },
              { title: "Favorites", body: "Tap the star icon on any tune card to save it. Your favorites are stored in your browser and survive page refreshes. Use the Favorites button in the filter toolbar to view only your starred tunes." },
              { title: "Audio Player & Mini Player", body: "When you play a tune, the mini player appears at the bottom of the screen. It shows the current tune, has prev/next controls, and a progress bar. Swipe left to skip to the next tune, swipe right for the previous one." },
              { title: "Shuffle & Chronological Mode", body: "In the mini player, the shuffle/list icon toggles between Shuffle mode (random order from the current filter set) and Chronological mode (tunes in order). Chronological lets you work through a filtered set systematically." },
              { title: "Swipe to Page", body: "On the home page (on touch screens), swipe left to advance to the next page of tunes, right to go back. The current page and total count appear at the bottom." },
              { title: "Tune of the Day", body: "Every day TuneVault features a different tune with full historical write-up, recordings, and notation. It's the same tune for all users on a given day — compare notes at your next session." },
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            Every day TuneVault automatically selects a featured tune. The full historical write-up, recordings, video, and notation are shown in one place — perfect for a daily practice focus or a conversation starter at your next session.
          </p>
          <Link
            href="/tune-of-the-day"
            data-testid="link-tune-of-day-about"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors"
          >
            See Today's Tune <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-2xl font-serif font-bold text-foreground mb-6">Frequently Asked Questions</h2>
          <div className="space-y-5">
            {FAQ_ITEMS.map(({ q, a }) => (
              <div key={q} className="border-b border-border pb-5 last:border-0 last:pb-0">
                <p className="font-semibold text-foreground mb-1">{q}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>

        <TipJar />
      </div>
    </div>
  );
}
