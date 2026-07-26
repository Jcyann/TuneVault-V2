import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Star, Calendar, Shuffle, Headphones, Video, BookOpen, FileText, Play, ArrowRight } from "lucide-react";
import ShareButton from "@/components/ShareButton";
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

interface TuneOfTheDayResponse {
  tune: Tune;
  date: string;
}

function randomPage(total: number) {
  return Math.floor(Math.random() * total) + 1;
}

export default function TuneOfTheDayPage() {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { startPlaylist } = usePlaylist();
  const playTune = (t: Tune) => startPlaylist([t], "chronological");
  const [videoAvailable, setVideoAvailable] = useState(true);
  const [shufflePage, setShufflePage] = useState<number | null>(null);
  const isShuffled = shufflePage !== null;

  const { data: statsData } = useQuery<{ total: string }>({
    queryKey: ["/api/stats"],
  });
  const total = parseInt(statsData?.total ?? "1051", 10);

  const shuffle = useCallback(() => {
    setVideoAvailable(true);
    setShufflePage(randomPage(total > 0 ? total : 1051));
  }, [total]);

  const resetToToday = useCallback(() => {
    setVideoAvailable(true);
    setShufflePage(null);
  }, []);

  // Daily tune — server picks deterministically from date
  const { data: todayData, isLoading: loadingToday } = useQuery<TuneOfTheDayResponse>({
    queryKey: ["/api/tune-of-the-day"],
    enabled: !isShuffled,
  });

  // Shuffled tune — random page pick
  const { data: shuffleData, isLoading: loadingShuffled } = useQuery<TunesResponse>({
    queryKey: ["/api/tunes", { limit: 1, page: shufflePage }],
    queryFn: () => fetch(`/api/tunes?limit=1&page=${shufflePage}`).then((r) => r.json()),
    enabled: isShuffled,
  });

  const tune: Tune | null = isShuffled
    ? (shuffleData?.tunes?.[0] ?? null)
    : (todayData?.tune ?? null);

  const isLoading = isShuffled ? loadingShuffled : loadingToday;

  useEffect(() => {
    if (tune) document.title = `Tune of the Day: ${tune.title} | TuneVault`;
    return () => { document.title = "TuneVault — Old-Time Fiddle Treasury"; };
  }, [tune]);

  const faved = tune ? isFavorite(tune.id) : false;

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background pb-16 pt-16 sm:pt-20">
      <div className="container mx-auto max-w-3xl px-6">
        <header className="border-t border-foreground pt-6 pb-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">{todayLabel}</div>
              <h1 className="font-display text-[44px] sm:text-6xl font-semibold tracking-tight leading-[0.95] text-foreground">
                Tune of the Day
              </h1>
              <p className="font-display italic text-xl text-muted-foreground mt-3 max-w-lg">
                {isShuffled
                  ? "Exploring a random tune — return to today's any time."
                  : "One tune, picked for today. Changes at midnight."}
              </p>
            </div>
            <div className="flex gap-3 flex-wrap self-start mt-2 items-center">
              {isShuffled && (
                <button
                  onClick={resetToToday}
                  data-testid="button-back-to-today"
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-border text-[11px] uppercase tracking-[0.16em] text-foreground hover:bg-foreground hover:text-background transition-colors"
                >
                  <Calendar className="w-3 h-3" /> Today
                </button>
              )}
              <button
                onClick={shuffle}
                data-testid="button-shuffle-totd"
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-foreground text-[11px] uppercase tracking-[0.16em] text-foreground hover:bg-foreground hover:text-background transition-colors"
              >
                <Shuffle className="w-3 h-3" /> Explore another
              </button>
              {tune && (
                <ShareButton
                  url={`${window.location.origin}/tune/${tune.id}`}
                  title={tune.title}
                  className="p-2 border border-border hover:border-foreground"
                  size={13}
                  aria-label="Share tune"
                />
              )}
            </div>
          </div>
        </header>
      </div>

      <div className="container mx-auto max-w-3xl px-6 pb-10 space-y-10">
        {isLoading || !tune ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : (
          <>
            {/* Tune editorial header */}
            <div className="border-t border-border pt-8">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-medium mb-4">
                <span className="text-foreground">Key of {tune.key}</span>
                <span className="capitalize">{tune.tuneType}</span>
                {tune.difficulty && <span className="capitalize">{tune.difficulty}</span>}
                {tune.region && <span>{tune.region}</span>}
                {tune.era && <span>{tune.era}</span>}
              </div>

              <h2 className="font-display text-4xl sm:text-5xl font-semibold text-foreground tracking-tight leading-[1.0]">
                {tune.title}
              </h2>
              {tune.alternativeTitles && (
                <p className="font-display italic text-lg text-muted-foreground mt-2">
                  <span className="text-[11px] uppercase tracking-[0.18em] not-italic font-sans mr-1.5">a.k.a.</span>
                  {tune.alternativeTitles}
                </p>
              )}

              <div className="flex items-center gap-3 mt-5">
                {(tune.audioUrl || tune.locItemId) && (
                  <button
                    data-testid="button-play-totd"
                    onClick={() => playTune(tune)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background text-[11px] uppercase tracking-[0.16em] font-medium hover:bg-primary transition-colors"
                  >
                    <Play className="w-3 h-3" fill="currentColor" /> Play
                  </button>
                )}
                <button
                  data-testid="button-favorite-totd"
                  onClick={() => toggleFavorite(tune.id)}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-border text-[11px] uppercase tracking-[0.16em] text-foreground hover:bg-foreground/[0.04] transition-colors"
                >
                  <Star className={`w-3 h-3 ${faved ? "fill-primary text-primary" : ""}`} />
                  {faved ? "Saved" : "Save"}
                </button>
              </div>
            </div>

            {/* Source fiddler */}
            {tune.sourceFiddler && (
              <p className="text-sm text-muted-foreground border-l-2 border-primary pl-4 -mt-2">
                <span className="text-[11px] uppercase tracking-[0.18em] mr-1.5">From</span>
                <span className="font-medium text-foreground">{tune.sourceFiddler}</span>
              </p>
            )}

            {/* Description */}
            {tune.description && (
              <section>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-2">History & Notes</div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">About this tune</h3>
                <p className="font-serif text-[17px] leading-[1.7] text-foreground/85 max-w-prose">{tune.description}</p>
              </section>
            )}

            {/* Playing Notes */}
            {tune.notes && (
              <section>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-2">On the bow</div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">Playing notes</h3>
                <p className="font-serif italic text-[16px] leading-[1.7] text-foreground/85 border-l-2 border-primary pl-5 max-w-prose">{tune.notes}</p>
              </section>
            )}

            {/* Audio */}
            {(tune.audioUrl || tune.locItemId) && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-foreground font-semibold">
                    <Headphones className="w-3 h-3" /> Audio recording
                  </div>
                  {tune.audioAttribution && (
                    <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">via {tune.audioAttribution}</span>
                  )}
                </div>
                <AudioPlayer tune={tune} />
              </section>
            )}

            {/* YouTube */}
            {tune.youtubeVideoId && videoAvailable && (
              <section>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-foreground font-semibold mb-3">
                  <Video className="w-3 h-3" /> Video performance
                </div>
                <YoutubePlayer
                  videoId={tune.youtubeVideoId}
                  title={tune.title}
                  onUnavailable={() => setVideoAvailable(false)}
                />
              </section>
            )}

            {/* Sheet Music */}
            {tune.transcriptUrl && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-foreground font-semibold">
                    <FileText className="w-3 h-3" /> Sheet music
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">via FiddleTunes.net</span>
                </div>
                <img
                  src={tune.transcriptUrl}
                  alt={`Sheet music for ${tune.title}`}
                  className="w-full border border-border cursor-zoom-in"
                  onClick={() => window.open(tune.transcriptUrl!, "_blank")}
                />
              </section>
            )}

            {/* ABC Notation */}
            {tune.abcNotation && (
              <section>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-foreground font-semibold mb-3">
                  <BookOpen className="w-3 h-3" /> Staff notation
                </div>
                <div className="border border-border p-5 bg-card">
                  <AbcStaffRenderer notation={tune.abcNotation} />
                </div>
              </section>
            )}

            {/* Explore full tune */}
            <Link href={`/tune/${tune.id}`} data-testid="link-explore-totd">
              <div className="flex items-center justify-between py-5 border-t border-b border-border hover:bg-foreground/[0.02] transition-colors cursor-pointer group">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-1">Continue</div>
                  <p className="font-display text-xl font-semibold text-foreground">Explore this tune in full →</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
              </div>
            </Link>

            <p className="text-center text-[10px] uppercase tracking-[0.18em] text-muted-foreground pt-2">
              {isShuffled ? `${total.toLocaleString("en-US")} tunes in the vault` : "A new tune every day at midnight UTC"}
            </p>
          </>
        )}

        <TipJar />
      </div>
    </div>
  );
}
