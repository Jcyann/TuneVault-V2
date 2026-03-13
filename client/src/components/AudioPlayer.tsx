import { useState, useEffect } from "react";
import { Headphones, Loader2, Mic2, Play, Music2, ExternalLink } from "lucide-react";
import type { Tune } from "@shared/schema";
import { usePlaylist } from "@/context/PlaylistContext";

interface AudioPlayerProps {
  tune: Tune;
}

export default function AudioPlayer({ tune }: AudioPlayerProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(tune.audioUrl ?? null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const { startPlaylist, playlist, currentIndex, isActive } = usePlaylist();

  useEffect(() => {
    if (tune.audioUrl) {
      setResolvedUrl(tune.audioUrl);
      return;
    }
    if (tune.locItemId) {
      setLoading(true);
      fetch(`/api/loc-audio/${tune.locItemId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.audioUrl) {
            setResolvedUrl(data.audioUrl);
          } else {
            setFailed(true);
          }
        })
        .catch(() => setFailed(true))
        .finally(() => setLoading(false));
    }
  }, [tune.audioUrl, tune.locItemId]);

  if (!tune.audioUrl && !tune.locItemId) return null;
  if (failed) return null;

  const isCurrentlyPlaying = isActive && playlist[currentIndex]?.id === tune.id;

  const performer = tune.sourceFiddler ?? null;
  const archiveDomain = tune.audioAttribution ?? null;
  const archiveName = tune.audioSource ?? null;

  return (
    <div className="mt-4 space-y-1.5" data-testid="audio-player">
      <div className="rounded-lg bg-gradient-to-r from-black/30 to-black/10 ring-1 ring-white/10 px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <Headphones className="w-4 h-4 text-primary-foreground/80" />
          <span className="text-xs font-medium text-primary-foreground/70 uppercase tracking-wide">
            Listen
          </span>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center gap-2 text-primary-foreground/60 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading audio…</span>
          </div>
        ) : isCurrentlyPlaying ? (
          <div className="flex-1 flex items-center gap-2">
            <Music2 className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-sm text-primary-foreground/80">Playing in mini player↓</span>
          </div>
        ) : (
          <button
            onClick={() => startPlaylist([tune])}
            disabled={!resolvedUrl && !tune.locItemId}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all hover:scale-105 active:scale-95 disabled:opacity-40 text-white shadow-sm"
            style={{ background: "#F59E0B" }}
            data-testid="audio-play-button"
            aria-label={`Play ${tune.title}`}
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            Play
          </button>
        )}
      </div>

      {(performer || archiveDomain || archiveName) && !loading && (
        <div className="flex items-start gap-2 px-1" data-testid="audio-credits">
          <Mic2 className="w-3.5 h-3.5 mt-0.5 text-primary-foreground/40 shrink-0" />
          <div className="text-xs text-primary-foreground/55 leading-snug space-y-0.5">
            {performer && (
              <div data-testid="audio-performer-credit">
                Performed by{" "}
                {archiveDomain && archiveName === performer ? (
                  <a
                    href={`https://${archiveDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary-foreground/80 inline-flex items-center gap-0.5 hover:text-primary-foreground transition-colors"
                    data-testid="audio-performer-link"
                  >
                    {performer}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ) : (
                  <span className="font-semibold text-primary-foreground/80">{performer}</span>
                )}
              </div>
            )}
            {(archiveDomain || archiveName) && archiveName !== performer && (
              <div className="text-primary-foreground/40" data-testid="audio-source-credit">
                {archiveDomain ? (
                  <a
                    href={`https://${archiveDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-primary-foreground/60 transition-colors"
                    data-testid="audio-source-link"
                  >
                    Via {archiveName ?? archiveDomain}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ) : (
                  <span>Via {archiveName}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
