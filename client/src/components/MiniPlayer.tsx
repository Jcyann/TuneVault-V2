import { useEffect, useRef, useState } from "react";
import { usePlaylist } from "@/context/PlaylistContext";
import { SkipBack, SkipForward, Play, Pause, Shuffle, X, Music2 } from "lucide-react";

const TUNE_TYPE_COLORS: Record<string, string> = {
  breakdown: "#F59E0B",
  reel: "#0EA5E9",
  waltz: "#8B5CF6",
  jig: "#10B981",
  modal: "#F43F5E",
  polka: "#F97316",
  march: "#6366F1",
  hornpipe: "#14B8A6",
  polska: "#A855F7",
  schottische: "#EC4899",
};

export default function MiniPlayer() {
  const { playlist, currentIndex, isActive, next, prev, reshuffle, dismiss } = usePlaylist();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [skipping, setSkipping] = useState(false);

  const current = playlist[currentIndex] ?? null;

  useEffect(() => {
    if (!current) { setResolvedUrl(null); return; }
    setResolvedUrl(null);
    setProgress(0);
    setSkipping(false);

    if (current.audioUrl) {
      setResolvedUrl(current.audioUrl);
    } else if (current.locItemId) {
      setSkipping(true);
      fetch(`/api/loc-audio/${current.locItemId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.audioUrl) {
            setResolvedUrl(d.audioUrl);
            setSkipping(false);
          } else {
            setTimeout(next, 1200);
          }
        })
        .catch(() => setTimeout(next, 1200));
    } else {
      setTimeout(next, 800);
    }
  }, [current?.id, currentIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !resolvedUrl) return;
    audio.src = resolvedUrl;
    audio.load();
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    }
  }, [resolvedUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => {
      setProgress(audio.currentTime);
      setDuration(audio.duration || 0);
    };
    const onEnded = () => next();
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [next]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !resolvedUrl) return;
    if (isPlaying) { audio.pause(); } else { audio.play().catch(() => {}); }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = Number(e.target.value);
    audio.currentTime = t;
    setProgress(t);
  };

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!isActive || !current) return null;

  const typeColor = TUNE_TYPE_COLORS[current.tuneType ?? ""] ?? "#F59E0B";

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 shadow-2xl border-t border-border"
      style={{ background: "hsl(var(--card))" }}
      data-testid="mini-player"
    >
      <div className="h-0.5 w-full" style={{ background: typeColor }} />

      <audio ref={audioRef} preload="auto" />

      <div className="container mx-auto max-w-5xl px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Music2 className="w-4 h-4 shrink-0" style={{ color: typeColor }} />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" data-testid="mini-player-title">
                {current.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {skipping ? "Loading audio…" : `Key of ${current.key} · ${currentIndex + 1} of ${playlist.length}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={prev}
              className="p-1.5 rounded-full hover:bg-muted transition-colors"
              data-testid="mini-player-prev"
              aria-label="Previous tune"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={togglePlay}
              disabled={!resolvedUrl}
              className="p-2 rounded-full text-primary-foreground transition-colors disabled:opacity-40"
              style={{ background: typeColor }}
              data-testid="mini-player-play-pause"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <button
              onClick={next}
              className="p-1.5 rounded-full hover:bg-muted transition-colors"
              data-testid="mini-player-next"
              aria-label="Next tune"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            <button
              onClick={reshuffle}
              className="p-1.5 rounded-full hover:bg-muted transition-colors"
              data-testid="mini-player-shuffle"
              aria-label="Reshuffle playlist"
            >
              <Shuffle className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={dismiss}
              className="p-1.5 rounded-full hover:bg-muted transition-colors ml-1"
              data-testid="mini-player-dismiss"
              aria-label="Close player"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {duration > 0 && (
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{fmt(progress)}</span>
            <input
              type="range"
              min={0}
              max={duration}
              step={0.5}
              value={progress}
              onChange={handleSeek}
              className="flex-1 h-1 accent-amber-500 cursor-pointer"
              data-testid="mini-player-progress"
            />
            <span className="text-xs text-muted-foreground tabular-nums w-8">{fmt(duration)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
