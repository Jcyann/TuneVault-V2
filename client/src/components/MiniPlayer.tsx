import { useEffect, useRef, useState, useCallback } from "react";
import { usePlaylist } from "@/context/PlaylistContext";
import { SkipBack, SkipForward, Play, Pause, Shuffle, X, Music2, ListOrdered, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import { useSwipe } from "@/hooks/useSwipe";

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

const SPEED_OPTIONS = [0.5, 0.75, 1.0] as const;
type SpeedOption = typeof SPEED_OPTIONS[number];
const SPEED_LABELS: Record<number, string> = { 0.5: "½×", 0.75: "¾×", 1.0: "1×" };

const NOTE_NAMES = ["A","A#/Bb","B","C","C#/Db","D","D#/Eb","E","F","F#/Gb","G","G#/Ab"];

function transposeKey(key: string, semitones: number): string {
  if (!semitones) return key;
  const minorSuffix = key.endsWith("m") ? "m" : "";
  const root = minorSuffix ? key.slice(0, -1) : key;
  const idx = NOTE_NAMES.findIndex(
    (n) => n === root || n.includes(root) || n.split("/").includes(root)
  );
  if (idx === -1) return key;
  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  return NOTE_NAMES[newIdx].split("/")[0] + minorSuffix;
}

const fmt = (s: number) => {
  if (!s || isNaN(s)) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

export default function MiniPlayer() {
  const { playlist, currentIndex, isActive, next, prev, reshuffle, dismiss, playMode, setPlayMode } = usePlaylist();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [skipping, setSkipping] = useState(false);
  const [speed, setSpeed] = useState<SpeedOption>(1.0);
  const [semitones, setSemitones] = useState(0);

  const current = playlist[currentIndex] ?? null;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const pitchRate = Math.pow(2, semitones / 12);
    audio.playbackRate = speed * pitchRate;
    (audio as any).preservesPitch = semitones === 0;
    (audio as any).mozPreservesPitch = semitones === 0;
    (audio as any).webkitPreservesPitch = semitones === 0;
  }, [speed, semitones]);

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
          if (d.audioUrl) { setResolvedUrl(d.audioUrl); setSkipping(false); }
          else setTimeout(next, 1200);
        })
        .catch(() => setTimeout(next, 1200));
    } else {
      setTimeout(next, 800);
    }
  }, [current?.id, currentIndex, current?.audioUrl, current?.locItemId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !resolvedUrl) return;
    audio.src = resolvedUrl;
    audio.load();
    const pitchRate = Math.pow(2, semitones / 12);
    audio.playbackRate = speed * pitchRate;
    (audio as any).preservesPitch = semitones === 0;
    (audio as any).mozPreservesPitch = semitones === 0;
    (audio as any).webkitPreservesPitch = semitones === 0;
    audio.play().catch(() => setIsPlaying(false));
  }, [resolvedUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => { setProgress(audio.currentTime); setDuration(audio.duration || 0); };
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
    if (isPlaying) audio.pause(); else audio.play().catch(() => {});
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = Number(e.target.value);
    audio.currentTime = t;
    setProgress(t);
  };

  const toggleMode = () => setPlayMode(playMode === "shuffle" ? "chronological" : "shuffle");
  const swipe = useSwipe({ onSwipeLeft: next, onSwipeRight: prev });

  if (!isActive || !current) return null;

  const typeColor = TUNE_TYPE_COLORS[current.tuneType ?? ""] ?? "#F59E0B";
  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;
  const credit = current.sourceFiddler ?? current.audioSource ?? null;
  const displayedKey = transposeKey(current.key ?? "", semitones);
  const keyDisplay = semitones !== 0
    ? `${semitones > 0 ? "+" : ""}${semitones} · ${displayedKey}`
    : (current.key ?? "—");

  const metaLine = skipping
    ? "Loading…"
    : [credit, current.tuneType, `${currentIndex + 1} / ${playlist.length}`].filter(Boolean).join(" · ");

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 shadow-2xl border-t border-border"
      style={{ background: "hsl(var(--card))" }}
      {...swipe}
      data-testid="mini-player"
    >
      {/* Thin color accent line */}
      <div className="h-0.5 w-full" style={{ background: typeColor }} />

      <audio ref={audioRef} preload="auto" />

      <div className="container mx-auto max-w-5xl px-3 pt-2 pb-2.5 space-y-1.5">

        {/* Row 1 — Seek bar */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground tabular-nums w-8 text-right shrink-0">{fmt(progress)}</span>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.5}
            value={progress}
            onChange={handleSeek}
            className="flex-1 h-1 accent-amber-500 cursor-pointer"
            data-testid="mini-player-progress"
          />
          <span className="text-xs text-muted-foreground tabular-nums w-8 shrink-0">{fmt(duration)}</span>
        </div>

        {/* Row 2 — Title · Transport · Speed */}
        <div className="flex items-center gap-2">

          {/* Tune info */}
          <Link href={`/tune/${current.id}`} className="flex items-center gap-2 min-w-0 flex-1 group">
            <div
              className="w-6 h-6 rounded flex items-center justify-center shrink-0"
              style={{ background: typeColor + "22", border: `1px solid ${typeColor}55` }}
            >
              <Music2 className="w-3 h-3" style={{ color: typeColor }} />
            </div>
            <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors leading-tight" data-testid="mini-player-title">
              {current.title}
            </p>
          </Link>

          {/* Transport */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={prev} className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" data-testid="mini-player-prev" aria-label="Previous">
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={togglePlay}
              disabled={!resolvedUrl && !skipping}
              className="mx-1 p-2 rounded-full text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40 shadow-sm"
              style={{ background: typeColor }}
              data-testid="mini-player-play-pause"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <button onClick={next} className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" data-testid="mini-player-next" aria-label="Next">
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Speed pills — always visible */}
          <div className="flex items-center gap-1 shrink-0">
            {SPEED_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                data-testid={`speed-btn-${s}`}
                aria-label={`Speed ${SPEED_LABELS[s]}`}
                className={`px-2 py-0.5 rounded text-xs font-semibold tabular-nums transition-colors ${
                  speed === s ? "text-white" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
                style={speed === s ? { background: typeColor } : {}}
              >
                {SPEED_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Row 3 — Meta · Pitch · Actions */}
        <div className="flex items-center gap-2">

          {/* Meta */}
          <p className="text-xs text-muted-foreground truncate flex-1 leading-tight" data-testid="mini-player-subtitle">
            {metaLine}
          </p>

          {/* Pitch transposer — always visible */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setSemitones((n) => Math.max(-6, n - 1))}
              data-testid="pitch-down"
              disabled={semitones <= -6}
              className="w-5 h-5 flex items-center justify-center rounded bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 text-sm font-bold transition-colors"
              aria-label="Pitch down"
            >−</button>
            <span
              className={`text-xs font-semibold tabular-nums min-w-[2.75rem] text-center px-1.5 py-0.5 rounded transition-colors ${
                semitones !== 0 ? "text-white" : "bg-muted text-muted-foreground"
              }`}
              style={semitones !== 0 ? { background: typeColor } : {}}
              data-testid="pitch-display"
            >
              {keyDisplay}
            </span>
            <button
              onClick={() => setSemitones((n) => Math.min(6, n + 1))}
              data-testid="pitch-up"
              disabled={semitones >= 6}
              className="w-5 h-5 flex items-center justify-center rounded bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 text-sm font-bold transition-colors"
              aria-label="Pitch up"
            >+</button>
            {semitones !== 0 && (
              <button
                onClick={() => setSemitones(0)}
                data-testid="pitch-reset"
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >reset</button>
            )}
          </div>

          {/* Shuffle / reshuffle / close */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={toggleMode}
              title={playMode === "shuffle" ? "Shuffle on" : "In order"}
              className={`p-1 rounded-full transition-colors ${playMode === "shuffle" ? "text-amber-500" : "text-muted-foreground hover:text-foreground"}`}
              data-testid="mini-player-mode-toggle"
              aria-label={`Mode: ${playMode}`}
            >
              {playMode === "shuffle" ? <Shuffle className="w-3.5 h-3.5" /> : <ListOrdered className="w-3.5 h-3.5" />}
            </button>
            {playMode === "shuffle" && (
              <button onClick={reshuffle} title="Reshuffle" className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" data-testid="mini-player-reshuffle" aria-label="Reshuffle">
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
            <button onClick={dismiss} className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground ml-0.5" data-testid="mini-player-dismiss" aria-label="Close player">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
