import { Link } from "wouter";
import { BookOpen, Music2, Package, ExternalLink, Info } from "lucide-react";
import TipJar from "@/components/TipJar";
import { usePageMeta } from "@/hooks/usePageMeta";

// ─── AFFILIATE LINK HELPER ────────────────────────────────────────────────────
// Replace BOOKSHOP_ID with your Bookshop.org affiliate ID (e.g. "tunevault")
// Replace SWEETWATER_ID with your Sweetwater affiliate referral code
// Replace SMP_ID with your Sheet Music Plus affiliate ID
const BOOKSHOP_ID = "YOUR_ID";  // sign up at bookshop.org/affiliates
const SWEETWATER_ID = "";       // sign up at sweetwater.com/affiliates
const SMP_ID = "";              // sign up at sheetmusicplus.com/affiliate

function bookshopUrl(isbn: string) {
  return `https://bookshop.org/a/${BOOKSHOP_ID}/isbn/${isbn}`;
}

// ─── CONTENT ─────────────────────────────────────────────────────────────────

const BOOKS = [
  {
    title: "Old-Time Fiddle: Round Peak Style",
    author: "Brad Leftwich & Linda Higginbotham",
    desc: "The definitive guide to the Round Peak tradition. Leftwich learned directly from Tommy Jarrell — this is the source.",
    price: "~$25",
    url: bookshopUrl("9780786680283"),
    tag: "Essential",
  },
  {
    title: "Traditional American Fiddle Tunes, Vol. 1",
    author: "Stacy Phillips",
    desc: "Over 100 tunes in notation and tab with regional style notes. A working player's reference.",
    price: "~$20",
    url: `https://www.sheetmusicplus.com/search?Ntt=stacy+phillips+fiddle&aff_id=${SMP_ID}`,
    tag: "Reference",
  },
  {
    title: "The Fiddle Book",
    author: "Marion Thede",
    desc: "The ethnomusicological classic — 150 tunes from the Southern mountains with historical context. Dense and essential.",
    price: "~$20",
    url: bookshopUrl("9780806802572"),
    tag: "Classic",
  },
  {
    title: "Appalachian Fiddle",
    author: "Miles Krassen",
    desc: "Clear notation, cultural context, and approachable arrangements. One of the best entry points for new old-time players.",
    price: "~$15",
    url: bookshopUrl("9780825601927"),
    tag: "Beginner-friendly",
  },
  {
    title: "The Old-Time Fiddler's Repertory",
    author: "R.P. Christeson",
    desc: "245 tunes collected from Missouri fiddlers in the 1940s–60s. A goldmine of less-known repertoire.",
    price: "~$25",
    url: bookshopUrl("9780826202765"),
    tag: "Deep Cuts",
  },
  {
    title: "The Portland Collection",
    author: "Susan Songer (ed.)",
    desc: "Community tune book from Portland's old-time scene — hundreds of tunes you'll actually hear at jams.",
    price: "~$20",
    url: "https://portlandcollection.com",
    tag: "Jam Ready",
  },
];

const RECORDINGS = [
  {
    title: "Down to the Cider Mill",
    artist: "Tommy Jarrell & Fred Cockerham",
    desc: "The Round Peak canon in its purest form. If you play old-time fiddle, you need this.",
    url: "https://folkways.si.edu/tommy-jarrell-fred-cockerham/down-to-the-cider-mill/american-folk/music/album/smithsonian",
    tag: "Holy Grail",
  },
  {
    title: "Feed Your Babies Onions",
    artist: "The Highwoods String Band",
    desc: "The definitive revival-era old-time band. Raw, driving, and totally alive — sounds like a real dance.",
    url: "https://www.discogs.com/master/592291",
    tag: "Revival Classic",
  },
  {
    title: "Doc Watson",
    artist: "Doc Watson",
    desc: "The 1964 debut. Watson's fiddle tunes on guitar alone are a masterclass in melodic old-time.",
    url: bookshopUrl("8712177062461"),
    tag: "Essential",
  },
  {
    title: "Gum Tree Canoe",
    artist: "John Hartford",
    desc: "Hartford at his most old-time — steamer whistles, steamboat lore, and Benton County fiddle tunes.",
    url: "https://folkways.si.edu",
    tag: "Unique",
  },
  {
    title: "Rounder Old Time Music Sampler",
    artist: "Various Artists",
    desc: "A perfect introduction to what Rounder Records documented in the 1970s–80s old-time revival.",
    url: "https://rounder.com",
    tag: "Sampler",
  },
];

const GEAR = [
  {
    title: "D'Addario Helicore Violin Strings",
    desc: "The workhorse string for old-time: warm, durable, and affordable. Medium tension for most open-backed tunings.",
    price: "~$30",
    url: `https://www.sweetwater.com/store/detail/H310--daddario-helicore-violin-string-set-medium?affil=${SWEETWATER_ID}`,
    tag: "Strings",
  },
  {
    title: "Hill Dark Rosin",
    desc: "The classic choice for old-time and folk fiddlers — grips the string without sticking. Made in England since 1890.",
    price: "~$12",
    url: `https://www.sweetwater.com/store/search/query/hill+dark+rosin?affil=${SWEETWATER_ID}`,
    tag: "Rosin",
  },
  {
    title: "Snark SN-1 Clip-On Tuner",
    desc: "Fast, bright, and cheap. Clips to the peghead — works in noisy jam environments. Replace the battery once a year.",
    price: "~$12",
    url: `https://www.sweetwater.com/store/detail/SN1--snark-sn-1-clip-on-chromatic-tuner?affil=${SWEETWATER_ID}`,
    tag: "Tuner",
  },
  {
    title: "Kun Original Shoulder Rest",
    desc: "Adjustable, foldable, and the standard choice for players who use one. Fits most 4/4 fiddles.",
    price: "~$30",
    url: `https://www.sweetwater.com/store/detail/KunOriginal?affil=${SWEETWATER_ID}`,
    tag: "Comfort",
  },
  {
    title: "Practice Mute (Heavy Rubber)",
    desc: "For apartment players and hotel-room practicers. Cuts volume to near-nothing without changing feel.",
    price: "~$8",
    url: `https://www.sweetwater.com/store/search/query/violin+practice+mute?affil=${SWEETWATER_ID}`,
    tag: "Practice",
  },
];

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function Tag({ label }: { label: string }) {
  return (
    <span className="text-[9px] uppercase tracking-[0.18em] font-semibold px-1.5 py-0.5 bg-primary/10 text-primary rounded-sm">
      {label}
    </span>
  );
}

