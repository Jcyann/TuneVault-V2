import { Link, useLocation } from "wouter";
import { ChevronRight, GraduationCap } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export default function LessonFooter() {
  const [location] = useLocation();
  const path = location.split("?")[0];
  const alreadyHasLessonPath =
    path === "/" ||
    path === "/about" ||
    path === "/book-a-lesson" ||
    path === "/admin" ||
    path.startsWith("/tune/");

  if (alreadyHasLessonPath) return null;

  return (
    <aside className="border-t border-foreground bg-primary text-primary-foreground" aria-label="Private lessons">
      <div className="container mx-auto flex max-w-6xl flex-col gap-4 px-5 py-7 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <GraduationCap className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-display text-xl font-semibold">Want help learning a tune?</p>
            <p className="mt-1 text-sm text-primary-foreground/75">
              Start with any TuneVault tune in a focused, one-on-one online lesson.
            </p>
          </div>
        </div>
        <Link
          href="/book-a-lesson?source=page_footer"
          onClick={() => trackEvent("lesson_cta_click", "lessons", "page_footer")}
          className="inline-flex shrink-0 items-center self-start border border-primary-foreground/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.15em] transition-colors hover:bg-primary-foreground hover:text-primary sm:self-auto"
          data-testid="link-page-footer-lesson"
        >
          Learn a tune <ChevronRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
    </aside>
  );
}