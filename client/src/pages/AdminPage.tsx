import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Inbox, MessageSquare, GraduationCap, Calendar, Mail, Music2, Globe, Clock, Mic, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import type { LessonInquiry, Suggestion, RecordingSubmission } from "@shared/schema";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

type EnrichedSubmission = RecordingSubmission & { tuneTitle?: string };

function SubmissionCard({ sub, onApprove, onReject, isPending }: {
  sub: EnrichedSubmission;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  isPending: boolean;
}) {
  const statusColor = sub.status === "approved"
    ? "text-green-700 bg-green-50 border-green-200"
    : sub.status === "rejected"
    ? "text-red-700 bg-red-50 border-red-200"
    : "text-amber-700 bg-amber-50 border-amber-200";

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4" data-testid={`submission-card-${sub.id}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-0.5">
          <p className="font-semibold text-foreground text-base">{sub.tuneTitle ?? `Tune #${sub.tuneId}`}</p>
          <p className="text-sm text-muted-foreground">
            {sub.submitterName} · <span className="capitalize">{sub.instrument}</span>
          </p>
          <a href={`mailto:${sub.submitterEmail}`} className="text-xs text-amber-600 hover:underline flex items-center gap-1">
            <Mail className="w-3 h-3" />{sub.submitterEmail}
          </a>
        </div>
        <div className="text-right shrink-0 space-y-1">
          <span className={`text-xs font-medium border px-2 py-0.5 rounded-full capitalize ${statusColor}`}>
            {sub.status}
          </span>
          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
            <Clock className="w-3 h-3" />{fmt(sub.createdAt)}
          </p>
        </div>
      </div>

      {sub.attributionName && sub.attributionName !== sub.submitterName && (
        <p className="text-xs text-muted-foreground">Credit as: <span className="font-medium text-foreground">{sub.attributionName}</span></p>
      )}

      <div className="flex flex-col gap-2">
        {sub.youtubeUrl && (
          <a
            href={sub.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`link-youtube-${sub.id}`}
            className="text-sm text-amber-600 hover:underline flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />YouTube: {sub.youtubeUrl.length > 60 ? sub.youtubeUrl.slice(0, 60) + "…" : sub.youtubeUrl}
          </a>
        )}
        {sub.audioUrl && (
          <a
            href={sub.audioUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`link-audio-${sub.id}`}
            className="text-sm text-amber-600 hover:underline flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />Audio: {sub.audioUrl.length > 60 ? sub.audioUrl.slice(0, 60) + "…" : sub.audioUrl}
          </a>
        )}
      </div>

      {sub.status === "pending" && (
        <div className="flex gap-3 pt-1">
          <Button
            size="sm"
            onClick={() => onApprove(sub.id)}
            disabled={isPending}
            data-testid={`button-approve-${sub.id}`}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" /> Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onReject(sub.id)}
            disabled={isPending}
            data-testid={`button-reject-${sub.id}`}
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            <XCircle className="w-4 h-4 mr-1" /> Reject
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  usePageMeta("Admin — TuneVault", "TuneVault admin dashboard");
  const [tab, setTab] = useState<"inquiries" | "suggestions" | "submissions">("inquiries");
  const { toast } = useToast();

  const { data: inquiries = [], isLoading: loadingInq } = useQuery<LessonInquiry[]>({
    queryKey: ["/api/admin/lesson-inquiries"],
  });

  const { data: subs = [], isLoading: loadingSug } = useQuery<Suggestion[]>({
    queryKey: ["/api/admin/suggestions"],
  });

  const { data: recordingSubs = [], isLoading: loadingRec } = useQuery<EnrichedSubmission[]>({
    queryKey: ["/api/admin/recording-submissions"],
  });

  const pendingCount = recordingSubs.filter((s) => s.status === "pending").length;

  const approveMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/admin/recording-submissions/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recording-submissions"] });
      toast({ title: "Recording approved", description: "It's now linked to the tune." });
    },
    onError: () => toast({ title: "Approval failed", variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/admin/recording-submissions/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recording-submissions"] });
      toast({ title: "Submission rejected." });
    },
    onError: () => toast({ title: "Rejection failed", variant: "destructive" }),
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
              <p className="text-primary-foreground/60 text-sm">Lesson inquiries, suggestions, and recording submissions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="flex gap-2 mb-6 flex-wrap">
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
          <button
            onClick={() => setTab("submissions")}
            data-testid="tab-submissions"
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              tab === "submissions"
                ? "bg-amber-500 text-white"
                : "border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <Mic className="w-4 h-4" />
            Recordings
            {pendingCount > 0 && (
              <span className="ml-1 text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold leading-none">
                {pendingCount}
              </span>
            )}
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

        {tab === "submissions" && (
          <div className="space-y-4">
            {loadingRec ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : recordingSubs.length === 0 ? (
              <div className="text-center py-16">
                <Mic className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground">No recording submissions yet.</p>
              </div>
            ) : (
              recordingSubs.map((sub) => (
                <SubmissionCard
                  key={sub.id}
                  sub={sub}
                  onApprove={(id) => approveMutation.mutate(id)}
                  onReject={(id) => rejectMutation.mutate(id)}
                  isPending={approveMutation.isPending || rejectMutation.isPending}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
