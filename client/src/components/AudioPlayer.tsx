import { useState, useEffect } from "react";
import { Headphones, Loader2, Mic2 } from "lucide-react";
import type { Tune } from "@shared/schema";

interface AudioPlayerProps {
  tune: Tune;
}

export default function AudioPlayer({ tune }: AudioPlayerProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(tune.audioUrl ?? null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

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

  const showCredits = !loading && resolvedUrl && (tune.audioSource || tune.sourceFiddler);

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
        ) : resolvedUrl ? (
          <audio
            controls
            src={resolvedUrl}
            className="flex-1 h-8 min-w-0"
            preload="none"
            data-testid="audio-element"
          />
        ) : null}
      </div>

      {showCredits && (
        <div
          className="flex items-start gap-2 px-1"
          data-testid="audio-credits"
        >
          <Mic2 className="w-3.5 h-3.5 mt-0.5 text-primary-foreground/40 shrink-0" />
          <div className="text-xs text-primary-foreground/55 leading-snug">
            {tune.audioSource && (
              <span data-testid="audio-source-badge">
                Recorded by <span className="font-medium text-primary-foreground/70">{tune.audioSource}</span>
              </span>
            )}
            {tune.audioSource && tune.sourceFiddler && (
              <span className="mx-1 text-primary-foreground/30">·</span>
            )}
            {tune.sourceFiddler && (
              <span data-testid="audio-fiddler-credit">
                Featuring <span className="font-medium text-primary-foreground/70">{tune.sourceFiddler}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
