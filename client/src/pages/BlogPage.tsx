import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronRight, Calendar, User } from "lucide-react";
import type { BlogPost } from "@shared/schema";
import TipJar from "@/components/TipJar";
import { usePageMeta } from "@/hooks/usePageMeta";

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function BlogPage() {
  usePageMeta(
    "Blog",
    "Stories, history, and deep dives into the Old-Time fiddle tradition from TuneVault."
  );

  const { data: posts = [], isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog"],
  });

  return (
    <div className="min-h-screen bg-background pb-16 pt-16 sm:pt-20">
      <div className="container mx-auto max-w-3xl px-6">
        <header className="border-t border-foreground pt-6 pb-10">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">Dispatches</div>
          <h1 className="font-display text-[44px] sm:text-6xl font-semibold tracking-tight leading-[0.95] text-foreground">The Journal</h1>
          <p className="font-display italic text-xl text-muted-foreground mt-3">Stories, history, and deep dives into the Old-Time tradition.</p>
        </header>
      </div>

      <div className="container mx-auto max-w-3xl px-6 pb-10">
        {isLoading ? (
          <div className="space-y-10">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-7 bg-muted w-3/4 mb-3" />
                <div className="h-4 bg-muted w-full mb-2" />
                <div className="h-4 bg-muted w-2/3" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 border-t border-border">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-4">No issues — yet</div>
            <h2 className="font-display text-4xl sm:text-5xl font-semibold text-foreground tracking-tight mb-3">Coming soon.</h2>
            <p className="font-serif text-base text-muted-foreground max-w-md mx-auto">
              Posts about Old-Time music history, featured tunes, and session culture are on their way.
            </p>
          </div>
        ) : (
          <div className="space-y-14 divide-y divide-border [&>*:not(:first-child)]:pt-14">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} data-testid={`blog-card-${post.id}`}>
                <article className="group cursor-pointer">
                  {post.coverImageUrl && (
                    <div className="overflow-hidden mb-5">
                      <img
                        src={post.coverImageUrl}
                        alt={post.title}
                        className="w-full h-56 object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
                    <span className="flex items-center gap-1.5"><User className="w-3 h-3" />{post.author}</span>
                    {post.publishedAt && (
                      <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" />{formatDate(post.publishedAt)}</span>
                    )}
                  </div>
                  <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground leading-[1.05] tracking-tight mb-3 group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="font-serif text-[16px] leading-relaxed text-muted-foreground mb-4 line-clamp-3 max-w-prose">
                      {post.excerpt}
                    </p>
                  )}
                  <span className="text-[11px] uppercase tracking-[0.18em] text-primary font-medium flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                    Read the dispatch <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </article>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-12">
          <TipJar />
        </div>
      </div>
    </div>
  );
}
