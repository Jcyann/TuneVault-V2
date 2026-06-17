import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Mic, Upload, Loader2, Music2, AlertTriangle, ArrowRight, Flag, Guitar, Users, Search, PencilLine } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { detectKeyFromBlob, getEssentia } from "@/lib/keyDetectionClient";
import SuggestChangesForm from "@/components/SuggestChangesForm";
import type { KeyDetectionResult } from "@shared/keyDetection";

const MAX_RECORD_SECONDS = 15;

// Circle of fifths, clockwise from the top. Each slot lists the spellings
// essentia might report so we can light up the matching tonic.
const CIRCLE_OF_FIFTHS = [
  { label: "C", names: ["C"] },
  { label: "G", names: ["G"] },
  { label: "D", names: ["D"] },
  { label: "A", names: ["A"] },
  { label: "E", names: ["E"] },
  { label: "B", names: ["B"] },
  { label: "F♯", names: ["F#", "Gb"] },
  { label: "D♭", names: ["Db", "C#"] },
  { label: "A♭", names: ["Ab", "G#"] },
  { label: "E♭", names: ["Eb", "D#"] },
  { label: "B♭", names: ["Bb", "A#"] },
  { label: "F", names: ["F"] },
];

const LABEL_RADIUS = 45; // % of container from center
const POSITIONS = CIRCLE_OF_FIFTHS.map((_, i) => {
  const a = ((-90 + i * 30) * Math.PI) / 180;
  return { left: 50 + LABEL_RADIUS * Math.cos(a), top: 50 + LABEL_RADIUS * Math.sin(a) };
});

const RING_R = 46;
const RING_C = 2 * Math.PI * RING_R;

const USES = [
  { icon: Guitar, text: "Tuning up — bow one sustained note and get its name in about a second." },
  { icon: Music2, text: "Naming a recording's key — record a clip playing nearby, or upload an audio file." },
  { icon: Users, text: "Jamming with confidence — learn the key before you jump into a session." },
  { icon: Search, text: "Browsing smarter — leap straight to every TuneVault tune in that key." },
  { icon: PencilLine, text: "Transcribing — confirm the key before you write out the notation." },
];

function normalizeNote(n: string): string {
  return (n || "").replace("♯", "#").replace("♭", "b");
}

// Chromatic pitch class (C=0) -> index in the circle-of-fifths array above.
const PC_TO_FIFTHS: Record<number, number> = {
  0: 0, 7: 1, 2: 2, 9: 3, 4: 4, 11: 5, 6: 6, 1: 7, 8: 8, 3: 9, 10: 10, 5: 11,
};

// Lightweight time-domain autocorrelation pitch detector (ACF2+). Returns the
// fundamental frequency in Hz, or -1 when the signal is too quiet/ambiguous.
function detectPitch(buf: Float32Array, sampleRate: number): number {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.006) return -1;

  let r1 = 0, r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }

  const b = buf.subarray(r1, r2);
  const n = b.length;
  if (n < 8) return -1;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) c[i] += b[j] * b[j + i];

  let d = 0;
  while (d < n - 1 && c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < n; i++) if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  if (maxpos <= 0) return -1;

  let T0 = maxpos;
  const x1 = c[T0 - 1] || 0, x2 = c[T0] || 0, x3 = c[T0 + 1] || 0;
  const a = (x1 + x3 - 2 * x2) / 2, bb = (x3 - x1) / 2;
  if (a) T0 = T0 - bb / (2 * a);

  const freq = sampleRate / T0;
  return freq >= 60 && freq <= 2000 ? freq : -1;
}

