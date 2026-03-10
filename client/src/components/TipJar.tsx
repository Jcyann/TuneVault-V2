import { Heart } from "lucide-react";
import { Link } from "wouter";

export default function TipJar() {
  return (
    <div className="flex flex-col items-center gap-3 py-8 border-t border-border mt-10">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
        <span>Enjoying TuneVault? Help keep the lights on.</span>
      </div>
      <a
        href="https://venmo.com/Jason-Chinchen"
        target="_blank"
        rel="noopener noreferrer"
        data-testid="link-tip-jar"
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-105 active:scale-95 shadow-md"
        style={{ backgroundColor: "#3D95CE" }}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" aria-hidden="true">
          <path d="M19.01 1.01C19.77 2.33 20.1 3.69 20.1 5.4c0 5.12-4.37 11.77-7.91 16.44H4.67L1.6 2.31l7.08-.67 1.63 12.97c1.52-2.47 3.39-6.38 3.39-9.03 0-1.45-.26-2.44-.66-3.26l6.07-1.31z"/>
        </svg>
        Support TuneVault
      </a>
      <Link
        href="/book-a-lesson"
        data-testid="link-book-lesson-footer"
        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
      >
        Book a lesson in Old-Time fiddle, clawhammer banjo, guitar, or upright bass
      </Link>
      <p className="text-xs text-muted-foreground opacity-50">TuneVault — Built for serious learners and history buffs</p>
    </div>
  );
}
