import { Link } from "wouter";
import { BookOpen, Music2, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TipJar from "@/components/TipJar";

const LESSON_HIGHLIGHTS = [
  { icon: Music2, title: "Any level welcome", desc: "Absolute beginners through advanced players. We start where you are." },
  { icon: BookOpen, title: "Tune-based learning", desc: "Every lesson centers on real tunes from the tradition — you leave with something you can play at a session." },
  { icon: Clock, title: "History and context", desc: "You learn not just the notes, but where the tune came from, who played it, and why it sounds the way it does." },
];

export default function BookALessonPage() {
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
            <BookOpen className="w-10 h-10 opacity-90" />
            <div>
              <h1 className="text-4xl font-bold tracking-tight font-serif drop-shadow-sm">Book a Lesson</h1>
              <p className="text-primary-foreground/70 text-sm mt-0.5">Old-Time fiddle instruction for all levels</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-10 space-y-12">
        {/* Intro */}
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Old-Time fiddle is one of the most rewarding musical traditions you can dive into. The repertoire is vast, the community is welcoming, and the music sits right in the sweet spot where history, feel, and technique come together.
          </p>
          <p>
            Lessons draw directly from the TuneVault repertoire — each tune comes with historical context, playing notes, and recordings so you can explore the tradition deeply, not just mechanically. Whether you're picking up a bow for the first time or looking to refine your bow arm and get your tunes session-ready, there's a path forward.
          </p>
          <p>
            Lessons are available online. All skill levels are welcome.
          </p>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {LESSON_HIGHLIGHTS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-5 rounded-xl border border-border bg-card flex flex-col gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                <Icon className="w-4.5 h-4.5 text-amber-700" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{title}</p>
                <p className="text-muted-foreground text-xs leading-relaxed mt-1">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Booking CTA */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center space-y-4">
          <h2 className="text-2xl font-serif font-bold text-amber-900">Ready to get started?</h2>
          <p className="text-amber-800 text-sm max-w-sm mx-auto">
            Online booking is coming soon. Check back shortly — or explore the tune library in the meantime to find what you want to learn first.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="relative inline-block">
              <Button
                size="lg"
                disabled
                data-testid="button-book-lesson"
                className="bg-amber-500 hover:bg-amber-500 text-white font-semibold px-8 opacity-80 cursor-not-allowed"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Book a Lesson
              </Button>
              <Badge className="absolute -top-2 -right-3 bg-amber-700 text-white text-[10px] px-1.5 py-0.5 rounded-full border-0">
                Soon
              </Badge>
            </div>
          </div>
          <p className="text-amber-700/60 text-xs">No account needed. Lessons via video call.</p>
        </div>

        {/* Secondary CTA */}
        <div className="text-center">
          <p className="text-muted-foreground text-sm mb-3">In the meantime, explore the tune library to find what you'd like to learn:</p>
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