export default function IdentifyKeyPage() {
  usePageMeta(
    "Identify the Key — TuneVault",
    "Record or upload a fiddle tune and detect its musical key right in your browser. A free tool for old-time and traditional musicians.",
  );
  const { toast } = useToast();

  const [analyzing, setAnalyzing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<KeyDetectionResult | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string>("");
  const [showSuggest, setShowSuggest] = useState(false);

  const [liveIndex, setLiveIndex] = useState(-1);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Live tuner visualization (Web Audio)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const freqDataRef = useRef<Uint8Array | null>(null);
  const timeDataRef = useRef<Float32Array | null>(null);
  const primaryRef = useRef<string>("");
  const frameRef = useRef(0);
  const vizRunningRef = useRef(false);
  const mountedRef = useRef(true);

  // Warm up the WASM engine in the background as soon as the page loads.
  useEffect(() => {
    getEssentia().catch(() => {/* surfaced on first use */});
    return () => {
      mountedRef.current = false;
      teardownRecording();
    };
  }, []);

  // Fully tear down a recording session: timer, viz/rAF, AudioContext, mic
  // tracks, and the recorder (with handlers detached so a late onstop can't
  // fire analysis after unmount or an aborted start).
  function teardownRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    stopViz();
    const mr = mediaRecorderRef.current;
    if (mr) {
      mr.ondataavailable = null;
      mr.onstop = null;
      if (mr.state !== "inactive") { try { mr.stop(); } catch { /* already stopped */ } }
      mediaRecorderRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function setupViz(stream: MediaStream) {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      freqDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      timeDataRef.current = new Float32Array(analyser.fftSize);
      primaryRef.current = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "25 70% 45%";
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = 360 * dpr;
        canvas.height = 360 * dpr;
        canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      frameRef.current = 0;
      vizRunningRef.current = true;
      rafRef.current = requestAnimationFrame(drawViz);
    } catch {
      /* visualization is non-critical; detection still works */
    }
  }

  function drawViz() {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    const freq = freqDataRef.current;
    if (analyser && canvas && freq) {
      const c = canvas.getContext("2d");
      if (c) {
        analyser.getByteFrequencyData(freq);
        c.clearRect(0, 0, 360, 360);
        const cx = 180, cy = 180, innerR = 116, maxLen = 38, N = 132, SENS = 1.9;
        const usable = Math.floor(freq.length * 0.5);
        const p = primaryRef.current || "25 70% 45%";
        c.lineWidth = 1.8;
        c.lineCap = "round";
        for (let i = 0; i < N; i++) {
          const t = i < N / 2 ? i / (N / 2) : (N - i) / (N / 2);
          const raw = (freq[Math.floor(t * usable)] || 0) / 255;
          const mag = Math.min(1, raw * SENS);
          const len = 2 + mag * maxLen;
          const ang = (i / N) * Math.PI * 2 - Math.PI / 2;
          const ca = Math.cos(ang), sa = Math.sin(ang);
          c.strokeStyle = `hsl(${p} / ${0.22 + mag * 0.6})`;
          c.beginPath();
          c.moveTo(cx + ca * innerR, cy + sa * innerR);
          c.lineTo(cx + ca * (innerR + len), cy + sa * (innerR + len));
          c.stroke();
        }
      }
    }

    frameRef.current = (frameRef.current + 1) % 600;
    if (frameRef.current % 4 === 0) {
      const time = timeDataRef.current;
      const ctx = audioCtxRef.current;
      if (analyser && time && ctx) {
        analyser.getFloatTimeDomainData(time);
        const hz = detectPitch(time, ctx.sampleRate);
        if (hz > 0) {
          const midi = Math.round(12 * Math.log2(hz / 440) + 69);
          const slot = PC_TO_FIFTHS[((midi % 12) + 12) % 12];
          setLiveIndex((prev) => (prev === slot ? prev : slot));
        }
      }
    }

    if (vizRunningRef.current) rafRef.current = requestAnimationFrame(drawViz);
  }

  function stopViz() {
    vizRunningRef.current = false;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    const canvas = canvasRef.current;
    const c = canvas?.getContext("2d");
    if (canvas && c) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, canvas.width, canvas.height); }
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    setLiveIndex(-1);
  }

  async function analyze(data: ArrayBuffer, label: string) {
    setAnalyzing(true);
    setResult(null);
    setSourceLabel(label);
    try {
      const r = await detectKeyFromBlob(data);
      if (mountedRef.current) setResult(r);
    } catch (err: any) {
      if (mountedRef.current) toast({ title: "Could not detect a key", description: err.message, variant: "destructive" });
    } finally {
      if (mountedRef.current) setAnalyzing(false);
    }
  }

  async function startRecording() {
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setLiveIndex(-1);
      setupViz(stream);
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const buf = await blob.arrayBuffer();
        await analyze(buf, "Microphone recording");
      };
      mr.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((e) => {
          if (e + 1 >= MAX_RECORD_SECONDS) stopRecording();
          return e + 1;
        });
      }, 1000);
    } catch (err: any) {
      teardownRecording();
      setRecording(false);
      toast({ title: "Microphone unavailable", description: "Please allow microphone access and try again.", variant: "destructive" });
    }
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecording(false);
    stopViz();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    await analyze(buf, file.name);
    e.target.value = "";
  }

  function onDialClick() {
    if (analyzing) return;
    if (recording) stopRecording();
    else startRecording();
  }

  const idle = !recording && !analyzing && !result;
  const activeIndex = result
    ? CIRCLE_OF_FIFTHS.findIndex((s) => s.names.map(normalizeNote).includes(normalizeNote(result.tonic)))
    : -1;

  return (
    <div className="min-h-screen bg-background pb-16 pt-16 sm:pt-20">
      <div className="container mx-auto max-w-2xl px-6">

        {/* Header */}
        <header className="border-t border-foreground pt-6 pb-8 text-center sm:text-left">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">The Tool</div>
          <h1 className="font-display text-[40px] sm:text-6xl font-semibold tracking-tight leading-[0.95] text-foreground">
            What key is this?
          </h1>
          <p className="font-display italic text-lg sm:text-xl text-muted-foreground mt-3 max-w-lg mx-auto sm:mx-0">
            Play a few bars or upload a clip — TuneVault names the key, right in your browser.
          </p>
        </header>

        {/* ── The dial ─────────────────────────────────────────── */}
        <div className="flex flex-col items-center pt-2 pb-6">
          <div className="relative w-[300px] h-[300px] sm:w-[360px] sm:h-[360px] select-none">

            {/* Circle of fifths labels */}
            {CIRCLE_OF_FIFTHS.map((s, i) => {
              const hot = (result != null && i === activeIndex) || (recording && i === liveIndex);
              return (
                <span
                  key={s.label}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 font-display tabular-nums transition-all duration-300 ${
                    hot
                      ? "text-primary font-bold scale-[1.6] text-lg sm:text-xl drop-shadow"
                      : result
                        ? "text-muted-foreground/35 text-sm sm:text-base"
                        : "text-muted-foreground/55 text-sm sm:text-base"
                  }`}
                  style={{ left: `${POSITIONS[i].left}%`, top: `${POSITIONS[i].top}%` }}
                  data-testid={`fifth-${s.label}`}
                >
                  {s.label}
                </span>
              );
            })}

            {/* Idle breathing halo */}
            {idle && (
              <>
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[66%] h-[66%] rounded-full bg-primary/15 tv-breathe pointer-events-none" />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[66%] h-[66%] rounded-full bg-primary/10 tv-breathe pointer-events-none" style={{ animationDelay: "1.7s" }} />
              </>
            )}

            {/* Recording sonar ripples */}
            {recording && [0, 1, 2].map((k) => (
              <span
                key={k}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full border-2 border-primary/40 tv-sonar pointer-events-none"
                style={{ animationDelay: `${k * 0.63}s` }}
              />
            ))}

            {/* Outer ring + countdown / result arc */}
            <svg viewBox="0 0 100 100" className={`absolute inset-[11%] w-[78%] h-[78%] -rotate-90 pointer-events-none ${analyzing ? "tv-spin-slow" : ""}`}>
              <circle cx="50" cy="50" r={RING_R} fill="none" stroke="hsl(var(--foreground) / 0.12)" strokeWidth="1.5" />
              {recording && (
                <circle
                  cx="50" cy="50" r={RING_R} fill="none"
                  stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={RING_C * (elapsed / MAX_RECORD_SECONDS)}
                  className="transition-[stroke-dashoffset] duration-1000 ease-linear"
                />
              )}
              {analyzing && (
                <circle
                  cx="50" cy="50" r={RING_R} fill="none"
                  stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round"
                  strokeDasharray={`${RING_C * 0.25} ${RING_C * 0.75}`}
                />
              )}
              {result && activeIndex >= 0 && (
                <circle cx="50" cy="50" r={RING_R} fill="none" stroke="hsl(var(--primary) / 0.55)" strokeWidth="2" />
              )}
            </svg>

            {/* Live circular EQ (drawn during recording) */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full pointer-events-none"
              aria-hidden="true"
            />

            {/* Tuner needle — points at the note currently being played */}
            {recording && liveIndex >= 0 && (
              <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full pointer-events-none">
                <g transform={`rotate(${liveIndex * 30} 50 50)`}>
                  <line x1="50" y1="50" x2="50" y2="15" stroke="hsl(var(--primary))" strokeWidth="1.4" strokeLinecap="round" opacity="0.9" />
                  <circle cx="50" cy="15" r="2.6" fill="hsl(var(--primary))" />
                </g>
              </svg>
            )}

            {/* Center disc — the button */}
            <button
              type="button"
              onClick={onDialClick}
              disabled={analyzing}
              data-testid="button-dial"
              aria-label={recording ? "Stop listening" : result ? "Listen again" : "Tap to listen"}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[58%] h-[58%] rounded-full flex flex-col items-center justify-center text-center gap-1 px-4
                bg-gradient-to-br from-[hsl(25_55%_32%)] to-[hsl(var(--primary))] text-primary-foreground shadow-2xl ring-1 ring-black/10
                transition-transform duration-300 hover:scale-[1.03] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground disabled:hover:scale-100 disabled:cursor-default"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-7 h-7 animate-spin" />
                  <span className="text-[11px] uppercase tracking-[0.16em] opacity-90 mt-1">Reading the key…</span>
                </>
              ) : recording ? (
                <>
                  <span className="font-display text-5xl sm:text-6xl font-bold tabular-nums leading-none" data-testid="text-countdown">
                    {MAX_RECORD_SECONDS - elapsed}
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.16em] opacity-90 mt-1.5">Tap to guess now</span>
                </>
              ) : result ? (
                <>
                  <span key={result.key} className="font-display text-5xl sm:text-6xl font-bold leading-none tv-pop" data-testid="text-detected-key">
                    {result.key}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.16em] opacity-80 mt-2">Tap to try again</span>
                </>
              ) : (
                <>
                  <Mic className="w-8 h-8 sm:w-9 sm:h-9" />
                  <span className="text-[11px] uppercase tracking-[0.16em] opacity-90 mt-1.5">Tap to listen</span>
                </>
              )}
            </button>
          </div>

          {/* Status caption under the dial */}
          <div className="mt-7 text-center min-h-[3.5rem]" role="status" aria-live="polite">
            {result && !analyzing ? (
              <div className="tv-pop" data-testid="result-caption">
                <p className="font-display text-xl text-foreground">
                  {result.tonic} {result.scale}
                  <span className="text-muted-foreground"> · {(result.confidence * 100).toFixed(0)}% confidence</span>
                </p>
                {sourceLabel && <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs mx-auto">from {sourceLabel}</p>}
              </div>
            ) : recording ? (
              <p className="font-serif text-[15px] text-muted-foreground">Listening… play a note, then tap the dial anytime for an instant read.</p>
            ) : analyzing ? (
              <p className="font-serif text-[15px] text-muted-foreground">Working out the key…</p>
            ) : (
              <p className="font-serif text-[15px] text-muted-foreground max-w-sm">
                Tap the dial and play a tune — or a single note to tune up. Tap again anytime for an instant read, or let it run up to {MAX_RECORD_SECONDS} seconds.
              </p>
            )}
          </div>

          {/* Result actions */}
          {result && !analyzing && (
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-4 tv-pop">
              <Link
                href={`/?key=${encodeURIComponent(result.key)}`}
                data-testid="link-browse-key"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <Music2 className="w-4 h-4" /> Browse {result.key} tunes <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={() => setShowSuggest(true)}
                data-testid="button-suggest-key"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <Flag className="w-4 h-4" /> Suggest "{result.key}" for a library tune
              </button>
            </div>
          )}

          {/* Upload — always available */}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={onFileChange}
            className="hidden"
            data-testid="input-audio-file"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={recording || analyzing}
            data-testid="button-choose-file"
            className="mt-6 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          >
            <Upload className="w-3.5 h-3.5" /> or upload an audio file
          </button>
        </div>

        {/* How it works + uses */}
        <section className="border-t border-border pt-7 mt-4 max-w-xl mx-auto">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">How it works</div>
          <p className="font-serif text-[15px] text-muted-foreground leading-relaxed">
            Pitch Detective listens to a few seconds of sound and works out the musical key — the home note and
            whether it's major or minor — using a pitch-analysis engine that runs entirely inside your browser.
            Nothing is uploaded; your audio never leaves your device.
          </p>

          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mt-8 mb-4">Great for</div>
          <ul className="space-y-3.5">
            {USES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-3" data-testid={`use-${text.split(" ")[0].toLowerCase()}`}>
                <span className="shrink-0 mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <p className="font-serif text-[15px] text-foreground leading-relaxed pt-0.5">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Disclaimer */}
        <div className="border-t border-border pt-5 mt-8 flex gap-2.5 max-w-xl mx-auto">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
          <p className="font-serif text-[13px] text-muted-foreground leading-relaxed">
            Key detection is an estimate. Old-time fiddle uses lots of open-string drones, which can fool the analysis into the
            dominant (a fifth away) or the relative major/minor. Trust your ears — and if you spot a tune in our library with the
            wrong key, please <Link href="/about" className="text-primary hover:underline">suggest a correction</Link>.
          </p>
        </div>
      </div>

      <Dialog open={showSuggest} onOpenChange={setShowSuggest}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-semibold">Suggest a key correction</DialogTitle>
            <DialogDescription>
              Search for the tune in our library that you just identified, and we'll review the key change.
            </DialogDescription>
          </DialogHeader>
          {result && (
            <SuggestChangesForm
              correctionType="key"
              suggestedValue={result.key}
              onSuccess={() => setTimeout(() => setShowSuggest(false), 1500)}
              onCancel={() => setShowSuggest(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
