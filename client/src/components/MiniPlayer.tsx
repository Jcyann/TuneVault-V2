import { useEffect, useRef, useState, useCallback } from "react";
import { usePlaylist } from "@/context/PlaylistContext";
import { SkipBack, SkipForward, Play, Pause, Shuffle, X, Music2, ListOrdered, RotateCcw, ExternalLink } from "lucide-react";
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
  const barRef = useRef<HTMLDivElement>(null);
  const [barHeight, setBarHeight] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [skipping, setSkipping] = useState(false);
  const [speed, setSpeed] = useState<SpeedOption>(1.0);
  const [semitones, setSemitones] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const current = playlist[currentIndex] ?? null;

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const update = () => setBarHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isActive, current?.id]);

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

  useEffect(() => {
    const handlePauseAudio = () => {
      audioRef.current?.pause();
    };
    window.addEventListener("tunevault:pause-audio", handlePauseAudio);
    return () => window.removeEventListener("tunevault:pause-audio", handlePauseAudio);
  }, []);

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
  const collapse = useCallback(() => setExpanded(false), []);
  const swipe = useSwipe({
    onSwipeLeft: next,
    onSwipeRight: prev,
    onSwipeUp: () => setExpanded(true),
    onSwipeDown: dismiss,
    ignoreInteractive: true,
  });
  const sheetSwipe = useSwipe({ onSwipeDown: collapse, threshold: 60, ignoreInteractive: true });

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
    <>
      {/* ============ EXPANDED DOCKED PANEL (swipe up to open) — non-modal ============ */}
      <div
        className="fixed inset-0 z-[60] flex items-end justify-center sm:justify-end px-0 sm:px-4 pointer-events-none"
        style={{ paddingBottom: barHeight }}
        aria-hidden={!expanded}
      >
        {/* Panel — only this region captures pointer events; the page behind stays scrollable */}
        <div
          {...sheetSwipe}
          role="region"
          aria-label="Now playing"
          className={`relative w-full max-w-md mb-2 sm:mb-4 transition-all duration-300 ease-out ${expanded ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-4 opacity-0 pointer-events-none"}`}
          data-testid="player-sheet"
        >
          <div
            className="rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[70vh] sm:max-h-[80vh] flex flex-col"
            style={{ background: "hsl(var(--card))" }}
          >
            {/* Grab handle + close */}
            <div className="relative pt-2.5 pb-1 shrink-0">
              <button
                onClick={collapse}
                className="mx-auto block h-1.5 w-10 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50 transition-colors"
                aria-label="Collapse player"
                data-testid="player-sheet-collapse"
              />
              <button
                onClick={dismiss}
                className="absolute right-3 top-2 p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Close player"
                data-testid="player-sheet-close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 pb-6 pt-1 overflow-y-auto">
              {/* Artwork + title */}
              <div className="flex flex-col items-center text-center gap-3 mb-5">
                <div
                  className="w-28 h-28 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ background: typeColor + "20", border: `1px solid ${typeColor}55` }}
                >
                  {isPlaying ? (
                    <div className="flex items-end gap-[3px] h-9" aria-hidden>
                      {[0, 0.18, 0.36, 0.12, 0.28].map((d, i) => (
                        <span key={i} className="tv-eq-bar w-[4px] h-full rounded-full" style={{ background: typeColor, animationDelay: `${d}s` }} />
                      ))}
                    </div>
                  ) : (
                    <Music2 className="w-12 h-12" style={{ color: typeColor }} />
                  )}
                </div>
                <div className="min-w-0 w-full">
                  <Link
                    href={`/tune/${current.id}`}
                    onClick={collapse}
                    className="font-display text-xl font-semibold leading-tight hover:text-primary transition-colors block truncate"
                    data-testid="player-sheet-title"
                  >
                    {current.title}
                  </Link>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground truncate mt-1.5">
                    {metaLine}
                  </p>
                </div>
              </div>

              {/* Seek */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[11px] text-muted-foreground tabular-nums w-9 text-right shrink-0">{fmt(progress)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 1}
                  step={0.5}
                  value={progress}
                  onChange={handleSeek}
                  className="flex-1 h-1.5 accent-amber-500 cursor-pointer"
                  data-testid="player-sheet-progress"
                  aria-label="Seek"
                />
                <span className="text-[11px] text-muted-foreground tabular-nums w-9 shrink-0">{fmt(duration)}</span>
              </div>

              {/* Transport */}
              <div className="flex items-center justify-center gap-4 mb-6">
                <button onClick={toggleMode} title={playMode === "shuffle" ? "Shuffle on" : "In order"} className={`p-2 rounded-full transition-colors ${playMode === "shuffle" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`} aria-label={`Mode: ${playMode}`} data-testid="player-sheet-mode">
                  {playMode === "shuffle" ? <Shuffle className="w-5 h-5" /> : <ListOrdered className="w-5 h-5" />}
                </button>
                <button onClick={prev} className="p-2 rounded-full hover:bg-muted transition-colors text-foreground" aria-label="Previous" data-testid="player-sheet-prev">
                  <SkipBack className="w-7 h-7" fill="currentColor" />
                </button>
                <button
                  onClick={togglePlay}
                  disabled={!resolvedUrl && !skipping}
                  className="w-16 h-16 rounded-full text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40 shadow-md flex items-center justify-center"
                  style={{ background: typeColor }}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  data-testid="player-sheet-play-pause"
                >
                  {isPlaying ? <Pause className="w-8 h-8" fill="currentColor" /> : <Play className="w-8 h-8 ml-1" fill="currentColor" />}
                </button>
                <button onClick={next} className="p-2 rounded-full hover:bg-muted transition-colors text-foreground" aria-label="Next" data-testid="player-sheet-next">
                  <SkipForward className="w-7 h-7" fill="currentColor" />
                </button>
                <button onClick={reshuffle} title="Reshuffle" disabled={playMode !== "shuffle"} className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Reshuffle" data-testid="player-sheet-reshuffle">
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>

              {/* Speed */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Speed</span>
                <div className="flex items-center gap-1.5">
                  {SPEED_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      data-testid={`sheet-speed-btn-${s}`}
                      aria-label={`Speed ${SPEED_LABELS[s]}`}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold tabular-nums transition-colors ${speed === s ? "text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                      style={speed === s ? { background: typeColor } : {}}
                    >
                      {SPEED_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pitch */}
              <div className="flex items-center justify-between gap-3 mb-5">
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Pitch</span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setSemitones((n) => Math.max(-6, n - 1))} disabled={semitones <= -6} className="w-8 h-8 flex items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 text-base font-bold transition-colors" aria-label="Pitch down" data-testid="sheet-pitch-down">−</button>
                  <span className={`text-sm font-semibold tabular-nums min-w-[3.5rem] text-center px-2 py-1.5 rounded-lg transition-colors ${semitones !== 0 ? "text-white" : "bg-muted text-muted-foreground"}`} style={semitones !== 0 ? { background: typeColor } : {}} data-testid="sheet-pitch-display">{keyDisplay}</span>
                  <button onClick={() => setSemitones((n) => Math.min(6, n + 1))} disabled={semitones >= 6} className="w-8 h-8 flex items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 text-base font-bold transition-colors" aria-label="Pitch up" data-testid="sheet-pitch-up">+</button>
                  {semitones !== 0 && (
                    <button onClick={() => setSemitones(0)} className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1" data-testid="sheet-pitch-reset">reset</button>
                  )}
                </div>
              </div>

              {/* Details link */}
              <Link
                href={`/tune/${current.id}`}
                onClick={collapse}
                className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors py-2"
                data-testid="player-sheet-details"
              >
                <ExternalLink className="w-3.5 h-3.5" /> View tune details
              </Link>
            </div>
          </div>
        </div>
      </div>

    <div
      ref={barRef}
      className="fixed bottom-0 left-0 right-0 z-50 shadow-2xl border-t border-border"
      style={{ background: "hsl(var(--card))" }}
      {...swipe}
      data-testid="mini-player"
    >
      {/* Thin color accent line */}
      <div className="h-0.5 w-full" style={{ background: typeColor }} />

      {/* Grab handle — tap or swipe up to expand */}
      <button
        onClick={() => setExpanded(true)}
        className="group w-full flex items-center justify-center pt-1.5 pb-0.5"
        aria-label="Expand player"
        data-testid="mini-player-expand"
      >
        <span className="h-1 w-9 rounded-full bg-muted-foreground/30 group-hover:bg-muted-foreground/50 transition-colors" />
      </button>

      <audio ref={audioRef} preload="auto" />

      {/* ============ DESKTOP LAYOUT (lg+) ============ */}
      <div className="hidden lg:block">
        <div className="container mx-auto max-w-7xl px-8 py-3">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-8">

            {/* LEFT — Title + meta */}
            <Link href={`/tune/${current.id}`} className="flex items-center gap-3 min-w-0 group">
              <div
                className="w-11 h-11 rounded flex items-center justify-center shrink-0 overflow-hidden"
                style={{ background: typeColor + "20", border: `1px solid ${typeColor}55` }}
              >
                {isPlaying ? (
                  <div className="flex items-end gap-[2px] h-4" aria-hidden>
                    {[0, 0.18, 0.36, 0.12].map((d, i) => (
                      <span
                        key={i}
                        className="tv-eq-bar w-[2.5px] h-full rounded-full"
                        style={{ background: typeColor, animationDelay: `${d}s` }}
                      />
                    ))}
                  </div>
                ) : (
                  <Music2 className="w-4 h-4" style={{ color: typeColor }} />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-display text-[15px] font-semibold leading-tight truncate group-hover:text-primary transition-colors" data-testid="mini-player-title">
                  {current.title}
                </p>
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground truncate mt-1" data-testid="mini-player-subtitle">
                  {metaLine}
                </p>
              </div>
            </Link>

            {/* CENTER — Transport + seek (the focal point) */}
            <div className="flex flex-col items-center gap-1.5 min-w-[420px]">
              <div className="flex items-center gap-2">
                <button onClick={toggleMode} title={playMode === "shuffle" ? "Shuffle on" : "In order"} className={`p-1.5 rounded-full transition-colors ${playMode === "shuffle" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`} data-testid="mini-player-mode-toggle" aria-label={`Mode: ${playMode}`}>
                  {playMode === "shuffle" ? <Shuffle className="w-4 h-4" /> : <ListOrdered className="w-4 h-4" />}
                </button>
                <button onClick={prev} className="p-2 rounded-full hover:bg-muted transition-colors text-foreground" data-testid="mini-player-prev" aria-label="Previous">
                  <SkipBack className="w-5 h-5" fill="currentColor" />
                </button>
                <button
                  onClick={togglePlay}
                  disabled={!resolvedUrl && !skipping}
                  className="mx-1 w-11 h-11 rounded-full text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40 shadow-sm flex items-center justify-center"
                  style={{ background: typeColor }}
                  data-testid="mini-player-play-pause"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
                </button>
                <button onClick={next} className="p-2 rounded-full hover:bg-muted transition-colors text-foreground" data-testid="mini-player-next" aria-label="Next">
                  <SkipForward className="w-5 h-5" fill="currentColor" />
                </button>
                {playMode === "shuffle" ? (
                  <button onClick={reshuffle} title="Reshuffle" className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" data-testid="mini-player-reshuffle" aria-label="Reshuffle">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                ) : <span className="w-7" />}
              </div>

              {/* Seek */}
              <div className="flex items-center gap-3 w-full">
                <span className="text-[11px] text-muted-foreground tabular-nums w-9 text-right shrink-0">{fmt(progress)}</span>
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
                <span className="text-[11px] text-muted-foreground tabular-nums w-9 shrink-0">{fmt(duration)}</span>
              </div>
            </div>

            {/* RIGHT — Speed · Pitch · Close */}
            <div className="flex items-center justify-end gap-5">
              {/* Speed */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Speed</span>
                <div className="flex items-center gap-1">
                  {SPEED_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      data-testid={`speed-btn-${s}`}
                      aria-label={`Speed ${SPEED_LABELS[s]}`}
                      className={`px-2 py-1 rounded text-xs font-semibold tabular-nums transition-colors ${speed === s ? "text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                      style={speed === s ? { background: typeColor } : {}}
                    >
                      {SPEED_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="w-px h-7 bg-border" aria-hidden />

              {/* Pitch */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Pitch</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSemitones((n) => Math.max(-6, n - 1))}
                    data-testid="pitch-down"
                    disabled={semitones <= -6}
                    className="w-6 h-6 flex items-center justify-center rounded bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 text-sm font-bold transition-colors"
                    aria-label="Pitch down"
                  >−</button>
                  <span
                    className={`text-xs font-semibold tabular-nums min-w-[3rem] text-center px-2 py-1 rounded transition-colors ${semitones !== 0 ? "text-white" : "bg-muted text-muted-foreground"}`}
                    style={semitones !== 0 ? { background: typeColor } : {}}
                    data-testid="pitch-display"
                  >
                    {keyDisplay}
                  </span>
                  <button
                    onClick={() => setSemitones((n) => Math.min(6, n + 1))}
                    data-testid="pitch-up"
                    disabled={semitones >= 6}
                    className="w-6 h-6 flex items-center justify-center rounded bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 text-sm font-bold transition-colors"
                    aria-label="Pitch up"
                  >+</button>
                  {semitones !== 0 && (
                    <button onClick={() => setSemitones(0)} data-testid="pitch-reset" className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1">reset</button>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="w-px h-7 bg-border" aria-hidden />

              <button onClick={dismiss} className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" data-testid="mini-player-dismiss" aria-label="Close player">
                <X className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* ============ MOBILE / TABLET LAYOUT (<lg) ============ */}
      <div className="lg:hidden container mx-auto max-w-5xl px-3 pt-2 pb-2.5 space-y-1.5">

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
            data-testid="mini-player-progress-mobile"
          />
          <span className="text-xs text-muted-foreground tabular-nums w-8 shrink-0">{fmt(duration)}</span>
        </div>

        {/* Row 2 — Title · Transport · Speed */}
        <div className="flex items-center gap-2">
          <Link href={`/tune/${current.id}`} className="flex items-center gap-2 min-w-0 flex-1 group">
            <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ background: typeColor + "22", border: `1px solid ${typeColor}55` }}>
              <Music2 className="w-3 h-3" style={{ color: typeColor }} />
            </div>
            <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors leading-tight">{current.title}</p>
          </Link>

          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={prev} className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" aria-label="Previous"><SkipBack className="w-4 h-4" /></button>
            <button onClick={togglePlay} disabled={!resolvedUrl && !skipping} className="mx-1 p-2 rounded-full text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40 shadow-sm" style={{ background: typeColor }} aria-label={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <button onClick={next} className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" aria-label="Next"><SkipForward className="w-4 h-4" /></button>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {SPEED_OPTIONS.map((s) => (
              <button key={s} onClick={() => setSpeed(s)} aria-label={`Speed ${SPEED_LABELS[s]}`} className={`px-2 py-0.5 rounded text-xs font-semibold tabular-nums transition-colors ${speed === s ? "text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`} style={speed === s ? { background: typeColor } : {}}>
                {SPEED_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Row 3 — Meta · Pitch · Actions */}
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground truncate flex-1 leading-tight">{metaLine}</p>

          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setSemitones((n) => Math.max(-6, n - 1))} disabled={semitones <= -6} className="w-5 h-5 flex items-center justify-center rounded bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 text-sm font-bold transition-colors" aria-label="Pitch down">−</button>
            <span className={`text-xs font-semibold tabular-nums min-w-[2.75rem] text-center px-1.5 py-0.5 rounded transition-colors ${semitones !== 0 ? "text-white" : "bg-muted text-muted-foreground"}`} style={semitones !== 0 ? { background: typeColor } : {}}>{keyDisplay}</span>
            <button onClick={() => setSemitones((n) => Math.min(6, n + 1))} disabled={semitones >= 6} className="w-5 h-5 flex items-center justify-center rounded bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 text-sm font-bold transition-colors" aria-label="Pitch up">+</button>
            {semitones !== 0 && (
              <button onClick={() => setSemitones(0)} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">reset</button>
            )}
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={toggleMode} title={playMode === "shuffle" ? "Shuffle on" : "In order"} className={`p-1 rounded-full transition-colors ${playMode === "shuffle" ? "text-amber-500" : "text-muted-foreground hover:text-foreground"}`} aria-label={`Mode: ${playMode}`}>
              {playMode === "shuffle" ? <Shuffle className="w-3.5 h-3.5" /> : <ListOrdered className="w-3.5 h-3.5" />}
            </button>
            {playMode === "shuffle" && (
              <button onClick={reshuffle} title="Reshuffle" className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" aria-label="Reshuffle"><RotateCcw className="w-3 h-3" /></button>
            )}
            <button onClick={dismiss} className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground ml-0.5" aria-label="Close player"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