function BookCard({ title, author, desc, price, url, tag }: typeof BOOKS[0]) {
  return (
    <div className="border-b border-border py-5 last:border-0 flex gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap mb-0.5">
          <Tag label={tag} />
        </div>
        <p className="font-display text-base font-semibold text-foreground leading-snug mt-1">{title}</p>
        <p className="text-xs text-muted-foreground mb-1">{author}</p>
        <p className="font-serif text-[14px] text-muted-foreground leading-relaxed">{desc}</p>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-2 pt-1">
        <span className="text-sm font-semibold text-foreground tabular-nums">{price}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.12em] font-medium text-primary hover:underline underline-offset-2"
        >
          Buy <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

function RecordingCard({ title, artist, desc, url, tag }: typeof RECORDINGS[0]) {
  return (
    <div className="border-b border-border py-5 last:border-0 flex gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap mb-0.5">
          <Tag label={tag} />
        </div>
        <p className="font-display text-base font-semibold text-foreground leading-snug mt-1">{title}</p>
        <p className="text-xs text-muted-foreground mb-1">{artist}</p>
        <p className="font-serif text-[14px] text-muted-foreground leading-relaxed">{desc}</p>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-2 pt-1">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.12em] font-medium text-primary hover:underline underline-offset-2"
        >
          Find it <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

function GearCard({ title, desc, price, url, tag }: typeof GEAR[0]) {
  return (
    <div className="border-b border-border py-5 last:border-0 flex gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap mb-0.5">
          <Tag label={tag} />
        </div>
        <p className="font-display text-base font-semibold text-foreground leading-snug mt-1">{title}</p>
        <p className="font-serif text-[14px] text-muted-foreground leading-relaxed mt-1">{desc}</p>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-2 pt-1">
        <span className="text-sm font-semibold text-foreground tabular-nums">{price}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.12em] font-medium text-primary hover:underline underline-offset-2"
        >
          Buy <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function GearPage() {
  usePageMeta(
    "Recommended Books, Recordings & Gear",
    "Curated old-time fiddle essentials: method books, classic recordings, strings, and gear — handpicked for serious learners."
  );

  return (
    <div className="min-h-screen bg-background pb-16 pt-16 sm:pt-20">
      <div className="container mx-auto max-w-3xl px-6">

        <header className="border-t border-foreground pt-6 pb-10">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">Curated</div>
          <h1 className="font-display text-[44px] sm:text-6xl font-semibold tracking-tight leading-[0.95] text-foreground">Books, Recordings & Gear</h1>
          <p className="font-display italic text-xl text-muted-foreground mt-3">What serious old-time players actually use.</p>
        </header>

        {/* Disclosure */}
        <div className="flex items-start gap-2.5 bg-muted/50 border border-border px-4 py-3 mb-10 text-xs text-muted-foreground leading-relaxed">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <p>Some links on this page are affiliate links — TuneVault earns a small commission if you buy through them, at no cost to you. Everything here is genuinely recommended.</p>
        </div>

        {/* Books */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-1">
            <BookOpen className="w-4 h-4 text-primary shrink-0" />
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Learn</div>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground tracking-tight mb-4">Books & Method Guides</h2>
          <div>
            {BOOKS.map((b) => <BookCard key={b.title} {...b} />)}
          </div>
        </section>

        {/* Recordings */}
        <section className="border-t border-foreground pt-8 mb-12">
          <div className="flex items-center gap-3 mb-1">
            <Music2 className="w-4 h-4 text-primary shrink-0" />
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Listen</div>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground tracking-tight mb-4">Essential Recordings</h2>
          <div>
            {RECORDINGS.map((r) => <RecordingCard key={r.title} {...r} />)}
          </div>
        </section>

        {/* Gear */}
        <section className="border-t border-foreground pt-8 mb-12">
          <div className="flex items-center gap-3 mb-1">
            <Package className="w-4 h-4 text-primary shrink-0" />
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Equip</div>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground tracking-tight mb-4">Strings & Gear</h2>
          <div>
            {GEAR.map((g) => <GearCard key={g.title} {...g} />)}
          </div>
        </section>

        {/* Suggest something */}
        <div className="border-t border-border pt-8 mb-10 text-center">
          <p className="text-sm text-muted-foreground">
            Know something that should be here?{" "}
            <Link href="/about#suggestion-box" className="text-primary underline underline-offset-2 hover:opacity-80">
              Suggest it →
            </Link>
          </p>
        </div>

        <TipJar />
      </div>
    </div>
  );
}
