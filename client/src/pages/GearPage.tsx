import { Link } from "wouter";
import { BookOpen, Music2, Package, ExternalLink, Info } from "lucide-react";
import TipJar from "@/components/TipJar";
import { usePageMeta } from "@/hooks/usePageMeta";

// ─── AFFILIATE HELPERS ────────────────────────────────────────────────────────
const BOOKSHOP_ID = "125147";
const SWEETWATER_ID = "";
const SMP_ID = "";

const bookshop = (isbn: string) => `https://bookshop.org/a/${BOOKSHOP_ID}/${isbn}`;
const withAffiliate = (url: string, parameter: string, id: string) =>
  id ? `${url}${url.includes("?") ? "&" : "?"}${parameter}=${encodeURIComponent(id)}` : url;
const sweetwater = (url: string) => withAffiliate(url, "affil", SWEETWATER_ID);
const sweetwaterSearch = (query: string) =>
  sweetwater(`https://www.sweetwater.com/store/search/query/${query.replace(/\s+/g, "+")}`);
const sheetMusicPlus = (query: string) =>
  withAffiliate(`https://www.sheetmusicplus.com/search?Ntt=${encodeURIComponent(query)}`, "aff_id", SMP_ID);
const olCover  = (isbn: string) => `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

// ─── DATA ─────────────────────────────────────────────────────────────────────

const BOOKS = [
  {
    title: "Old-Time Fiddle: Round Peak Style",
    author: "Brad Leftwich & Linda Higginbotham",
    desc: "The definitive guide to the Round Peak tradition. Leftwich learned directly from Tommy Jarrell — this is the source.",
    price: "$25",
    url: bookshop("9780786680283"),
    image: "https://m.media-amazon.com/images/I/51btI5JbhEL.jpg",
    tag: "Essential",
  },
  {
    title: "Traditional American Fiddle Tunes, Vol. 1",
    author: "Stacy Phillips",
    desc: "Over 100 tunes in notation and tab with regional style notes. A working player's reference.",
    price: "$20",
    url: sheetMusicPlus("stacy phillips fiddle"),
    image: "https://opensheetmusic.com/cdn/shop/products/cover-large_file_8214bdf1-d477-4c6e-a5f7-5d64756edbe7_compact.jpg?v=1596611216",
    tag: "Reference",
  },
  {
    title: "The Fiddle Book",
    author: "Marion Thede",
    desc: "The ethnomusicological classic — 150 tunes from the Southern mountains with historical context. Dense and essential.",
    price: "$20",
    url: bookshop("9780806802572"),
    image: "https://images-na.ssl-images-amazon.com/images/I/71Qs7ZbuLQL.jpg",
    tag: "Classic",
  },
  {
    title: "Appalachian Fiddle",
    author: "Miles Krassen",
    desc: "Clear notation, cultural context, approachable arrangements. One of the best entry points for new old-time players.",
    price: "$15",
    url: bookshop("9780825601927"),
    image: "https://m.media-amazon.com/images/I/513beeHen0S.jpg",
    tag: "Beginner-Friendly",
  },
  {
    title: "The Old-Time Fiddler's Repertory",
    author: "R.P. Christeson",
    desc: "245 tunes collected from Missouri fiddlers in the 1940s–60s. A goldmine of less-known repertoire.",
    price: "$25",
    url: bookshop("9780826202765"),
    image: "https://m.media-amazon.com/images/I/612Ui3lza6L.jpg",
    tag: "Deep Cuts",
  },
  {
    title: "The Portland Collection",
    author: "Susan Songer (ed.)",
    desc: "Community tune book from Portland's old-time scene — hundreds of tunes you'll actually hear at jams.",
    price: "$20",
    url: "https://portlandcollection.com",
    image: "https://m.media-amazon.com/images/I/51cQYszk+LL.jpg",
    tag: "Jam Ready",
  },
];

const RECORDINGS = [
  {
    title: "Down to the Cider Mill",
    artist: "Tommy Jarrell & Fred Cockerham",
    desc: "The Round Peak canon in its purest form. If you play old-time fiddle, you need this.",
    url: "https://folkways.si.edu/tommy-jarrell-fred-cockerham/down-to-the-cider-mill/american-folk/music/album/smithsonian",
    image: "https://cdn-images.dzcdn.net/images/cover/4a497b3c757bf627582c4c3cc39dc1ad/500x500-000000-80-0-0.jpg",
    tag: "Holy Grail",
  },
  {
    title: "Feed Your Babies Onions",
    artist: "The Highwoods String Band",
    desc: "The definitive revival-era old-time band. Raw, driving, and totally alive — sounds like a real dance.",
    url: "https://www.discogs.com/master/592291",
    image: "https://m.media-amazon.com/images/I/61fazs8qG8L.jpg",
    tag: "Revival Classic",
  },
  {
    title: "Doc Watson",
    artist: "Doc Watson",
    desc: "The 1964 Vanguard debut. Watson's fiddle tunes on guitar alone are a masterclass in melodic old-time.",
    url: "https://folkways.si.edu/doc-watson/doc-watson/american-folk-bluegrass/music/album/smithsonian",
    image: "https://e.snmc.io/i/600/w/cbc22a6d3789ebad92c33aa9128e056c/1384125/doc-watson-doc-watson-Cover-Art.jpg",
    tag: "Essential",
  },
  {
    title: "Gum Tree Canoe",
    artist: "John Hartford",
    desc: "Hartford at his most old-time — steamer whistles, steamboat lore, and Benton County fiddle tunes.",
    url: "https://www.discogs.com/master/572925",
    image: "https://www.popsike.pics/pix/20230925/145324194517.jpg",
    tag: "Unique",
  },
  {
    title: "Old-Time Music Sampler",
    artist: "Various Artists (Rounder Records)",
    desc: "A perfect introduction to what Rounder Records documented in the 1970s–80s old-time revival.",
    url: "https://rounder.com",
    image: "https://folkways-media.si.edu/images/album_covers/SF700/SFW40093.jpg",
    tag: "Sampler",
  },
];

const GEAR = [
  {
    title: "D'Addario Helicore Violin Strings",
    brand: "D'Addario",
    desc: "The workhorse string for old-time: warm, durable, and affordable. Medium tension for most open-back tunings.",
    price: "$30",
    url: sweetwater("https://www.sweetwater.com/store/detail/H310--daddario-helicore-violin-string-set-medium"),
    image: "https://www.kcstrings.com/cdn/shop/files/helicore_vn_med_530x@2x.jpg",
    tag: "Strings",
  },
  {
    title: "Hill Dark Rosin",
    brand: "W.E. Hill & Sons",
    desc: "The classic choice for old-time and folk fiddlers — grips the string without sticking. Made in England since 1890.",
    price: "$12",
    url: sweetwater("https://www.sweetwater.com/store/search/query/hill+dark+rosin"),
    image: "https://thumbs.static-thomann.de/thumb/padthumb600x600/pics/bdb/_56/562692/18125447_800.jpg",
    tag: "Rosin",
  },
  {
    title: "Snark SN-1 Clip-On Tuner",
    brand: "Snark",
    desc: "Fast, bright, and cheap. Clips to the peghead — works in noisy jam environments. Replace the battery once a year.",
    price: "$12",
    url: sweetwater("https://www.sweetwater.com/store/detail/SN1--snark-sn-1-clip-on-chromatic-tuner"),
    image: "https://m.media-amazon.com/images/I/410CjULLnZL.jpg",
    tag: "Tuner",
  },
  {
    title: "Kun Original Shoulder Rest",
    brand: "Kun",
    desc: "Adjustable, foldable, and the standard choice for players who use one. Fits most 4/4 fiddles.",
    price: "$30",
    url: sweetwater("https://www.sweetwater.com/store/detail/KunOriginal"),
    image: "https://www.stringersmusic.com/cdn/shop/products/Kun_collapsible_4_a389fe83-9a96-4d25-8fbd-a2873f4eb5f3.png",
    tag: "Comfort",
  },
  {
    title: "Practice Mute — Heavy Rubber",
    brand: "Generic",
    desc: "For apartment players and hotel-room practicers. Cuts volume to near-nothing without changing feel.",
    price: "$8",
    url: sweetwater("https://www.sweetwater.com/store/search/query/violin+practice+mute"),
    image: "https://i.ebayimg.com/images/g/05YAAOSwkdZjv24O/s-l500.jpg",
    tag: "Practice",
  },
  {
    title: "D'Addario J60 5-String Banjo Strings",
    brand: "D'Addario",
    desc: "A practical light-gauge set for five-string banjo, with a clear starting point for clawhammer or three-finger players.",
    price: "$8",
    url: sweetwaterSearch("daddario j60 banjo strings"),
    image: "/images/gear/daddario-ej60-banjo-strings.jpg",
    tag: "Banjo Strings",
  },
  {
    title: "GHS PF150 5-String Banjo Strings",
    brand: "GHS",
    desc: "Phosphor-bronze banjo strings with a warm, focused response for players who want a little more body from the instrument.",
    price: "$8",
    url: sweetwaterSearch("GHS PF150 banjo strings"),
    image: "/images/gear/ghs-pf150-banjo-strings.jpg",
    tag: "Banjo Strings",
  },
  {
    title: "Aquila AQ-7B Minstrel Banjo Strings",
    brand: "Aquila New Nylgut",
    desc: "A five-string synthetic-gut-style set made for minstrel banjo players seeking a lower-tension, period-informed feel.",
    price: "$17",
    url: "https://www.sagamusic.com/shop/fretted-instrument-accessories/aquila/aquila-new-nylgut-aq-7b-minstrel-banjo-strings-medium-tension-dgdfa-set-of-5/",
    image: "/images/gear/aquila-aq7b-minstrel-banjo-strings.jpg",
    tag: "Minstrel Banjo",
  },
  {
    title: "D'Addario EJ16 Phosphor Bronze Guitar Strings",
    brand: "D'Addario",
    desc: "Light-gauge acoustic guitar strings with a familiar phosphor-bronze balance for rhythm guitar and flatpicking.",
    price: "$12",
    url: sweetwaterSearch("D'Addario EJ16 guitar strings"),
    image: "/images/gear/daddario-ej16-guitar-strings.jpg",
    tag: "Guitar Strings",
  },
  {
    title: "Elixir 80/20 Bronze Nanoweb Guitar Strings",
    brand: "Elixir",
    desc: "Coated acoustic-guitar strings designed to keep their feel and brightness longer between changes.",
    price: "$18",
    url: sweetwaterSearch("Elixir 80 20 bronze Nanoweb guitar strings"),
    image: "/images/gear/elixir-nanoweb-8020-guitar-strings.jpg",
    tag: "Guitar Strings",
  },
  {
    title: "Martin Authentic Acoustic Lifespan 2.0",
    brand: "Martin",
    desc: "A coated phosphor-bronze acoustic guitar set for players who want longer-lasting strings for regular jam and gig use.",
    price: "$18",
    url: sweetwaterSearch("Martin Lifespan 2.0 guitar strings"),
    image: "/images/gear/martin-lifespan-guitar-strings.jpg",
    tag: "Guitar Strings",
  },
  {
    title: "D'Addario Prelude Violin Strings",
    brand: "D'Addario",
    desc: "A dependable student-friendly fiddle string option for trying alternate tunings without spending heavily on a full set.",
    price: "$25",
    url: sweetwaterSearch("D'Addario Prelude violin strings"),
    image: "/images/gear/daddario-prelude-violin-strings.jpg",
    tag: "Fiddle Strings",
  },
  {
    title: "BlueChip TPR-S Thumb Pick",
    brand: "BlueChip",
    desc: "A low-profile thumb pick for clawhammer banjo and fingerstyle guitar players who want a consistent picking edge.",
    price: "$40",
    url: sweetwaterSearch("BlueChip TPR-S thumb pick"),
    image: "/images/gear/bluechip-tpr-thumb-pick.jpg",
    tag: "Picks",
  },
  {
    title: "Dunlop Brass Fingerpicks",
    brand: "Dunlop",
    desc: "Lightweight metal fingerpicks for three-finger banjo and fingerstyle guitar, with adjustable fit around the fingertip.",
    price: "$6",
    url: sweetwaterSearch("Dunlop brass fingerpicks"),
    image: "/images/gear/dunlop-brass-fingerpicks.jpg",
    tag: "Picks",
  },
  {
    title: "Shubb C1 Original Capo",
    brand: "Shubb",
    desc: "A compact guitar capo with adjustable pressure for quick key changes while keeping the strings settled.",
    price: "$25",
    url: sweetwaterSearch("Shubb C1 capo"),
    image: "/images/gear/shubb-c1-capo.jpg",
    tag: "Capos",
  },
  {
    title: "D'Addario NS Banjo Capo",
    brand: "D'Addario",
    desc: "A dedicated banjo capo for changing keys while keeping the fifth-string setup in view.",
    price: "$20",
    url: sweetwaterSearch("D'Addario NS banjo capo"),
    image: "/images/gear/daddario-ns-banjo-capo.jpg",
    tag: "Capos",
  },
  {
    title: "Korg MA-2 Digital Metronome",
    brand: "Korg",
    desc: "A pocket metronome for tightening bowing, clawhammer drop-thumb patterns, and guitar rhythm before the jam.",
    price: "$20",
    url: sweetwaterSearch("Korg MA-2 metronome"),
    image: "/images/gear/korg-ma2-metronome.jpg",
    tag: "Practice",
  },
  {
    title: "Boss DB-30 Dr. Beat",
    brand: "Boss",
    desc: "A compact rhythm trainer with a clear display for slow practice, speed building, and working through crooked phrases.",
    price: "$30",
    url: sweetwaterSearch("Boss DB-30 metronome"),
    image: "/images/gear/boss-db30-metronome.jpg",
    tag: "Practice",
  },
  {
    title: "Peterson StroboClip HD Tuner",
    brand: "Peterson",
    desc: "A high-resolution clip-on tuner for players who want more precise setup checks across fiddle, banjo, and guitar.",
    price: "$60",
    url: sweetwaterSearch("Peterson StroboClip HD tuner"),
    image: "/images/gear/peterson-stroboclip-hd-tuner.jpg",
    tag: "Tuner",
  },
  {
    title: "Hercules Violin Stand",
    brand: "Hercules",
    desc: "A stable stand that keeps a fiddle easy to reach between tunes instead of resting it on a chair or amp.",
    price: "$40",
    url: sweetwaterSearch("Hercules violin stand"),
    image: "/images/gear/hercules-violin-stand.jpg",
    tag: "Setup",
  },
  {
    title: "K&M Folding Music Stand",
    brand: "König & Meyer",
    desc: "A portable stand for sheet music, chord charts, and set lists at home, rehearsals, or outdoor sessions.",
    price: "$35",
    url: sweetwaterSearch("K&M folding music stand"),
    image: "/images/gear/km-folding-music-stand.jpg",
    tag: "Setup",
  },
  {
    title: "Zoom H1essential Recorder",
    brand: "Zoom",
    desc: "A small handheld recorder for capturing lessons, jam ideas, and room sound without setting up a full microphone rig.",
    price: "$100",
    url: sweetwaterSearch("Zoom H1essential recorder"),
    image: "/images/gear/zoom-h1essential-recorder.jpg",
    tag: "Recording",
  },
  {
    title: "Etymotic ER20XS High-Fidelity Earplugs",
    brand: "Etymotic",
    desc: "Reusable musician earplugs that reduce volume while keeping the balance of a live jam more natural.",
    price: "$25",
    url: sweetwaterSearch("Etymotic ER20XS earplugs"),
    image: "/images/gear/etymotic-er20xs-earplugs.jpg",
    tag: "Hearing",
  },
  {
    title: "D'Addario Humidipak Two-Way Humidification",
    brand: "D'Addario",
    desc: "A case humidification system for helping protect wooden instruments through dry indoor seasons and travel.",
    price: "$30",
    url: sweetwaterSearch("D'Addario Humidipak"),
    image: "/images/gear/daddario-humidipak.jpg",
    tag: "Care",
  },
  {
    title: "Fiddle Cleaning & Care Kit",
    brand: "D'Addario",
    desc: "A simple care set for wiping rosin from the instrument and keeping strings, finish, and case routine under control.",
    price: "$15",
    url: sweetwaterSearch("D'Addario violin cleaning care kit"),
    image: "/images/gear/daddario-instrument-care-kit.jpg",
    tag: "Care",
  },
];

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function Tag({ label }: { label: string }) {
  return (
    <span className="text-[9px] uppercase tracking-[0.16em] font-semibold px-1.5 py-0.5 bg-primary/10 text-primary rounded-sm">
      {label}
    </span>
  );
}

type CardAspect = "portrait" | "square";

function ProductImage({
  src,
  alt,
  aspect,
}: {
  src: string | null;
  alt: string;
  aspect: CardAspect;
}) {
  const aspectClass = aspect === "portrait" ? "aspect-[2/3]" : "aspect-square";

  if (!src) {
    return (
      <div className={`w-full ${aspectClass} bg-muted flex items-center justify-center rounded-t-sm`}>
        <BookOpen className="w-8 h-8 text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <div className={`w-full ${aspectClass} bg-muted overflow-hidden rounded-t-sm`}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    </div>
  );
}

function BookCard({ title, author, desc, price, url, image, tag }: typeof BOOKS[0]) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col bg-card border border-border rounded-sm overflow-hidden hover:shadow-md transition-shadow"
      data-testid={`book-card-${title.toLowerCase().replace(/\s+/g, "-").slice(0, 20)}`}
    >
      <ProductImage src={image} alt={title} aspect="portrait" />
      <div className="flex flex-col flex-1 p-3 gap-1.5">
        <Tag label={tag} />
        <p className="font-display text-sm font-semibold text-foreground leading-snug line-clamp-2">{title}</p>
        <p className="text-[11px] text-muted-foreground">{author}</p>
        <p className="font-serif text-[12px] text-muted-foreground leading-relaxed line-clamp-3 flex-1">{desc}</p>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
          <span className="text-sm font-semibold text-foreground">{price}</span>
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] font-semibold text-primary group-hover:underline underline-offset-2">
            Buy <ExternalLink className="w-3 h-3" />
          </span>
        </div>
      </div>
    </a>
  );
}

function RecordingCard({ title, artist, desc, url, image, tag }: typeof RECORDINGS[0]) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col bg-card border border-border rounded-sm overflow-hidden hover:shadow-md transition-shadow"
      data-testid={`recording-card-${title.toLowerCase().replace(/\s+/g, "-").slice(0, 20)}`}
    >
      <ProductImage src={image} alt={title} aspect="square" />
      <div className="flex flex-col flex-1 p-3 gap-1.5">
        <Tag label={tag} />
        <p className="font-display text-sm font-semibold text-foreground leading-snug line-clamp-2">{title}</p>
        <p className="text-[11px] text-muted-foreground">{artist}</p>
        <p className="font-serif text-[12px] text-muted-foreground leading-relaxed line-clamp-3 flex-1">{desc}</p>
        <div className="flex items-center justify-end mt-2 pt-2 border-t border-border">
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] font-semibold text-primary group-hover:underline underline-offset-2">
            Find It <ExternalLink className="w-3 h-3" />
          </span>
        </div>
      </div>
    </a>
  );
}

function GearCard({ title, brand, desc, price, url, image, tag }: typeof GEAR[0]) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col bg-card border border-border rounded-sm overflow-hidden hover:shadow-md transition-shadow"
      data-testid={`gear-card-${title.toLowerCase().replace(/\s+/g, "-").slice(0, 20)}`}
    >
      <div className="aspect-square bg-white overflow-hidden rounded-t-sm">
        {image ? (
          <img
            src={image}
            alt={title}
            className="w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-[1.05]"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-muted-foreground/30" />
          </div>
        )}
      </div>
      <div className="flex flex-col flex-1 p-3 gap-1.5">
        <Tag label={tag} />
        <p className="font-display text-sm font-semibold text-foreground leading-snug line-clamp-2">{title}</p>
        <p className="text-[11px] text-muted-foreground">{brand}</p>
        <p className="font-serif text-[12px] text-muted-foreground leading-relaxed line-clamp-3 flex-1">{desc}</p>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
          <span className="text-sm font-semibold text-foreground">{price}</span>
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] font-semibold text-primary group-hover:underline underline-offset-2">
            Buy <ExternalLink className="w-3 h-3" />
          </span>
        </div>
      </div>
    </a>
  );
}

// ─── SECTION HEADER ──────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, eyebrow, title, border = false }: {
  icon: React.ElementType;
  eyebrow: string;
  title: string;
  border?: boolean;
}) {
  return (
    <div className={`${border ? "border-t border-foreground pt-8 " : ""}mb-6`}>
      <div className="flex items-center gap-3 mb-1">
        <Icon className="w-4 h-4 text-primary shrink-0" />
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">{eyebrow}</div>
      </div>
      <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">{title}</h2>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function GearPage() {
  usePageMeta(
    "Recommended Gear, Books & Recordings",
    "Curated old-time fiddle essentials: strings, gear, method books, and classic recordings — handpicked for serious learners."
  );

  return (
    <div className="min-h-screen bg-background pb-16 pt-16 sm:pt-20">
      <div className="container mx-auto max-w-5xl px-6">

        <header className="border-t border-foreground pt-6 pb-10">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">Curated</div>
          <h1 className="font-display text-[44px] sm:text-6xl font-semibold tracking-tight leading-[0.95] text-foreground">Gear, Books & Recordings</h1>
          <p className="font-display italic text-xl text-muted-foreground mt-3">What serious old-time players actually use.</p>
        </header>

        {/* Disclosure */}
        <div className="flex items-start gap-2.5 bg-muted/50 border border-border px-4 py-3 mb-10 text-xs text-muted-foreground leading-relaxed rounded-sm">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <p><span className="font-semibold text-foreground">Affiliate disclosure:</span> Some links earn TuneVault a small commission at no extra cost to you. We only recommend what we genuinely use and believe in.</p>
        </div>

        {/* ── Gear ── */}
        <section className="mb-14">
          <SectionHeader icon={Package} eyebrow="Equip" title="Strings & Gear" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {GEAR.map((g) => <GearCard key={g.title} {...g} />)}
          </div>
        </section>

        {/* ── Books ── */}
        <section className="mb-14">
          <SectionHeader icon={BookOpen} eyebrow="Learn" title="Books & Method Guides" border />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {BOOKS.map((b) => <BookCard key={b.title} {...b} />)}
          </div>
        </section>

        {/* ── Recordings ── */}
        <section className="mb-14">
          <SectionHeader icon={Music2} eyebrow="Listen" title="Essential Recordings" border />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {RECORDINGS.map((r) => <RecordingCard key={r.title} {...r} />)}
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

        <p className="text-center text-[11px] text-muted-foreground/60 leading-relaxed mb-8 max-w-md mx-auto">
          TuneVault is a Bookshop.org, Sheet Music Plus, and Sweetwater affiliate. Purchases through our links may earn a small commission.
        </p>

        <TipJar />
      </div>
    </div>
  );
}
