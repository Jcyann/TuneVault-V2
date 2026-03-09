import { Link } from "wouter";
import { GraduationCap, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TipJar from "@/components/TipJar";
import { usePageMeta } from "@/hooks/usePageMeta";

const INSTRUMENTS = [
  {
    name: "Old-Time Fiddle",
    desc: "The heart of the tradition. Learn bow technique, left-hand position, tone production, and repertoire from the full Old-Time canon. Beginners welcome.",
  },
  {
    name: "Clawhammer Banjo",
    desc: "The driving pulse of Old-Time music. Learn the bum-ditty stroke, drop-thumb technique, and how to lock in with the fiddle at a session.",
  },
  {
    name: "Old-Time Guitar",
    desc: "The rhythmic backbone. Learn boom-chick rhythm, bass runs, and how to comp sensitively behind a melody without overpowering the groove.",
  },
  {
    name: "Bass",
    desc: "The foundation. Learn walking bass lines, chord tones, and the art of holding the pocket in a jam. Electric or upright welcome.",
  },
];

export default function BookALessonPage() {
  usePageMeta(
    "Book a Lesson",
    "Online lessons in Old-Time fiddle, clawhammer banjo, Old-Time guitar, and bass. All levels welcome. Tune-based learning with deep historical context."
  );

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
          <div className="flex items-center gap-3 mb-2">
            <GraduationCap className="w-10 h-10 opacity-90" />
            <div>
              <h1 className="text-4xl font-bold tracking-tight font-serif drop-shadow-sm">Book a Lesson</h1>
              <p className="text-primary-foreground/70 text-sm mt-0.5">Fiddle · Clawhammer Banjo · Guitar · Bass</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-10 space-y-12">
        {/* Intro */}
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Old-Time music is one of the most rewarding traditions you can dive into — the repertoire is deep, the community is welcoming, and the music lives at the intersection of history, feel, and technique. Lessons draw directly from the TuneVault repertoire so every tune comes with context, recordings, and a real reason to play it.
          </p>
          <p>
            Whether you're picking up an instrument for the first time or looking to get your tunes session-ready, lessons are available online at all skill levels.
          </p>
        </div>

        {/* Instruments */}
        <div>
          <h2 className="text-xl font-serif font-bold text-foreground mb-4">What We Teach</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {INSTRUMENTS.map(({ name, desc }) => (
              <div key={name} className="p-5 rounded-xl border border-border bg-card flex flex-col gap-2">
                <p className="font-semibold text-foreground">{name}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* What to expect */}
        <div>
          <h2 className="text-xl font-serif font-bold text-foreground mb-3">What to Expect</h2>
          <ul className="space-y-2 text-muted-foreground text-sm">
            {[
              "Tune-based learning — you leave every lesson with something you can play at a session",
              "Historical context for every tune — the who, where, and why",
              "Technique tailored to your instrument and level",
              "Video call lessons — no travel, no scheduling headaches",
              "All levels welcome, including complete beginners",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <ChevronRight className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Booking CTA */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center space-y-4">
          <h2 className="text-2xl font-serif font-bold text-amber-900">Ready to get started?</h2>
          <p className="text-amber-800 text-sm max-w-sm mx-auto">
            Online booking is coming soon. Check back shortly — or explore the tune library to find what you want to learn first.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="relative inline-block">
              <Button
                size="lg"
                disabled
                data-testid="button-book-lesson"
                className="bg-amber-500 hover:bg-amber-500 text-white font-semibold px-8 opacity-80 cursor-not-allowed"
              >
                <GraduationCap className="w-4 h-4 mr-2" />
                Book a Lesson
              </Button>
              <Badge className="absolute -top-2 -right-3 bg-amber-700 text-white text-[10px] px-1.5 py-0.5 rounded-full border-0">
                Soon
              </Badge>
            </div>
          </div>
          <p className="text-amber-700/60 text-xs">Lessons via video call. No account needed.</p>
        </div>

        {/* Secondary CTA */}
        <div className="text-center">
          <p className="text-muted-foreground text-sm mb-3">Explore the tune library to find what you'd like to learn:</p>
          <Link href="/" data-testid="link-explore-from-booking">
            <Button variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50">
              Explore TuneVault <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        <TipJar />
      </div>
    </div>
  );
}
