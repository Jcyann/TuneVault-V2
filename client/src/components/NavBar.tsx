import { Link, useLocation } from "wouter";
import { Music2, Calendar, Info, GraduationCap } from "lucide-react";

const navLinks = [
  { href: "/", label: "Home", icon: Music2 },
  { href: "/tune-of-the-day", label: "Tune of the Day", icon: Calendar },
  { href: "/about", label: "About", icon: Info },
  { href: "/book-a-lesson", label: "Lessons", icon: GraduationCap },
];

export default function NavBar() {
  const [location] = useLocation();

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-30 border-b border-white/10 backdrop-blur-md"
      style={{
        backgroundImage: "linear-gradient(150deg, hsl(var(--primary)) 0%, hsl(25 75% 28%) 100%)",
      }}
    >
      <div className="container mx-auto max-w-5xl px-4 h-12 flex items-center gap-1">
        {navLinks.map(({ href, label }) => {
          const active = location === href || (href === "/" && location === "");
          return (
            <Link
              key={href}
              href={href}
              data-testid={`nav-link-${label.toLowerCase().replace(/\s+/g, "-")}`}
              className={`hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                active
                  ? "bg-white/20 text-white"
                  : "text-white/75 hover:text-white hover:bg-white/10"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* Mobile bottom tab strip */}
      <div className="sm:hidden flex border-t border-white/10">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const active = location === href || (href === "/" && location === "");
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center py-1.5 text-[9px] font-medium transition-colors ${
                active ? "text-amber-400" : "text-white/60 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
