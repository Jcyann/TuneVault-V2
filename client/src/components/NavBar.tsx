import { Link, useLocation } from "wouter";
import { Music2, Calendar, Info, GraduationCap, BookOpen, KeyRound, ShoppingBag } from "lucide-react";

const navLinks = [
  { href: "/", label: "Home", mobileLabel: "Home", icon: Music2 },
  { href: "/tune-of-the-day", label: "Tune of the Day", mobileLabel: "Today", icon: Calendar },
  { href: "/identify-key", label: "Identify Key", mobileLabel: "Key", icon: KeyRound },
  { href: "/blog", label: "Blog", mobileLabel: "Blog", icon: BookOpen },
  { href: "/gear", label: "Store", mobileLabel: "Store", icon: ShoppingBag },
  { href: "/about", label: "About", mobileLabel: "About", icon: Info },
  { href: "/book-a-lesson", label: "Lessons", mobileLabel: "Lessons", icon: GraduationCap },
];

export default function NavBar() {
  const [location] = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-30 bg-background/90 backdrop-blur border-b border-border">
      <div className="container mx-auto max-w-6xl px-5 h-14 flex items-center justify-between">
        <Link
          href="/"
          data-testid="nav-wordmark"
          className="font-display text-xl font-bold tracking-tight text-foreground hover:text-primary transition-colors"
        >
          TuneVault
        </Link>
        <div className="hidden sm:flex items-center gap-1">
          {navLinks.map(({ href, label }) => {
            const active = location === href || (href === "/" && location === "");
            return (
              <Link
                key={href}
                href={href}
                data-testid={`nav-link-${label.toLowerCase().replace(/\s+/g, "-")}`}
                className={`relative inline-flex items-center px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] font-medium transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
                {active && (
                  <span className="absolute left-3 right-3 -bottom-0.5 h-px bg-primary" />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Mobile bottom tab strip */}
      <div className="sm:hidden flex border-t border-border bg-background">
        {navLinks.map(({ href, mobileLabel, icon: Icon }) => {
          const active = location === href || (href === "/" && location === "");
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center py-1.5 text-[9px] font-medium tracking-wider uppercase transition-colors ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              {mobileLabel}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
