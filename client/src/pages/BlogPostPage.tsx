import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { BlogPost } from "@shared/schema";
import TipJar from "@/components/TipJar";
import { usePageMeta } from "@/hooks/usePageMeta";

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function DynamicMeta({ post }: { post: BlogPost }) {
  usePageMeta(post.title, post.excerpt || `${post.title} — TuneVault Blog`);
  return null;
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading, isError } = useQuery<BlogPost>({
    queryKey: ["/api/blog", slug],
    queryFn: () => fetch(`/api/blog/${slug}`).then((r) => { if (!r.ok) throw new Error("Not found"); return r.json(); }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-12">
        <div className="container mx-auto max-w-3xl px-4 py-16 animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="space-y-2 mt-8">
            {[1,2,3,4,5].map(i => <div key={i} className="h-4 bg-muted rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="min-h-screen bg-background pt-12 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Post not found.</p>
          <Link href="/blog" className="text-amber-600 hover:underline text-sm">← Back to Blog</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8 pt-12">
      <DynamicMeta post={post} />

      {/* Hero / cover */}
      {post.coverImageUrl ? (
        <div className="relative h-56 sm:h-72 w-full overflow-hidden">
          <img src={post.coverImageUrl} alt={post.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      ) : (
        <div
          className="h-32 w-full"
          style={{ backgroundImage: "linear-gradient(150deg, hsl(var(--primary)) 0%, hsl(25 75% 28%) 100%)" }}
        />
      )}

      <div className="container mx-auto max-w-3xl px-4 py-8">
        {/* Back link */}
        <Link
          href="/blog"
          data-testid="link-back-to-blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Blog
        </Link>

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-foreground leading-tight mb-4">
            {post.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {post.author}
            </span>
            {post.publishedAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {formatDate(post.publishedAt)}
              </span>
            )}
          </div>
          {post.excerpt && (
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed border-l-4 border-amber-400 pl-4 italic">
              {post.excerpt}
            </p>
          )}
        </header>

        {/* Body */}
        <div className="prose prose-amber prose-sm sm:prose max-w-none text-foreground
          prose-headings:font-serif prose-headings:text-foreground
          prose-p:text-muted-foreground prose-p:leading-relaxed
          prose-a:text-amber-600 prose-a:no-underline hover:prose-a:underline
          prose-strong:text-foreground
          prose-blockquote:border-amber-400 prose-blockquote:text-muted-foreground prose-blockquote:italic
          prose-hr:border-border prose-code:text-amber-700 prose-code:bg-amber-50
        ">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <Link href="/blog" className="text-amber-600 hover:underline text-sm">
            ← Back to all posts
          </Link>
        </div>

        <div className="mt-8">
          <TipJar />
        </div>
      </div>
    </div>
  );
}
