import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Mic, Upload, Loader2, Music2, AlertTriangle, ArrowRight, Flag } from "lucide-react";
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

function normalizeNote(n: string): string {
  return (n || "").replace("♯", "#").replace("♭", "b");
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Warm up the WASM engine in the background as soon as the page loads.
  useEffect(() => {
    getEssentia().catch(() => {/* surfaced on first use */});
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function analyze(data: ArrayBuffer, label: string) {
    setAnalyzing(true);
    setResult(null);
    setSourceLabel(label);
    try {
      const r = await detectKeyFromBlob(data);
      setResult(r);
    } catch (err: any) {
      toast({ title: "Could not detect a key", description: err.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  }

  async function startRecording() {
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
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
      toast({ title: "Microphone unavailable", description: "Please allow microphone access and try again.", variant: "destructive" });
    }
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecording(false);
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
              const active = i === activeIndex;
              return (
                <span
                  key={s.label}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 font-display tabular-nums transition-all duration-500 ${
                    active
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
                  <span className="text-[11px] uppercase tracking-[0.16em] opacity-90 mt-1.5">Tap to stop</span>
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
              <p className="font-serif text-[15px] text-muted-foreground">Listening… play near your device.</p>
            ) : analyzing ? (
              <p className="font-serif text-[15px] text-muted-foreground">Working out the key…</p>
            ) : (
              <p className="font-serif text-[15px] text-muted-foreground max-w-sm">
                Tap the dial and play up to {MAX_RECORD_SECONDS} seconds of a tune.
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

        {/* Disclaimer */}
        <div className="border-t border-border pt-5 mt-2 flex gap-2.5 max-w-xl mx-auto">
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
