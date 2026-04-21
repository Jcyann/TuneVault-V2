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
    <div className="min-h-screen bg-background pb-8 pt-12 sm:pt-12">
      {/* Hero */}
      <div
        className="relative text-primary-foreground px-4 pt-12 pb-10 overflow-hidden border-b border-white/10"
        style={{
          backgroundImage: "linear-gradient(150deg, hsl(var(--primary)) 0%, hsl(25 75% 28%) 100%)",
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.18),transparent_65%)] pointer-events-none" />
        <div className="container mx-auto max-w-3xl relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <BookOpen className="w-10 h-10 opacity-90" />
            <div>
              <h1 className="text-4xl font-bold tracking-tight font-serif drop-shadow-sm">TuneVault Blog</h1>
              <p className="text-primary-foreground/70 text-sm mt-0.5">Stories, history, and deep dives into Old-Time music</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-10">
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-6 animate-pulse">
                <div className="h-5 bg-muted rounded w-3/4 mb-3" />
                <div className="h-4 bg-muted rounded w-full mb-2" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-24">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-25" />
            <h2 className="text-xl font-serif font-bold text-foreground mb-2">Coming soon</h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Posts about Old-Time music history, featured tunes, and session culture are on their way.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} data-testid={`blog-card-${post.id}`}>
                <article className="group rounded-2xl border border-border bg-card hover:border-amber-300 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer">
                  {post.coverImageUrl && (
                    <img
                      src={post.coverImageUrl}
                      alt={post.title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-6">
                    <h2 className="text-xl font-serif font-bold text-foreground mb-2 group-hover:text-amber-700 transition-colors">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-3">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {post.author}
                        </span>
                        {post.publishedAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(post.publishedAt)}
                          </span>
                        )}
                      </div>
                      <span className="text-amber-600 text-xs font-medium flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
                        Read more <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
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
