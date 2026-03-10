import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Inbox, MessageSquare, GraduationCap, Calendar, Mail, Music2, Globe, Clock, Mic, ExternalLink, CheckCircle2, XCircle, Youtube, Loader2, Search, RefreshCw } from "lucide-react";
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
  const [tab, setTab] = useState<"inquiries" | "suggestions" | "submissions" | "youtube">("inquiries");
  const { toast } = useToast();

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
      .replace(/[-–—_#]/g, " ").replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, " ").trim();
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
          <button
            onClick={() => setTab("youtube")}
            data-testid="tab-youtube"
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              tab === "youtube"
                ? "bg-amber-500 text-white"
                : "border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <Youtube className="w-4 h-4" />
            YouTube
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
      </div>
    </div>
  );
}
