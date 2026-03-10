import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Inbox, MessageSquare, GraduationCap, Calendar, Mail, Music2, Globe, Clock } from "lucide-react";
import type { LessonInquiry, Suggestion } from "@shared/schema";
import { usePageMeta } from "@/hooks/usePageMeta";

function fmt(d: string | Date) {
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function InquiryCard({ inq }: { inq: LessonInquiry }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3" data-testid={`inquiry-card-${inq.id}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-semibold text-foreground text-base">{inq.name}</p>
          <a href={`mailto:${inq.email}`} className="text-sm text-amber-600 hover:underline flex items-center gap-1">
            <Mail className="w-3.5 h-3.5" />{inq.email}
          </a>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            {inq.instrument}
          </p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 justify-end">
            <Clock className="w-3 h-3" />{fmt(inq.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <GraduationCap className="w-4 h-4 shrink-0 text-amber-500" />
          <span>{inq.experienceLevel}</span>
        </div>
        {inq.yearsPlaying && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4 shrink-0 text-amber-500" />
            <span>{inq.yearsPlaying}</span>
          </div>
        )}
        {inq.availability && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4 shrink-0 text-amber-500" />
            <span>{inq.availability}</span>
          </div>
        )}
        {inq.timezone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Globe className="w-4 h-4 shrink-0 text-amber-500" />
            <span>{inq.timezone}</span>
          </div>
        )}
      </div>

      {inq.currentGoals && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Goals</p>
          <p className="text-sm text-foreground leading-relaxed bg-muted/40 rounded-lg p-3">{inq.currentGoals}</p>
        </div>
      )}

      {inq.specificTunes && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
            <Music2 className="w-3.5 h-3.5" /> Tunes / Styles
          </p>
          <p className="text-sm text-foreground leading-relaxed bg-muted/40 rounded-lg p-3">{inq.specificTunes}</p>
        </div>
      )}

      {inq.additionalNotes && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Additional Notes</p>
          <p className="text-sm text-foreground leading-relaxed bg-muted/40 rounded-lg p-3">{inq.additionalNotes}</p>
        </div>
      )}
    </div>
  );
}

function SuggestionCard({ sug }: { sug: Suggestion }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-2" data-testid={`suggestion-card-${sug.id}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="font-semibold text-foreground">{sug.name || <span className="italic text-muted-foreground">Anonymous</span>}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />{fmt(sug.createdAt)}
        </p>
      </div>
      <p className="text-sm text-foreground leading-relaxed bg-muted/40 rounded-lg p-3">{sug.message}</p>
    </div>
  );
}

export default function AdminPage() {
  usePageMeta("Admin — TuneVault", "TuneVault admin dashboard");
  const [tab, setTab] = useState<"inquiries" | "suggestions">("inquiries");

  const { data: inquiries = [], isLoading: loadingInq } = useQuery<LessonInquiry[]>({
    queryKey: ["/api/admin/lesson-inquiries"],
  });

  const { data: subs = [], isLoading: loadingSug } = useQuery<Suggestion[]>({
    queryKey: ["/api/admin/suggestions"],
  });

  return (
    <div className="min-h-screen bg-background pb-12">
      <div
        className="px-4 pt-10 pb-8 border-b border-border"
        style={{ background: "linear-gradient(150deg, hsl(var(--primary)) 0%, hsl(25 75% 28%) 100%)" }}
      >
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-3">
            <Inbox className="w-8 h-8 text-primary-foreground opacity-90" />
            <div>
              <h1 className="text-3xl font-bold font-serif text-primary-foreground">TuneVault Admin</h1>
              <p className="text-primary-foreground/60 text-sm">Lesson inquiries and suggestions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("inquiries")}
            data-testid="tab-inquiries"
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              tab === "inquiries"
                ? "bg-amber-500 text-white"
                : "border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Lesson Inquiries
            <span className="ml-1 text-xs opacity-75">({inquiries.length})</span>
          </button>
          <button
            onClick={() => setTab("suggestions")}
            data-testid="tab-suggestions"
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              tab === "suggestions"
                ? "bg-amber-500 text-white"
                : "border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Suggestions
            <span className="ml-1 text-xs opacity-75">({subs.length})</span>
          </button>
        </div>

        {tab === "inquiries" && (
          <div className="space-y-4">
            {loadingInq ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : inquiries.length === 0 ? (
              <div className="text-center py-16">
                <GraduationCap className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground">No lesson inquiries yet.</p>
              </div>
            ) : (
              inquiries.map((inq) => <InquiryCard key={inq.id} inq={inq} />)
            )}
          </div>
        )}

        {tab === "suggestions" && (
          <div className="space-y-4">
            {loadingSug ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : subs.length === 0 ? (
              <div className="text-center py-16">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground">No suggestions yet.</p>
              </div>
            ) : (
              subs.map((sug) => <SuggestionCard key={sug.id} sug={sug} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
