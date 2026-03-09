import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Star, Calendar, Shuffle, Headphones, Video, BookOpen, FileText, Play, ArrowRight, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Tune } from "@shared/schema";
import AudioPlayer from "@/components/AudioPlayer";
import YoutubePlayer from "@/components/YoutubePlayer";
import AbcStaffRenderer from "@/components/AbcStaffRenderer";
import TipJar from "@/components/TipJar";
import { useFavorites } from "@/hooks/useFavorites";
import { usePlaylist } from "@/context/PlaylistContext";

interface TunesResponse {
  tunes: Tune[];
  total: number;
  totalPages: number;
  limit: number;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-green-100 text-green-800 border-green-300",
  intermediate: "bg-amber-100 text-amber-800 border-amber-300",
  advanced: "bg-red-100 text-red-800 border-red-300",
};

function randomPage(total: number) {
  return Math.floor(Math.random() * total) + 1;
}

export default function TuneOfTheDayPage() {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { playTune } = usePlaylist();
  const [videoAvailable, setVideoAvailable] = useState(true);

  const { data: statsData } = useQuery<{ total: string }>({
    queryKey: ["/api/stats"],
  });
  const total = parseInt(statsData?.total ?? "997", 10);

  const [page, setPage] = useState<number>(() => randomPage(997));

  const shuffle = useCallback(() => {
    setVideoAvailable(true);
    setPage(randomPage(total > 0 ? total : 997));
  }, [total]);

  const { data, isLoading } = useQuery<TunesResponse>({
    queryKey: ["/api/tunes", { limit: 1, page }],
    queryFn: () => fetch(`/api/tunes?limit=1&page=${page}`).then((r) => r.json()),
  });

  const tune = data?.tunes?.[0] ?? null;
  const faved = tune ? isFavorite(tune.id) : false;

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background pb-8 pt-12 sm:pt-12">
      {/* Hero */}
      <div
        className="relative text-primary-foreground px-4 pt-12 pb-10 overflow-hidden border-b border-white/10"
        style={{
          backgroundImage: [
            "repeating-linear-gradient(0deg, transparent, transparent 22px, rgba(255,255,255,0.05) 22px, rgba(255,255,255,0.05) 23px)",
            "linear-gradient(150deg, hsl(var(--primary)) 0%, hsl(25 75% 28%) 100%)",
          ].join(", "),
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.18),transparent_65%)] pointer-events-none" />
        <div className="container mx-auto max-w-3xl relative z-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Calendar className="w-10 h-10 opacity-90" />
              <div>
                <h1 className="text-4xl font-bold tracking-tight font-serif drop-shadow-sm">Tune of the Day</h1>
                <p className="text-primary-foreground/70 text-sm mt-0.5">{todayLabel}</p>
              </div>
            </div>
            <Button
              onClick={shuffle}
              data-testid="button-shuffle-totd"
              variant="outline"
              size="sm"
              className="border-white/30 text-white hover:bg-white/15 hover:text-white bg-white/10 self-start mt-1"
            >
              <Shuffle className="w-3.5 h-3.5 mr-1.5" />
              Show me another
            </Button>
          </div>
          <p className="text-primary-foreground/60 text-sm max-w-lg mt-4">
            A randomly selected tune from the vault — press shuffle any time to discover a new one.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-8 space-y-8">
        {isLoading || !tune ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : (
          <>
            {/* Tune header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-3xl font-serif font-bold text-foreground">{tune.title}</h2>
                {tune.alternativeTitles && (
                  <p className="text-muted-foreground text-sm mt-0.5">Also known as: {tune.alternativeTitles}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-medium">{tune.key}</Badge>
                  <Badge variant="outline" className="capitalize">{tune.tuneType}</Badge>
                  {tune.difficulty && (
                    <Badge className={DIFFICULTY_COLORS[tune.difficulty] ?? ""}>{tune.difficulty}</Badge>
                  )}
                  {tune.region && <Badge variant="outline">{tune.region}</Badge>}
                  {tune.era && <Badge variant="outline">{tune.era}</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="button-favorite-totd"
                  onClick={() => toggleFavorite(tune.id)}
                  className={faved ? "border-amber-400 text-amber-600" : ""}
                >
                  <Star className={`w-4 h-4 mr-1.5 ${faved ? "fill-amber-400 text-amber-400" : ""}`} />
                  {faved ? "Saved" : "Save"}
                </Button>
                {(tune.audioUrl || tune.locItemId) && (
                  <Button
                    size="sm"
                    data-testid="button-play-totd"
                    onClick={() => playTune(tune)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Play className="w-4 h-4 mr-1.5" /> Play
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  data-testid="button-shuffle-totd-inline"
                  onClick={shuffle}
                  className="text-muted-foreground"
                >
                  <Shuffle className="w-4 h-4 mr-1.5" /> Another tune
                </Button>
              </div>
            </div>

            {/* Source fiddler */}
            {tune.sourceFiddler && (
              <div className="text-sm text-muted-foreground italic border-l-2 border-amber-400 pl-3">
                Associated with <strong className="text-foreground">{tune.sourceFiddler}</strong>
              </div>
            )}

            {/* Description */}
            {tune.description && (
              <div>
                <h3 className="text-lg font-serif font-semibold text-foreground mb-2">Historical Background</h3>
                <p className="text-muted-foreground leading-relaxed">{tune.description}</p>
              </div>
            )}

            {/* Playing Notes */}
            {tune.notes && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <h3 className="text-base font-serif font-semibold text-amber-900 mb-2">Playing Notes</h3>
                <p className="text-amber-800 text-sm leading-relaxed">{tune.notes}</p>
              </div>
            )}

            {/* Audio */}
            {(tune.audioUrl || tune.locItemId) && (
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Headphones className="w-4 h-4 text-sky-600" />
                  <h3 className="font-semibold text-sm text-foreground">Audio Recording</h3>
                  {tune.audioAttribution && (
                    <span className="text-xs text-muted-foreground ml-auto">via {tune.audioAttribution}</span>
                  )}
                </div>
                <AudioPlayer tune={tune} />
              </div>
            )}

            {/* YouTube */}
            {tune.youtubeVideoId && videoAvailable && (
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Video className="w-4 h-4 text-rose-600" />
                  <h3 className="font-semibold text-sm text-foreground">Video Performance</h3>
                </div>
                <YoutubePlayer
                  videoId={tune.youtubeVideoId}
                  title={tune.title}
                  onUnavailable={() => setVideoAvailable(false)}
                />
              </div>
            )}

            {/* Sheet Music */}
            {tune.transcriptUrl && (
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-semibold text-sm text-foreground">Sheet Music</h3>
                  <span className="text-xs text-muted-foreground ml-auto">via FiddleTunes.net</span>
                </div>
                <img
                  src={tune.transcriptUrl}
                  alt={`Sheet music for ${tune.title}`}
                  className="w-full rounded-lg cursor-zoom-in"
                  onClick={() => window.open(tune.transcriptUrl!, "_blank")}
                />
              </div>
            )}

            {/* ABC Notation */}
            {tune.abcNotation && (
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-violet-600" />
                  <h3 className="font-semibold text-sm text-foreground">Staff Notation (ABC)</h3>
                </div>
                <AbcStaffRenderer abc={tune.abcNotation} />
              </div>
            )}

            {/* Explore full tune */}
            <Link href={`/tune/${tune.id}`} data-testid="link-explore-totd">
              <div className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/40 transition-colors cursor-pointer group">
                <div>
                  <p className="font-semibold text-foreground">Explore this tune fully</p>
                  <p className="text-muted-foreground text-sm">See all recordings, related tunes, and more</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>

            {/* Shuffle again CTA */}
            <div className="text-center py-4">
              <Button
                onClick={shuffle}
                data-testid="button-shuffle-totd-bottom"
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
              >
                <Shuffle className="w-4 h-4 mr-2" />
                Show me another tune
              </Button>
              <p className="text-muted-foreground text-xs mt-2">997 tunes in the vault</p>
            </div>
          </>
        )}

        <TipJar />
      </div>
    </div>
  );
}
