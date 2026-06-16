import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Inbox, MessageSquare, GraduationCap, Calendar, Mail, Music2, Globe, Clock, Mic, ExternalLink, CheckCircle2, XCircle, Youtube, Loader2, Search, RefreshCw, BookOpen, Plus, Pencil, Trash2, Eye, EyeOff, Zap, KeyRound, Activity, AlertTriangle } from "lucide-react";
import type { LessonInquiry, Suggestion, RecordingSubmission, BlogPost, KeyReview } from "@shared/schema";
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

const CORRECTION_LABELS: Record<string, { label: string; color: string }> = {
  general: { label: "General / New tune", color: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600" },
  key: { label: "Key correction", color: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700" },
  title: { label: "Title correction", color: "bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700" },
  alternative_titles: { label: "Alt titles", color: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700" },
  source_fiddler: { label: "Source fiddler", color: "bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-700" },
  description: { label: "Historical info", color: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700" },
  audio: { label: "Audio URL", color: "bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700" },
  video: { label: "YouTube video", color: "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700" },
};

function SuggestionCard({ sug, onApply, onReject, isPending }: {
  sug: Suggestion;
  onApply: (id: number) => void;
  onReject: (id: number) => void;
  isPending: boolean;
}) {
  const typeInfo = CORRECTION_LABELS[sug.correctionType ?? "general"] ?? CORRECTION_LABELS.general;
  const statusColor = sug.status === "applied"
    ? "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/30 dark:border-green-800"
    : sug.status === "rejected"
    ? "text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-800"
    : "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800";
  const canApply = sug.status === "pending" && !!sug.tuneId && !!sug.suggestedValue && sug.correctionType !== "general";

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3" data-testid={`suggestion-card-${sug.id}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-foreground">{sug.name || <span className="italic text-muted-foreground">Anonymous</span>}</p>
            {sug.email && (
              <a href={`mailto:${sug.email}`} className="text-xs text-amber-600 hover:underline flex items-center gap-1">
                <Mail className="w-3 h-3" />{sug.email}
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${typeInfo.color}`}>{typeInfo.label}</span>
            {sug.tuneTitle && (
              <a href={`/tunes/${sug.tuneId}`} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-600 hover:underline flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />{sug.tuneTitle}
              </a>
            )}
          </div>
        </div>
        <div className="text-right shrink-0 space-y-1">
          <span className={`text-xs font-medium border px-2 py-0.5 rounded-full capitalize ${statusColor}`}>{sug.status ?? "pending"}</span>
          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
            <Clock className="w-3 h-3" />{fmt(sug.createdAt)}
          </p>
        </div>
      </div>

      {sug.suggestedValue && (
        <div className="bg-muted/40 rounded-lg px-3 py-2.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Suggested value</p>
          <p className="text-sm text-foreground font-medium break-all">{sug.suggestedValue}</p>
        </div>
      )}

      {sug.message && sug.message !== "—" && (
        <p className="text-sm text-foreground leading-relaxed bg-muted/40 rounded-lg p-3">{sug.message}</p>
      )}

      {sug.status === "pending" && (
        <div className="flex gap-3 pt-1 flex-wrap">
          {canApply && (
            <Button
              size="sm"
              onClick={() => onApply(sug.id)}
              disabled={isPending}
              data-testid={`button-apply-suggestion-${sug.id}`}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Apply to tune
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onReject(sug.id)}
            disabled={isPending}
            data-testid={`button-reject-suggestion-${sug.id}`}
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            <XCircle className="w-4 h-4 mr-1" /> Dismiss
          </Button>
          {!canApply && sug.correctionType !== "general" && sug.tuneId && !sug.suggestedValue && (
            <p className="text-xs text-muted-foreground self-center">No suggested value — review manually via tune link above.</p>
          )}
        </div>
      )}
    </div>
  );
}

type EnrichedSubmission = RecordingSubmission & { tuneTitle?: string };

function SubmissionCard({ sub, onApprove, onReject, onApplyToTune, isPending }: {
  sub: EnrichedSubmission;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onApplyToTune: (id: number) => void;
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
        <div className="flex gap-3 pt-1 flex-wrap">
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
      {(sub.status === "approved" || sub.status === "pending") && (sub.youtubeUrl || sub.audioUrl) && (
        <div className="pt-1 border-t border-border">
          <Button
            size="sm"
            onClick={() => onApplyToTune(sub.id)}
            disabled={isPending}
            data-testid={`button-apply-to-tune-${sub.id}`}
            className="bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5"
          >
            <Zap className="w-4 h-4" /> Apply to tune
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            Writes {sub.youtubeUrl ? "YouTube ID" : "audio URL"} directly to the tune record.
          </p>
        </div>
      )}
    </div>
  );
}

type EnrichedKeyReview = KeyReview & { tuneTitle: string };

const KEY_OPTIONS = ["A", "Am", "B", "Bb", "Bbm", "Bm", "C", "C#", "Cm", "D", "Dm", "E", "Eb", "Em", "F", "F#", "Fm", "G", "G#", "Gm"];

function KeyReviewCard({ review, threshold, onApprove, onReject, isPending }: {
  review: EnrichedKeyReview;
  threshold: number;
  onApprove: (id: number, key: string) => void;
  onReject: (id: number) => void;
  isPending: boolean;
}) {
  const detected = review.detectedKey ?? "";
  const [chosenKey, setChosenKey] = useState(review.reviewedKey ?? detected);
  const confidence = review.confidence ?? 0;
  const highConf = confidence >= threshold;
  const statusColor = review.status === "applied"
    ? "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/30 dark:border-green-800"
    : review.status === "rejected"
    ? "text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-800"
    : "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800";

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3" data-testid={`key-review-card-${review.id}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <a href={`/tune/${review.tuneId}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground hover:text-amber-600 flex items-center gap-1.5" data-testid={`link-tune-${review.tuneId}`}>
            {review.tuneTitle} <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </a>
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="text-muted-foreground">Current:</span>
            <span className="font-mono font-medium text-foreground bg-muted px-1.5 py-0.5 rounded">{review.currentKey ?? "—"}</span>
            <span className="text-muted-foreground">→ Detected:</span>
            <span className="font-mono font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded" data-testid={`text-detected-${review.id}`}>
              {detected || "—"}
            </span>
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full border ${highConf ? "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/30 dark:border-green-800" : "text-muted-foreground bg-muted border-border"}`} data-testid={`text-confidence-${review.id}`}>
              {(confidence * 100).toFixed(0)}% confidence
            </span>
          </div>
        </div>
        <span className={`text-xs font-medium border px-2 py-0.5 rounded-full capitalize shrink-0 ${statusColor}`}>{review.status}</span>
      </div>

      {review.audioUrl && (
        <audio
          controls
          preload="none"
          src={review.audioUrl}
          className="w-full h-9"
          data-testid={`audio-review-${review.id}`}
        />
      )}

      {review.status === "pending" && (
        <div className="flex items-end gap-3 flex-wrap pt-1">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground block">Key to apply</label>
            <select
              value={chosenKey}
              onChange={(e) => setChosenKey(e.target.value)}
              data-testid={`select-key-${review.id}`}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
            >
              {!KEY_OPTIONS.includes(chosenKey) && chosenKey && <option value={chosenKey}>{chosenKey}</option>}
              {KEY_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <Button
            size="sm"
            onClick={() => onApprove(review.id, chosenKey)}
            disabled={isPending || !chosenKey}
            data-testid={`button-approve-key-${review.id}`}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" /> Approve & write key
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onReject(review.id)}
            disabled={isPending}
            data-testid={`button-reject-key-${review.id}`}
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            <XCircle className="w-4 h-4 mr-1" /> Dismiss
          </Button>
        </div>
      )}
      {review.status === "applied" && (
        <p className="text-sm text-green-700 dark:text-green-400">Wrote key <span className="font-mono font-semibold">{review.reviewedKey}</span> to this tune.</p>
      )}
    </div>
  );
}

export default function AdminPage() {
  usePageMeta("Admin — TuneVault", "TuneVault admin dashboard");
  const [tab, setTab] = useState<"inquiries" | "suggestions" | "submissions" | "youtube" | "blog" | "keyreview" | "datahealth">("inquiries");

  const { toast } = useToast();

  // ── Blog tab state ──
  const [blogEditId, setBlogEditId] = useState<number | null>(null);
  const [blogShowForm, setBlogShowForm] = useState(false);
  const emptyPost = { title: "", slug: "", excerpt: "", content: "", coverImageUrl: "", author: "Jason Chinchen", published: false };
  const [blogForm, setBlogForm] = useState(emptyPost);

  const { data: blogPostList = [], isLoading: loadingBlog } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog/all"],
    enabled: tab === "blog",
  });

  function slugify(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function saveBlogPost() {
    const body = {
      ...blogForm,
      publishedAt: blogForm.published ? new Date().toISOString() : null,
      coverImageUrl: blogForm.coverImageUrl || null,
      excerpt: blogForm.excerpt || null,
    };
    try {
      if (blogEditId) {
        await apiRequest("PUT", `/api/admin/blog/${blogEditId}`, body);
        toast({ title: "Post updated!" });
      } else {
        await apiRequest("POST", "/api/admin/blog", body);
        toast({ title: "Post created!" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/blog/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      setBlogShowForm(false);
      setBlogEditId(null);
      setBlogForm(emptyPost);
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
  }

  async function deleteBlogPost(id: number) {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    try {
      await apiRequest("DELETE", `/api/admin/blog/${id}`);
      toast({ title: "Post deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/blog/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  }

  // ── YouTube tab state ──
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<null | { total: number; matched: any[]; unmatched: any[] }>(null);
  const [syncChecked, setSyncChecked] = useState<Set<string>>(new Set());
  const [applyingSync, setApplyingSync] = useState(false);

  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<null | { searched: number; found: number; results: any[] }>(null);
  const [bulkChecked, setBulkChecked] = useState<Set<number>>(new Set());
  const [applyingBulk, setApplyingBulk] = useState(false);
  const [bulkLimit, setBulkLimit] = useState(50);

  function normalizeTitle(t: string): string {
    return t
      .toLowerCase()
      .replace(/\(.*?\)/g, "").replace(/\[.*?\]/g, "")
      .replace(/[-–—_#'`]/g, " ").replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, " ").trim();
  }

  const YT_STOP = new Set([
    "the","and","with","for","from","old","new","some","this","that",
    "its","our","her","his","your","my","at","by","in","on","of","to",
    "up","as","an","a","tune","fiddle","old-time","oldtime","otaf",
    "appalachian","time","playing","straight","style","duo","duet",
  ]);

  function keyWords(norm: string): string[] {
    return norm.split(" ").filter(w => w.length >= 3 && !YT_STOP.has(w));
  }

  function wordPrefixMatch(a: string, b: string): boolean {
    return a === b || a.startsWith(b) || b.startsWith(a);
  }

  function matchScore(videoNorm: string, tuneNorm: string): number {
    const tuneKW = keyWords(tuneNorm);
    if (tuneKW.length === 0) return 0;
    const videoKW = keyWords(videoNorm);
    const hits = tuneKW.filter(tw => videoKW.some(vw => wordPrefixMatch(tw, vw))).length;
    return hits / tuneKW.length;
  }

  async function getYtKey(): Promise<string> {
    const res = await fetch("/api/admin/youtube-key");
    if (!res.ok) throw new Error("YouTube API key not configured");
    const { key } = await res.json();
    return key;
  }

  async function ytGet(url: string): Promise<any> {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`YouTube API error ${r.status}`);
    return r.json();
  }

  async function fetchChannelVideos(apiKey: string, handle: string): Promise<{ videoId: string; title: string }[]> {
    const chanData = await ytGet(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`);
    const uploadsId = chanData?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsId) throw new Error("Channel not found or has no public uploads");
    const videos: { videoId: string; title: string }[] = [];
    let pageToken = "";
    do {
      const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=50&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ""}`;
      const data = await ytGet(url);
      for (const item of data.items ?? []) {
        const videoId = item.snippet?.resourceId?.videoId;
        const title = item.snippet?.title;
        if (videoId && title) videos.push({ videoId, title });
      }
      pageToken = data.nextPageToken ?? "";
    } while (pageToken);
    return videos;
  }

  async function runChannelSync() {
    setSyncLoading(true);
    setSyncResult(null);
    setSyncChecked(new Set());
    try {
      const [apiKey, tunesRes] = await Promise.all([getYtKey(), fetch("/api/admin/tune-titles")]);
      const allTunes: { id: number; title: string; altTitles: string | null; hasVideo: string | null }[] = await tunesRes.json();
      const videos = await fetchChannelVideos(apiKey, "jasonnchinchen");

      const tuneMap = new Map<string, { id: number; title: string; hasVideo: boolean }>();
      for (const t of allTunes) {
        tuneMap.set(normalizeTitle(t.title), { id: t.id, title: t.title, hasVideo: !!t.hasVideo });
        if (t.altTitles) {
          for (const alt of t.altTitles.split(/[,;|]/)) {
            const n = normalizeTitle(alt.trim());
            if (n) tuneMap.set(n, { id: t.id, title: t.title, hasVideo: !!t.hasVideo });
          }
        }
      }

      const matched: any[] = [];
      const unmatched: any[] = [];
      for (const v of videos) {
        const normVideo = normalizeTitle(v.title);
        let found = tuneMap.get(normVideo);

        if (!found) {
          for (const [key, tune] of tuneMap) {
            if (key.length >= 4 && normVideo.includes(key)) { found = tune; break; }
          }
        }

        if (!found) {
          let bestScore = 0;
          let bestTune: typeof found;
          for (const [key, tune] of tuneMap) {
            if (key.length < 4) continue;
            const kw = keyWords(key);
            if (kw.length < 2) continue;  // single-word titles: substring only
            const score = matchScore(normVideo, key);
            const threshold = kw.length <= 2 ? 1.0 : 0.70;
            if (score >= threshold && score > bestScore) {
              bestScore = score;
              bestTune = tune;
            }
          }
          found = bestTune;
        }

        if (found) {
          matched.push({ videoId: v.videoId, videoTitle: v.title, tuneId: found.id, tuneTitle: found.title, alreadyHasVideo: found.hasVideo });
        } else {
          unmatched.push({ videoId: v.videoId, videoTitle: v.title });
        }
      }

      setSyncResult({ total: videos.length, matched, unmatched });
      setSyncChecked(new Set(matched.map((m) => m.videoId)));
    } catch (err: any) {
      toast({ title: "Channel scan failed", description: err.message, variant: "destructive" });
    } finally {
      setSyncLoading(false);
    }
  }

  async function applyChannelSync() {
    if (!syncResult) return;
    setApplyingSync(true);
    try {
      const matches = syncResult.matched.filter((m) => syncChecked.has(m.videoId))
        .map((m) => ({ videoId: m.videoId, tuneId: m.tuneId, alreadyHasVideo: m.alreadyHasVideo }));
      const res = await fetch("/api/admin/youtube-apply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matches }),
      });
      const data = await res.json();
      toast({ title: `Applied! ${data.updated} tunes updated, ${data.addedRecording} recordings added.` });
      setSyncResult(null);
    } catch (err: any) {
      toast({ title: "Apply failed", description: err.message, variant: "destructive" });
    } finally {
      setApplyingSync(false);
    }
  }

  async function runBulkSearch() {
    setBulkLoading(true);
    setBulkResult(null);
    setBulkChecked(new Set());
    try {
      const [apiKey, tunesRes] = await Promise.all([getYtKey(), fetch("/api/admin/tune-titles")]);
      const allTunes: { id: number; title: string; hasVideo: string | null }[] = await tunesRes.json();
      const missing = allTunes.filter((t) => !t.hasVideo).slice(0, bulkLimit);

      const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
      const results: any[] = [];

      for (const tune of missing) {
        try {
          const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(tune.title + " old time fiddle")}&key=${apiKey}`;
          const data = await ytGet(url);
          const top = data.items?.[0];
          if (top?.id?.videoId) {
            results.push({
              tuneId: tune.id, tuneTitle: tune.title,
              videoId: top.id.videoId, videoTitle: top.snippet?.title,
              channel: top.snippet?.channelTitle,
              thumbnail: top.snippet?.thumbnails?.default?.url,
            });
          }
        } catch {}
        await delay(150);
      }

      setBulkResult({ searched: missing.length, found: results.length, results });
      setBulkChecked(new Set(results.map((r) => r.tuneId)));
    } catch (err: any) {
      toast({ title: "Bulk search failed", description: err.message, variant: "destructive" });
    } finally {
      setBulkLoading(false);
    }
  }

  async function applyBulkSearch() {
    if (!bulkResult) return;
    setApplyingBulk(true);
    try {
      const matches = bulkResult.results.filter((r) => bulkChecked.has(r.tuneId))
        .map((r) => ({ tuneId: r.tuneId, videoId: r.videoId }));
      const res = await fetch("/api/admin/youtube-bulk-apply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matches }),
      });
      const data = await res.json();
      toast({ title: `Linked ${data.applied} videos to tunes!` });
      setBulkResult(null);
    } catch (err: any) {
      toast({ title: "Apply failed", description: err.message, variant: "destructive" });
    } finally {
      setApplyingBulk(false);
    }
  }

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

  const applyToTuneMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/admin/recording-submissions/${id}/apply-to-tune`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recording-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tunes"] });
      toast({ title: "Applied to tune!", description: "The URL has been written to the tune record." });
    },
    onError: () => toast({ title: "Apply failed", variant: "destructive" }),
  });

  const [bulkApplying, setBulkApplying] = useState(false);
  async function bulkApplyApproved() {
    setBulkApplying(true);
    try {
      const res = await apiRequest("PATCH", "/api/admin/recording-submissions/bulk-apply-approved");
      const data = res as any;
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recording-submissions"] });
      toast({ title: `Bulk apply done — ${data.applied} tunes updated, ${data.errors} errors.` });
    } catch {
      toast({ title: "Bulk apply failed", variant: "destructive" });
    } finally {
      setBulkApplying(false);
    }
  }

  const applySuggestionMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/admin/suggestions/${id}/apply`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tunes"] });
      toast({ title: "Correction applied!", description: "The tune has been updated." });
    },
    onError: () => toast({ title: "Apply failed", variant: "destructive" }),
  });

  const rejectSuggestionMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/admin/suggestions/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/suggestions"] });
      toast({ title: "Suggestion dismissed." });
    },
    onError: () => toast({ title: "Dismiss failed", variant: "destructive" }),
  });

  const pendingSuggestionCount = subs.filter((s) => (s.status ?? "pending") === "pending").length;

  // ── Key Review tab state ──
  const [keyStatusFilter, setKeyStatusFilter] = useState<"pending" | "applied" | "rejected">("pending");
  const { data: keyReviewData, isLoading: loadingKeyReviews } = useQuery<{ reviews: EnrichedKeyReview[]; threshold: number }>({
    queryKey: ["/api/admin/key-reviews"],
    enabled: tab === "keyreview",
  });
  const keyReviews = keyReviewData?.reviews ?? [];
  const keyThreshold = keyReviewData?.threshold ?? 0.8;
  const pendingKeyCount = keyReviews.filter((r) => r.status === "pending").length;
  const visibleKeyReviews = keyReviews.filter((r) => r.status === keyStatusFilter);

  const approveKeyMutation = useMutation({
    mutationFn: ({ id, key }: { id: number; key: string }) =>
      apiRequest("PATCH", `/api/admin/key-reviews/${id}/approve`, { key }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/key-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/data-health"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tunes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
      toast({ title: "Key written to tune." });
    },
    onError: () => toast({ title: "Approve failed", variant: "destructive" }),
  });

  const rejectKeyMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/admin/key-reviews/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/key-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/data-health"] });
      toast({ title: "Detection dismissed." });
    },
    onError: () => toast({ title: "Dismiss failed", variant: "destructive" }),
  });

  const bulkApproveKeyMutation = useMutation({
    mutationFn: (threshold: number) =>
      apiRequest("POST", `/api/admin/key-reviews/bulk-approve`, { threshold }),
    onSuccess: async (res: any) => {
      const count = res?.applied ?? res?.count ?? 0;
      queryClient.invalidateQueries({ queryKey: ["/api/admin/key-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/data-health"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tunes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
      toast({ title: `Bulk-approved ${count} detection${count === 1 ? "" : "s"}.` });
    },
    onError: () => toast({ title: "Bulk approve failed", variant: "destructive" }),
  });

  const highConfidencePendingCount = keyReviews.filter(
    (r) => r.status === "pending" && (r.confidence ?? 0) >= keyThreshold,
  ).length;

  function handleBulkApprove() {
    if (highConfidencePendingCount === 0) {
      toast({ title: "Nothing to bulk-approve", description: `No pending detections at or above ${(keyThreshold * 100).toFixed(0)}% confidence.` });
      return;
    }
    const ok = window.confirm(
      `Bulk-approve ${highConfidencePendingCount} pending detection(s) at or above ${(keyThreshold * 100).toFixed(0)}% confidence?\n\n` +
        `WARNING: detection on solo fiddle is only ~45–60% accurate and confidence does NOT reliably predict correctness. ` +
        `This writes each detected key straight to its tune WITHOUT you listening first. ` +
        `Reviewing by ear is strongly recommended instead.`,
    );
    if (ok) bulkApproveKeyMutation.mutate(keyThreshold);
  }

  // ── Data Health tab ──
  const { data: dataHealth, isLoading: loadingHealth } = useQuery<{
    total: number; placeholderKeys: number; missingDescriptions: number; missingAudio: number; pendingKeyReviews: number;
  }>({
    queryKey: ["/api/admin/data-health"],
    enabled: tab === "datahealth",
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
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
          <button
            onClick={() => setTab("inquiries")}
            data-testid="tab-inquiries"
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors shrink-0 ${
              tab === "inquiries"
                ? "bg-amber-500 text-white"
                : "border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span className="hidden sm:inline">Lesson </span>Inquiries
            <span className="ml-1 text-xs opacity-75">({inquiries.length})</span>
          </button>
          <button
            onClick={() => setTab("suggestions")}
            data-testid="tab-suggestions"
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors shrink-0 ${
              tab === "suggestions"
                ? "bg-amber-500 text-white"
                : "border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Suggestions
            {pendingSuggestionCount > 0 && (
              <span className="ml-1 text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold leading-none">
                {pendingSuggestionCount}
              </span>
            )}
            {pendingSuggestionCount === 0 && <span className="ml-1 text-xs opacity-75">({subs.length})</span>}
          </button>
          <button
            onClick={() => setTab("submissions")}
            data-testid="tab-submissions"
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors shrink-0 ${
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
          <button
            onClick={() => setTab("youtube")}
            data-testid="tab-youtube"
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors shrink-0 ${
              tab === "youtube"
                ? "bg-amber-500 text-white"
                : "border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <Youtube className="w-4 h-4" />
            YouTube
          </button>
          <button
            onClick={() => setTab("blog")}
            data-testid="tab-blog"
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors shrink-0 ${
              tab === "blog"
                ? "bg-amber-500 text-white"
                : "border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Blog
          </button>
          <button
            onClick={() => setTab("keyreview")}
            data-testid="tab-keyreview"
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors shrink-0 ${
              tab === "keyreview"
                ? "bg-amber-500 text-white"
                : "border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <KeyRound className="w-4 h-4" />
            Key Review
            {pendingKeyCount > 0 && (
              <span className="ml-1 text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold leading-none">
                {pendingKeyCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("datahealth")}
            data-testid="tab-datahealth"
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors shrink-0 ${
              tab === "datahealth"
                ? "bg-amber-500 text-white"
                : "border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Data </span>Health
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
              <>
                {pendingSuggestionCount > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {pendingSuggestionCount} pending — structured corrections with a tune + suggested value can be one-click applied below.
                  </p>
                )}
                {subs.map((sug) => (
                  <SuggestionCard
                    key={sug.id}
                    sug={sug}
                    onApply={(id) => applySuggestionMutation.mutate(id)}
                    onReject={(id) => rejectSuggestionMutation.mutate(id)}
                    isPending={applySuggestionMutation.isPending || rejectSuggestionMutation.isPending}
                  />
                ))}
              </>
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
              <>
                {recordingSubs.some((s) => s.status === "approved") && (
                  <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-5 py-4">
                    <div>
                      <p className="font-semibold text-sm text-foreground">
                        {recordingSubs.filter((s) => s.status === "approved").length} approved submission{recordingSubs.filter((s) => s.status === "approved").length !== 1 ? "s" : ""} ready
                      </p>
                      <p className="text-xs text-muted-foreground">Apply all to their tune records in one batch.</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={bulkApplyApproved}
                      disabled={bulkApplying}
                      data-testid="button-bulk-apply-approved"
                      className="bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 shrink-0"
                    >
                      {bulkApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      Apply all approved
                    </Button>
                  </div>
                )}
                {recordingSubs.map((sub) => (
                  <SubmissionCard
                    key={sub.id}
                    sub={sub}
                    onApprove={(id) => approveMutation.mutate(id)}
                    onReject={(id) => rejectMutation.mutate(id)}
                    onApplyToTune={(id) => applyToTuneMutation.mutate(id)}
                    isPending={approveMutation.isPending || rejectMutation.isPending || applyToTuneMutation.isPending}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {tab === "youtube" && (
          <div className="space-y-8">

            {/* ── Section 1: Your Channel ── */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4" data-testid="youtube-channel-section">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-lg font-bold font-serif flex items-center gap-2">
                    <Youtube className="w-5 h-5 text-red-500" />
                    Sync Your Channel
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Scans <span className="font-medium text-foreground">@jasonnchinchen</span> and matches your video titles to tunes in the database.
                  </p>
                </div>
                <Button
                  onClick={runChannelSync}
                  disabled={syncLoading}
                  data-testid="button-channel-sync"
                  className="bg-red-600 hover:bg-red-700 text-white shrink-0"
                >
                  {syncLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning…</> : <><RefreshCw className="w-4 h-4 mr-2" />Scan Channel</>}
                </Button>
              </div>

              {syncResult && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span><strong className="text-foreground">{syncResult.total}</strong> videos found</span>
                    <span><strong className="text-green-600">{syncResult.matched.length}</strong> matched to tunes</span>
                    <span><strong className="text-muted-foreground">{syncResult.unmatched.length}</strong> unmatched</span>
                  </div>

                  {syncResult.matched.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">Matched ({syncChecked.size} selected)</p>
                        <div className="flex gap-2">
                          <button onClick={() => setSyncChecked(new Set(syncResult.matched.map((m) => m.videoId)))} className="text-xs text-amber-600 hover:underline">All</button>
                          <button onClick={() => setSyncChecked(new Set())} className="text-xs text-muted-foreground hover:underline">None</button>
                        </div>
                      </div>
                      <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                        {syncResult.matched.map((m) => (
                          <label key={m.videoId} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 cursor-pointer hover:bg-muted/60" data-testid={`sync-match-${m.videoId}`}>
                            <input
                              type="checkbox"
                              checked={syncChecked.has(m.videoId)}
                              onChange={(e) => {
                                const next = new Set(syncChecked);
                                e.target.checked ? next.add(m.videoId) : next.delete(m.videoId);
                                setSyncChecked(next);
                              }}
                              className="accent-amber-500"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{m.tuneTitle}</p>
                              <p className="text-xs text-muted-foreground truncate">"{m.videoTitle}"</p>
                            </div>
                            {m.alreadyHasVideo && (
                              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 shrink-0">+recording</span>
                            )}
                            <a href={`https://youtube.com/watch?v=${m.videoId}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-red-500 shrink-0">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </label>
                        ))}
                      </div>
                      <Button
                        onClick={applyChannelSync}
                        disabled={applyingSync || syncChecked.size === 0}
                        data-testid="button-apply-sync"
                        className="bg-green-600 hover:bg-green-700 text-white w-full"
                      >
                        {applyingSync ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Applying…</> : <><CheckCircle2 className="w-4 h-4 mr-2" />Apply {syncChecked.size} Matches</>}
                      </Button>
                    </div>
                  )}

                  {syncResult.unmatched.length > 0 && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium">
                        {syncResult.unmatched.length} unmatched videos (click to expand)
                      </summary>
                      <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                        {syncResult.unmatched.map((u) => (
                          <li key={u.videoId} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <a href={`https://youtube.com/watch?v=${u.videoId}`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground hover:underline truncate">{u.videoTitle}</a>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>

            {/* ── Section 2: Bulk Search ── */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4" data-testid="youtube-bulk-section">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-lg font-bold font-serif flex items-center gap-2">
                    <Search className="w-5 h-5 text-amber-500" />
                    Find Videos for Missing Tunes
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Searches YouTube for tunes that don't have a video yet. Review results before applying.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={bulkLimit}
                    onChange={(e) => setBulkLimit(Number(e.target.value))}
                    data-testid="select-bulk-limit"
                    className="text-sm border border-border rounded-lg px-2 py-1.5 bg-background text-foreground"
                  >
                    <option value={25}>25 tunes</option>
                    <option value={50}>50 tunes</option>
                    <option value={100}>100 tunes</option>
                    <option value={200}>200 tunes</option>
                  </select>
                  <Button
                    onClick={runBulkSearch}
                    disabled={bulkLoading}
                    data-testid="button-bulk-search"
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    {bulkLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Searching…</> : <><Search className="w-4 h-4 mr-2" />Search YouTube</>}
                  </Button>
                </div>
              </div>

              {bulkLoading && (
                <p className="text-sm text-muted-foreground italic">This can take a minute — searching {bulkLimit} tunes…</p>
              )}

              {bulkResult && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span><strong className="text-foreground">{bulkResult.searched}</strong> tunes searched</span>
                    <span><strong className="text-green-600">{bulkResult.found}</strong> videos found</span>
                    <span><strong className="text-amber-600">{bulkChecked.size}</strong> selected</span>
                  </div>

                  {bulkResult.results.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">Results — review before applying</p>
                        <div className="flex gap-2">
                          <button onClick={() => setBulkChecked(new Set(bulkResult.results.map((r) => r.tuneId)))} className="text-xs text-amber-600 hover:underline">All</button>
                          <button onClick={() => setBulkChecked(new Set())} className="text-xs text-muted-foreground hover:underline">None</button>
                        </div>
                      </div>
                      <div className="max-h-96 overflow-y-auto space-y-1.5 pr-1">
                        {bulkResult.results.map((r) => (
                          <label key={r.tuneId} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 cursor-pointer hover:bg-muted/60" data-testid={`bulk-result-${r.tuneId}`}>
                            <input
                              type="checkbox"
                              checked={bulkChecked.has(r.tuneId)}
                              onChange={(e) => {
                                const next = new Set(bulkChecked);
                                e.target.checked ? next.add(r.tuneId) : next.delete(r.tuneId);
                                setBulkChecked(next);
                              }}
                              className="accent-amber-500"
                            />
                            {r.thumbnail && <img src={r.thumbnail} alt="" className="w-10 h-7 rounded object-cover shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{r.tuneTitle}</p>
                              <p className="text-xs text-muted-foreground truncate">"{r.videoTitle}" — {r.channel}</p>
                            </div>
                            <a href={`https://youtube.com/watch?v=${r.videoId}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-red-500 shrink-0">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </label>
                        ))}
                      </div>
                      <Button
                        onClick={applyBulkSearch}
                        disabled={applyingBulk || bulkChecked.size === 0}
                        data-testid="button-apply-bulk"
                        className="bg-green-600 hover:bg-green-700 text-white w-full"
                      >
                        {applyingBulk ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Applying…</> : <><CheckCircle2 className="w-4 h-4 mr-2" />Link {bulkChecked.size} Videos to Tunes</>}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}

        {tab === "blog" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {blogPostList.length} post{blogPostList.length !== 1 ? "s" : ""} total
              </p>
              <Button
                data-testid="button-new-blog-post"
                onClick={() => {
                  setBlogEditId(null);
                  setBlogForm(emptyPost);
                  setBlogShowForm(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5"
                size="sm"
              >
                <Plus className="w-4 h-4" /> New Post
              </Button>
            </div>

            {blogShowForm && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-5 space-y-4">
                <h3 className="font-semibold text-foreground">{blogEditId ? "Edit Post" : "New Post"}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Title *</label>
                    <input
                      data-testid="input-blog-title"
                      value={blogForm.title}
                      onChange={(e) => {
                        const t = e.target.value;
                        setBlogForm((f) => ({ ...f, title: t, slug: blogEditId ? f.slug : slugify(t) }));
                      }}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      placeholder="Post title"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Slug *</label>
                    <input
                      data-testid="input-blog-slug"
                      value={blogForm.slug}
                      onChange={(e) => setBlogForm((f) => ({ ...f, slug: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
                      placeholder="url-friendly-slug"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Excerpt</label>
                  <input
                    data-testid="input-blog-excerpt"
                    value={blogForm.excerpt}
                    onChange={(e) => setBlogForm((f) => ({ ...f, excerpt: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Brief summary shown on the blog listing page"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Content (Markdown)</label>
                  <textarea
                    data-testid="textarea-blog-content"
                    value={blogForm.content}
                    onChange={(e) => setBlogForm((f) => ({ ...f, content: e.target.value }))}
                    rows={12}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono resize-y"
                    placeholder="Write your post in Markdown format..."
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Cover Image URL</label>
                    <input
                      data-testid="input-blog-cover"
                      value={blogForm.coverImageUrl}
                      onChange={(e) => setBlogForm((f) => ({ ...f, coverImageUrl: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      placeholder="https://…"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Author</label>
                    <input
                      data-testid="input-blog-author"
                      value={blogForm.author}
                      onChange={(e) => setBlogForm((f) => ({ ...f, author: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none" data-testid="toggle-blog-published">
                  <input
                    type="checkbox"
                    checked={blogForm.published}
                    onChange={(e) => setBlogForm((f) => ({ ...f, published: e.target.checked }))}
                    className="accent-amber-500 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-foreground">Published</span>
                  <span className="text-xs text-muted-foreground">(sets published_at to now if publishing for the first time)</span>
                </label>
                <div className="flex gap-2">
                  <Button
                    data-testid="button-save-blog-post"
                    onClick={saveBlogPost}
                    disabled={!blogForm.title || !blogForm.slug}
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                    size="sm"
                  >
                    {blogEditId ? "Save Changes" : "Create Post"}
                  </Button>
                  <Button
                    data-testid="button-cancel-blog-form"
                    variant="outline"
                    size="sm"
                    onClick={() => { setBlogShowForm(false); setBlogEditId(null); setBlogForm(emptyPost); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {loadingBlog ? (
              <p className="text-sm text-muted-foreground">Loading posts…</p>
            ) : blogPostList.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-25" />
                <p className="text-muted-foreground">No blog posts yet. Create your first post above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {blogPostList.map((post) => (
                  <div key={post.id} className="rounded-xl border border-border bg-card p-4 flex items-start gap-4" data-testid={`blog-admin-row-${post.id}`}>
                    {post.coverImageUrl && (
                      <img src={post.coverImageUrl} alt="" className="w-16 h-12 rounded-lg object-cover shrink-0 hidden sm:block" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground truncate">{post.title}</p>
                        {post.published ? (
                          <span className="text-xs bg-green-100 text-green-700 border border-green-200 rounded-full px-2 py-0.5 flex items-center gap-1">
                            <Eye className="w-3 h-3" /> Published
                          </span>
                        ) : (
                          <span className="text-xs bg-muted text-muted-foreground border border-border rounded-full px-2 py-0.5 flex items-center gap-1">
                            <EyeOff className="w-3 h-3" /> Draft
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">/blog/{post.slug}</p>
                      {post.excerpt && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{post.excerpt}</p>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`button-edit-blog-${post.id}`}
                        onClick={() => {
                          setBlogEditId(post.id);
                          setBlogForm({
                            title: post.title,
                            slug: post.slug,
                            excerpt: post.excerpt || "",
                            content: post.content,
                            coverImageUrl: post.coverImageUrl || "",
                            author: post.author,
                            published: post.published,
                          });
                          setBlogShowForm(true);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`button-delete-blog-${post.id}`}
                        onClick={() => deleteBlogPost(post.id)}
                        className="text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "keyreview" && (
          <div className="space-y-5">
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4 text-sm text-amber-900 dark:text-amber-200 flex gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">Detections are suggestions, not facts.</p>
                <p className="text-amber-800/90 dark:text-amber-300/80">
                  Automatic key detection on solo fiddle is only ~45–60% accurate (open-string drones cause fifth/relative confusion),
                  and confidence does not reliably predict correctness. <strong>Listen to each clip and confirm or correct the key before approving.</strong>
                  Approving writes the key directly to the tune; dismissing leaves the tune unchanged.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {(["pending", "applied", "rejected"] as const).map((s) => {
                const count = keyReviews.filter((r) => r.status === s).length;
                return (
                  <button
                    key={s}
                    onClick={() => setKeyStatusFilter(s)}
                    data-testid={`filter-key-${s}`}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                      keyStatusFilter === s ? "bg-amber-500 text-white" : "border border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {s} ({count})
                  </button>
                );
              })}
              <div className="ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkApprove}
                  disabled={bulkApproveKeyMutation.isPending || highConfidencePendingCount === 0}
                  data-testid="button-bulk-approve-keys"
                  className="text-xs gap-1.5"
                >
                  {bulkApproveKeyMutation.isPending ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Approving…</>
                  ) : (
                    <><CheckCircle2 className="w-3.5 h-3.5" /> Bulk-approve ≥{(keyThreshold * 100).toFixed(0)}% ({highConfidencePendingCount})</>
                  )}
                </Button>
              </div>
            </div>

            {loadingKeyReviews ? (
              <p className="text-sm text-muted-foreground">Loading detections…</p>
            ) : keyReviews.length === 0 ? (
              <div className="text-center py-16">
                <KeyRound className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-25" />
                <p className="text-muted-foreground">No key detections queued yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Run <code className="font-mono">npx tsx server/scripts/detectBadKeys.ts</code> to populate the review queue.</p>
              </div>
            ) : visibleKeyReviews.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No {keyStatusFilter} detections.</p>
            ) : (
              <div className="space-y-3">
                {visibleKeyReviews.map((r) => (
                  <KeyReviewCard
                    key={r.id}
                    review={r}
                    threshold={keyThreshold}
                    onApprove={(id, key) => approveKeyMutation.mutate({ id, key })}
                    onReject={(id) => rejectKeyMutation.mutate(id)}
                    isPending={approveKeyMutation.isPending || rejectKeyMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "datahealth" && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Live data-quality counts across the tune library. See the monthly runbook in <code className="font-mono">replit.md</code> for the maintenance routine.
            </p>
            {loadingHealth || !dataHealth ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: "Total tunes", value: dataHealth.total, hint: "Everything in the library", tone: "neutral" as const },
                  { label: 'Placeholder "B" keys', value: dataHealth.placeholderKeys, hint: "Need a real key — review queue", tone: dataHealth.placeholderKeys > 0 ? "warn" : "ok" as const },
                  { label: "Pending key reviews", value: dataHealth.pendingKeyReviews, hint: "Detections awaiting approval", tone: dataHealth.pendingKeyReviews > 0 ? "warn" : "ok" as const },
                  { label: "Missing descriptions", value: dataHealth.missingDescriptions, hint: "No write-up yet", tone: dataHealth.missingDescriptions > 0 ? "warn" : "ok" as const },
                  { label: "Missing audio", value: dataHealth.missingAudio, hint: "No audio_url or LOC item", tone: dataHealth.missingAudio > 0 ? "warn" : "ok" as const },
                ].map((c) => (
                  <div
                    key={c.label}
                    data-testid={`health-card-${c.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`}
                    className={`rounded-xl border p-5 ${
                      c.tone === "warn"
                        ? "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20"
                        : c.tone === "ok"
                        ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20"
                        : "border-border bg-card"
                    }`}
                  >
                    <p className="text-3xl font-bold text-foreground">{c.value.toLocaleString()}</p>
                    <p className="text-sm font-medium text-foreground mt-1">{c.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.hint}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
